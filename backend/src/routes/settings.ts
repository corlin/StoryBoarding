import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { systemSettings } from "../db/schema";

const router = new Hono<{ Bindings: Bindings }>();

// GET /api/settings/providers
router.get("/providers", async (c) => {
  const db = getDb(c.env.DB);
  let setting = await db.select().from(systemSettings).where(eq(systemSettings.id, "default")).get();

  if (!setting) {
    const defaultData = {
      id: "default",
      llmProvider: "openrouter",
      llmApiKey: "",
      llmApiBase: c.env.DEFAULT_LLM_API_BASE || "https://openrouter.ai/api/v1",
      llmModel: c.env.DEFAULT_LLM_MODEL || "deepseek/deepseek-chat",
      imageProvider: "openrouter",
      imageApiKey: "",
      imageApiBase: "https://openrouter.ai/api/v1",
      imageModel: c.env.DEFAULT_IMAGE_MODEL || "google/imagen-3",
      updatedAt: new Date().toISOString(),
    };
    await db.insert(systemSettings).values(defaultData);
    setting = defaultData;
  }

  const s = setting!;

  return c.json({
    llm_provider: s.llmProvider,
    llm_api_key: s.llmApiKey,
    llm_api_base: s.llmApiBase,
    llm_model: s.llmModel,
    image_provider: s.imageProvider,
    image_api_key: s.imageApiKey,
    image_api_base: s.imageApiBase,
    image_model: s.imageModel,
  });
});

// PUT /api/settings/providers
router.put("/providers", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();

  const updates: any = {};
  if (body.llm_provider !== undefined) updates.llmProvider = body.llm_provider;
  if (body.llm_api_key !== undefined) updates.llmApiKey = body.llm_api_key;
  if (body.llm_api_base !== undefined) updates.llmApiBase = body.llm_api_base;
  if (body.llm_model !== undefined) updates.llmModel = body.llm_model;
  if (body.image_provider !== undefined) updates.imageProvider = body.image_provider;
  if (body.image_api_key !== undefined) updates.imageApiKey = body.image_api_key;
  if (body.image_api_base !== undefined) updates.imageApiBase = body.image_api_base;
  if (body.image_model !== undefined) updates.imageModel = body.image_model;
  updates.updatedAt = new Date().toISOString();

  await db
    .insert(systemSettings)
    .values({ id: "default", ...updates })
    .onConflictDoUpdate({ target: systemSettings.id, set: updates });

  return c.json({ success: true, ...body });
});

// POST /api/settings/test-llm (Real-time LLM Model Probe)
router.post("/test-llm", async (c) => {
  const body = await c.req.json();
  const apiKey = (body.api_key || "").trim();
  const apiBase = (body.api_base || "https://openrouter.ai/api/v1").trim();
  const model = (body.model || "deepseek/deepseek-chat").trim();

  if (!apiKey) {
    return c.json({ ok: false, error: "请先填入 LLM API Key" }, 400);
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://storyboarding.caifu.social",
        "X-Title": "AI StoryBoarding Diagnostics",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Ping: Reply with 'PONG' in 1 word." }],
        max_tokens: 15,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (resp.ok) {
      const data = (await resp.json()) as any;
      const reply = data.choices?.[0]?.message?.content?.trim() || "PONG";
      return c.json({ ok: true, latency_ms: latency, model, reply });
    } else {
      const errText = await resp.text();
      return c.json({ ok: false, status: resp.status, error: `HTTP ${resp.status}: ${errText}` }, 400);
    }
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message || "请求超时或网络异常" }, 500);
  }
});

// POST /api/settings/test-image (Real-time Image Model Probe)
router.post("/test-image", async (c) => {
  const body = await c.req.json();
  const apiKey = (body.api_key || "").trim();
  const apiBase = (body.api_base || "https://openrouter.ai/api/v1").trim();
  const model = (body.model || "x-ai/grok-imagine-image-2.0").trim();

  if (!apiKey) {
    return c.json({ ok: false, error: "请先填入 AI 绘画 API Key" }, 400);
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://storyboarding.caifu.social",
        "X-Title": "AI StoryBoarding Diagnostics",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Monochrome storyboard thumbnail test, 16:9 widescreen" }],
        modalities: ["image", "text"],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (resp.ok) {
      return c.json({ ok: true, latency_ms: latency, model });
    } else {
      const errText = await resp.text();
      return c.json({ ok: false, status: resp.status, error: `HTTP ${resp.status}: ${errText}` }, 400);
    }
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message || "生图测试超时或网络异常" }, 500);
  }
});

export default router;
