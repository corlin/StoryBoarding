import { Hono } from "hono";
import { eq, ne, and, desc, sql, inArray } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import {
  projects, sequences, shots, generationJobs, takes,
  dialogueLines, editVersions, assetVersions,
} from "../db/schema";
import { getAuthUser } from "../lib/auth";
import { saveImageToR2 } from "../lib/storage";
import { dialogueIdFromTakeMetadata } from "../lib/tts";
import { authorizeProjectOwner, authorizeSequenceOwner, authorizeShotOwner } from "../lib/projectAccess";
import { AUDIO_STRATEGIES, lipSyncStatusForStrategy, type AudioStrategy } from "../lib/videoProvider";

const router = new Hono<{ Bindings: Bindings }>();

// Helper: get project ID from shot
async function getProjectIdFromShot(db: any, shotId: string): Promise<string> {
  const shot = await db.select().from(shots).where(eq(shots.id, shotId)).get();
  if (!shot) return "";
  const seq = await db.select().from(sequences).where(eq(sequences.id, shot.sequenceId)).get();
  return seq?.projectId || "";
}

async function refreshShotLipSyncFromDialogue(db: any, shotId: string) {
  const shot = await db.select().from(shots).where(eq(shots.id, shotId)).get();
  if (!shot) return;
  const lines = await db.select().from(dialogueLines).where(eq(dialogueLines.shotId, shotId)).all();
  const nonEmptyLines = lines.filter((line: any) => String(line.text || "").trim());
  const isVoiceover = nonEmptyLines.length > 0 && nonEmptyLines.every((line: any) => line.isVoiceover);
  const dialogueText = nonEmptyLines.length > 0
    ? nonEmptyLines.map((line: any) => line.text).join("\n")
    : shot.dialogue || "";
  const strategy = (shot.audioStrategy || "native_av") as AudioStrategy;
  await db.update(shots).set({
    lipSyncStatus: lipSyncStatusForStrategy(strategy, dialogueText, isVoiceover),
    updatedAt: new Date().toISOString(),
  }).where(eq(shots.id, shotId));
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

    const access = await authorizeProjectOwner(db, c.req.header("Authorization"), projectId);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);
    const project = access.project;

    // Get all sequences for project
    const seqs = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).all();
    const seqIds = seqs.map((s: any) => s.id);
    const sequenceById = new Map(seqs.map((s: any) => [s.id, s]));

    if (seqIds.length === 0) {
      return c.json({ project_id: projectId, project_aspect_ratio: project?.aspectRatio || "9:16", shots: [], status_counts: {} });
    }

    // Get all shots for this project's sequences
    const allShots = seqIds.length > 0
      ? await db.select().from(shots).where(inArray(shots.sequenceId, seqIds)).all()
      : [];
    const projectShots = allShots;

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
    const projectDialogueLines = shotIds.length > 0
      ? await db.select().from(dialogueLines).where(inArray(dialogueLines.shotId, shotIds)).all()
      : [];

    // Build kanban items
    const items = projectShots.map((shot: any) => {
      const sequence: any = sequenceById.get(shot.sequenceId);
      const shotTakes = projectTakes.filter((t: any) => t.shotId === shot.id);
      const visualTakes = shotTakes.filter((t: any) => t.takeType !== "audio");
      const audioTakes = shotTakes.filter((t: any) => t.takeType === "audio");
      const shotJobs = projectJobs.filter((j: any) => j.shotId === shot.id);
      const adoptedTake = visualTakes.find((t: any) => t.isAdopted);
      const pendingTakes = visualTakes.filter((t: any) => t.reviewStatus === "pending");
      const failedJobs = shotJobs.filter((j: any) => j.status === "failed");
      const shotLines = projectDialogueLines.filter((line: any) => line.shotId === shot.id && (line.text || "").trim());
      const hasVisibleDialogue = shotLines.length > 0
        ? shotLines.some((line: any) => !line.isVoiceover)
        : Boolean((shot.dialogue || "").trim()) && !/^(旁白|画外音|内心|narrator|voice[- ]?over)\s*[：:]/i.test((shot.dialogue || "").trim());

      // Determine kanban status
      let status = "待生成";
      if (failedJobs.length > 0 && !adoptedTake) status = "失败";
      else if (shotJobs.some((j: any) => j.status === "processing" || j.status === "submitted")) status = "生成中";
      else if (pendingTakes.length > 0 && !adoptedTake) status = "待审";
      else if (visualTakes.some((t: any) => t.reviewStatus === "rejected") && !adoptedTake) status = "退回";
      else if (adoptedTake) status = "已采用";

      return {
        shot_id: shot.id,
        sequence_id: shot.sequenceId,
        episode_number: sequence?.episodeNumber || sequence?.order || 1,
        episode_title: sequence?.title || `第 ${sequence?.episodeNumber || sequence?.order || 1} 集`,
        order: shot.order,
        shot_size: shot.shotSize,
        duration: shot.duration,
        action: shot.action,
        dialogue: shot.dialogue,
        audio_strategy: shot.audioStrategy || "native_av",
        lip_sync_status: hasVisibleDialogue ? (shot.lipSyncStatus || "pending") : "not_applicable",
        status,
        has_image: !!shot.storyboardImageUrl,
        takes_count: visualTakes.length,
        visual_takes_count: visualTakes.length,
        audio_takes_count: audioTakes.length,
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
      project_aspect_ratio: project.aspectRatio || "9:16",
      total_shots: items.length,
      status_counts: statusCounts,
      shots: items.sort((a: any, b: any) => a.episode_number - b.episode_number || a.order - b.order),
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

    const access = shotId
      ? await authorizeShotOwner(db, c.req.header("Authorization"), shotId)
      : await authorizeProjectOwner(db, c.req.header("Authorization"), projectId!);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);

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
    const takeProject = await db.select().from(projects).where(eq(projects.id, take.projectId)).get();
    if (!takeProject || takeProject.userId !== authUser.userId) return c.json({ detail: "无权访问该候选" }, 403);

    // Visual and audio selections are independent. Generated TTS is scoped to one
    // dialogue line so multiple spoken lines in the same shot can each be adopted.
    const metadataDialogueId = take.takeType === "audio" ? dialogueIdFromTakeMetadata(take.metadata) : "";
    const dialogueLine = metadataDialogueId
      ? await db.select().from(dialogueLines).where(and(
          eq(dialogueLines.id, metadataDialogueId),
          eq(dialogueLines.projectId, take.projectId),
          eq(dialogueLines.shotId, take.shotId),
        )).get()
      : null;
    const dialogueId = dialogueLine?.id || "";
    if (dialogueId) {
      const shotAudioTakes = await db.select().from(takes).where(and(
        eq(takes.shotId, take.shotId),
        eq(takes.takeType, "audio"),
      )).all();
      const sameDialogueTakeIds = shotAudioTakes
        .filter((candidate: any) => dialogueIdFromTakeMetadata(candidate.metadata) === dialogueId)
        .map((candidate: any) => candidate.id);
      // Audio uploaded before dialogue-scoped TTS has no dialogue_id metadata.
      // audioVersion is its durable association, so retire that legacy take too.
      if (dialogueLine?.audioVersion && !sameDialogueTakeIds.includes(dialogueLine.audioVersion)) {
        const legacyTake = shotAudioTakes.find((candidate: any) => candidate.id === dialogueLine.audioVersion);
        if (legacyTake) {
          let legacyMetadata: Record<string, any> = {};
          try {
            legacyMetadata = JSON.parse(legacyTake.metadata || "{}");
          } catch {
            legacyMetadata = {};
          }
          await db.update(takes).set({
            metadata: JSON.stringify({ ...legacyMetadata, dialogue_id: dialogueId }),
            updatedAt: new Date().toISOString(),
          }).where(eq(takes.id, legacyTake.id));
        }
        sameDialogueTakeIds.push(dialogueLine.audioVersion);
      }
      if (sameDialogueTakeIds.length > 0) {
        await db.update(takes).set({ isAdopted: false, adoptedAt: null }).where(inArray(takes.id, sameDialogueTakeIds));
      }
    } else {
      const sameTrack = take.takeType === "audio" ? eq(takes.takeType, "audio") : ne(takes.takeType, "audio");
      await db.update(takes).set({ isAdopted: false, adoptedAt: null }).where(and(
        eq(takes.shotId, take.shotId),
        sameTrack,
      ));
    }

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
    if (take.takeType === "video") {
      const shot = await db.select().from(shots).where(eq(shots.id, take.shotId)).get();
      let takeMetadata: Record<string, any> = {};
      try { takeMetadata = JSON.parse(take.metadata || "{}"); } catch { takeMetadata = {}; }
      const metadataStrategy = String(takeMetadata.audio_strategy || "");
      const audioStrategy = (AUDIO_STRATEGIES.includes(metadataStrategy as AudioStrategy)
        ? metadataStrategy
        : shot?.audioStrategy || "native_av") as AudioStrategy;
      const shotLines = await db.select().from(dialogueLines).where(eq(dialogueLines.shotId, take.shotId)).all();
      const nonEmptyShotLines = shotLines.filter((line: any) => String(line.text || "").trim());
      const isVoiceover = nonEmptyShotLines.length > 0 && nonEmptyShotLines.every((line: any) => line.isVoiceover);
      const dialogueText = nonEmptyShotLines.length > 0
        ? nonEmptyShotLines.map((line: any) => line.text).join("\n")
        : shot?.dialogue || "";
      await db.update(shots).set({
        audioStrategy,
        lipSyncStatus: lipSyncStatusForStrategy(audioStrategy, dialogueText, isVoiceover),
        updatedAt: new Date().toISOString(),
      }).where(eq(shots.id, take.shotId));
    }
    if (take.takeType === "audio" && dialogueId && take.mediaUrl) {
      await db.update(dialogueLines).set({
        audioVersion: take.id,
        audioUrl: take.mediaUrl,
        updatedAt: new Date().toISOString(),
      }).where(eq(dialogueLines.id, dialogueId));
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
    const takeProject = await db.select().from(projects).where(eq(projects.id, take.projectId)).get();
    if (!takeProject || takeProject.userId !== authUser.userId) return c.json({ detail: "无权访问该候选" }, 403);

    await db.update(takes).set({
      reviewStatus: "rejected",
      rejectionReason: reason,
      isAdopted: false,
      adoptedAt: null,
    }).where(eq(takes.id, takeId));

    if (take.takeType === "audio") {
      const dialogueId = dialogueIdFromTakeMetadata(take.metadata);
      if (dialogueId) {
        const line = await db.select().from(dialogueLines).where(and(
          eq(dialogueLines.id, dialogueId),
          eq(dialogueLines.projectId, take.projectId),
          eq(dialogueLines.shotId, take.shotId),
        )).get();
        if (line?.audioVersion === take.id) {
          await db.update(dialogueLines).set({ audioVersion: "", audioUrl: "", updatedAt: new Date().toISOString() })
            .where(eq(dialogueLines.id, dialogueId));
        }
      }
    }

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

    const formData = await c.req.formData();
    const shotId = formData.get("shot_id") as string;
    const takeType = (formData.get("take_type") as string) || "video";
    const dialogueId = (formData.get("dialogue_id") as string) || "";
    const file = formData.get("file") as File;

    if (!shotId) return c.json({ detail: "shot_id required" }, 400);
    if (!file) return c.json({ detail: "file required" }, 400);

    const access = await authorizeShotOwner(db, c.req.header("Authorization"), shotId);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);
    const projectId = access.project.id;
    if (takeType === "audio" && dialogueId) {
      const line = await db.select().from(dialogueLines).where(and(
        eq(dialogueLines.id, dialogueId),
        eq(dialogueLines.projectId, projectId),
        eq(dialogueLines.shotId, shotId),
      )).get();
      if (!line) return c.json({ detail: "台词与当前镜头不匹配" }, 409);
    }

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
      metadata: JSON.stringify({
        filename: file.name,
        size: file.size,
        type: file.type,
        dialogue_id: dialogueId || undefined,
        // Uploaded videos are treated as audiovisual masters. Assembly maps the
        // source audio mandatorily, so a silent upload fails clearly instead of
        // silently producing a muted delivery.
        native_audio: takeType === "video",
      }),
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

// Upload a final delivery artifact and return its durable R2 URL.
router.post("/deliveries/upload", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);

    const formData = await c.req.formData();
    const projectId = formData.get("project_id") as string;
    const artifactType = (formData.get("artifact_type") as string) || "artifact";
    const file = formData.get("file") as File;
    if (!projectId || !file) return c.json({ detail: "project_id and file required" }, 400);

    const access = await authorizeProjectOwner(db, c.req.header("Authorization"), projectId);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);
    if (!c.env.STORAGE) return c.json({ detail: "R2 storage is not configured" }, 503);

    const safeType = artifactType.replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const r2Key = `deliveries/${projectId}/${safeType}-${crypto.randomUUID()}.${ext}`;
    await c.env.STORAGE.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { projectId, artifactType, originalName: file.name },
    });

    return c.json({
      status: "success",
      project_id: projectId,
      artifact_type: artifactType,
      filename: file.name,
      size: file.size,
      media_url: `/api/assets/${r2Key}`,
    });
  } catch (err: any) {
    console.error("[Delivery Upload Error]:", err);
    return c.json({ detail: `交付文件上传失败: ${err?.message || err}` }, 500);
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

    let jobs;
    if (shotId) {
      const access = await authorizeShotOwner(db, c.req.header("Authorization"), shotId);
      if (!access.ok) return c.json({ detail: access.detail }, access.status);
      jobs = await db.select().from(generationJobs).where(eq(generationJobs.shotId, shotId))
        .orderBy(desc(generationJobs.createdAt)).limit(limit).all();
    } else if (projectId) {
      const access = await authorizeProjectOwner(db, c.req.header("Authorization"), projectId);
      if (!access.ok) return c.json({ detail: access.detail }, access.status);
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

    let lines;
    if (shotId) {
      const access = await authorizeShotOwner(db, c.req.header("Authorization"), shotId);
      if (!access.ok) return c.json({ detail: access.detail }, access.status);
      lines = await db.select().from(dialogueLines).where(eq(dialogueLines.shotId, shotId))
        .orderBy(dialogueLines.orderIndex).all();
    } else if (projectId) {
      const access = await authorizeProjectOwner(db, c.req.header("Authorization"), projectId);
      if (!access.ok) return c.json({ detail: access.detail }, access.status);
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

    const { id, project_id, shot_id, sequence_id, speaker, text, performance, emotion,
      audio_version, audio_url, actual_duration, planned_duration, is_voiceover, order_index,
      language, voice_source, voice_consent_status } = body;

    if (!project_id) return c.json({ detail: "project_id required" }, 400);
    const access = await authorizeProjectOwner(db, c.req.header("Authorization"), project_id);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);
    if (shot_id) {
      const shotAccess = await authorizeShotOwner(db, c.req.header("Authorization"), shot_id);
      if (!shotAccess.ok) return c.json({ detail: shotAccess.detail }, shotAccess.status);
      if (shotAccess.project.id !== project_id) return c.json({ detail: "镜头不属于该工程" }, 409);
      if (sequence_id && shotAccess.sequence.id !== sequence_id) return c.json({ detail: "镜头不属于该场次" }, 409);
    }
    if (sequence_id) {
      const sequenceAccess = await authorizeSequenceOwner(db, c.req.header("Authorization"), sequence_id);
      if (!sequenceAccess.ok) return c.json({ detail: sequenceAccess.detail }, sequenceAccess.status);
      if (sequenceAccess.project.id !== project_id) return c.json({ detail: "场次不属于该工程" }, 409);
    }

    if (id) {
      const existing = await db.select().from(dialogueLines).where(eq(dialogueLines.id, id)).get();
      if (!existing || existing.projectId !== project_id) return c.json({ detail: "台词记录不存在" }, 404);
      if (audio_version !== undefined || audio_url !== undefined) {
        const effectiveAudioVersion = audio_version !== undefined ? audio_version : existing.audioVersion;
        const effectiveAudioUrl = audio_url !== undefined ? audio_url : existing.audioUrl;
        if (effectiveAudioVersion || effectiveAudioUrl) {
          const adoptedAudio = effectiveAudioVersion
            ? await db.select().from(takes).where(eq(takes.id, effectiveAudioVersion)).get()
            : null;
          if (!adoptedAudio || adoptedAudio.projectId !== project_id || adoptedAudio.shotId !== (shot_id || existing.shotId) ||
            adoptedAudio.takeType !== "audio" || !adoptedAudio.isAdopted || adoptedAudio.mediaUrl !== effectiveAudioUrl) {
            return c.json({ detail: "audio_version 必须指向当前镜头已采用的音频版本", error_code: "REFERENCE_AUDIO_NOT_ADOPTED" }, 409);
          }
        }
      }
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
      if (language !== undefined) updateData.language = language;
      if (voice_source !== undefined) updateData.voiceSource = voice_source;
      if (voice_consent_status !== undefined) updateData.voiceConsentStatus = voice_consent_status;
      if (order_index !== undefined) updateData.orderIndex = order_index;

      await db.update(dialogueLines).set(updateData).where(eq(dialogueLines.id, id));
      if (is_voiceover !== undefined && (shot_id || existing.shotId)) {
        await refreshShotLipSyncFromDialogue(db, shot_id || existing.shotId);
      }
      return c.json({ status: "success", dialogue_id: id, action: "updated" });
    } else {
      // Create new
      if (audio_version || audio_url) {
        const adoptedAudio = audio_version
          ? await db.select().from(takes).where(eq(takes.id, audio_version)).get()
          : null;
        if (!adoptedAudio || adoptedAudio.projectId !== project_id || adoptedAudio.shotId !== shot_id ||
          adoptedAudio.takeType !== "audio" || !adoptedAudio.isAdopted || adoptedAudio.mediaUrl !== audio_url) {
          return c.json({ detail: "audio_version 必须指向当前镜头已采用的音频版本", error_code: "REFERENCE_AUDIO_NOT_ADOPTED" }, 409);
        }
      }
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
        language: language || "zh-CN",
        voiceSource: voice_source || "",
        voiceConsentStatus: voice_consent_status || "unverified",
        orderIndex: order_index || 0,
      });
      if (shot_id) await refreshShotLipSyncFromDialogue(db, shot_id);
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
    if (!projectId) return c.json({ detail: "project_id required" }, 400);

    const access = await authorizeProjectOwner(db, c.req.header("Authorization"), projectId);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);

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

    const { project_id, sequence_id, version_tag, version_name, assembly_data,
      subtitle_data, export_result, total_duration, is_current } = body;

    if (!project_id || !version_tag) return c.json({ detail: "project_id and version_tag required" }, 400);
    const access = await authorizeProjectOwner(db, c.req.header("Authorization"), project_id);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);
    if (sequence_id) {
      const sequenceAccess = await authorizeSequenceOwner(db, c.req.header("Authorization"), sequence_id);
      if (!sequenceAccess.ok) return c.json({ detail: sequenceAccess.detail }, sequenceAccess.status);
      if (sequenceAccess.project.id !== project_id) return c.json({ detail: "场次不属于该工程" }, 409);
    }

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
      exportResult: JSON.stringify(export_result || {}),
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
    if (!projectId) return c.json({ detail: "project_id required" }, 400);

    const access = await authorizeProjectOwner(db, c.req.header("Authorization"), projectId);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);

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
    const visualTakes = allTakes.filter((t: any) => t.takeType !== "audio");
    const videoTakes = allTakes.filter((t: any) => t.takeType === "video");
    const audioTakes = allTakes.filter((t: any) => t.takeType === "audio");
    const reviewedTakes = allTakes.filter((t: any) => t.reviewStatus !== "pending");
    const approvedTakes = allTakes.filter((t: any) => t.reviewStatus === "approved" || t.isAdopted);
    const reviewedVisualTakes = visualTakes.filter((t: any) => t.reviewStatus !== "pending");
    const approvedVisualTakes = visualTakes.filter((t: any) => t.reviewStatus === "approved" || t.isAdopted);
    const reviewedVideoTakes = videoTakes.filter((t: any) => t.reviewStatus !== "pending");
    const approvedVideoTakes = videoTakes.filter((t: any) => t.reviewStatus === "approved" || t.isAdopted);

    return c.json({
      project_id: projectId,
      total_jobs: jobs.length,
      total_takes: allTakes.length,
      reviewed_takes: reviewedTakes.length,
      approved_takes: approvedTakes.length,
      pending_review: allTakes.length - reviewedTakes.length,
      adoption_rate: reviewedTakes.length > 0 ? approvedTakes.length / reviewedTakes.length : 0,
      total_visual_takes: visualTakes.length,
      total_audio_takes: audioTakes.length,
      reviewed_visual_takes: reviewedVisualTakes.length,
      approved_visual_takes: approvedVisualTakes.length,
      pending_visual_review: visualTakes.length - reviewedVisualTakes.length,
      visual_adoption_rate: reviewedVisualTakes.length > 0 ? approvedVisualTakes.length / reviewedVisualTakes.length : 0,
      total_video_takes: videoTakes.length,
      reviewed_video_takes: reviewedVideoTakes.length,
      approved_video_takes: approvedVideoTakes.length,
      pending_video_review: videoTakes.length - reviewedVideoTakes.length,
      video_adoption_rate: reviewedVideoTakes.length > 0 ? approvedVideoTakes.length / reviewedVideoTakes.length : 0,
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
    if (!projectId) return c.json({ detail: "project_id required" }, 400);

    const access = await authorizeProjectOwner(db, c.req.header("Authorization"), projectId);
    if (!access.ok) return c.json({ detail: access.detail }, access.status);

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
