import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { projects, sequences, shots, projectVersions, users, characters, locations } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt, cleanPromptOfMetaPollution } from "../agents/director/pipeline";
import { captureProjectSnapshot } from "./versions";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { saveImageToR2 } from "../lib/storage";

const router = new Hono<{ Bindings: Bindings }>();

// Compute deterministic project base seed from string
export function getProjectBaseSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 800000 + 10000;
}

// Robust Universal Multimodal Storyboard Image Generator with 512x288 Low-Res & 20s Timeout
export async function generateCinematicStoryboardImage(
  prompt: string,
  shotId: string,
  settings: {
    imageApiKey?: string;
    imageApiBase?: string;
    imageModel?: string;
  },
  storage?: R2Bucket,
  seed: number = Math.floor(Math.random() * 1000000),
  options?: {
    aspectRatio?: "9:16" | "16:9";
    referenceImageUrls?: string[];
  }
): Promise<string> {
  const apiKey = settings.imageApiKey?.trim();
  const apiBase = settings.imageApiBase?.trim() || "https://openrouter.ai/api/v1";
  const model = settings.imageModel?.trim() || "bytedance-seed/seedream-5-0-lite";
  const r2Key = `shots/${shotId}.jpg`;
  const ratio = options?.aspectRatio || "9:16";
  const dedicatedSize = ratio === "9:16" ? "576x1024" : "1024x576";

  let rawImageUrl = "";

  // 1. Call AI Provider when API Key is present with a 25s timeout
  if (apiKey) {
    const isOpenRouter = apiBase.includes("openrouter.ai");

    // Case 0: OpenRouter Official Dedicated /images API (for openai/gpt-image-2 and 16:9 Widescreen Storyboard Generation)
    if (isOpenRouter) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s strict wait

        const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://storyboarding.caifu.social",
            "X-Title": "AI StoryBoarding",
          },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            aspect_ratio: ratio,
            quality: "high",
            background: "auto",
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = (await resp.json()) as any;
          if (data.data && Array.isArray(data.data) && data.data[0]) {
            rawImageUrl = data.data[0].url || data.data[0].b64_json || "";
          } else if (data.images && Array.isArray(data.images) && data.images[0]) {
            rawImageUrl = data.images[0].url || data.images[0] || "";
          }
          if (rawImageUrl && !rawImageUrl.startsWith("http") && !rawImageUrl.startsWith("data:")) {
            rawImageUrl = `data:image/png;base64,${rawImageUrl}`;
          }
        }
      } catch (e: any) {
        console.warn("OpenRouter /images dedicated call failed:", e?.message || e);
      }
    }

    // Case A: OpenRouter Multimodal Chat Completions Protocol (Fallback for chat-based vision models)
    if (isOpenRouter && !rawImageUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

        const cleanPrompt = cleanPromptOfMetaPollution(prompt);
        const userContent: any[] = [{ type: "text", text: cleanPrompt }];
        if (options?.referenceImageUrls && options.referenceImageUrls.length > 0) {
          for (const refImg of options.referenceImageUrls.slice(0, 2)) {
            userContent.push({
              type: "image_url",
              image_url: { url: refImg },
            });
          }
        }
        
        const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://storyboarding.caifu.social",
            "X-Title": "AI StoryBoarding",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "user",
                content: userContent,
              },
            ],
            modalities: ["image", "text"],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = (await resp.json()) as any;
          const msg = data.choices?.[0]?.message;

          if (msg?.images && Array.isArray(msg.images) && msg.images.length > 0) {
            const firstImg = msg.images[0];
            rawImageUrl = typeof firstImg === "string" ? firstImg : firstImg?.image_url?.url || firstImg?.url || "";
          }

          if (!rawImageUrl && msg?.content) {
            const mdMatch = msg.content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
            if (mdMatch && mdMatch[1]) {
              rawImageUrl = mdMatch[1];
            } else if (msg.content.startsWith("http://") || msg.content.startsWith("https://")) {
              rawImageUrl = msg.content.trim();
            } else if (msg.content.startsWith("data:image/")) {
              rawImageUrl = msg.content.trim();
            }
          }
        } else {
          console.warn(`OpenRouter image generation returned ${resp.status}`);
        }
      } catch (e: any) {
        console.warn("OpenRouter image call failed or timed out (>45s):", e?.message || e);
      }
    }

    // Case B: Standard OpenAI /images/generations Protocol (DALL-E 3, Midjourney API, etc.)
    if (!rawImageUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

        const cleanPrompt = cleanPromptOfMetaPollution(prompt);
        const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            prompt: cleanPrompt,
            n: 1,
            size: dedicatedSize,
            response_format: "url",
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = (await resp.json()) as any;
          rawImageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || "";
          if (rawImageUrl && !rawImageUrl.startsWith("http") && !rawImageUrl.startsWith("data:")) {
            rawImageUrl = `data:image/png;base64,${rawImageUrl}`;
          }
        }
      } catch (e) {
        console.warn("Standard /images/generations failed:", e);
      }
    }
  }

  // 2. Persist image to Cloudflare R2 object storage (Zero fake placeholders: if failed/timed out, keep strictly empty)
  if (storage && rawImageUrl) {
    const r2Url = await saveImageToR2(rawImageUrl, r2Key, storage);
    if (r2Url) {
      return r2Url;
    }
  }

  return rawImageUrl || "";
}

