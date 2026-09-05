import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { locations } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { saveImageToR2 } from "../lib/storage";

const router = new Hono<{ Bindings: Bindings }>();

// POST /api/locations/:id/generate-concept (AI 一键生成场景空间概念图并存盘 R2)
router.post("/:id/generate-concept", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录导演账号" }, 401);
    }

    const loc = await db.select().from(locations).where(eq(locations.id, id)).get();
    if (!loc) {
      return c.json({ detail: "场景不存在" }, 404);
    }

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.hasKey) {
      return c.json({ detail: "请先在设置中配置 OpenRouter API Key" }, 400);
    }

    const envLabel = loc.environmentType === "interior" ? "interior architectural space" : "exterior landscape environment";
    const lightingDesc = loc.activeLightingState ? `${loc.activeLightingState} lighting atmospheric mood` : (loc.lightingStyle || "natural cinematic light");
    const variantDesc = loc.isVariant && loc.reuseStrategy ? `, scene variant based on master environment: ${loc.reuseStrategy}` : "";
    const prompt = `${loc.name}, ${envLabel}, ${loc.visualAnchor || "cinematic scene establishment"}${variantDesc}, lighting: ${lightingDesc}, wide angle cinematic environment concept art, empty scene without people, highly detailed, photorealistic 8k uhd`;

    const apiKey = settings.llmApiKey;
    const apiBase = settings.llmApiBase || "https://openrouter.ai/api/v1";
    const model = settings.imageModel || "google/gemini-2.5-flash-image";

    let rawImageUrl = "";
    try {
      const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size: "1024x576",
          aspect_ratio: "16:9",
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as any;
        rawImageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || "";
      }
    } catch (e) {
      console.warn("Location concept generation error:", e);
    }

    if (!rawImageUrl) {
      return c.json({ detail: "生成场景概念图失败，请检查图像配置" }, 502);
    }

    // Persist to Cloudflare R2 via unified storage utility
    const r2Key = `locations/${id}/concept_${Date.now()}.jpg`;
    const r2Url = await saveImageToR2(rawImageUrl, r2Key, c.env.STORAGE);
    const finalUrl = r2Url || rawImageUrl;

    const [updated] = await db
      .update(locations)
      .set({ referenceImageUrl: finalUrl, updatedAt: new Date().toISOString() })
      .where(eq(locations.id, id))
      .returning();

    return c.json({
      success: true,
      location: {
        id: updated.id,
        name: updated.name,
        reference_image_url: updated.referenceImageUrl,
      },
    });
  } catch (err: any) {
    return c.json({ detail: `生成场景基准图异常: ${err?.message || err}` }, 500);
  }
});

export default router;
