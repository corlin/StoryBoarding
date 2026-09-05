import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { props, shots } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { saveImageToR2 } from "../lib/storage";

const router = new Hono<{ Bindings: Bindings }>();

// GET /api/props/project/:projectId (获取项目道具库)
router.get("/project/:projectId", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const projectId = c.req.param("projectId");

    const propList = await db.select().from(props).where(eq(props.projectId, projectId)).all();
    return c.json({
      props: propList.map((p) => ({
        id: p.id,
        project_id: p.projectId,
        name: p.name,
        category: p.category,
        visual_anchor: p.visualAnchor,
        reference_image_url: p.referenceImageUrl,
        description: p.description,
        created_at: p.createdAt,
      })),
    });
  } catch (err: any) {
    return c.json({ detail: `获取道具列表失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/props (新建关键叙事道具)
router.post("/", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const newProp = {
      id,
      projectId: body.project_id,
      name: body.name || "未命名道具",
      category: body.category || "general",
      visualAnchor: body.visual_anchor || "",
      referenceImageUrl: body.reference_image_url || "",
      description: body.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(props).values(newProp);

    return c.json({
      success: true,
      prop: {
        id: newProp.id,
        project_id: newProp.projectId,
        name: newProp.name,
        category: newProp.category,
        visual_anchor: newProp.visualAnchor,
        reference_image_url: newProp.referenceImageUrl,
        description: newProp.description,
      },
    });
  } catch (err: any) {
    return c.json({ detail: `创建道具失败: ${err?.message || err}` }, 500);
  }
});

// PUT /api/props/:id (更新道具)
router.put("/:id", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");
    const body = await c.req.json();

    const updates: any = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.visual_anchor !== undefined) updates.visualAnchor = body.visual_anchor;
    if (body.reference_image_url !== undefined) updates.referenceImageUrl = body.reference_image_url;
    if (body.description !== undefined) updates.description = body.description;

    const [updated] = await db.update(props).set(updates).where(eq(props.id, id)).returning();
    if (!updated) {
      return c.json({ detail: "道具不存在" }, 404);
    }

    return c.json({
      success: true,
      prop: {
        id: updated.id,
        project_id: updated.projectId,
        name: updated.name,
        category: updated.category,
        visual_anchor: updated.visualAnchor,
        reference_image_url: updated.referenceImageUrl,
        description: updated.description,
      },
    });
  } catch (err: any) {
    return c.json({ detail: `更新道具失败: ${err?.message || err}` }, 500);
  }
});

// DELETE /api/props/:id
router.delete("/:id", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");

    await db.delete(props).where(eq(props.id, id));
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ detail: `删除道具失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/props/:id/generate-concept (AI 一键生成纯白底特写道具参考图并存盘 R2)
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

    const prop = await db.select().from(props).where(eq(props.id, id)).get();
    if (!prop) {
      return c.json({ detail: "道具不存在" }, 404);
    }

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.hasKey) {
      return c.json({ detail: "请先在设置中配置 OpenRouter API Key" }, 400);
    }

    // shuohao-skills novel-art prop standards: Scale phrase & no hands
    const scalePhrase = prop.scale === "furniture" ? "furniture scale" : prop.scale === "tabletop" ? "tabletop scale" : "handheld scale";
    
    // Parse 3-5 anchors
    let anchorsText = "";
    try {
      const parsedAnchors = prop.anchorsJson ? JSON.parse(prop.anchorsJson) : [];
      if (Array.isArray(parsedAnchors) && parsedAnchors.length > 0) {
        anchorsText = ", narrative key features: " + parsedAnchors.map((a: any) => `${a.name}: ${a.desc}`).join("; ");
      }
    } catch (_) {}

    // White backdrop studio prop closeup prompt (shuohao-skills hard rule: isolated on pure white background, absolutely no hands, no fingers, no people)
    const prompt = `studio prop reference photography of ${prop.name}, ${scalePhrase}, category: ${prop.category}, ${prop.visualAnchor || prop.description || "cinematic narrative key item"}${anchorsText}, extreme close-up detail shot, isolated on pure white background (#FFFFFF), studio softbox lighting, pristine sharp focus, clean cutout, 8k resolution --no hands, fingers, holding, human figure, people, shadows on background`;

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
          size: "1024x1024",
          aspect_ratio: "1:1",
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as any;
        rawImageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || "";
      }
    } catch (e) {
      console.warn("Prop concept generation error:", e);
    }

    if (!rawImageUrl) {
      return c.json({ detail: "生成道具概念图失败，请检查图像配置" }, 502);
    }

    // Persist to Cloudflare R2
    const r2Key = `props/${id}/concept_${Date.now()}.jpg`;
    const r2Url = await saveImageToR2(rawImageUrl, r2Key, c.env.STORAGE);
    const finalUrl = r2Url || rawImageUrl;

    const [updated] = await db
      .update(props)
      .set({ referenceImageUrl: finalUrl, updatedAt: new Date().toISOString() })
      .where(eq(props.id, id))
      .returning();

    return c.json({
      success: true,
      prop: {
        id: updated.id,
        name: updated.name,
        reference_image_url: updated.referenceImageUrl,
      },
    });
  } catch (err: any) {
    return c.json({ detail: `生成道具概念图异常: ${err?.message || err}` }, 500);
  }
});

export default router;