// 3-Worker Safe Concurrency Task Pool Helper
export async function runConcurrentTasks<T, R>(
  items: T[],
  concurrency: number,
  taskFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await taskFn(items[idx], idx);
      } catch (err) {
        console.error(`Concurrent task failed at index ${idx}:`, err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// POST /api/generate/from-story & POST /api/generate/storyboard
const handleGenerateFromStory = async (c: any) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  const projectId = body.project_id;
  const storyText = body.story || "";
  const targetDuration = Number(body.target_duration) || 30.0;
  const narrativeMode = body.narrative_mode || "hollywood";
  const structuralArchetype = body.structural_archetype;
  const narrativeCenter = body.narrative_center;

  const proj = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!proj) {
    return c.json({ detail: "Project not found" }, 404);
  }

  await db.update(projects).set({ story: storyText, targetDuration, updatedAt: new Date().toISOString() }).where(eq(projects.id, projectId));

  let seq = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).get();
  if (!seq) {
    const seqId = crypto.randomUUID();
    await db.insert(sequences).values({
      id: seqId,
      projectId,
      title: "主场次",
      order: 1,
      episodeNumber: 1,
      cliffhangerSummary: "",
      targetDuration: 60.0,
      screenplayText: storyText || "",
    });
    seq = {
      id: seqId,
      projectId,
      title: "主场次",
      order: 1,
      episodeNumber: 1,
      hookSummary: "",
      cliffhangerSummary: "",
      payoffSummary: "",
      targetDuration: 60.0,
      screenplayText: storyText || "",
      beatsData: "[]",
      createdAt: "",
      updatedAt: "",
    };
  }
  const currentSeq = seq!;

  // 1. Auto-capture pre-AI snapshot
  const preSnapshot = await captureProjectSnapshot(db, projectId);
  if (preSnapshot && preSnapshot.shotCount > 0) {
    const backupId = crypto.randomUUID();
    const existingVersions = await db.select().from(projectVersions).where(eq(projectVersions.projectId, projectId)).all();
    const versionTag = `v1.${existingVersions.length + 1}-auto`;
    await db.insert(projectVersions).values({
      id: backupId,
      projectId,
      versionTag,
      versionName: `AI 导演拆镜前自动备份`,
      triggerType: "auto_pre_ai",
      shotCount: preSnapshot.shotCount,
      totalDuration: preSnapshot.totalDuration,
      snapshotData: JSON.stringify(preSnapshot),
      createdAt: new Date().toISOString(),
    });
  }

  const authHeader = c.req.header("Authorization");
  const authUser = await getAuthUser(authHeader);
  if (!authUser) {
    return c.json({ detail: "请先登录导演账号" }, 401);
  }

  const settings = await getUserSettings(db, authUser.userId);
  if (!settings.hasKey) {
    return c.json({ detail: "请先在「设置」中配置您的专属 OpenRouter API Key 后再开启 AI 智能拆镜" }, 400);
  }

  const result = await runDirectorPipeline(storyText, targetDuration, {
    apiKey: settings.llmApiKey,
    apiBase: settings.llmApiBase,
    model: settings.llmModel,
    narrativeMode: narrativeMode as any,
    structuralArchetype,
    narrativeCenter: narrativeCenter as any,
  });

  const baseSeed = getProjectBaseSeed(projectId);

  // 2. Check for locked shots
  const existingShots = await db.select().from(shots).where(eq(shots.sequenceId, currentSeq.id)).all();
  const lockedShots = existingShots.filter((s) => s.isLocked);

  if (lockedShots.length > 0) {
    const lockedOrders = new Set(lockedShots.map((s) => s.order));
    const unlockedShots = existingShots.filter((s) => !s.isLocked);
    for (const u of unlockedShots) {
      await db.delete(shots).where(eq(shots.id, u.id));
    }

    const availableSlots: { slot: number; planShot: any }[] = [];
    let aiIndex = 0;
    for (let slot = 1; slot <= Math.max(3, result.shots.length); slot++) {
      if (lockedOrders.has(slot)) continue;
      const s = result.shots[aiIndex];
      if (!s) break;
      aiIndex++;
      availableSlots.push({ slot, planShot: s });
    }

    const insertedShotTasks: { shotId: string; s: any; slot: number }[] = [];
    for (const item of availableSlots) {
      const shotId = crypto.randomUUID();
      insertedShotTasks.push({ shotId, s: item.planShot, slot: item.slot });
      await db.insert(shots).values({
        id: shotId,
        sequenceId: currentSeq.id,
        order: item.slot,
        duration: item.planShot.duration,
        shotSize: item.planShot.shot_size,
        cameraAngle: item.planShot.camera_angle,
        cameraMovement: JSON.stringify(item.planShot.camera_movement || {}),
        subject: item.planShot.subject || "",
        action: item.planShot.action,
        dialogue: item.planShot.dialogue || "",
        narrativeFunction: item.planShot.narrative_function || "动作推进",
        lighting: item.planShot.lighting || "自然光",
        audio: JSON.stringify(item.planShot.audio || {}),
        imagePrompt: item.planShot.image_prompt,
        videoPrompt: item.planShot.video_prompt,
        continuityData: JSON.stringify(item.planShot.continuity_data || {}),
        storyboardImageUrl: "",
        isDirty: false,
        isLocked: false,
      });
    }

    const backgroundJob = async () => {
      try {
        await runConcurrentTasks(insertedShotTasks, 3, async ({ shotId, s, slot }) => {
          const seed = baseSeed + slot * 1000;
          const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
          await db.update(shots).set({ storyboardImageUrl: imageUrl, updatedAt: new Date().toISOString() }).where(eq(shots.id, shotId));
        });
      } catch (err) {
        console.error("Background rendering error (locked shots from-story):", err);
      }
    };

    if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
      c.executionCtx.waitUntil(backgroundJob());
    } else {
      backgroundJob();
    }
  } else {
    await db.delete(shots).where(eq(shots.sequenceId, currentSeq.id));

    const insertedShotTasks: { shotId: string; s: any }[] = [];
    for (const s of result.shots) {
      const shotId = crypto.randomUUID();
      insertedShotTasks.push({ shotId, s });
      await db.insert(shots).values({
        id: shotId,
        sequenceId: currentSeq.id,
        order: s.order,
        duration: s.duration,
        shotSize: s.shot_size,
        cameraAngle: s.camera_angle,
        cameraMovement: JSON.stringify(s.camera_movement || {}),
        subject: s.subject || "",
        action: s.action,
        dialogue: s.dialogue || "",
        narrativeFunction: s.narrative_function || "动作推进",
        lighting: s.lighting || "自然光",
        audio: JSON.stringify(s.audio || {}),
        imagePrompt: s.image_prompt,
        videoPrompt: s.video_prompt,
        continuityData: JSON.stringify(s.continuity_data || {}),
        storyboardImageUrl: "",
        isDirty: false,
        isLocked: false,
      });
    }

    const backgroundJob = async () => {
      try {
        await runConcurrentTasks(insertedShotTasks, 3, async ({ shotId, s }) => {
          const seed = baseSeed + s.order * 1000;
          const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
          await db.update(shots).set({ storyboardImageUrl: imageUrl, updatedAt: new Date().toISOString() }).where(eq(shots.id, shotId));
        });
      } catch (err) {
        console.error("Background rendering error (from-story):", err);
      }
    };

    if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
      c.executionCtx.waitUntil(backgroundJob());
    } else {
      backgroundJob();
    }
  }

  return c.json({
    status: "success",
    theme: result.theme,
    shots_count: result.shots.length,
    target_duration: result.target_duration,
    narrative_mode: result.narrative_mode,
    structural_archetype: result.structural_archetype,
    narrative_center: result.narrative_center,
  });
};

