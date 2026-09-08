import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import {
  projects, sequences, shots, generationJobs, takes,
  dialogueLines, editVersions, assetVersions,
} from "../db/schema";
import { getAuthUser } from "../lib/auth";
import { saveImageToR2 } from "../lib/storage";

const router = new Hono<{ Bindings: Bindings }>();

// Helper: get project ID from shot
async function getProjectIdFromShot(db: any, shotId: string): Promise<string> {
  const shot = await db.select().from(shots).where(eq(shots.id, shotId)).get();
  if (!shot) return "";
  const seq = await db.select().from(sequences).where(eq(sequences.id, shot.sequenceId)).get();
  return seq?.projectId || "";
}

// ============================================================
// Production Kanban: status overview for all shots in a project
// ============================================================
router.get("/kanban", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const projectId = c.req.query("project_id");
    if (!projectId) return c.json({ detail: "project_id required" }, 400);

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    // Get all sequences for project
    const seqs = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).all();
    const seqIds = seqs.map((s: any) => s.id);

    if (seqIds.length === 0) {
      return c.json({ project_id: projectId, shots: [], status_counts: {} });
    }

    // Get all shots
    const allShots = await db.select().from(shots)
      .where(sql`${shots.sequenceId} in (${sql.join(seqIds.map(() => sql`${""}`), sql`,`)})`)
      .all();
    // Simpler: fetch all and filter
    const projectShots = allShots.filter((s: any) => seqIds.includes(s.sequenceId));

    // Get takes count per shot
    const shotIds = projectShots.map((s: any) => s.id);
    const allTakes = shotIds.length > 0
      ? await db.select().from(takes).all()
      : [];
    const projectTakes = allTakes.filter((t: any) => shotIds.includes(t.shotId));

    // Get jobs count per shot
    const allJobs = shotIds.length > 0
      ? await db.select().from(generationJobs).all()
      : [];
    const projectJobs = allJobs.filter((j: any) => shotIds.includes(j.shotId));

    // Build kanban items
    const items = projectShots.map((shot: any) => {
      const shotTakes = projectTakes.filter((t: any) => t.shotId === shot.id);
      const shotJobs = projectJobs.filter((j: any) => j.shotId === shot.id);
      const adoptedTake = shotTakes.find((t: any) => t.isAdopted);
      const pendingTakes = shotTakes.filter((t: any) => t.reviewStatus === "pending");
      const failedJobs = shotJobs.filter((j: any) => j.status === "failed");

      // Determine kanban status
      let status = "待生成";
      if (failedJobs.length > 0 && !adoptedTake) status = "失败";
      else if (shotJobs.some((j: any) => j.status === "processing" || j.status === "submitted")) status = "生成中";
      else if (pendingTakes.length > 0 && !adoptedTake) status = "待审";
      else if (shotTakes.some((t: any) => t.reviewStatus === "rejected") && !adoptedTake) status = "退回";
      else if (adoptedTake) status = "已采用";

      return {
        shot_id: shot.id,
        order: shot.order,
        shot_size: shot.shotSize,
        duration: shot.duration,
        action: shot.action,
        dialogue: shot.dialogue,
        status,
        has_image: !!shot.storyboardImageUrl,
        takes_count: shotTakes.length,
        pending_takes: pendingTakes.length,
        adopted_take_id: adoptedTake?.id || null,
        latest_failure: failedJobs.length > 0 ? failedJobs[failedJobs.length - 1].failureReason : "",
      };
    });

    // Status counts
    const statusCounts: Record<string, number> = {};
    items.forEach((item: any) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });

    return c.json({
      project_id: projectId,
      total_shots: items.length,
      status_counts: statusCounts,
      shots: items.sort((a: any, b: any) => a.order - b.order),
    });
  } catch (err: any) {
    console.error("[Kanban Error]:", err);
    return c.json({ detail: `看板加载失败: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// Takes: list, adopt, reject
// ============================================================
router.get("/takes", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const shotId = c.req.query("shot_id");
    const projectId = c.req.query("project_id");

    if (!shotId && !projectId) return c.json({ detail: "shot_id or project_id required" }, 400);

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    let results;
    if (shotId) {
      results = await db.select().from(takes).where(eq(takes.shotId, shotId)).orderBy(desc(takes.createdAt)).all();
    } else {
      results = await db.select().from(takes).where(eq(takes.projectId, projectId!)).orderBy(desc(takes.createdAt)).all();
    }

    return c.json({ takes: results });
  } catch (err: any) {
    console.error("[Takes List Error]:", err);
    return c.json({ detail: `候选列表加载失败: ${err?.message || err}` }, 500);
  }
});

// Adopt a take
router.post("/takes/:id/adopt", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const takeId = c.req.param("id");

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    const take = await db.select().from(takes).where(eq(takes.id, takeId)).get();
    if (!take) return c.json({ detail: "候选不存在" }, 404);

    // Un-adopt all other takes for this shot
    await db.update(takes).set({ isAdopted: false, adoptedAt: null }).where(eq(takes.shotId, take.shotId));

    // Adopt this take
    await db.update(takes).set({
      isAdopted: true,
      reviewStatus: "approved",
      adoptedAt: new Date().toISOString(),
    }).where(eq(takes.id, takeId));

    // If it's an image take, update the shot's storyboard image
    if (take.takeType === "image" && take.mediaUrl) {
      await db.update(shots).set({
        storyboardImageUrl: take.mediaUrl,
        isDirty: false,
        updatedAt: new Date().toISOString(),
      }).where(eq(shots.id, take.shotId));
    }

    return c.json({ status: "success", take_id: takeId, adopted: true });
  } catch (err: any) {
    console.error("[Adopt Error]:", err);
    return c.json({ detail: `采用失败: ${err?.message || err}` }, 500);
  }
});

// Reject a take
router.post("/takes/:id/reject", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const takeId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const reason = body.reason || "";

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    const take = await db.select().from(takes).where(eq(takes.id, takeId)).get();
    if (!take) return c.json({ detail: "候选不存在" }, 404);

    await db.update(takes).set({
      reviewStatus: "rejected",
      rejectionReason: reason,
      isAdopted: false,
      adoptedAt: null,
    }).where(eq(takes.id, takeId));

    return c.json({ status: "success", take_id: takeId, rejected: true, reason });
  } catch (err: any) {
    console.error("[Reject Error]:", err);
    return c.json({ detail: `退回失败: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// External media upload (video/audio)
// ============================================================
router.post("/takes/upload", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    const formData = await c.req.formData();
    const shotId = formData.get("shot_id") as string;
    const takeType = (formData.get("take_type") as string) || "video";
    const file = formData.get("file") as File;

    if (!shotId) return c.json({ detail: "shot_id required" }, 400);
    if (!file) return c.json({ detail: "file required" }, 400);

    const projectId = await getProjectIdFromShot(db, shotId);
    if (!projectId) return c.json({ detail: "Shot not found" }, 404);

    // Upload to R2
    const ext = file.name.split(".").pop() || "mp4";
    const r2Key = `takes/${shotId}/${crypto.randomUUID()}.${ext}`;
    let mediaUrl = "";

    if (c.env.STORAGE) {
      await c.env.STORAGE.put(r2Key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      // Use R2 public URL via /api/assets/ endpoint
      mediaUrl = `/api/assets/${r2Key}`;
    }

    const takeId = crypto.randomUUID();
    await db.insert(takes).values({
      id: takeId,
      projectId,
      shotId,
      jobId: null,
      takeType,
      source: "external_upload",
      mediaUrl,
      duration: 0,
      reviewStatus: "pending",
      isAdopted: false,
      metadata: JSON.stringify({ filename: file.name, size: file.size, type: file.type }),
    });

    return c.json({
      status: "success",
      take_id: takeId,
      media_url: mediaUrl,
      take_type: takeType,
      source: "external_upload",
    });
  } catch (err: any) {
    console.error("[Upload Error]:", err);
    return c.json({ detail: `上传失败: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// Generation Jobs: list and status
// ============================================================
router.get("/jobs", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const projectId = c.req.query("project_id");
    const shotId = c.req.query("shot_id");
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    let jobs;
    if (shotId) {
      jobs = await db.select().from(generationJobs).where(eq(generationJobs.shotId, shotId))
        .orderBy(desc(generationJobs.createdAt)).limit(limit).all();
    } else if (projectId) {
      jobs = await db.select().from(generationJobs).where(eq(generationJobs.projectId, projectId!))
        .orderBy(desc(generationJobs.createdAt)).limit(limit).all();
    } else {
      return c.json({ detail: "project_id or shot_id required" }, 400);
    }

    return c.json({ jobs, count: jobs.length });
  } catch (err: any) {
    console.error("[Jobs List Error]:", err);
    return c.json({ detail: `任务列表加载失败: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// Dialogue Lines: list, create/update with actual duration
// ============================================================
router.get("/dialogue", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const projectId = c.req.query("project_id");
    const shotId = c.req.query("shot_id");

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    let lines;
    if (shotId) {
      lines = await db.select().from(dialogueLines).where(eq(dialogueLines.shotId, shotId))
        .orderBy(dialogueLines.orderIndex).all();
    } else if (projectId) {
      lines = await db.select().from(dialogueLines).where(eq(dialogueLines.projectId, projectId!))
        .orderBy(dialogueLines.orderIndex).all();
    } else {
      return c.json({ detail: "project_id or shot_id required" }, 400);
    }

    return c.json({ dialogue_lines: lines });
  } catch (err: any) {
    console.error("[Dialogue List Error]:", err);
    return c.json({ detail: `台词列表加载失败: ${err?.message || err}` }, 500);
  }
});

// Create or update a dialogue line
router.post("/dialogue", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const body = await c.req.json();

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    const { id, project_id, shot_id, sequence_id, speaker, text, performance, emotion,
      audio_version, audio_url, actual_duration, planned_duration, is_voiceover, order_index } = body;

    if (!project_id) return c.json({ detail: "project_id required" }, 400);

    if (id) {
      // Update existing
      const updateData: any = { updatedAt: new Date().toISOString() };
      if (speaker !== undefined) updateData.speaker = speaker;
      if (text !== undefined) updateData.text = text;
      if (performance !== undefined) updateData.performance = performance;
      if (emotion !== undefined) updateData.emotion = emotion;
      if (audio_version !== undefined) updateData.audioVersion = audio_version;
      if (audio_url !== undefined) updateData.audioUrl = audio_url;
      if (actual_duration !== undefined) updateData.actualDuration = actual_duration;
      if (planned_duration !== undefined) updateData.plannedDuration = planned_duration;
      if (is_voiceover !== undefined) updateData.isVoiceover = is_voiceover;
      if (order_index !== undefined) updateData.orderIndex = order_index;

      await db.update(dialogueLines).set(updateData).where(eq(dialogueLines.id, id));
      return c.json({ status: "success", dialogue_id: id, action: "updated" });
    } else {
      // Create new
      const lineId = crypto.randomUUID();
      await db.insert(dialogueLines).values({
        id: lineId,
        projectId: project_id,
        shotId: shot_id || null,
        sequenceId: sequence_id || null,
        speaker: speaker || "",
        text: text || "",
        performance: performance || "",
        emotion: emotion || "",
        audioVersion: audio_version || "",
        audioUrl: audio_url || "",
        actualDuration: actual_duration || 0,
        plannedDuration: planned_duration || 0,
        isVoiceover: is_voiceover || false,
        orderIndex: order_index || 0,
      });
      return c.json({ status: "success", dialogue_id: lineId, action: "created" });
    }
  } catch (err: any) {
    console.error("[Dialogue Save Error]:", err);
    return c.json({ detail: `台词保存失败: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// Edit Versions
// ============================================================
router.get("/edit-versions", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const projectId = c.req.query("project_id");

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    const versions = await db.select().from(editVersions)
      .where(eq(editVersions.projectId, projectId!))
      .orderBy(desc(editVersions.createdAt)).all();

    return c.json({ edit_versions: versions });
  } catch (err: any) {
    console.error("[EditVersions Error]:", err);
    return c.json({ detail: `剪辑版本加载失败: ${err?.message || err}` }, 500);
  }
});

router.post("/edit-versions", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const body = await c.req.json();

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    const { project_id, sequence_id, version_tag, version_name, assembly_data,
      subtitle_data, total_duration, is_current } = body;

    if (!project_id || !version_tag) return c.json({ detail: "project_id and version_tag required" }, 400);

    // If marking as current, un-mark others
    if (is_current) {
      await db.update(editVersions).set({ isCurrent: false }).where(eq(editVersions.projectId, project_id));
    }

    const versionId = crypto.randomUUID();
    await db.insert(editVersions).values({
      id: versionId,
      projectId: project_id,
      sequenceId: sequence_id || null,
      versionTag: version_tag,
      versionName: version_name || "",
      assemblyData: JSON.stringify(assembly_data || {}),
      subtitleData: JSON.stringify(subtitle_data || []),
      isCurrent: is_current || false,
      totalDuration: total_duration || 0,
    });

    return c.json({ status: "success", edit_version_id: versionId });
  } catch (err: any) {
    console.error("[EditVersion Create Error]:", err);
    return c.json({ detail: `剪辑版本保存失败: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// Cost Summary & Production Ledger
// ============================================================
router.get("/costs", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const projectId = c.req.query("project_id");

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    const jobs = await db.select().from(generationJobs).where(eq(generationJobs.projectId, projectId!)).all();

    // Aggregate costs by currency
    const costsByCurrency: Record<string, { total: number; count: number; succeeded: number; failed: number; cancelled: number }> = {};
    let hasUnknownCost = false;

    for (const job of jobs) {
      const currency = job.costCurrency || "unknown";
      if (currency === "unknown" || !job.costCurrency) hasUnknownCost = true;
      if (!costsByCurrency[currency]) {
        costsByCurrency[currency] = { total: 0, count: 0, succeeded: 0, failed: 0, cancelled: 0 };
      }
      costsByCurrency[currency].total += job.costAmount || 0;
      costsByCurrency[currency].count++;
      if (job.status === "succeeded") costsByCurrency[currency].succeeded++;
      if (job.status === "failed") costsByCurrency[currency].failed++;
      if (job.status === "cancelled") costsByCurrency[currency].cancelled++;
    }

    // Takes stats
    const allTakes = await db.select().from(takes).where(eq(takes.projectId, projectId!)).all();
    const reviewedTakes = allTakes.filter((t: any) => t.reviewStatus !== "pending");
    const approvedTakes = allTakes.filter((t: any) => t.reviewStatus === "approved" || t.isAdopted);

    return c.json({
      project_id: projectId,
      total_jobs: jobs.length,
      total_takes: allTakes.length,
      reviewed_takes: reviewedTakes.length,
      approved_takes: approvedTakes.length,
      pending_review: allTakes.length - reviewedTakes.length,
      adoption_rate: reviewedTakes.length > 0 ? approvedTakes.length / reviewedTakes.length : 0,
      costs_by_currency: costsByCurrency,
      has_unknown_cost: hasUnknownCost,
      cost_complete: !hasUnknownCost && jobs.every((j: any) => j.costCurrency && j.costAmount !== null),
      jobs: jobs.map((j: any) => ({
        id: j.id,
        shot_id: j.shotId,
        job_type: j.jobType,
        provider: j.provider,
        model: j.model,
        status: j.status,
        cost_amount: j.costAmount,
        cost_currency: j.costCurrency,
        failure_reason: j.failureReason,
        created_at: j.createdAt,
        completed_at: j.completedAt,
      })),
    });
  } catch (err: any) {
    console.error("[Costs Error]:", err);
    return c.json({ detail: `成本统计失败: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// Asset Versions
// ============================================================
router.get("/asset-versions", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const projectId = c.req.query("project_id");
    const assetType = c.req.query("asset_type");

    const authUser = await getAuthUser(c.req.header("Authorization"));
    if (!authUser) return c.json({ detail: "请先登录" }, 401);

    let query = db.select().from(assetVersions).where(eq(assetVersions.projectId, projectId!));
    if (assetType) {
      query = db.select().from(assetVersions).where(and(eq(assetVersions.projectId, projectId!), eq(assetVersions.assetType, assetType)));
    }
    const versions = await query.orderBy(desc(assetVersions.createdAt)).all();

    return c.json({ asset_versions: versions });
  } catch (err: any) {
    console.error("[AssetVersions Error]:", err);
    return c.json({ detail: `资产版本加载失败: ${err?.message || err}` }, 500);
  }
});

export default router;
