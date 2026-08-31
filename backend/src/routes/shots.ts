import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { shots } from "../db/schema";

const router = new Hono<{ Bindings: Bindings }>();

// POST /api/shots
router.post("/", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();

  const [newShot] = await db
    .insert(shots)
    .values({
      id,
      sequenceId: body.sequence_id,
      order: Number(body.order) || 1,
      duration: Number(body.duration) || 2.5,
      shotSize: body.shot_size || "medium_shot",
      cameraAngle: body.camera_angle || "eye_level",
      cameraMovement: typeof body.camera_movement === "string" ? body.camera_movement : JSON.stringify(body.camera_movement || {}),
      subject: body.subject || "",
      action: body.action || "",
      dialogue: body.dialogue || "",
      narrativeFunction: body.narrative_function || "动作推进",
      lighting: body.lighting || "自然光",
      audio: typeof body.audio === "string" ? body.audio : JSON.stringify(body.audio || {}),
      imagePrompt: body.image_prompt || "",
      videoPrompt: body.video_prompt || "",
      continuityData: typeof body.continuity_data === "string" ? body.continuity_data : JSON.stringify(body.continuity_data || {}),
      isDirty: false,
    })
    .returning();

  return c.json(newShot, 201);
});

// PUT /api/shots/:id
router.put("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json();

  const updates: any = {};
  if (body.order !== undefined) updates.order = Number(body.order);
  if (body.duration !== undefined) updates.duration = Number(body.duration);
  if (body.shot_size !== undefined) updates.shotSize = body.shot_size;
  if (body.camera_angle !== undefined) updates.cameraAngle = body.camera_angle;
  if (body.camera_movement !== undefined) {
    updates.cameraMovement = typeof body.camera_movement === "string" ? body.camera_movement : JSON.stringify(body.camera_movement);
  }
  if (body.subject !== undefined) updates.subject = body.subject;
  if (body.action !== undefined) updates.action = body.action;
  if (body.dialogue !== undefined) updates.dialogue = body.dialogue;
  if (body.narrative_function !== undefined) updates.narrativeFunction = body.narrative_function;
  if (body.lighting !== undefined) updates.lighting = body.lighting;
  if (body.audio !== undefined) {
    updates.audio = typeof body.audio === "string" ? body.audio : JSON.stringify(body.audio);
  }
  if (body.image_prompt !== undefined) updates.imagePrompt = body.image_prompt;
  if (body.video_prompt !== undefined) updates.videoPrompt = body.video_prompt;
  if (body.continuity_data !== undefined) {
    updates.continuityData = typeof body.continuity_data === "string" ? body.continuity_data : JSON.stringify(body.continuity_data);
  }
  if (body.storyboard_image_url !== undefined) updates.storyboardImageUrl = body.storyboard_image_url;
  if (body.is_dirty !== undefined) updates.isDirty = Boolean(body.is_dirty);
  updates.updatedAt = new Date().toISOString();

  const [updated] = await db.update(shots).set(updates).where(eq(shots.id, id)).returning();
  return c.json(updated);
});

// DELETE /api/shots/:id
router.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  await db.delete(shots).where(eq(shots.id, id));
  return c.json({ success: true });
});

export default router;