router.post("/from-story", handleGenerateFromStory);
router.post("/storyboard", handleGenerateFromStory);

// POST /api/generate/from-script (Real AI breakdown from script with server-side async image generation)
router.post("/from-script", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  const projectId = body.project_id;
  const scriptText = body.script_text || "";

  const proj = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!proj) {
    return c.json({ detail: "Project not found" }, 404);
  }

  let seq = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).get();
  if (!seq) {
    const seqId = crypto.randomUUID();
    await db.insert(sequences).values({
      id: seqId,
      projectId,
      title: "导入剧本场次",
      order: 1,
      episodeNumber: 1,
      cliffhangerSummary: "",
      targetDuration: 60.0,
      screenplayText: scriptText || "",
    });
    seq = {
      id: seqId,
      projectId,
      title: "导入剧本场次",
      order: 1,
      episodeNumber: 1,
      hookSummary: "",
      cliffhangerSummary: "",
      payoffSummary: "",
      targetDuration: 60.0,
      screenplayText: scriptText || "",
      beatsData: "[]",
      createdAt: "",
      updatedAt: "",
    };
  }
  const currentSeq = seq!;

  const preSnapshot = await captureProjectSnapshot(db, projectId);
  if (preSnapshot && preSnapshot.shotCount > 0) {
    const backupId = crypto.randomUUID();
    const existingVersions = await db.select().from(projectVersions).where(eq(projectVersions.projectId, projectId)).all();
    const versionTag = `v1.${existingVersions.length + 1}-auto`;
    await db.insert(projectVersions).values({
      id: backupId,
      projectId,
      versionTag,
      versionName: `剧本解析前自动备份`,
      triggerType: "auto_pre_ai",
      shotCount: preSnapshot.shotCount,
      totalDuration: preSnapshot.totalDuration,
      snapshotData: JSON.stringify(preSnapshot),
      createdAt: new Date().toISOString(),
    });
  }

  const authHeader = c.req.header("Authorization");
  const authUser = await getAuthUser(authHeader);
  if (!authUser) {
    return c.json({ detail: "请先登录导演账号" }, 401);
  }

  const settings = await getUserSettings(db, authUser.userId);
  if (!settings.hasKey) {
    return c.json({ detail: "请先在「设置」中配置您的专属 OpenRouter API Key 后再进行剧本解析" }, 400);
  }

  const result = await runDirectorPipeline(scriptText, 30.0, {
    apiKey: settings.llmApiKey,
    apiBase: settings.llmApiBase,
    model: settings.llmModel,
  });

  const baseSeed = getProjectBaseSeed(projectId);
  const existingShots = await db.select().from(shots).where(eq(shots.sequenceId, currentSeq.id)).all();
  const lockedShots = existingShots.filter((s) => s.isLocked);

  if (lockedShots.length > 0) {
    const lockedOrders = new Set(lockedShots.map((s) => s.order));
    const unlockedShots = existingShots.filter((s) => !s.isLocked);
    for (const u of unlockedShots) {
      await db.delete(shots).where(eq(shots.id, u.id));
    }

    const availableSlots: { slot: number; planShot: any }[] = [];
    let aiIndex = 0;
    for (let slot = 1; slot <= Math.max(3, result.shots.length); slot++) {
      if (lockedOrders.has(slot)) continue;
      const s = result.shots[aiIndex];
      if (!s) break;
      aiIndex++;
      availableSlots.push({ slot, planShot: s });
    }

    const insertedShotTasks: { shotId: string; s: any; slot: number }[] = [];
    for (const item of availableSlots) {
      const shotId = crypto.randomUUID();
      insertedShotTasks.push({ shotId, s: item.planShot, slot: item.slot });
      await db.insert(shots).values({
        id: shotId,
        sequenceId: currentSeq.id,
        order: item.slot,
        duration: item.planShot.duration,
        shotSize: item.planShot.shot_size,
        cameraAngle: item.planShot.camera_angle,
        cameraMovement: JSON.stringify(item.planShot.camera_movement || {}),
        subject: item.planShot.subject || "",
        action: item.planShot.action,
        dialogue: item.planShot.dialogue || "",
        narrativeFunction: item.planShot.narrative_function || "动作推进",
        lighting: item.planShot.lighting || "自然光",
        audio: JSON.stringify(item.planShot.audio || {}),
        imagePrompt: item.planShot.image_prompt,
        videoPrompt: item.planShot.video_prompt,
        continuityData: JSON.stringify(item.planShot.continuity_data || {}),
        storyboardImageUrl: "",
        isDirty: false,
        isLocked: false,
      });
    }

    const backgroundJob = async () => {
      try {
        await runConcurrentTasks(insertedShotTasks, 3, async ({ shotId, s, slot }) => {
          const seed = baseSeed + slot * 1000;
          const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
          await db.update(shots).set({ storyboardImageUrl: imageUrl, updatedAt: new Date().toISOString() }).where(eq(shots.id, shotId));
        });
      } catch (err) {
        console.error("Background rendering error (locked shots from-script):", err);
      }
    };

    if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
      c.executionCtx.waitUntil(backgroundJob());
    } else {
      backgroundJob();
    }
  } else {
    await db.delete(shots).where(eq(shots.sequenceId, currentSeq.id));

    const insertedShotTasks: { shotId: string; s: any }[] = [];
    for (const s of result.shots) {
      const shotId = crypto.randomUUID();
      insertedShotTasks.push({ shotId, s });
      await db.insert(shots).values({
        id: shotId,
        sequenceId: currentSeq.id,
        order: s.order,
        duration: s.duration,
        shotSize: s.shot_size,
        cameraAngle: s.camera_angle,
        cameraMovement: JSON.stringify(s.camera_movement || {}),
        subject: s.subject || "",
        action: s.action,
        dialogue: s.dialogue || "",
        narrativeFunction: s.narrative_function || "动作推进",
        lighting: s.lighting || "自然光",
        audio: JSON.stringify(s.audio || {}),
        imagePrompt: s.image_prompt,
        videoPrompt: s.video_prompt,
        continuityData: JSON.stringify(s.continuity_data || {}),
        storyboardImageUrl: "",
        isDirty: false,
        isLocked: false,
      });
    }

    const backgroundJob = async () => {
      try {
        await runConcurrentTasks(insertedShotTasks, 3, async ({ shotId, s }) => {
          const seed = baseSeed + s.order * 1000;
          const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
          await db.update(shots).set({ storyboardImageUrl: imageUrl, updatedAt: new Date().toISOString() }).where(eq(shots.id, shotId));
        });
      } catch (err) {
        console.error("Background rendering error (from-script):", err);
      }
    };

    if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
      c.executionCtx.waitUntil(backgroundJob());
    } else {
      backgroundJob();
    }
  }

  return c.json({
    status: "success",
    theme: "剧本智能解析分镜",
    shots_count: result.shots.length,
    target_duration: result.target_duration,
  });
});

