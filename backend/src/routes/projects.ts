import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { projects, sequences, shots } from "../db/schema";

const router = new Hono<{ Bindings: Bindings }>();

// Helper to create demo project if database is completely empty
async function ensureDemoProject(db: any) {
  const existing = await db.select().from(projects).limit(1);
  if (existing.length === 0) {
    const projId = "demo";
    await db.insert(projects).values({
      id: projId,
      title: "矩阵·赛博宗师：雨夜茶馆决战 (The Matrix: Cyber Master)",
      story: "赛博雨夜，青瓦飞檐的古典中式茶楼隐没在全息霓虹广告与绿色数据流雨幕中。黑客武术大师墨客身着黑色立领长衫风衣踏入雨巷，与拦截的特工银狐狭路相逢。两人展开惊心动魄的近身功夫对决，经历了电磁枪拔枪、经典360度子弹时间铁板桥闪避、凌空三连踢，最终特工被踢飞撞碎雕花屏风，墨客收势伫立在雨中。",
      targetDuration: 30.0,
    });

    const seqId = "seq-demo-1";
    await db.insert(sequences).values({
      id: seqId,
      projectId: projId,
      title: "茶馆雨夜决战主场次",
      order: 1,
    });

    const demoShots = [
      { order: 1, duration: 5.0, size: "extreme_wide_shot", angle: "high_angle", mov: "crane", subj: "古风茶楼", act: "站在雨中的悬浮茶楼前，霓虹广告投影在湿漉地面上形成扭曲倒影" },
      { order: 2, duration: 4.0, size: "medium_shot", angle: "low_angle", mov: "push_in", subj: "特工银狐", act: "从巷道阴影中走出，液压关节发出机械声，等离子短棍展开时迸发蓝色电弧" },
      { order: 3, duration: 3.0, size: "close_up", angle: "dutch_angle", mov: "static", subj: "特工电磁枪", act: "机械手指扣动电磁枪扳机，武器充能时浮现红色能量纹路" },
      { order: 4, duration: 6.0, size: "medium_close_up", angle: "eye_level", mov: "pan_right", subj: "墨客避弹", act: "以太极云手动作侧身避弹，折扇展开形成电磁屏障，雨滴在力场周围悬浮" },
      { order: 5, duration: 5.0, size: "wide_shot", angle: "high_angle", mov: "crane_down", subj: "量子碎片", act: "被电磁弹击中的瞬间，纳米材料碎片呈量子态扩散，每个碎片显示不同时空影像" },
      { order: 6, duration: 7.0, size: "full_shot", angle: "eye_level", mov: "tracking_back", subj: "宗师收势", act: "收扇负手而立，风衣下摆缓缓落下，背后悬浮着破碎的茶楼全息投影" },
    ];

    for (const s of demoShots) {
      await db.insert(shots).values({
        id: `shot-demo-${s.order}`,
        sequenceId: seqId,
        order: s.order,
        duration: s.duration,
        shotSize: s.size,
        cameraAngle: s.angle,
        cameraMovement: JSON.stringify({ type: s.mov }),
        subject: s.subj,
        action: s.act,
        narrativeFunction: "动作推进",
        lighting: "冷调暗红霓虹与绿色数据流反光",
        audio: JSON.stringify({ sfx: "暴雨声、全息霓虹电流嗡鸣" }),
        imagePrompt: `Professional pre-production director's storyboard sketch, 16:9 cinematic frame, rough graphite and dark pencil lines, bold confident gestural strokes, selective grayscale wash, clear silhouette staging, directional movement arrows, ${s.size}, ${s.angle}, camera ${s.mov}, ${s.act} --no speech balloons, comic panels, 3d render`,
        videoPrompt: `Camera ${s.mov} ${s.act}`,
        continuityData: JSON.stringify({ screen_direction: "left_to_right" }),
        isDirty: false,
      });
    }
  }
}

// GET /api/projects
router.get("/", async (c) => {
  const db = getDb(c.env.DB);
  await ensureDemoProject(db);
  const list = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return c.json(list);
});

// GET /api/projects/:id
router.get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  await ensureDemoProject(db);
  const id = c.req.param("id");

  const proj = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!proj) {
    return c.json({ detail: "Project not found" }, 404);
  }

  const seqs = await db.select().from(sequences).where(eq(sequences.projectId, id)).all();
  const resultSeqs = [];

  for (const seq of seqs) {
    const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).orderBy(shots.order).all();
    resultSeqs.push({
      ...seq,
      shots: shotList.map((s) => ({
        ...s,
        camera_movement: typeof s.cameraMovement === "string" ? JSON.parse(s.cameraMovement) : s.cameraMovement,
        audio: typeof s.audio === "string" ? JSON.parse(s.audio) : s.audio,
        continuity_data: typeof s.continuityData === "string" ? JSON.parse(s.continuityData) : s.continuityData,
        target_duration: proj.targetDuration,
      })),
    });
  }

  return c.json({
    ...proj,
    target_duration: proj.targetDuration,
    sequences: resultSeqs,
  });
});

// POST /api/projects
router.post("/", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();

  const [newProj] = await db
    .insert(projects)
    .values({
      id,
      title: body.title || "未命名项目",
      story: body.story || "",
      targetDuration: Number(body.target_duration) || 30.0,
    })
    .returning();

  // Create initial default sequence
  await db.insert(sequences).values({
    id: crypto.randomUUID(),
    projectId: id,
    title: "主场次 (Main Sequence)",
    order: 1,
  });

  return c.json(newProj, 201);
});

// PUT /api/projects/:id
router.put("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json();

  const updates: any = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.story !== undefined) updates.story = body.story;
  if (body.target_duration !== undefined) updates.targetDuration = Number(body.target_duration);
  updates.updatedAt = new Date().toISOString();

  const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
  return c.json(updated);
});

// DELETE /api/projects/:id
router.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  await db.delete(projects).where(eq(projects.id, id));
  return c.json({ success: true });
});

export default router;
