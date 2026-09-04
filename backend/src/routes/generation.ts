import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { projects, sequences, shots, projectVersions, users } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt, cleanPromptOfMetaPollution } from "../agents/director/pipeline";
import { captureProjectSnapshot } from "./versions";
import { getAuthUser, getUserSettings } from "../lib/auth";

const router = new Hono<{ Bindings: Bindings }>();

// Convert Base64 string to Uint8Array safely
function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Compute deterministic project base seed from string
export function getProjectBaseSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 800000 + 10000;
}

// Save image stream or URL to Cloudflare R2
async function saveImageToR2(
  imageSource: string,
  storage: R2Bucket | undefined,
  r2Key: string
): Promise<string | null> {
  if (!storage) {
    console.warn(`[R2 Storage] storage binding is undefined, cannot save ${r2Key}`);
    return null;
  }

  try {
    if (imageSource.startsWith("data:image/")) {
      const bytes = base64ToUint8Array(imageSource);
      await storage.put(r2Key, bytes, {
        httpMetadata: { contentType: "image/jpeg" },
      });
      console.log(`[R2 Storage] Successfully stored base64 image to R2: ${r2Key} (${bytes.length} bytes)`);
      return `https://storyboarding-api.caifu.social/api/assets/${r2Key}`;
    }

    if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(imageSource, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "image/*,*/*",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          await storage.put(r2Key, buffer, {
            httpMetadata: { contentType },
          });
          console.log(`[R2 Storage] Successfully stored external image to R2: ${r2Key} (${buffer.byteLength} bytes)`);
          return `https://storyboarding-api.caifu.social/api/assets/${r2Key}`;
        } else {
          console.warn(`[R2 Storage] Upstream fetch image failed: HTTP ${res.status} for ${imageSource.slice(0, 80)}`);
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.warn(`[R2 Storage] Upstream fetch timed out or failed:`, fetchErr?.message || fetchErr);
      }
    }
  } catch (err) {
    console.warn(`[R2 Storage] Failed to persist image to R2 (${r2Key}):`, err);
  }

  return null;
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
  seed: number = Math.floor(Math.random() * 1000000)
): Promise<string> {
  const apiKey = settings.imageApiKey?.trim();
  const apiBase = settings.imageApiBase?.trim() || "https://openrouter.ai/api/v1";
  const model = settings.imageModel?.trim() || "bytedance-seed/seedream-5-0-lite";
  const r2Key = `shots/${shotId}.jpg`;

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
            aspect_ratio: "16:9",
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
                content: cleanPrompt,
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
            size: "512x512",
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
    const r2Url = await saveImageToR2(rawImageUrl, storage, r2Key);
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
      cliffhangerSummary: "",
      targetDuration: 60.0,
      screenplayText: storyText || "",
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
      cliffhangerSummary: "",
      targetDuration: 60.0,
      screenplayText: scriptText || "",
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
const handleGenerateSingleShotImage = async (c: any) => {
  const db = getDb(c.env.DB);
  const shotId = c.req.param("shotId");

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

  const prompt = shot.imagePrompt || formatDirectorImagePrompt(shot.action, shot.shotSize, shot.cameraAngle, "static");
  const seed = Math.floor(Math.random() * 9000000) + Date.now() % 10000;

  const imageUrl = await generateCinematicStoryboardImage(prompt, shotId, settings, c.env.STORAGE, seed);

  await db.update(shots).set({
    storyboardImageUrl: imageUrl,
    isDirty: false,
    updatedAt: new Date().toISOString(),
  }).where(eq(shots.id, shotId));

  return c.json({
    status: "success",
    shot_id: shotId,
    storyboard_image_url: imageUrl,
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

    const systemPrompt = `你是一位精通爆款短剧与好莱坞编剧工业的顶级剧作顾问。
创作者提供了一个一句话灵感构思：
"""${userPrompt}"""

${genrePromptDesc}
${catharsisDesc}
${castRule}
${mustHaveRule}

请为该构思设计 3 种截然不同走向的短剧提案。每个提案包含吸引人的剧名、一句话商业核心卖点（Logline）、登场角色列表（带纯英文视觉特征 Visual DNA 锚点）、不可违背的核心事件发生点、全集剧情梗概（200~300字），以及标准电影格式的文学剧本片段（包含场景头、人物对白、文学动作描写）。

必须输出严格合法的纯 JSON 格式（不要使用任何 markdown 代码块包裹，不要多余说明文字）：
{
  "proposals": [
    {
      "id": "proposal_1",
      "title": "剧名（抓人且契合赛道）",
      "flavor_tag": "方案风格（如：大女主清醒复仇版 / 双向奔赴救赎版）",
      "logline": "一句话核心商业卖点钩子",
      "characters": [
        { "name": "姓名", "role": "protagonist", "personality": "性格小传", "visual_anchor": "英文视觉DNA锚点" },
        { "name": "姓名", "role": "antagonist", "personality": "性格小传", "visual_anchor": "英文视觉DNA锚点" }
      ],
      "synopsis": "完整短剧全集剧情梗概（200~300字，起承转合清晰，高潮迭起，紧扣必经剧情）",
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