// POST /api/generate/images/:shotId & POST /api/generate/shot-image/:shotId
// Unified Spatial Scoping Engine: Resolves 9:16 vertical composition, dual-character anti-bleeding,
// single character visual DNA, and location space lighting anchors
export async function resolveShotPromptAndOptions(
  db: any,
  shot: any,
  project?: any
): Promise<{
  prompt: string;
  options: {
    aspectRatio: "9:16" | "16:9";
    referenceImageUrls: string[];
  };
}> {
  let proj = project;
  if (!proj && shot.sequenceId) {
    const seq = await db.select().from(sequences).where(eq(sequences.id, shot.sequenceId)).get();
    if (seq) {
      proj = await db.select().from(projects).where(eq(projects.id, seq.projectId)).get();
    }
  }
  const aspectRatio: "9:16" | "16:9" = (proj?.aspectRatio as any) || "9:16";

  let shotCharIds: string[] = [];
  try {
    shotCharIds = typeof shot.characterIds === "string" ? JSON.parse(shot.characterIds) : shot.characterIds || [];
  } catch {}

  let boundChars: any[] = [];
  if (proj && shotCharIds.length > 0) {
    const allChars = await db.select().from(characters).where(eq(characters.projectId, proj.id)).all();
    boundChars = allChars.filter((ch: any) => shotCharIds.includes(ch.id));
  }

  // Fallback: If no explicit characters linked, check subject/action text against project characters
  if (boundChars.length === 0 && proj) {
    const allChars = await db.select().from(characters).where(eq(characters.projectId, proj.id)).all();
    boundChars = allChars.filter((ch: any) => {
      const q = ch.name?.trim().toLowerCase();
      return q && (shot.subject?.toLowerCase().includes(q) || shot.action?.toLowerCase().includes(q));
    });
  }

  let locAnchor = "";
  if (shot.locationId) {
    const loc = await db.select().from(locations).where(eq(locations.id, shot.locationId)).get();
    if (loc) {
      locAnchor = `${loc.name}, ${loc.environmentType} space, ${loc.visualAnchor}, lighting: ${loc.lightingStyle}`;
    }
  }

  let finalPrompt = shot.imagePrompt || "";
  let spatialScopingPrefix = "";

  if (aspectRatio === "9:16") {
    spatialScopingPrefix += "vertical framing, 9:16 vertical cinematic composition, TikTok/Reels short drama cinematography, ";
  }

  if (boundChars.length >= 2) {
    const c1 = boundChars[0];
    const c2 = boundChars[1];
    spatialScopingPrefix += `Two distinct people in scene: on the left side, [Subject: ${c1.name}, ${c1.visualAnchor || "stylish character"}], facing right; on the right side, [Subject: ${c2.name}, ${c2.visualAnchor || "distinct character"}], facing left. Strictly separated distinct clothing, different hair colors, zero color bleeding, individual features. `;
  } else if (boundChars.length === 1) {
    const c = boundChars[0];
    spatialScopingPrefix += `[Subject: ${c.name}, ${c.visualAnchor || "consistent character"}]. Consistent authentic facial features and outfit. `;
  }

  if (locAnchor) {
    spatialScopingPrefix += `Setting: ${locAnchor}. `;
  }

  if (!finalPrompt) {
    finalPrompt = formatDirectorImagePrompt(shot.action, shot.shotSize, shot.cameraAngle, "static");
  }

  const enrichedPrompt = spatialScopingPrefix ? `${spatialScopingPrefix}${finalPrompt}` : finalPrompt;
  const referenceImageUrls: string[] = boundChars
    .map((c: any) => c.avatarUrl)
    .filter((url: any) => Boolean(url && typeof url === "string" && url.startsWith("http")));

  return {
    prompt: enrichedPrompt,
    options: {
      aspectRatio,
      referenceImageUrls,
    },
  };
}

