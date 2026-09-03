import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { users } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { encryptUserSecret, maskApiKey } from "../lib/crypto";

const router = new Hono<{ Bindings: Bindings }>();

// GET /api/settings/providers (Strictly User-Owned Settings with Secure Masked Output)
router.get("/providers", async (c) => {
  const db = getDb(c.env.DB);
  const authHeader = c.req.header("Authorization");
  const authUser = await getAuthUser(authHeader);

  const settings = await getUserSettings(db, authUser?.userId);

  return c.json({
    llm_provider: "openrouter",
    has_llm_key: settings.hasKey,
    llm_api_key_masked: maskApiKey(settings.llmApiKey),
    llm_api_key: "", // Plaintext strictly zeroed
    llm_api_base: settings.llmApiBase,
    llm_model: settings.llmModel,
    image_provider: "openrouter",
    has_image_key: Boolean(settings.imageApiKey && settings.imageApiKey.trim()),
    image_api_key_masked: maskApiKey(settings.imageApiKey),
    image_api_key: "", // Plaintext strictly zeroed
    image_api_base: settings.imageApiBase,
    image_model: settings.imageModel,
  });
});

// POST & PUT /api/settings/providers (Update Provider Settings with AES-256-GCM Encryption)
const handleUpdateProviders = async (c: any) => {
  const db = getDb(c.env.DB);
  const authHeader = c.req.header("Authorization");
  const authUser = await getAuthUser(authHeader);

  if (!authUser) {
    return c.json({ detail: "请先登录导演账号后再保存个人设置" }, 401);
  }

  const user = await db.select().from(users).where(eq(users.id, authUser.userId)).get();
  if (!user) {
    return c.json({ detail: "用户不存在或已被注销" }, 404);
  }

  const body = (await c.req.json().catch(() => ({}))) || {};

  let existingUserSettings: any = {};
  if (user.customSettings) {
    try {
      existingUserSettings = JSON.parse(user.customSettings);
    } catch (e) {}
  }

  // Smart Key Preservation & AES-256-GCM Encryption
  let finalEncryptedLlmKey = existingUserSettings.llmApiKey || "";
  if (body.llm_api_key !== undefined && typeof body.llm_api_key === "string") {
    const raw = body.llm_api_key.trim();
    if (raw && !raw.includes("••••")) {
      finalEncryptedLlmKey = await encryptUserSecret(raw, user.salt);
    }
  }

  let finalEncryptedImageKey = existingUserSettings.imageApiKey || "";
  if (body.image_api_key !== undefined && typeof body.image_api_key === "string") {
    const raw = body.image_api_key.trim();
    if (raw && !raw.includes("••••")) {
      finalEncryptedImageKey = await encryptUserSecret(raw, user.salt);
    }
  }

  const updateData = {
    llmProvider: body.llm_provider || existingUserSettings.llmProvider || "openrouter",
    llmApiKey: finalEncryptedLlmKey,
    llmApiBase: (body.llm_api_base || existingUserSettings.llmApiBase || "https://openrouter.ai/api/v1").trim(),
    llmModel: (body.llm_model || existingUserSettings.llmModel || "deepseek/deepseek-chat").trim(),
    imageProvider: body.image_provider || existingUserSettings.imageProvider || "openrouter",
    imageApiKey: finalEncryptedImageKey,
    imageApiBase: (body.image_api_base || existingUserSettings.imageApiBase || "https://openrouter.ai/api/v1").trim(),
    imageModel: (body.image_model || existingUserSettings.imageModel || "bytedance-seed/seedream-5-0-lite").trim(),
    updatedAt: new Date().toISOString(),
  };

  await db
    .update(users)
    .set({
      customSettings: JSON.stringify(updateData),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, authUser.userId));

  return c.json({
    status: "success",
    has_llm_key: Boolean(finalEncryptedLlmKey),
    has_image_key: Boolean(finalEncryptedImageKey),
    settings: {
      ...updateData,
      llmApiKey: maskApiKey(body.llm_api_key || "••••••••"),
      imageApiKey: maskApiKey(body.image_api_key || "••••••••"),
    },
  });
};

router.post("/providers", handleUpdateProviders);
router.put("/providers", handleUpdateProviders);

// POST /api/settings/test-llm (Real-time LLM Model Probe - strictly user-provided or user-saved key)
router.post("/test-llm", async (c) => {
  const db = getDb(c.env.DB);
  const authHeader = c.req.header("Authorization");
  const authUser = await getAuthUser(authHeader);
  const body = (await c.req.json().catch(() => ({}))) || {};

  const userSettings = await getUserSettings(db, authUser?.userId);

  const apiKey = (body.api_key || userSettings.llmApiKey || "").trim();
  const apiBase = (body.api_base || userSettings.llmApiBase || "https://openrouter.ai/api/v1").trim();
  const model = (body.model || userSettings.llmModel || "deepseek/deepseek-chat").trim();

  if (!apiKey) {
    return c.json({ ok: false, error: "未检测到 OpenRouter API Key，请先输入密钥" }, 400);
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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
  } catch (e: any) {
    return c.json({ ok: false, error: `连通探测超时或网络错误: ${e?.message || e}` }, 500);
  }
});

// POST /api/settings/test-image (Real-time Image Generation Probe)
router.post("/test-image", async (c) => {
  const db = getDb(c.env.DB);
  const authHeader = c.req.header("Authorization");
  const authUser = await getAuthUser(authHeader);
  const body = (await c.req.json().catch(() => ({}))) || {};

  const userSettings = await getUserSettings(db, authUser?.userId);

  const apiKey = (body.api_key || userSettings.imageApiKey || userSettings.llmApiKey || "").trim();
  const apiBase = (body.api_base || userSettings.imageApiBase || "https://openrouter.ai/api/v1").trim();
  const model = (body.model || userSettings.imageModel || "bytedance-seed/seedream-5-0-lite").trim();

  if (!apiKey) {
    return c.json({ ok: false, error: "未检测到图像 API Key，请先输入密钥" }, 400);
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
        messages: [{ role: "user", content: "Test image probe ping" }],
        max_tokens: 10,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (resp.ok) {
      return c.json({ ok: true, latency_ms: latency, model, executed_by: "cloudflare_worker" });
    } else {
      const errText = await resp.text();
      return c.json({ ok: false, status: resp.status, error: `HTTP ${resp.status}: ${errText}`, executed_by: "cloudflare_worker" }, 400);
    }
  } catch (e: any) {
    return c.json({ ok: false, error: `生图模型测试超时: ${e?.message || e}` }, 500);
  }
});

export default router;
