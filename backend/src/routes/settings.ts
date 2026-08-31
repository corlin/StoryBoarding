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
      imageModel: c.env.DEFAULT_IMAGE_MODEL || "openai/gpt-image-2",
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
    image_model: s.imageModel || "openai/gpt-image-2",
  });
});

// POST & PUT /api/settings/providers (Update Provider Settings)
const handleUpdateProviders = async (c: any) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();

  const updateData = {
    llmProvider: body.llm_provider || "openrouter",
    llmApiKey: (body.llm_api_key !== undefined ? body.llm_api_key : "").trim(),
    llmApiBase: (body.llm_api_base || "https://openrouter.ai/api/v1").trim(),
    llmModel: (body.llm_model || "deepseek/deepseek-chat").trim(),
    imageProvider: body.image_provider || "openrouter",
    imageApiKey: (body.image_api_key !== undefined ? body.image_api_key : "").trim(),
    imageApiBase: (body.image_api_base || "https://openrouter.ai/api/v1").trim(),
    imageModel: (body.image_model || "openai/gpt-image-2").trim(),
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(systemSettings)
    .values({ id: "default", ...updateData })
    .onConflictDoUpdate({
      target: systemSettings.id,
      set: updateData,
    });

  return c.json({ status: "success", settings: updateData });
};

router.post("/providers", handleUpdateProviders);
router.put("/providers", handleUpdateProviders);

// POST /api/settings/test-llm (Real-time LLM Model Probe - 100% Server-Side via Cloudflare Worker)
router.post("/test-llm", async (c) => {
  const db = getDb(c.env.DB);
  const body = (await c.req.json().catch(() => ({}))) || {};

  let setting = await db.select().from(systemSettings).where(eq(systemSettings.id, "default")).get();

  const apiKey = (body.api_key || setting?.llmApiKey || "").trim();
  const apiBase = (body.api_base || setting?.llmApiBase || c.env.DEFAULT_LLM_API_BASE || "https://openrouter.ai/api/v1").trim();
  const model = (body.model || setting?.llmModel || c.env.DEFAULT_LLM_MODEL || "deepseek/deepseek-chat").trim();

  if (!apiKey) {
    return c.json({ ok: false, error: "服务端与请求中均未配置 LLM API Key，请先输入或保存设置" }, 400);
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
      return c.json({ ok: true, latency_ms: latency, model, reply, executed_by: "cloudflare_worker" });
    } else {
      const errText = await resp.text();
      return c.json({ ok: false, status: resp.status, error: `HTTP ${resp.status}: ${errText}`, executed_by: "cloudflare_worker" }, 400);
    }
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message || "服务端请求超时或网络异常", executed_by: "cloudflare_worker" }, 500);
  }
});

// POST /api/settings/test-image (Real-time Image Model Probe - 100% Server-Side via Cloudflare Worker)
router.post("/test-image", async (c) => {
  const db = getDb(c.env.DB);
  const body = (await c.req.json().catch(() => ({}))) || {};

  let setting = await db.select().from(systemSettings).where(eq(systemSettings.id, "default")).get();

  const apiKey = (body.api_key || setting?.imageApiKey || setting?.llmApiKey || "").trim();
  const apiBase = (body.api_base || setting?.imageApiBase || "https://openrouter.ai/api/v1").trim();
  const model = (body.model || setting?.imageModel || c.env.DEFAULT_IMAGE_MODEL || "openai/gpt-image-2").trim();

  if (!apiKey) {
    return c.json({ ok: false, error: "服务端与请求中均未配置生图 API Key，请先输入或保存设置" }, 400);
  }

  const start = Date.now();
  const isOpenRouter = apiBase.includes("openrouter.ai");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let resp: Response;
    if (isOpenRouter) {
      // Primary: OpenRouter Dedicated /images endpoint
      resp = await fetch(`${apiBase.replace(/\/+$/, "")}/images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://storyboarding.caifu.social",
          "X-Title": "AI StoryBoarding Diagnostics",
        },
        body: JSON.stringify({
          model: model,
          prompt: "2d monochrome graphite film storyboard illustration, 16:9 widescreen, cinematic draft line art",
          aspect_ratio: "16:9",
          quality: "high",
          background: "auto",
        }),
        signal: controller.signal,
      });
    } else {
      // OpenAI Compatible /images/generations endpoint
      resp = await fetch(`${apiBase.replace(/\/+$/, "")}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          prompt: "2d monochrome graphite film storyboard illustration, 16:9 widescreen",
          n: 1,
          size: "512x512",
        }),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (resp.ok) {
      return c.json({ ok: true, latency_ms: latency, model, executed_by: "cloudflare_worker" });
    } else {
      const errText = await resp.text();
      return c.json({ ok: false, status: resp.status, error: `HTTP ${resp.status}: ${errText}`, executed_by: "cloudflare_worker" }, 400);
    }
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message || "服务端生图测试超时或网络异常", executed_by: "cloudflare_worker" }, 500);
  }
});

export default router;