const handleGenerateSingleShotImage = async (c: any) => {
  await ensureSchema(c.env.DB);
  const db = getDb(c.env.DB);
  const shotId = c.req.param("id");

  const shot = await db.select().from(shots).where(eq(shots.id, shotId)).get();
  if (!shot) {
    return c.json({ detail: "Shot not found" }, 404);
  }

  const authHeader = c.req.header("Authorization");
  const authUser = await getAuthUser(authHeader);
  if (!authUser) {
    return c.json({ detail: "请先登录导演账号" }, 401);
  }

  const settings = await getUserSettings(db, authUser.userId);
  if (!settings.hasKey) {
    return c.json({ detail: "请先在「设置」中配置您的专属 OpenRouter API Key 后再生成 AI 画面" }, 400);
  }

  const { prompt: enrichedPrompt, options } = await resolveShotPromptAndOptions(db, shot);
  const seed = Math.floor(Math.random() * 9000000) + Date.now() % 10000;

  const imageUrl = await generateCinematicStoryboardImage(
    enrichedPrompt,
    shotId,
    settings,
    c.env.STORAGE,
    seed,
    options
  );

  const existingHistory: string[] = shot.imageHistory ? JSON.parse(shot.imageHistory) : [];
  const updatedHistory = imageUrl && !existingHistory.includes(imageUrl) 
    ? [imageUrl, ...existingHistory].slice(0, 10) 
    : existingHistory;

  await db.update(shots).set({
    storyboardImageUrl: imageUrl,
    imageHistory: JSON.stringify(updatedHistory),
    isDirty: false,
    updatedAt: new Date().toISOString(),
  }).where(eq(shots.id, shotId));

  return c.json({
    status: "success",
    shot_id: shotId,
    storyboard_image_url: imageUrl,
    image_history: updatedHistory,
  });
};

