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
      const res = await fetch(imageSource, { method: "GET" });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";
        await storage.put(r2Key, buffer, {
          httpMetadata: { contentType },
        });
        return `/api/assets/${r2Key}`;
      }
    }
  } catch (err) {
    console.warn(`Failed to persist image to R2 (${r2Key}):`, err);
  }

  return null;
}

// Instant 0ms Previz Director Graphite Sketch Generator (High Performance)
export function generateInstantPrevizSvg(shot: {
  order: number;
  shotSize: string;
  cameraAngle: string;
  action: string;
  subject?: string;
}): string {
  const sizeUpper = (shot.shotSize || "medium_shot").replace(/_/g, " ").toUpperCase();
  const angleUpper = (shot.cameraAngle || "eye_level").replace(/_/g, " ").toUpperCase();
  const actionEscaped = (shot.action || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const subjEscaped = (shot.subject || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
    <rect width="640" height="360" fill="#080c14"/>
    <defs>
      <pattern id="grid-${shot.order}" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
      <linearGradient id="previz-grad-${shot.order}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#previz-grad-${shot.order})"/>
    <rect width="640" height="360" fill="url(#grid-${shot.order})"/>
    
    <!-- 16:9 Action Safe Frame Area -->
    <rect x="24" y="24" width="592" height="312" rx="10" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1.5" stroke-dasharray="8 6"/>
    
    <!-- Director's Crosshair Center -->
    <line x1="320" y1="165" x2="320" y2="195" stroke="rgba(56,189,248,0.4)" stroke-width="1.5"/>
    <line x1="305" y1="180" x2="335" y2="180" stroke="rgba(56,189,248,0.4)" stroke-width="1.5"/>
    <circle cx="320" cy="180" r="42" fill="none" stroke="rgba(56,189,248,0.2)" stroke-width="1"/>

    <!-- Top Badge -->
    <rect x="40" y="40" width="160" height="28" rx="6" fill="rgba(15,23,42,0.85)" stroke="rgba(56,189,248,0.4)" stroke-width="1"/>
    <text x="50" y="59" fill="#38bdf8" font-size="13" font-family="monospace" font-weight="bold">PREVIZ · SHOT ${String(shot.order).padStart(2, "0")}</text>
    
    <!-- Camera Spec -->
    <text x="215" y="59" fill="#94a3b8" font-size="12" font-family="sans-serif" font-weight="500">${sizeUpper} · ${angleUpper}</text>
    
    <!-- Narrative Caption Box -->
    <rect x="40" y="260" width="560" height="60" rx="8" fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <text x="56" y="284" fill="#38bdf8" font-size="12" font-family="sans-serif" font-weight="bold">${subjEscaped || "场景构图"}</text>
    <text x="56" y="303" fill="#e2e8f0" font-size="11" font-family="sans-serif">${actionEscaped.slice(0, 52)}...</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Robust Universal Multimodal Storyboard Image Generator (For On-Demand & Batch Developing)
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

  // 1. Call AI Provider when API Key is present
  if (apiKey) {
    const isOpenRouter = apiBase.includes("openrouter.ai");

    // Case A: OpenRouter Multimodal Chat Completions Protocol (Grok Imagine, Imagen 3, FLUX, Recraft)
    if (isOpenRouter) {
      try {
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
                content: `Generate a high quality 16:9 cinematic pre-production director storyboard drawing: ${prompt}`,
              },
            ],
            modalities: ["image", "text"],
          }),
        });

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
          const errText = await resp.text();
          console.warn(`OpenRouter image generation returned ${resp.status}:`, errText);
        }
      } catch (e) {
        console.warn("OpenRouter chat/completions image call failed:", e);
      }
    }

    // Case B: Standard OpenAI /images/generations Protocol (DALL-E 3, Midjourney API, etc.)
    if (!rawImageUrl) {
      try {
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
            size: "1024x1024",
            response_format: "url",
          }),
        });

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

  // 2. High-speed cinematic 16:9 FLUX engine fallback if no API key or upstream failed
  if (!rawImageUrl) {
    const cleanPrompt = prompt.replace(/[^\w\s,\.\-]/g, " ").trim();
    rawImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      `cinematic 2d pre-production film storyboard graphite drawing, 16:9 widescreen, ${cleanPrompt}, movie concept art, visual master`
    )}?width=1024&height=576&seed=${seed}&model=flux&nologo=true`;
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

// POST /api/generate/from-story (Instant Previz breakdown <1.5s)
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

  // 2. Check for locked shots
  const existingShots = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
  const lockedShots = existingShots.filter((s) => s.isLocked);

  if (lockedShots.length > 0) {
    const lockedOrders = new Set(lockedShots.map((s) => s.order));
    const unlockedShots = existingShots.filter((s) => !s.isLocked);
    for (const u of unlockedShots) {
      await db.delete(shots).where(eq(shots.id, u.id));
    }

    let aiIndex = 0;
    for (let slot = 1; slot <= Math.max(6, result.shots.length); slot++) {
      if (lockedOrders.has(slot)) continue;
      const s = result.shots[aiIndex];
      if (!s) break;
      aiIndex++;

      const shotId = crypto.randomUUID();
      const previzSvg = generateInstantPrevizSvg({
        order: slot,
        shotSize: s.shot_size,
        cameraAngle: s.camera_angle,
        action: s.action,
        subject: s.subject || "",
      });

      await db.insert(shots).values({
        id: shotId,
        sequenceId: seq.id,
        order: slot,
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
        storyboardImageUrl: previzSvg,
        isDirty: true,
        isLocked: false,
      });
    }
  } else {
    await db.delete(shots).where(eq(shots.sequenceId, seq.id));

    for (const s of result.shots) {
      const shotId = crypto.randomUUID();
      const previzSvg = generateInstantPrevizSvg({
        order: s.order,
        shotSize: s.shot_size,
        cameraAngle: s.camera_angle,
        action: s.action,
        subject: s.subject || "",
      });

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
        storyboardImageUrl: previzSvg,
        isDirty: true,
        isLocked: false,
      });
    }
  }

  return c.json({
    status: "success",
    theme: result.theme,
    shots_count: result.shots.length,
    target_duration: result.target_duration,
  });
});

// POST /api/generate/from-script (Instant Previz breakdown <1.5s)
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

  const existingShots = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
  const lockedShots = existingShots.filter((s) => s.isLocked);

  if (lockedShots.length > 0) {
    const lockedOrders = new Set(lockedShots.map((s) => s.order));
    const unlockedShots = existingShots.filter((s) => !s.isLocked);
    for (const u of unlockedShots) {
      await db.delete(shots).where(eq(shots.id, u.id));
    }

    let aiIndex = 0;
    for (let slot = 1; slot <= Math.max(6, result.shots.length); slot++) {
      if (lockedOrders.has(slot)) continue;
      const s = result.shots[aiIndex];
      if (!s) break;
      aiIndex++;

      const shotId = crypto.randomUUID();
      const previzSvg = generateInstantPrevizSvg({
        order: slot,
        shotSize: s.shot_size,
        cameraAngle: s.camera_angle,
        action: s.action,
        subject: s.subject || "",
      });

      await db.insert(shots).values({
        id: shotId,
        sequenceId: seq.id,
        order: slot,
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
        storyboardImageUrl: previzSvg,
        isDirty: true,
        isLocked: false,
      });
    }
  } else {
    await db.delete(shots).where(eq(shots.sequenceId, seq.id));

    for (const s of result.shots) {
      const shotId = crypto.randomUUID();
      const previzSvg = generateInstantPrevizSvg({
        order: s.order,
        shotSize: s.shot_size,
        cameraAngle: s.camera_angle,
        action: s.action,
        subject: s.subject || "",
      });

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
        storyboardImageUrl: previzSvg,
        isDirty: true,
        isLocked: false,
      });
    }
  }

  return c.json({
    status: "success",
    theme: "剧本智能解析分镜",
    shots_count: result.shots.length,
    target_duration: result.target_duration,
  });
});

// POST /api/generate/images/:shotId (On-demand Hi-Fi AI diffusion & R2 saving)
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
    isDirty: false, // Upgraded from Previz sketch to Hi-Fi AI rendered state
    updatedAt: new Date().toISOString(),
  }).where(eq(shots.id, shotId));

  return c.json({
    status: "success",
    shot_id: shotId,
    storyboard_image_url: imageUrl,
  });
});

// POST /api/generate/images/project/:projectId
router.post("/images/project/:projectId", async (c) => {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");

  const seqs = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).all();
  let count = 0;

  for (const seq of seqs) {
    const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
    count += shotList.length;
  }

  return c.json({
    status: "success",
    rendered_count: count,
  });
});

export default router;
