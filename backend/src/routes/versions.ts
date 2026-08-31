import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { projects, sequences, shots, projectVersions } from "../db/schema";

const router = new Hono<{ Bindings: Bindings }>();

// Helper to capture a full project snapshot
export async function captureProjectSnapshot(db: any, projectId: string) {
  const proj = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!proj) return null;

  const seqs = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).orderBy(sequences.order).all();
  const sequenceSnapshots = [];

  for (const seq of seqs) {
    const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).orderBy(shots.order).all();
    sequenceSnapshots.push({
      ...seq,
      shots: shotList,
    });
  }

  const allShots = sequenceSnapshots.flatMap((s) => s.shots);
  const totalDuration = allShots.reduce((acc: number, s: any) => acc + (Number(s.duration) || 2.5), 0);

  return {
    project: proj,
    sequences: sequenceSnapshots,
    shotCount: allShots.length,
    totalDuration,
  };
}

// GET /api/projects/:projectId/versions
router.get("/:projectId/versions", async (c) => {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");

  const list = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.createdAt))
    .all();

  return c.json(
    list.map((v) => ({
      id: v.id,
      project_id: v.projectId,
      version_tag: v.versionTag,
      version_name: v.versionName,
      trigger_type: v.triggerType,
      shot_count: v.shotCount,
      total_duration: v.totalDuration,
      snapshot_data: JSON.parse(v.snapshotData),
      created_at: v.createdAt,
    }))
  );
});

// POST /api/projects/:projectId/versions
router.post("/:projectId/versions", async (c) => {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");
  const body = await c.req.json();

  const snapshot = await captureProjectSnapshot(db, projectId);
  if (!snapshot) {
    return c.json({ detail: "Project not found" }, 404);
  }

  // Calculate next version tag (e.g., v1.0, v1.1)
  const existing = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .all();

  const nextIndex = existing.length + 1;
  const versionTag = body.version_tag || `v1.${nextIndex}`;
  const versionName = body.version_name || (body.trigger_type === "auto_pre_ai" ? "AI 导演拆镜前自动备份" : "手动里程碑快照");
  const triggerType = body.trigger_type || "manual";

  const versionId = crypto.randomUUID();

  await db.insert(projectVersions).values({
    id: versionId,
    projectId,
    versionTag,
    versionName,
    triggerType,
    shotCount: snapshot.shotCount,
    totalDuration: snapshot.totalDuration,
    snapshotData: JSON.stringify(snapshot),
    createdAt: new Date().toISOString(),
  });

  return c.json(
    {
      status: "success",
      version_id: versionId,
      version_tag: versionTag,
      version_name: versionName,
      trigger_type: triggerType,
    },
    201
  );
});

