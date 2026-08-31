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

export default router;
