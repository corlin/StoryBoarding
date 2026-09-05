import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { shots } from "../db/schema";

import { formatDirectorImagePrompt, formatDirectorVideoPrompt } from "../agents/director/pipeline";

const router = new Hono<{ Bindings: Bindings }>();

// POST /api/shots
router.post("/", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();

  const action = body.action || "";
  const size = body.shot_size || "medium_shot";
  const angle = body.camera_angle || "eye_level";
  const mov = typeof body.camera_movement === "object" ? body.camera_movement.type || "push_in" : body.camera_movement || "push_in";
  const subject = body.subject || "";

  const autoImgPrompt = body.image_prompt || formatDirectorImagePrompt(action, size, angle, mov, {
    subject,
    order: Number(body.order) || 1,
  });

  const autoVidPrompt = body.video_prompt || formatDirectorVideoPrompt(action, mov, size, {
    subject,
    order: Number(body.order) || 1,
  });

  const charIds = Array.isArray(body.character_ids) ? JSON.stringify(body.character_ids) : (body.character_ids || "[]");
  const locId = body.location_id || "";

  const [newShot] = await db
    .insert(shots)
    .values({
      id,
      sequenceId: body.sequence_id,
      order: Number(body.order) || 1,
      duration: Number(body.duration) || 2.5,
      shotSize: size,
      cameraAngle: angle,
      cameraMovement: typeof body.camera_movement === "string" ? body.camera_movement : JSON.stringify(body.camera_movement || {}),
      subject,
      characterIds: charIds,
      locationId: locId,
      action,
      dialogue: body.dialogue || "",
      narrativeFunction: body.narrative_function || "动作推进",
      lighting: body.lighting || "通透自然光影",
      audio: typeof body.audio === "string" ? body.audio : JSON.stringify(body.audio || {}),
      imagePrompt: autoImgPrompt,
      videoPrompt: autoVidPrompt,
      continuityData: typeof body.continuity_data === "string" ? body.continuity_data : JSON.stringify(body.continuity_data || {}),
      isDirty: false,
    })
    .returning();

  return c.json({
    ...newShot,
    character_ids: JSON.parse(newShot.characterIds || "[]"),
    location_id: newShot.locationId || "",
  }, 201);
});

// PUT /api/shots/:id
router.put("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json();

  const existingShot = await db.select().from(shots).where(eq(shots.id, id)).get();
  if (!existingShot) {
    return c.json({ detail: "Shot not found" }, 404);
  }

  const updates: any = {};
  if (body.order !== undefined) updates.order = Number(body.order);
  if (body.duration !== undefined) updates.duration = Number(body.duration);
  if (body.shot_size !== undefined) updates.shotSize = body.shot_size;
  if (body.camera_angle !== undefined) updates.cameraAngle = body.camera_angle;
  if (body.camera_movement !== undefined) {
    updates.cameraMovement = typeof body.camera_movement === "string" ? body.camera_movement : JSON.stringify(body.camera_movement);
  }
  if (body.subject !== undefined) updates.subject = body.subject;
  if (body.character_ids !== undefined) {
    updates.characterIds = Array.isArray(body.character_ids) ? JSON.stringify(body.character_ids) : body.character_ids;
  }
  if (body.prop_ids !== undefined) {
    updates.propIds = Array.isArray(body.prop_ids) ? JSON.stringify(body.prop_ids) : body.prop_ids;
  }
  if (body.clip_id !== undefined) updates.clipId = body.clip_id;
  if (body.start_time !== undefined) updates.startTime = Number(body.start_time);
  if (body.end_time !== undefined) updates.endTime = Number(body.end_time);
  if (body.dialogue_emotion !== undefined) updates.dialogueEmotion = body.dialogue_emotion;
  if (body.location_id !== undefined) {
    updates.locationId = body.location_id;
  }
  if (body.action !== undefined) updates.action = body.action;
  if (body.dialogue !== undefined) updates.dialogue = body.dialogue;
  if (body.narrative_function !== undefined) updates.narrativeFunction = body.narrative_function;
  if (body.lighting !== undefined) updates.lighting = body.lighting;
  if (body.audio !== undefined) {
    updates.audio = typeof body.audio === "string" ? body.audio : JSON.stringify(body.audio);
  }
  if (body.continuity_data !== undefined) {
    updates.continuityData = typeof body.continuity_data === "string" ? body.continuity_data : JSON.stringify(body.continuity_data);
  }
  if (body.storyboard_image_url !== undefined) {
    updates.storyboardImageUrl = body.storyboard_image_url;
    updates.isDirty = false;
  }
  if (body.is_dirty !== undefined) updates.isDirty = Boolean(body.is_dirty);
  if (body.is_locked !== undefined) updates.isLocked = Boolean(body.is_locked);
  if (body.isLocked !== undefined) updates.isLocked = Boolean(body.isLocked);

  // Check if visual action script was edited -> auto re-compile prompts & flag dirty
  const isScriptModified =
    (body.action !== undefined && body.action !== existingShot.action) ||
    (body.shot_size !== undefined && body.shot_size !== existingShot.shotSize) ||
    (body.camera_angle !== undefined && body.camera_angle !== existingShot.cameraAngle) ||
    (body.camera_movement !== undefined && JSON.stringify(body.camera_movement) !== existingShot.cameraMovement) ||
    (body.subject !== undefined && body.subject !== existingShot.subject);

  if (isScriptModified) {
    const finalAction = body.action !== undefined ? body.action : existingShot.action || "";
    const finalSize = body.shot_size !== undefined ? body.shot_size : existingShot.shotSize || "medium_shot";
    const finalAngle = body.camera_angle !== undefined ? body.camera_angle : existingShot.cameraAngle || "eye_level";
    const movObj = body.camera_movement !== undefined ? body.camera_movement : JSON.parse(existingShot.cameraMovement || "{}");
    const finalMov = typeof movObj === "object" ? movObj?.type || "push_in" : movObj || "push_in";
    const finalSubject = body.subject !== undefined ? body.subject : existingShot.subject || "";

    if (body.image_prompt === undefined) {
      updates.imagePrompt = formatDirectorImagePrompt(finalAction, finalSize, finalAngle, finalMov, {
        subject: finalSubject,
        order: updates.order || existingShot.order,
      });
    }
    if (body.video_prompt === undefined) {
      updates.videoPrompt = formatDirectorVideoPrompt(finalAction, finalMov, finalSize, {
        subject: finalSubject,
        order: updates.order || existingShot.order,
      });
    }

    if (body.storyboard_image_url === undefined && existingShot.storyboardImageUrl) {
      updates.isDirty = true;
    }
  } else {
    if (body.image_prompt !== undefined) updates.imagePrompt = body.image_prompt;
    if (body.video_prompt !== undefined) updates.videoPrompt = body.video_prompt;
  }

  updates.updatedAt = new Date().toISOString();

  const [updated] = await db.update(shots).set(updates).where(eq(shots.id, id)).returning();
  return c.json({
    ...updated,
    character_ids: JSON.parse(updated.characterIds || "[]"),
    prop_ids: JSON.parse(updated.propIds || "[]"),
    location_id: updated.locationId || "",
    clip_id: updated.clipId || "",
    dialogue_emotion: updated.dialogueEmotion || "",
  });
});

// DELETE /api/shots/:id
router.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  await db.delete(shots).where(eq(shots.id, id));
  return c.json({ success: true });
});

export default router;