// POST /api/projects/:projectId/versions/:versionId/rollback
router.post("/:projectId/versions/:versionId/rollback", async (c) => {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");
  const versionId = c.req.param("versionId");

  const targetVersion = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.id, versionId))
    .get();

  if (!targetVersion) {
    return c.json({ detail: "Version not found" }, 404);
  }

  // 1. Automatically create a backup of current state before rollback
  const currentSnapshot = await captureProjectSnapshot(db, projectId);
  if (currentSnapshot && currentSnapshot.shotCount > 0) {
    const backupId = crypto.randomUUID();
    await db.insert(projectVersions).values({
      id: backupId,
      projectId,
      versionTag: `backup-${Date.now().toString().slice(-4)}`,
      versionName: `回滚前自动状态备份`,
      triggerType: "rollback_backup",
      shotCount: currentSnapshot.shotCount,
      totalDuration: currentSnapshot.totalDuration,
      snapshotData: JSON.stringify(currentSnapshot),
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Restore data from target snapshot
  const snapshot = JSON.parse(targetVersion.snapshotData);

  // Update project metadata
  await db
    .update(projects)
    .set({
      title: snapshot.project.title,
      story: snapshot.project.story,
      targetDuration: snapshot.project.targetDuration,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, projectId));

  // Remove existing sequences and shots
  const existingSeqs = await db.select().from(sequences).where(eq(sequences.projectId, projectId)).all();
  for (const seq of existingSeqs) {
    await db.delete(shots).where(eq(shots.sequenceId, seq.id));
  }
  await db.delete(sequences).where(eq(sequences.projectId, projectId));

  // Re-insert sequences and shots from snapshot
  for (const seqData of snapshot.sequences || []) {
    const seqId = crypto.randomUUID();
    await db.insert(sequences).values({
      id: seqId,
      projectId,
      title: seqData.title || "主场次",
      order: seqData.order || 1,
    });

    for (const shotData of seqData.shots || []) {
      await db.insert(shots).values({
        id: crypto.randomUUID(),
        sequenceId: seqId,
        order: shotData.order,
        duration: shotData.duration,
        shotSize: shotData.shotSize || shotData.shot_size || "medium_shot",
        cameraAngle: shotData.cameraAngle || shotData.camera_angle || "eye_level",
        cameraMovement: typeof shotData.cameraMovement === "string" ? shotData.cameraMovement : JSON.stringify(shotData.camera_movement || {}),
        subject: shotData.subject || "",
        action: shotData.action || "",
        dialogue: shotData.dialogue || "",
        narrativeFunction: shotData.narrativeFunction || shotData.narrative_function || "动作推进",
        lighting: shotData.lighting || "自然光",
        audio: typeof shotData.audio === "string" ? shotData.audio : JSON.stringify(shotData.audio || {}),
        imagePrompt: shotData.imagePrompt || shotData.image_prompt || "",
        videoPrompt: shotData.videoPrompt || shotData.video_prompt || "",
        continuityData: typeof shotData.continuityData === "string" ? shotData.continuityData : JSON.stringify(shotData.continuity_data || {}),
        storyboardImageUrl: shotData.storyboardImageUrl || shotData.storyboard_image_url || "",
        isDirty: false,
        isLocked: typeof shotData.isLocked === "boolean" ? shotData.isLocked : (typeof shotData.is_locked === "boolean" ? shotData.is_locked : false),
      });
    }
  }

  return c.json({
    status: "success",
    message: `已成功回滚至 ${targetVersion.versionTag} (${targetVersion.versionName})`,
  });
});

// POST /api/projects/:projectId/versions/:versionId/fork
router.post("/:projectId/versions/:versionId/fork", async (c) => {
  const db = getDb(c.env.DB);
  const versionId = c.req.param("versionId");

  const targetVersion = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.id, versionId))
    .get();

  if (!targetVersion) {
    return c.json({ detail: "Version not found" }, 404);
  }

  const snapshot = JSON.parse(targetVersion.snapshotData);
  const newProjectId = crypto.randomUUID();
  const forkedTitle = `[分支] ${snapshot.project.title} (${targetVersion.versionTag})`;

  await db.insert(projects).values({
    id: newProjectId,
    title: forkedTitle,
    story: snapshot.project.story || "",
    targetDuration: snapshot.project.targetDuration || 30.0,
  });

  for (const seqData of snapshot.sequences || []) {
    const newSeqId = crypto.randomUUID();
    await db.insert(sequences).values({
      id: newSeqId,
      projectId: newProjectId,
      title: seqData.title || "主场次",
      order: seqData.order || 1,
    });

    for (const shotData of seqData.shots || []) {
      await db.insert(shots).values({
        id: crypto.randomUUID(),
        sequenceId: newSeqId,
        order: shotData.order,
        duration: shotData.duration,
        shotSize: shotData.shotSize || shotData.shot_size || "medium_shot",
        cameraAngle: shotData.cameraAngle || shotData.camera_angle || "eye_level",
        cameraMovement: typeof shotData.cameraMovement === "string" ? shotData.cameraMovement : JSON.stringify(shotData.camera_movement || {}),
        subject: shotData.subject || "",
        action: shotData.action || "",
        dialogue: shotData.dialogue || "",
        narrativeFunction: shotData.narrativeFunction || shotData.narrative_function || "动作推进",
        lighting: shotData.lighting || "自然光",
        audio: typeof shotData.audio === "string" ? shotData.audio : JSON.stringify(shotData.audio || {}),
        imagePrompt: shotData.imagePrompt || shotData.image_prompt || "",
        videoPrompt: shotData.videoPrompt || shotData.video_prompt || "",
        continuityData: typeof shotData.continuityData === "string" ? shotData.continuityData : JSON.stringify(shotData.continuity_data || {}),
        storyboardImageUrl: shotData.storyboardImageUrl || shotData.storyboard_image_url || "",
        isDirty: false,
        isLocked: typeof shotData.isLocked === "boolean" ? shotData.isLocked : (typeof shotData.is_locked === "boolean" ? shotData.is_locked : false),
      });
    }
  }

  return c.json({
    status: "success",
    id: newProjectId,
    title: forkedTitle,
  }, 201);
});

export default router;
