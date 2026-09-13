import { Hono } from "hono";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { shots, sequences, projects, generationJobs, takes, dialogueLines } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { saveMediaToR2 } from "../lib/storage";
import { generatedVideoTakeId, isActiveVideoJob } from "../lib/videoJobState";
import {
  AUDIO_STRATEGIES,
  type AudioStrategy,
  buildVideoProviderRequest,
  parseVideoProviderPoll,
  resolveVideoProviderConfig,
  lipSyncStatusForStrategy,
} from "../lib/videoProvider";

const router = new Hono<{ Bindings: Bindings }>();

function normalizeProviderAssetUrl(value: string | null | undefined, requestUrl: string) {
  const assetUrl = (value || "").trim();
  if (!assetUrl) return "";
  if (assetUrl.startsWith("https://") || assetUrl.startsWith("http://") || assetUrl.startsWith("data:")) {
    return assetUrl;
  }
  // BytePlus LAS uses approved asset-library identifiers for human references.
  if (/^asset:\/\/[A-Za-z0-9._:-]+$/.test(assetUrl)) return assetUrl;
  if (assetUrl.startsWith("/api/assets/")) {
    return new URL(assetUrl, new URL(requestUrl).origin).toString();
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
    const providerConfig = resolveVideoProviderConfig(
      userSettings.videoProvider || "minimax",
      userSettings.videoApiBase,
      userSettings.videoModel,
    );
    const configuredStrategy = String((shot as any).audioStrategy || "native_av") as AudioStrategy;
    if (!AUDIO_STRATEGIES.includes(configuredStrategy)) {
      return c.json({ detail: `镜头音频策略无效：${configuredStrategy}` }, 409);
    }
    const firstFrameImage = normalizeProviderAssetUrl(shot.storyboardImageUrl, c.req.url);
    const firstFrameReference = firstFrameImage.startsWith("data:image/") ? "inline_data_url" : firstFrameImage;
    const shotDialogueLines = await db.select().from(dialogueLines).where(eq(dialogueLines.shotId, shotId))
      .orderBy(dialogueLines.orderIndex).all();
    const adoptedAudioLines = shotDialogueLines.filter((line: any) => line.audioVersion && line.audioUrl);
    if (configuredStrategy === "reference_audio_av" || configuredStrategy === "performance_lipsync") {
      const unverifiedVoiceLines = adoptedAudioLines.filter((line: any) =>
        !["self", "licensed", "provider_preset"].includes(line.voiceConsentStatus || "unverified"));
      if (unverifiedVoiceLines.length > 0) {
        return c.json({
          detail: "参考音频的声音来源或授权尚未确认，请先在台词时间线完成标记",
          error_code: "VOICE_CONSENT_UNVERIFIED",
          dialogue_ids: unverifiedVoiceLines.map((line: any) => line.id),
        }, 409);
      }
      const missingVoiceSourceLines = adoptedAudioLines.filter((line: any) =>
        line.voiceConsentStatus !== "provider_preset" && !(line.voiceSource || "").trim());
      if (missingVoiceSourceLines.length > 0) {
        return c.json({
          detail: "参考音频缺少声音来源或授权凭据，请先在台词时间线补充",
          error_code: "VOICE_SOURCE_REQUIRED",
          dialogue_ids: missingVoiceSourceLines.map((line: any) => line.id),
        }, 409);
      }
    }
    const strategyUsesReferenceAudio = configuredStrategy === "reference_audio_av" || configuredStrategy === "performance_lipsync";
    const referenceAudioLines = strategyUsesReferenceAudio ? adoptedAudioLines : [];
    const referenceTakeIds = referenceAudioLines.map((line: any) => line.audioVersion).filter(Boolean);
    const referenceTakes = referenceTakeIds.length > 0
      ? await db.select().from(takes).where(inArray(takes.id, referenceTakeIds)).all()
      : [];
    const referenceTakeById = new Map(referenceTakes.map((take: any) => [take.id, take]));
    const referenceAudioUrls = referenceAudioLines
      .map((line: any) => normalizeProviderAssetUrl(line.audioUrl, c.req.url))
      .filter(Boolean);
    let providerRequest;
    try {
      providerRequest = buildVideoProviderRequest(providerConfig, {
        prompt: videoPrompt,
        aspectRatio,
        duration: shot.duration || providerConfig.capability.minDuration,
        firstFrameImage,
        audioStrategy: configuredStrategy,
        referenceAudioUrls,
        referenceAudioDurations: referenceAudioLines.map((line: any) => Number(line.actualDuration || line.plannedDuration || 0)),
        referenceAudioSizes: referenceAudioLines.map((line: any) => {
          try { return Number(JSON.parse(referenceTakeById.get(line.audioVersion)?.metadata || "{}").size || 0); } catch { return 0; }
        }),
        referenceAudioMimeTypes: referenceAudioLines.map((line: any) => {
          try { return String(JSON.parse(referenceTakeById.get(line.audioVersion)?.metadata || "{}").type || ""); } catch { return ""; }
        }),
      });
    } catch (requestError: any) {
      return c.json({
        detail: requestError?.message || String(requestError),
        error_code: "VIDEO_AUDIO_STRATEGY_INVALID",
        shot_id: shotId,
      }, 409);
    }
    const generationMode = providerRequest.generationMode;

    // MiniMax T2V does not accept an aspect-ratio parameter. For vertical projects,
    // require a vertical first frame unless the caller explicitly accepts fallback risk.
    if (providerConfig.protocol === "minimax_v1" && aspectRatio === "9:16" && !firstFrameImage && body.allow_landscape_fallback !== true) {
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
      duration: providerRequest.duration,
      fps: 24,
      protocol: providerConfig.protocol,
      provider_base_url: providerConfig.baseUrl,
      audio_strategy: configuredStrategy,
      native_audio: providerConfig.capability.nativeAudio && configuredStrategy !== "post_dub" && configuredStrategy !== "silent_broll",
      reference_audio_take_ids: referenceAudioLines.map((line: any) => line.audioVersion),
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
      SELECT ?, ?, ?, 'video', ?, ?, ?, ?, ?, '', 'submitted', '', '', '{}', 0, 'unknown', 'video', ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM generation_jobs
        WHERE shot_id = ? AND job_type = 'video' AND status IN ('submitted', 'processing')
      )
    `).bind(
      jobId,
      projectId || "",
      shotId,
      providerConfig.provider,
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

    let submitResp: Response;
    try {
      submitResp = await fetch(providerRequest.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userSettings.videoApiKey}`,
        },
        body: JSON.stringify(providerRequest.body),
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
    const externalTaskId = submitData?.task_id || submitData?.id || submitData?.data?.task_id || submitData?.data?.id || "";
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
      audio_strategy: configuredStrategy,
      native_audio: providerConfig.capability.nativeAudio && configuredStrategy !== "post_dub" && configuredStrategy !== "silent_broll",
      reference_audio_count: referenceAudioUrls.length,
      message: generationMode === "reference_to_video"
        ? "参考音频驱动的视频任务已提交；生成后仍需人工验收口型"
        : generationMode === "image_to_video"
          ? "图生视频任务已提交，将沿用当前分镜首帧"
          : "文生视频任务已提交",
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
    const jobShot = job.shotId
      ? await db.select().from(shots).where(eq(shots.id, job.shotId)).get()
      : null;

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

    let parameters: any = {};
    try { parameters = JSON.parse(job.parameters || "{}"); } catch { /* ignore legacy parameters */ }

    // The provider/model/base are immutable job inputs. The key remains user-owned,
    // while settings prevent it from changing until active jobs reach a terminal state.
    const userSettings = await getUserSettings(db, authUser.userId);
    const providerConfig = resolveVideoProviderConfig(
      job.provider || userSettings.videoProvider || "minimax",
      parameters.provider_base_url || userSettings.videoApiBase,
      job.model || userSettings.videoModel,
    );

    // MiniMax v1 task query returns status and file_id.
    const pollResp = await fetch(
      providerConfig.queryUrl(job.externalTaskId),
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

    const pollResult = parseVideoProviderPoll(providerConfig, pollData);
    const taskStatus = pollResult.rawStatus;
    const fileId = pollResult.fileId;
    const errorMsg = pollResult.error;
    let videoUrl = pollResult.videoUrl;
    const newStatus = pollResult.status;

    if (newStatus === "succeeded" && !videoUrl && fileId && providerConfig.provider === "minimax") {
      const fileResp = await fetch(
        `${providerConfig.baseUrl}/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
        { headers: { Authorization: `Bearer ${userSettings.videoApiKey}` } }
      );
      const fileData: any = await fileResp.json().catch(() => ({}));
      if (!fileResp.ok || !fileData?.file?.download_url) {
        return c.json({ job_id: jobId, status: "processing", message: "视频已生成，下载地址暂未就绪" });
      }
      videoUrl = fileData.file.download_url;
    }
    if (newStatus === "succeeded" && !videoUrl) {
      return c.json({ job_id: jobId, status: "processing", message: "视频已生成，下载地址暂未就绪" });
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
      if (!r2Url) {
        console.error(`[Video Poll] R2 persist failed; refusing ephemeral upstream URL for job ${jobId}`);
        return c.json({
          job_id: jobId,
          status: "processing",
          message: "视频已生成，但持久化存储失败；未采用供应商临时链接，请稍后重试",
          error_code: "VIDEO_PERSISTENCE_PENDING",
        }, 502);
      }
      const finalUrl = r2Url;
      updateData.resultUrl = finalUrl;

      // Create a Take record for the generated video
      const persistedDialogueLines = job.shotId
        ? await db.select().from(dialogueLines).where(eq(dialogueLines.shotId, job.shotId)).all()
        : [];
      const isVoiceover = persistedDialogueLines.length > 0 && persistedDialogueLines.every((line: any) => line.isVoiceover);
      const dialogueText = persistedDialogueLines.length > 0
        ? persistedDialogueLines.map((line: any) => line.text || "").filter(Boolean).join("\n")
        : jobShot?.dialogue || "";
      await db.insert(takes).values({
        id: takeId,
        projectId: job.projectId || "",
        shotId: job.shotId || "",
        jobId: job.id,
        takeType: "video",
        source: "ai_generated",
        mediaUrl: finalUrl,
        duration: pollResult.duration || parameters.duration || 0,
        reviewStatus: "pending",
        isAdopted: false,
        metadata: JSON.stringify({
          external_task_id: job.externalTaskId,
          file_id: fileId,
          model: job.model,
          resolution: pollResult.resolution || (providerConfig.protocol === "byteplus_las" ? "720p" : "768P"),
          output_ratio: pollResult.ratio || "",
          requested_ratio: parameters.requested_aspect_ratio || parameters.aspect_ratio,
          generation_mode: parameters.generation_mode || "text_to_video",
          audio_strategy: parameters.audio_strategy || "native_av",
          native_audio: Boolean(parameters.native_audio),
          lip_sync_status: lipSyncStatusForStrategy(
            (parameters.audio_strategy || "native_av") as AudioStrategy,
            dialogueText,
            isVoiceover,
          ),
          reference_audio_take_ids: parameters.reference_audio_take_ids || [],
          first_frame_image_url: parameters.first_frame_image_url || "",
          upstream_url: videoUrl,
          r2_persisted: true,
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
