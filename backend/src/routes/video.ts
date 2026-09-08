import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { shots, sequences, projects, generationJobs, takes } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { saveMediaToR2 } from "../lib/storage";

const router = new Hono<{ Bindings: Bindings }>();

// MiniMax H3 pricing (China region, api.minimax.cn)
// Source: https://platform.minimaxi.com/docs/guides/pricing-paygo
const MINIMAX_PRICING: Record<string, Record<string, number>> = {
  "MiniMax-H3": { "768P": 0.50, "2K": 0.80 },
  "MiniMax-H3-Max": { "480P": 0.30, "768P": 0.50 },
};

/** Calculate video generation cost based on model, resolution, duration. */
function calculateVideoCost(model: string, resolution: string, duration: number): { amount: number; currency: string; unit: string } {
  const perSecond = MINIMAX_PRICING[model]?.[resolution] ?? 0.50;
  const amount = Math.round(perSecond * duration * 100) / 100;
  return { amount, currency: "CNY", unit: "seconds" };
}

async function loadOwnedShotContext(db: any, shotId: string, userId: string) {
  const shot = await db.select().from(shots).where(eq(shots.id, shotId)).get();
  if (!shot) return { error: "镜头不存在", status: 404 as const };
  const sequence = await db.select().from(sequences).where(eq(sequences.id, shot.sequenceId)).get();
  const project = sequence
    ? await db.select().from(projects).where(eq(projects.id, sequence.projectId)).get()
    : null;
  if (!project || project.userId !== userId) return { error: "无权访问该镜头", status: 403 as const };
  return { shot, sequence, project };
}

