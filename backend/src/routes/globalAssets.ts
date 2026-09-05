import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { globalAssets, characters, locations, props } from "../db/schema";
import { getAuthUser } from "../lib/auth";

const router = new Hono<{ Bindings: Bindings }>();

// GET /api/global-assets (List all user-level assets, optionally filter by type)
router.get("/", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录查看全局资产库" }, 401);
    }

    const typeQuery = c.req.query("type"); // 'character' | 'location' | 'prop' | undefined
    let query = db.select().from(globalAssets).where(eq(globalAssets.userId, authUser.userId));
    if (typeQuery) {
      query = db.select().from(globalAssets).where(and(eq(globalAssets.userId, authUser.userId), eq(globalAssets.assetType, typeQuery)));
    }

    const assets = await query.orderBy(desc(globalAssets.createdAt)).all();
    return c.json({
      status: "success",
      total: assets.length,
      assets: assets.map((a) => ({
        id: a.id,
        user_id: a.userId,
        asset_type: a.assetType,
        name: a.name,
        visual_anchor: a.visualAnchor,
        reference_image_url: a.referenceImageUrl,
        metadata: a.metadataJson ? JSON.parse(a.metadataJson) : {},
        created_at: a.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[Get Global Assets Error]:", err);
    return c.json({ detail: `获取全局资产库失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/global-assets/collect (One-click collect character/location/prop from project into global asset library)
router.post("/collect", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录" }, 401);
    }

    const body = await c.req.json();
    const { asset_type, name, visual_anchor, reference_image_url, metadata } = body;
    if (!asset_type || !name) {
      return c.json({ detail: "缺少资产类型或名称" }, 400);
    }

    const id = crypto.randomUUID();
    const [created] = await db
      .insert(globalAssets)
      .values({
        id,
        userId: authUser.userId,
        assetType: asset_type,
        name: name.trim(),
        visualAnchor: (visual_anchor || "").trim(),
        referenceImageUrl: reference_image_url || "",
        metadataJson: JSON.stringify(metadata || {}),
      })
      .returning();

    return c.json({
      status: "success",
      message: `✨ 「${name}」已成功加入全局资产库！`,
      asset: {
        id: created.id,
        asset_type: created.assetType,
        name: created.name,
        visual_anchor: created.visualAnchor,
        reference_image_url: created.referenceImageUrl,
        metadata: JSON.parse(created.metadataJson),
      },
    });
  } catch (err: any) {
    console.error("[Collect Global Asset Error]:", err);
    return c.json({ detail: `入库失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/global-assets/:id/import-to-project (Import global asset into target project)
router.post("/:id/import-to-project", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const assetId = c.req.param("id");
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录" }, 401);
    }

    const body = await c.req.json();
    const targetProjectId = body.project_id;
    if (!targetProjectId) {
      return c.json({ detail: "请指定导入的目标项目 ID" }, 400);
    }

    const globalAsset = await db.select().from(globalAssets).where(eq(globalAssets.id, assetId)).get();
    if (!globalAsset) {
      return c.json({ detail: "全局资产不存在" }, 404);
    }

    const meta = globalAsset.metadataJson ? JSON.parse(globalAsset.metadataJson) : {};
    let importedEntity: any = null;

    if (globalAsset.assetType === "character") {
      const charId = crypto.randomUUID();
      [importedEntity] = await db
        .insert(characters)
        .values({
          id: charId,
          projectId: targetProjectId,
          name: globalAsset.name,
          role: meta.role || "supporting",
          visualAnchor: globalAsset.visualAnchor,
          avatarUrl: globalAsset.referenceImageUrl,
          turnaroundPrompt: meta.turnaround_prompt || "",
          costumeVariants: JSON.stringify(meta.costume_variants || []),
          personality: meta.personality || "",
          voiceDna: meta.voice_dna || "",
        })
        .returning();
    } else if (globalAsset.assetType === "location") {
      const locId = crypto.randomUUID();
      [importedEntity] = await db
        .insert(locations)
        .values({
          id: locId,
          projectId: targetProjectId,
          name: globalAsset.name,
          environmentType: meta.environment_type || "interior",
          visualAnchor: globalAsset.visualAnchor,
          referenceImageUrl: globalAsset.referenceImageUrl,
          lightingStyle: meta.lighting_style || "自然光",
          lightingStates: JSON.stringify(meta.lighting_states || ["自然光"]),
          activeLightingState: meta.active_lighting_state || "自然光",
          isVariant: Boolean(meta.is_variant),
          parentLocationId: meta.parent_location_id || "",
          reuseStrategy: meta.reuse_strategy || "",
        })
        .returning();
    } else if (globalAsset.assetType === "prop") {
      const propId = crypto.randomUUID();
      [importedEntity] = await db
        .insert(props)
        .values({
          id: propId,
          projectId: targetProjectId,
          name: globalAsset.name,
          category: meta.category || "general",
          visualAnchor: globalAsset.visualAnchor,
          referenceImageUrl: globalAsset.referenceImageUrl,
          description: meta.description || "",
        })
        .returning();
    }

    return c.json({
      status: "success",
      message: `✨ 已将「${globalAsset.name}」成功克隆导入至当前项目！`,
      imported_entity: importedEntity,
    });
  } catch (err: any) {
    console.error("[Import Global Asset Error]:", err);
    return c.json({ detail: `导入项目失败: ${err?.message || err}` }, 500);
  }
});

// DELETE /api/global-assets/:id
router.delete("/:id", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const assetId = c.req.param("id");
    const [deleted] = await db.delete(globalAssets).where(eq(globalAssets.id, assetId)).returning();
    if (!deleted) {
      return c.json({ detail: "资产不存在" }, 404);
    }
    return c.json({ status: "success", message: "资产已从全局库中移除" });
  } catch (err: any) {
    return c.json({ detail: `删除失败: ${err?.message || err}` }, 500);
  }
});

export default router;
