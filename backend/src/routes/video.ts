import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { shots, sequences, projects, generationJobs, takes } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { saveMediaToR2 } from "../lib/storage";
import { generatedVideoTakeId, isActiveVideoJob } from "../lib/videoJobState";

const router = new Hono<{ Bindings: Bindings }>();

function normalizeMiniMaxConfig(apiBase: string, model: string) {
  let base = (apiBase || "https://api.minimax.cn/v1").replace(/\/+$/, "");
  if (base.endsWith("/v2")) base = `${base.slice(0, -3)}/v1`;
  const normalizedModel = model === "MiniMax-H3" || model === "MiniMax-H3-Max" || model === "video-01-h3"
    ? "MiniMax-Hailuo-02"
    : (model || "MiniMax-Hailuo-02");
  return { apiBase: base, model: normalizedModel };
}

function normalizeFirstFrameUrl(value: string | null | undefined, requestUrl: string) {
  const imageUrl = (value || "").trim();
  if (!imageUrl) return "";
  if (imageUrl.startsWith("https://") || imageUrl.startsWith("http://") || imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/api/assets/")) {
    return new URL(imageUrl, new URL(requestUrl).origin).toString();
  }
  return "";
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
    const body = await c.req.json().catch(() => ({}));
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
    const activeJob = existingJobs.find(isActiveVideoJob);
    if (activeJob) {
      return c.json({
        status: "existing",
        job_id: activeJob.id,
        external_task_id: activeJob.externalTaskId,
        shot_id: shotId,
        message: "该镜头已有进行中的视频任务，已阻止重复付费提交",
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
    const videoDuration = (shot.duration || 0) > 6 ? 10 : 6;
    const providerConfig = normalizeMiniMaxConfig(userSettings.videoApiBase, userSettings.videoModel);
    const firstFrameImage = normalizeFirstFrameUrl(shot.storyboardImageUrl, c.req.url);
    const firstFrameReference = firstFrameImage.startsWith("data:image/") ? "inline_data_url" : firstFrameImage;
    const generationMode = firstFrameImage ? "image_to_video" : "text_to_video";

    // MiniMax T2V does not accept an aspect-ratio parameter. For vertical projects,
    // require a vertical first frame unless the caller explicitly accepts fallback risk.
    if (aspectRatio === "9:16" && !firstFrameImage && body.allow_landscape_fallback !== true) {
      return c.json({
        detail: "竖屏工程缺少首帧。请先生成或上传 9:16 分镜图，再使用图生视频；如确需文生视频，请明确接受横屏输出风险。",
        error_code: "VERTICAL_FIRST_FRAME_REQUIRED",
        shot_id: shotId,
        project_aspect_ratio: aspectRatio,
      }, 409);
    }

    // Create GenerationJob record
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    const parameters = JSON.stringify({
      requested_aspect_ratio: aspectRatio,
      duration: videoDuration,
      fps: 24,
      generation_mode: generationMode,
      first_frame_image_url: firstFrameReference,
    });
    // D1 serializes writes. Reserve the active slot in one INSERT...SELECT statement so
    // concurrent clicks cannot both pass a separate read-before-write check and bill twice.
    const reservation = await c.env.DB.prepare(`
      INSERT INTO generation_jobs (
        id, project_id, shot_id, job_type, provider, model, input_revision,
        reference_asset_version, parameters, external_task_id, status,
        failure_reason, result_url, result_metadata, cost_amount, cost_currency,
        cost_unit, submitted_at, created_at, updated_at
      )
      SELECT ?, ?, ?, 'video', ?, ?, ?, ?, ?, '', 'submitted', '', '', '{}', 0, '', '', ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM generation_jobs
        WHERE shot_id = ? AND job_type = 'video' AND status IN ('submitted', 'processing')
      )
    `).bind(
      jobId,
      projectId || "",
      shotId,
      userSettings.videoProvider || "minimax",
      providerConfig.model,
      videoPrompt.substring(0, 500),
      firstFrameReference,
      parameters,
      now,
      now,
      now,
      shotId,
    ).run();

    if (!Number((reservation.meta as any)?.changes || 0)) {
      const concurrentJobs = await db.select().from(generationJobs)
        .where(eq(generationJobs.shotId, shotId))
        .orderBy(desc(generationJobs.createdAt))
        .all();
      const concurrentJob = concurrentJobs.find(isActiveVideoJob);
      return c.json({
        status: "existing",
        job_id: concurrentJob?.id || "",
        external_task_id: concurrentJob?.externalTaskId || "",
        shot_id: shotId,
        message: "该镜头已有进行中的视频任务，已阻止重复付费提交",
      });
    }

    // MiniMax China v1 API: POST /video_generation with prompt.
    const reqBody: any = {
      model: providerConfig.model,
      prompt: videoPrompt.substring(0, 2000),
      resolution: "768P",
      duration: videoDuration,
    };
    if (firstFrameImage) reqBody.first_frame_image = firstFrameImage;
    let submitResp: Response;
    try {
      submitResp = await fetch(`${providerConfig.apiBase}/video_generation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userSettings.videoApiKey}`,
        },
        body: JSON.stringify(reqBody),
      });
    } catch (submitError: any) {
      const errorMsg = submitError?.message || String(submitError);
      const failureReason = `供应商连接中断，平台无法确认任务是否已受理：${errorMsg}`;
      await db.update(generationJobs).set({
        status: "failed",
        failureReason,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(generationJobs.id, jobId));
      return c.json({
        detail: `${failureReason}。请先在 MiniMax 任务列表核对，再决定是否重试。`,
        job_id: jobId,
        status: "failed",
      }, 502);
    }

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
      generation_mode: generationMode,
      message: generationMode === "image_to_video"
        ? "图生视频任务已提交，将沿用当前分镜首帧的画幅"
        : "文生视频任务已提交，供应商可能不保持工程画幅",
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
    const providerConfig = normalizeMiniMaxConfig(userSettings.videoApiBase, job.model || userSettings.videoModel);

    // MiniMax v1 task query returns status and file_id.
    const pollResp = await fetch(
      `${providerConfig.apiBase}/query/video_generation?task_id=${encodeURIComponent(job.externalTaskId)}`,
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

    const taskStatus = pollData?.status || "";
    const fileId = pollData?.file_id || "";
    const errorMsg = pollData?.error_message || pollData?.base_resp?.status_msg || pollData?.error?.message || "";
    let videoUrl = "";

    // Map MiniMax v2 status to our status: queued, running, succeeded, failed, cancelled
    let newStatus = job.status;
    if (taskStatus === "Success" || taskStatus === "success" || taskStatus === "succeeded") {
      newStatus = "succeeded";
    } else if (taskStatus === "Fail" || taskStatus === "failed") {
      newStatus = "failed";
    } else if (taskStatus === "Cancelled" || taskStatus === "cancelled") {
      newStatus = "cancelled";
    } else if (["Queueing", "Preparing", "Processing", "queued", "running", "processing"].includes(taskStatus)) {
      newStatus = "processing";
    }

    if (newStatus === "succeeded" && fileId) {
      const fileResp = await fetch(
        `${providerConfig.apiBase}/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
        { headers: { Authorization: `Bearer ${userSettings.videoApiKey}` } }
      );
      const fileData: any = await fileResp.json().catch(() => ({}));
      if (!fileResp.ok || !fileData?.file?.download_url) {
        return c.json({ job_id: jobId, status: "processing", message: "视频已生成，下载地址暂未就绪" });
      }
      videoUrl = fileData.file.download_url;
    }

    // Update job status
    const updateData: any = { status: newStatus, updatedAt: new Date().toISOString() };

    if (newStatus === "succeeded" && videoUrl) {
      updateData.completedAt = new Date().toISOString();

      // Persist video to our own R2 (MiniMax URLs are signed & expire)
      // A provider job owns one deterministic Take. Concurrent poll requests may repeat
      // retrieval/R2 work, but can no longer create duplicate review candidates.
      const takeId = generatedVideoTakeId(job.id);
      const r2Key = `takes/${job.shotId || "orphan"}/${takeId}.mp4`;
      const r2Url = await saveMediaToR2(videoUrl, r2Key, c.env.STORAGE, 120000, "video/*,*/*");
      const finalUrl = r2Url || videoUrl;
      if (!r2Url) {
        console.warn(`[Video Poll] R2 persist failed, keeping upstream URL for job ${jobId}`);
      }
      updateData.resultUrl = finalUrl;

      // Create a Take record for the generated video
      let parameters: any = {};
      try { parameters = JSON.parse(job.parameters || "{}"); } catch { /* ignore */ }
      await db.insert(takes).values({
        id: takeId,
        projectId: job.projectId || "",
        shotId: job.shotId || "",
        jobId: job.id,
        takeType: "video",
        source: "ai_generated",
        mediaUrl: finalUrl,
        duration: parameters.duration || 0,
        reviewStatus: "pending",
        isAdopted: false,
        metadata: JSON.stringify({
          external_task_id: job.externalTaskId,
          file_id: fileId,
          model: job.model,
          resolution: "768P",
          requested_ratio: parameters.requested_aspect_ratio || parameters.aspect_ratio,
          generation_mode: parameters.generation_mode || "text_to_video",
          first_frame_image_url: parameters.first_frame_image_url || "",
          upstream_url: r2Url ? videoUrl : undefined,
          r2_persisted: Boolean(r2Url),
        }),
      }).onConflictDoNothing({ target: takes.id });

      const persistedTake = await db.select().from(takes).where(eq(takes.id, takeId)).get();
      updateData.resultUrl = persistedTake?.mediaUrl || finalUrl;

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