// ============================================================
// POST /api/generate/video/{shotId}
// Submit a video generation task to the configured video provider
// ============================================================
router.post("/video/:shotId", async (c) => {
  const shotId = c.req.param("shotId");
  const authUser = await getAuthUser(c.req.header("Authorization"));
  if (!authUser) return c.json({ detail: "请先登录" }, 401);

  await ensureSchema(c.env.DB);
  const db = getDb(c.env.DB);

  try {
    // Load shot and its video prompt
    const context = await loadOwnedShotContext(db, shotId, authUser.userId);
    if ("error" in context) return c.json({ detail: context.error }, context.status);
    const { shot, project } = context;
    const projectId = project.id;

    // Do not create a second billable provider task while one is active.
    const existingJobs = await db.select().from(generationJobs)
      .where(eq(generationJobs.shotId, shotId))
      .orderBy(desc(generationJobs.createdAt))
      .all();
    const activeJob = existingJobs.find((job: any) =>
      job.jobType === "video" && (job.status === "submitted" || job.status === "processing")
    );
    if (activeJob) {
      return c.json({
        status: "existing",
        job_id: activeJob.id,
        external_task_id: activeJob.externalTaskId,
        shot_id: shotId,
        message: "该镜头已有进行中的视频任务，请先刷新任务状态",
      });
    }

    // Get user video provider settings
    const userSettings = await getUserSettings(db, authUser.userId);
    if (!userSettings.videoApiKey) {
      return c.json({
        detail: "未配置视频生成 API Key。请在设置中配置 MiniMax 视频模型密钥。",
        error_code: "NO_VIDEO_KEY",
      }, 400);
    }

    // Build video prompt
    const videoPrompt = (shot as any).videoPrompt || shot.action || shot.dialogue || "";
    if (!videoPrompt.trim()) {
      return c.json({ detail: "该镜头缺少视频提示词或动作描述" }, 400);
    }

    // Determine aspect ratio from project
    const aspectRatio = project.aspectRatio === "16:9" ? "16:9" : "9:16";
    const videoDuration = Math.min(Math.max(Math.round(shot.duration || 5), 4), 15); // H3: 4-15s

    // Create GenerationJob record
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(generationJobs).values({
      id: jobId,
      projectId: projectId || "",
      shotId,
      jobType: "video",
      provider: userSettings.videoProvider || "minimax",
      model: userSettings.videoModel || "video-01-h3",
      inputRevision: videoPrompt.substring(0, 500),
      referenceAssetVersion: "",
      parameters: JSON.stringify({ aspect_ratio: aspectRatio, duration: videoDuration, fps: 24 }),
      externalTaskId: "",
      status: "submitted",
      failureReason: "",
      resultUrl: "",
      resultMetadata: "{}",
      costAmount: 0,
      costCurrency: "",
      costUnit: "",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Submit to MiniMax H3 v2 API
    // API: POST {base}/video_generation with content array format
    const apiBase = userSettings.videoApiBase.replace(/\/+$/, "");
    const reqBody: any = {
      model: userSettings.videoModel || "MiniMax-H3",
      content: [
        { type: "text", text: videoPrompt },
      ],
      resolution: "768P", // MiniMax-H3 supports 768P / 2K
      duration: videoDuration,
      ratio: aspectRatio, // 9:16 or 16:9
    };
    const submitResp = await fetch(`${apiBase}/video_generation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSettings.videoApiKey}`,
      },
      body: JSON.stringify(reqBody),
    });

    const submitData: any = await submitResp.json().catch(() => ({}));

    if (!submitResp.ok) {
      const errorMsg = submitData?.error?.message || submitData?.message || submitData?.base_resp?.status_msg || `HTTP ${submitResp.status}`;
      await db.update(generationJobs).set({
        status: "failed",
        failureReason: `提交失败: ${errorMsg}`,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(generationJobs.id, jobId));
      return c.json({
        detail: `视频生成提交失败: ${errorMsg}`,
        job_id: jobId,
        status: "failed",
      }, 502);
    }

    // MiniMax v2 returns { task_id: "..." }
    const externalTaskId = submitData?.task_id || "";
    if (!externalTaskId) {
      const respBody = JSON.stringify(submitData).substring(0, 500);
      await db.update(generationJobs).set({
        status: "failed",
        failureReason: `供应商未返回 task_id, 响应: ${respBody}`,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(generationJobs.id, jobId));
      return c.json({ detail: `供应商未返回任务ID, 响应: ${respBody}`, job_id: jobId, status: "failed" }, 502);
    }

    // Update job with external task ID
    await db.update(generationJobs).set({
      externalTaskId,
      status: "processing",
      updatedAt: new Date().toISOString(),
    }).where(eq(generationJobs.id, jobId));

    return c.json({
      status: "submitted",
      job_id: jobId,
      external_task_id: externalTaskId,
      shot_id: shotId,
      message: "视频生成任务已提交，使用轮询接口查询结果",
    });
  } catch (err: any) {
    console.error("[Video Submit Error]:", err);
    return c.json({ detail: `视频生成提交异常: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// POST /api/generate/poll
// Poll a video generation task status; create Take when complete
// ============================================================
router.post("/poll", async (c) => {
  const authUser = await getAuthUser(c.req.header("Authorization"));
  if (!authUser) return c.json({ detail: "请先登录" }, 401);

  await ensureSchema(c.env.DB);
  const db = getDb(c.env.DB);

  try {
    const body = await c.req.json().catch(() => ({}));
    const jobId = body.job_id;
    if (!jobId) return c.json({ detail: "job_id required" }, 400);

    const job = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).get();
    if (!job) return c.json({ detail: "任务不存在" }, 404);

    const jobProject = await db.select().from(projects).where(eq(projects.id, job.projectId)).get();
    if (!jobProject || jobProject.userId !== authUser.userId) {
      return c.json({ detail: "无权访问该任务" }, 403);
    }

    // If already completed, return current state
    if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") {
      let metadata: any = {};
      try { metadata = JSON.parse(job.resultMetadata || "{}"); } catch { /* ignore legacy metadata */ }
      return c.json({
        job_id: jobId,
        status: job.status,
        failure_reason: job.failureReason,
        video_url: job.resultUrl,
        take_id: metadata.take_id,
      });
    }

    if (!job.externalTaskId) {
      return c.json({ job_id: jobId, status: job.status, message: "任务尚未提交到供应商" });
    }

    // Get user settings for API key
    const userSettings = await getUserSettings(db, authUser.userId);
    const apiBase = userSettings.videoApiBase.replace(/\/+$/, "");

    // Poll MiniMax v2 task status: GET {base}/query/video_generation/{task_id}
    const pollResp = await fetch(
      `${apiBase}/query/video_generation/${encodeURIComponent(job.externalTaskId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${userSettings.videoApiKey}` },
      }
    );

    const pollData: any = await pollResp.json().catch(() => ({}));

    if (!pollResp.ok) {
      const errMsg = pollData?.error?.message || pollData?.message || `HTTP ${pollResp.status}`;
      return c.json({
        job_id: jobId,
        status: job.status,
        message: `轮询失败: ${errMsg}`,
      });
    }

    // MiniMax v2 response: { task: { id, status, content: { url }, ... } }
    const task = pollData?.task || {};
    const taskStatus = task?.status || "";
    const videoUrl = task?.content?.url || "";
    const errorMsg = task?.error || pollData?.error?.message || "";

    // Map MiniMax v2 status to our status: queued, running, succeeded, failed, cancelled
    let newStatus = job.status;
    if (taskStatus === "succeeded") {
      newStatus = "succeeded";
    } else if (taskStatus === "failed") {
      newStatus = "failed";
    } else if (taskStatus === "cancelled") {
      newStatus = "cancelled";
    } else if (taskStatus === "queued" || taskStatus === "running") {
      newStatus = "processing";
    }

    // Update job status
    const updateData: any = { status: newStatus, updatedAt: new Date().toISOString() };

    if (newStatus === "succeeded" && videoUrl) {
      updateData.completedAt = new Date().toISOString();

      // Persist video to our own R2 (MiniMax URLs are signed & expire)
      const takeId = crypto.randomUUID();
      const r2Key = `takes/${job.shotId || "orphan"}/${takeId}.mp4`;
      const r2Url = await saveMediaToR2(videoUrl, r2Key, c.env.STORAGE, 120000, "video/*,*/*");
      const finalUrl = r2Url || videoUrl;
      if (!r2Url) {
        console.warn(`[Video Poll] R2 persist failed, keeping upstream URL for job ${jobId}`);
      }
      updateData.resultUrl = finalUrl;

      // Calculate and record cost (P0-6)
      const cost = calculateVideoCost(
        task?.model || job.model || "MiniMax-H3",
        task?.resolution || "768P",
        task?.duration || 0
      );
      updateData.costAmount = cost.amount;
      updateData.costCurrency = cost.currency;
      updateData.costUnit = cost.unit;

      // Create a Take record for the generated video
      await db.insert(takes).values({
        id: takeId,
        projectId: job.projectId || "",
        shotId: job.shotId || "",
        jobId: job.id,
        takeType: "video",
        source: "ai_generated",
        mediaUrl: finalUrl,
        duration: task?.duration || 0,
        reviewStatus: "pending",
        isAdopted: false,
        metadata: JSON.stringify({
          external_task_id: job.externalTaskId,
          model: task?.model || job.model,
          resolution: task?.resolution,
          ratio: task?.ratio,
          upstream_url: r2Url ? videoUrl : undefined,
          r2_persisted: Boolean(r2Url),
        }),
      });

      updateData.resultMetadata = JSON.stringify({ take_id: takeId });
    } else if (newStatus === "failed") {
      updateData.completedAt = new Date().toISOString();
      updateData.failureReason = errorMsg || "供应商返回失败状态";
    }

    await db.update(generationJobs).set(updateData).where(eq(generationJobs.id, jobId));

    return c.json({
      job_id: jobId,
      status: newStatus,
      external_status: taskStatus,
      video_url: newStatus === "succeeded" ? (updateData.resultUrl || videoUrl || "") : (videoUrl || ""),
      failure_reason: newStatus === "failed" ? (errorMsg || job.failureReason) : "",
      take_id: newStatus === "succeeded" ? JSON.parse(updateData.resultMetadata || "{}").take_id : undefined,
    });
  } catch (err: any) {
    console.error("[Video Poll Error]:", err);
    return c.json({ detail: `轮询异常: ${err?.message || err}` }, 500);
  }
});

// ============================================================
// GET /api/generate/video/jobs?shot_id=xxx
// List video generation jobs for a shot
// ============================================================
router.get("/video/jobs", async (c) => {
  const authUser = await getAuthUser(c.req.header("Authorization"));
  if (!authUser) return c.json({ detail: "请先登录" }, 401);

  await ensureSchema(c.env.DB);
  const db = getDb(c.env.DB);

  const shotId = c.req.query("shot_id");
  if (!shotId) return c.json({ detail: "shot_id required" }, 400);

  const context = await loadOwnedShotContext(db, shotId, authUser.userId);
  if ("error" in context) return c.json({ detail: context.error }, context.status);

  const jobs = await db.select().from(generationJobs)
    .where(eq(generationJobs.shotId, shotId))
    .orderBy(desc(generationJobs.createdAt))
    .all();

  const videoJobs = jobs.filter((j: any) => j.jobType === "video");
  return c.json({ jobs: videoJobs, count: videoJobs.length });
});

export default router;
