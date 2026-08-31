import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { projects, sequences, shots, systemSettings, projectVersions } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt } from "../agents/director/pipeline";
import { captureProjectSnapshot } from "./versions";

const router = new Hono<{ Bindings: Bindings }>();

// Helper to get active API keys from D1 system_settings or env
export async function getActiveSettings(db: any, env: Bindings) {
  const setting = await db.select().from(systemSettings).where(eq(systemSettings.id, "default")).get();
  return {
    llmApiKey: setting?.llmApiKey || "",
    llmApiBase: setting?.llmApiBase || env.DEFAULT_LLM_API_BASE || "https://openrouter.ai/api/v1",
    llmModel: setting?.llmModel || env.DEFAULT_LLM_MODEL || "deepseek/deepseek-chat",
    imageApiKey: setting?.imageApiKey || setting?.llmApiKey || "",
    imageApiBase: setting?.imageApiBase || "https://openrouter.ai/api/v1",
    imageModel: setting?.imageModel || env.DEFAULT_IMAGE_MODEL || "x-ai/grok-imagine-image-2.0",
  };
}

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
  if (!storage) return null;

  try {
    if (imageSource.startsWith("data:image/")) {
      const bytes = base64ToUint8Array(imageSource);
      await storage.put(r2Key, bytes, {
        httpMetadata: { contentType: "image/jpeg" },
      });
      return `/api/assets/${r2Key}`;
    }

    if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(imageSource, { method: "GET", signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          await storage.put(r2Key, buffer, {
            httpMetadata: { contentType },
          });
          return `/api/assets/${r2Key}`;
        }
      } catch (_) {
        clearTimeout(timeoutId);
      }
    }
  } catch (err) {
    console.warn(`Failed to persist image to R2 (${r2Key}):`, err);
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
  const model = settings.imageModel?.trim() || "x-ai/grok-imagine-image-2.0";
  const r2Key = `shots/${shotId}.jpg`;

  let rawImageUrl = "";

  // 1. Call AI Provider when API Key is present with a 20s timeout
  if (apiKey) {
    const isOpenRouter = apiBase.includes("openrouter.ai");

    // Case A: OpenRouter Multimodal Chat Completions Protocol (Grok Imagine, Imagen 3, FLUX, Recraft)
    if (isOpenRouter) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

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
                content: `Monochrome pre-production director storyboard draft (512x288, 16:9 widescreen, graphite lines): ${prompt}`,
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
        console.warn("OpenRouter image call failed or timed out (>20s):", e?.message || e);
      }
    }

    // Case B: Standard OpenAI /images/generations Protocol (DALL-E 3, Midjourney API, etc.)
    if (!rawImageUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
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

  // 2. High-speed cinematic 512x288 FLUX engine fallback if no API key or upstream failed/timed out
  if (!rawImageUrl) {
    const cleanPrompt = prompt.replace(/[^\w\s,\.\-]/g, " ").trim();
    rawImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      `cinematic 2d monochrome graphite film storyboard illustration, 16:9 widescreen, ${cleanPrompt}, draft line art`
    )}?width=512&height=288&seed=${seed}&model=flux&nologo=true`;
  }

  // 3. Persist image to Cloudflare R2 object storage
  if (storage && rawImageUrl) {
    const r2Url = await saveImageToR2(rawImageUrl, storage, r2Key);
    if (r2Url) {
      return r2Url;
    }
  }

  return rawImageUrl;
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

// POST /api/generate/from-story (Real AI breakdown with 3-worker concurrent image generation & 4-pillar continuity)
router.post("/from-story", async (c) => {
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
    await db.insert(sequences).values({ id: seqId, projectId, title: "主场次", order: 1 });
    seq = { id: seqId, projectId, title: "主场次", order: 1, createdAt: "", updatedAt: "" };
  }

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

  const settings = await getActiveSettings(db, c.env);
  const result = await runDirectorPipeline(storyText, targetDuration, {
    apiKey: settings.llmApiKey,
    apiBase: settings.llmApiBase,
    model: settings.llmModel,
  });

  const baseSeed = getProjectBaseSeed(projectId);

  // 2. Check for locked shots
  const existingShots = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
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

    // 3-Worker concurrent real AI image generation with deterministic seed chain
    await runConcurrentTasks(availableSlots, 3, async ({ slot, planShot }) => {
      const shotId = crypto.randomUUID();
      const seed = baseSeed + slot * 1000;
      const imageUrl = await generateCinematicStoryboardImage(planShot.image_prompt, shotId, settings, c.env.STORAGE, seed);

      await db.insert(shots).values({
        id: shotId,
        sequenceId: seq.id,
        order: slot,
        duration: planShot.duration,
        shotSize: planShot.shot_size,
        cameraAngle: planShot.camera_angle,
        cameraMovement: JSON.stringify(planShot.camera_movement || {}),
        subject: planShot.subject || "",
        action: planShot.action,
        dialogue: planShot.dialogue || "",
        narrativeFunction: planShot.narrative_function || "动作推进",
        lighting: planShot.lighting || "自然光",
        audio: JSON.stringify(planShot.audio || {}),
        imagePrompt: planShot.image_prompt,
        videoPrompt: planShot.video_prompt,
        continuityData: JSON.stringify(planShot.continuity_data || {}),
        storyboardImageUrl: imageUrl,
        isDirty: false,
        isLocked: false,
      });
    });
  } else {
    await db.delete(shots).where(eq(shots.sequenceId, seq.id));

    // 3-Worker concurrent real AI image generation with deterministic seed chain
    await runConcurrentTasks(result.shots, 3, async (s) => {
      const shotId = crypto.randomUUID();
      const seed = baseSeed + s.order * 1000;
      const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);

      await db.insert(shots).values({
        id: shotId,
        sequenceId: seq.id,
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
        storyboardImageUrl: imageUrl,
        isDirty: false,
        isLocked: false,
      });
    });
  }

  return c.json({
    status: "success",
    theme: result.theme,
    shots_count: result.shots.length,
    target_duration: result.target_duration,
  });
});

// POST /api/generate/from-script (Real AI breakdown from script with 3-worker concurrent image generation)
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
    await db.insert(sequences).values({ id: seqId, projectId, title: "导入剧本场次", order: 1 });
    seq = { id: seqId, projectId, title: "导入剧本场次", order: 1, createdAt: "", updatedAt: "" };
  }

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

  const settings = await getActiveSettings(db, c.env);
  const result = await runDirectorPipeline(scriptText, 30.0, {
    apiKey: settings.llmApiKey,
    apiBase: settings.llmApiBase,
    model: settings.llmModel,
  });

  const baseSeed = getProjectBaseSeed(projectId);
  const existingShots = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
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

    await runConcurrentTasks(availableSlots, 3, async ({ slot, planShot }) => {
      const shotId = crypto.randomUUID();
      const seed = baseSeed + slot * 1000;
      const imageUrl = await generateCinematicStoryboardImage(planShot.image_prompt, shotId, settings, c.env.STORAGE, seed);

      await db.insert(shots).values({
        id: shotId,
        sequenceId: seq.id,
        order: slot,
        duration: planShot.duration,
        shotSize: planShot.shot_size,
        cameraAngle: planShot.camera_angle,
        cameraMovement: JSON.stringify(planShot.camera_movement || {}),
        subject: planShot.subject || "",
        action: planShot.action,
        dialogue: planShot.dialogue || "",
        narrativeFunction: planShot.narrative_function || "动作推进",
        lighting: planShot.lighting || "自然光",
        audio: JSON.stringify(planShot.audio || {}),
        imagePrompt: planShot.image_prompt,
        videoPrompt: planShot.video_prompt,
        continuityData: JSON.stringify(planShot.continuity_data || {}),
        storyboardImageUrl: imageUrl,
        isDirty: false,
        isLocked: false,
      });
    });
  } else {
    await db.delete(shots).where(eq(shots.sequenceId, seq.id));

    await runConcurrentTasks(result.shots, 3, async (s) => {
      const shotId = crypto.randomUUID();
      const seed = baseSeed + s.order * 1000;
      const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);

      await db.insert(shots).values({
        id: shotId,
        sequenceId: seq.id,
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
        storyboardImageUrl: imageUrl,
        isDirty: false,
        isLocked: false,
      });
    });
  }

  return c.json({
    status: "success",
    theme: "剧本智能解析分镜",
    shots_count: result.shots.length,
    target_duration: result.target_duration,
  });
});

// POST /api/generate/images/:shotId (Dedicated single-shot real AI regeneration with project seed offset)
router.post("/images/:shotId", async (c) => {
  const db = getDb(c.env.DB);
  const shotId = c.req.param("shotId");

  const shot = await db.select().from(shots).where(eq(shots.id, shotId)).get();
  if (!shot) {
    return c.json({ detail: "Shot not found" }, 404);
  }

  const settings = await getActiveSettings(db, c.env);
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
});

export default router;
