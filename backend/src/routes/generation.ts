import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { projects, sequences, shots, systemSettings } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt } from "../agents/director/pipeline";

const router = new Hono<{ Bindings: Bindings }>();

// Helper to get active API keys from D1 system_settings or env
async function getActiveSettings(db: any, env: Bindings) {
  const setting = await db.select().from(systemSettings).where(eq(systemSettings.id, "default")).get();
  return {
    llmApiKey: setting?.llmApiKey || "",
    llmApiBase: setting?.llmApiBase || env.DEFAULT_LLM_API_BASE || "https://openrouter.ai/api/v1",
    llmModel: setting?.llmModel || env.DEFAULT_LLM_MODEL || "deepseek/deepseek-chat",
    imageApiKey: setting?.imageApiKey || setting?.llmApiKey || "",
    imageApiBase: setting?.imageApiBase || "https://openrouter.ai/api/v1",
    imageModel: setting?.imageModel || env.DEFAULT_IMAGE_MODEL || "google/imagen-3",
  };
}

// Generate real AI storyboard image using configured provider or high-speed cinematic FLUX engine
export async function generateCinematicStoryboardImage(
  prompt: string,
  settings: {
    imageApiKey?: string;
    imageApiBase?: string;
    imageModel?: string;
  },
  seed: number = Math.floor(Math.random() * 1000000)
): Promise<string> {
  const apiKey = settings.imageApiKey?.trim();
  const apiBase = settings.imageApiBase?.trim() || "https://openrouter.ai/api/v1";
  const model = settings.imageModel?.trim() || "google/imagen-3";

  // 1. If API Key provided, attempt OpenAI / OpenRouter images API
  if (apiKey) {
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
        const url = data.data?.[0]?.url;
        if (url) return url;
      }
    } catch (e) {
      console.warn("API image generation failed, using fallback:", e);
    }
  }

  // 2. High-speed cinematic 16:9 visual storyboard engine (FLUX widescreen drawing)
  const cleanPrompt = prompt.replace(/[^\w\s,\.\-]/g, " ").trim();
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    `cinematic 2d pre-production film storyboard graphite drawing, 16:9 widescreen, ${cleanPrompt}, movie concept art, visual master`
  )}?width=1024&height=576&seed=${seed}&model=flux&nologo=true`;
}

// POST /api/generate/from-story
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

  // Update project story and duration
  await db.update(projects).set({ story: storyText, targetDuration, updatedAt: new Date().toISOString() }).where(eq(projects.id, projectId));

  // Find or create default sequence
  let seq = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).get();
  if (!seq) {
    const seqId = crypto.randomUUID();
    await db.insert(sequences).values({ id: seqId, projectId, title: "主场次", order: 1 });
    seq = { id: seqId, projectId, title: "主场次", order: 1, createdAt: "", updatedAt: "" };
  }

  const settings = await getActiveSettings(db, c.env);
  const result = await runDirectorPipeline(storyText, targetDuration, {
    apiKey: settings.llmApiKey,
    apiBase: settings.llmApiBase,
    model: settings.llmModel,
  });

  // Clear existing shots for sequence
  await db.delete(shots).where(eq(shots.sequenceId, seq.id));

  // Insert newly planned shots with visual storyboard images
  for (const s of result.shots) {
    const shotId = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 900000) + s.order * 1000;
    const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, settings, seed);

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
    });
  }

  return c.json({
    status: "success",
    theme: result.theme,
    shots_count: result.shots.length,
    target_duration: result.target_duration,
  });
});

// POST /api/generate/from-script
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

  const settings = await getActiveSettings(db, c.env);
  const result = await runDirectorPipeline(scriptText, 30.0, {
    apiKey: settings.llmApiKey,
    apiBase: settings.llmApiBase,
    model: settings.llmModel,
  });

  await db.delete(shots).where(eq(shots.sequenceId, seq.id));

  for (const s of result.shots) {
    const shotId = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 900000) + s.order * 1000;
    const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, settings, seed);

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
    });
  }

  return c.json({
    status: "success",
    theme: "剧本智能解析分镜",
    shots_count: result.shots.length,
    target_duration: result.target_duration,
  });
});

// POST /api/generate/images/:shotId
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

  const imageUrl = await generateCinematicStoryboardImage(prompt, settings, seed);

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

// POST /api/generate/images/project/:projectId
router.post("/images/project/:projectId", async (c) => {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");

  const settings = await getActiveSettings(db, c.env);
  const seqs = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).all();
  let count = 0;

  for (const seq of seqs) {
    const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
    for (const s of shotList) {
      const prompt = s.imagePrompt || formatDirectorImagePrompt(s.action, s.shotSize, s.cameraAngle, "static");
      const seed = Math.floor(Math.random() * 9000000) + Date.now() % 10000;
      const imageUrl = await generateCinematicStoryboardImage(prompt, settings, seed);

      await db.update(shots).set({
        storyboardImageUrl: imageUrl,
        isDirty: false,
        updatedAt: new Date().toISOString(),
      }).where(eq(shots.id, s.id));
      count += 1;
    }
  }

  return c.json({
    status: "success",
    rendered_count: count,
  });
});

export default router;