router.post("/images/:shotId", handleGenerateSingleShotImage);
router.post("/shot-image/:shotId", handleGenerateSingleShotImage);

// POST /api/generate/pitch-ideas (One-line idea to 3 distinct short drama proposals)
router.post("/pitch-ideas", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录导演账号" }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const userPrompt = (body.prompt || "").trim();
    if (!userPrompt) {
      return c.json({ detail: "请输入您的一句话故事点子或关键构想" }, 400);
    }

    const genre = body.genre || "female_lead"; // "female_lead" | "male_lead" | "realistic"
    const catharsisLevel = body.catharsis_level || "commercial"; // "restrained" | "commercial" | "extreme"
    const strictCast = Boolean(body.strict_cast);
    const mustHaveBeats = Array.isArray(body.must_have_beats) ? body.must_have_beats : [];

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.hasKey) {
      return c.json({ detail: "请先在「设置」中配置您的专属 OpenRouter API Key" }, 400);
    }

    const genrePromptDesc =
      genre === "female_lead"
        ? "【女频精选赛道】: 聚焦大女主觉醒、清醒反击、情感反思与救赎、手撕伪善、双向奔赴。严禁降智恶毒反派与无底线辱女恶趣味。"
        : genre === "male_lead"
        ? "【男频爽剧赛道】: 聚焦小人物逆袭、尊严打脸、潜龙出渊、商道崛起。节奏明快、戏剧反差强烈，爽而不腻。"
        : "【现实主义/治愈成长赛道】: 聚焦当代年轻人真实困境与自我救赎、温暖互助、心理治愈。情感真挚细腻、拒绝浮夸狗血。";

    const catharsisDesc =
      catharsisLevel === "restrained"
        ? "爽感烈度:【清醒克制 · 心理博弈向】注重人物内心动机与合情合理的情感推演，不搞夸张狗血冲突。"
        : catharsisLevel === "extreme"
        ? "爽感烈度:【极致反转 · 高能成瘾向】情绪大起大落、反差拉满、悬念密集紧凑，但合乎基本逻辑。"
        : "爽感烈度:【好莱坞商业黄金节拍】30 秒一小反转、60 秒一生死卡点，节奏紧密连贯。";

    const castRule = strictCast
      ? "【强制角色边界锁定 (Strict Cast)】: 本次故事严格限定在 2~3 个核心登场人物！严禁擅自凭空添加任何多余的角色（例如不允许凭空冒出男女主上司、前任等第三方第三者）！所有戏剧张力与对手戏只能在给定的核心人物之间展开！"
      : "允许根据剧情需要增添恰当的辅助配角。";

    const mustHaveRule =
      mustHaveBeats.length > 0
        ? `【不可违背的核心剧情事件 (Must-Happen Beats)】: 以下事件必须在剧情的关键节点真实发生并成为核心转折点，严禁遗漏或忽视：\n${mustHaveBeats.map((b: string) => `- ${b}`).join("\n")}`
        : "";

    const systemPrompt = `你是一位精通爆款短剧与好莱坞编剧工业的顶级剧作顾问（深度应用 SoloEnt-AI 5分钟短剧高命中模型）。
创作者提供了一个一句话灵感构思：
"""${userPrompt}"""

${genrePromptDesc}
${catharsisDesc}
${castRule}
${mustHaveRule}

【5分钟短剧高命中规则】：
必须从以下【12大高命中结构原型】中为每个提案匹配最适合的主推进机制（如：单空间高压对峙型、倒计时规则收缩型、交易代价升级型、身份/关系错位揭底型、错误解法反噬型、仪式中断与夺权型、系统失控推演型、多维视角塌缩型、绝对规则置换型、记忆/认知篡改型、困境死循环型、概念具象化掠夺型）。
明确指出主叙事重心（character 角色向 / creative 创意向 / plot 强剧情向），以及前 30 秒黄金律（0-3s入画、3-10s加压、10-30s揭底牌）。

请为该构思设计 3 种截然不同走向的短剧提案。每个提案包含吸引人的剧名、一句话商业核心卖点（Logline）、匹配的结构原型名称、主叙事重心、30秒钩子拆解、登场角色列表（带纯英文视觉特征 Visual DNA 锚点）、不可违背的核心事件发生点、全集剧情梗概（200~300字），以及标准电影格式的文学剧本片段（包含场景头、人物对白、文学动作描写）。

必须输出严格合法的纯 JSON 格式（不要使用任何 markdown 代码块包裹，不要多余说明文字）：
{
  "proposals": [
    {
      "id": "proposal_1",
      "title": "剧名（抓人且契合赛道）",
      "flavor_tag": "方案风格（如：大女主清醒复仇版 / 双向奔赴救赎版）",
      "structural_archetype": "结构原型名称（如：单空间高压对峙型）",
      "narrative_center": "character",
      "hook_30s_breakdown": {
        "s0_3": "0~3s 绝境/反差瞬间入画描述",
        "s3_10": "3~10s 危机加压或规则咬人",
        "s10_30": "10~30s 揭开底牌与致命信息缺口"
      },
      "logline": "一句话核心商业卖点钩子",
      "characters": [
        { "name": "姓名", "role": "protagonist", "personality": "性格小传", "visual_anchor": "英文视觉DNA锚点" },
        { "name": "姓名", "role": "antagonist", "personality": "性格小传", "visual_anchor": "英文视觉DNA锚点" }
      ],
      "synopsis": "完整短剧全集剧情梗概（200~300字，四幕因果推进：启动-升级-假高潮-兑现）",
      "screenplay_preview": "第 1 场 · 室内茶馆 · 夜\\n\\n【动作】外头暴雨如注，少女将退学申请书缓缓推过茶案。\\n\\n女主名\\n(眼神决绝)\\n我不走了。这一次，由我来保护大家。"
    }
  ]
}`;

    const res = await fetch(`${settings.llmApiBase || "https://openrouter.ai/api/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.llmApiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel || "deepseek/deepseek-chat",
        temperature: 0.75,
        messages: [{ role: "user", content: systemPrompt }],
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return c.json({ detail: `生成点子提案失败: ${errTxt}` }, 500);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    let proposals: any[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.proposals)) {
          proposals = parsed.proposals;
        }
      }
    } catch (parseErr) {
      console.error("[Parse Proposals JSON Error]:", parseErr);
    }

    if (proposals.length === 0) {
      return c.json({ detail: "AI 提案解析失败，请重试" }, 500);
    }

    return c.json({
      status: "success",
      proposals,
    });
  } catch (err: any) {
    console.error("[Pitch Ideas Error]:", err);
    return c.json({ detail: `生成短剧点子提案失败: ${err?.message || err}` }, 500);
  }
});

export default router;
