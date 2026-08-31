import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { projects, sequences, shots, systemSettings } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt } from "../agents/director/pipeline";

const router = new Hono<{ Bindings: Bindings }>();

// Helper to get active API keys from D1 system_settings or env
async function getActiveSettings(db: any, env: Bindings) {
  const setting = await db.select().from(systemSettings).where(eq(systemSettings.id, "default")).get();
  return {
    llmApiKey: setting?.llmApiKey || "",
    llmApiBase: setting?.llmApiBase || env.DEFAULT_LLM_API_BASE || "https://openrouter.ai/api/v1",
    llmModel: setting?.llmModel || env.DEFAULT_LLM_MODEL || "deepseek/deepseek-chat",
    imageApiKey: setting?.imageApiKey || setting?.llmApiKey || "",
    imageApiBase: setting?.imageApiBase || "https://openrouter.ai/api/v1",
    imageModel: setting?.imageModel || env.DEFAULT_IMAGE_MODEL || "google/imagen-3",
  };
}

const FULL_DEMO_SHOTS = [
  { order: 1, duration: 2.5, size: "extreme_wide_shot", angle: "high_angle", mov: "crane", subj: "古风茶楼与赛博雨夜", act: "俯瞰赛博雨夜，青瓦飞檐的古风茶楼悬挂着发光的红灯笼，周围环绕着绿色全息数据流与密集的雨幕。" },
  { order: 2, duration: 2.0, size: "wide_shot", angle: "eye_level", mov: "tracking_right", subj: "墨客 (Moke)", act: "墨客身穿黑色立领长衫风衣，戴着黑色墨镜，缓步踏过水洼，皮靴带起一圈圈慢动作水花涟漪。" },
  { order: 3, duration: 2.0, size: "medium_shot", angle: "low_angle", mov: "push_in", subj: "特工银狐 (Agent Fox)", act: "特工银狐从茶馆暗影中缓步走出，右手微抬，袖口机械装置发出淡蓝色充能微光。" },
  { order: 4, duration: 2.5, size: "medium_close_up", angle: "eye_level", mov: "static", subj: "墨客 (Moke)", act: "墨客面容沉静，双手从容展开摆出经典咏春/太极问手起手式，手指轻勾：“请。”" },
  { order: 5, duration: 2.0, size: "full_shot", angle: "dutch_angle", mov: "handheld", subj: "特工与墨客", act: "特工暴喝一声率先发难，瞬步暴冲撕裂雨雾，重拳带起空气激波直轰墨客面门。" },
  { order: 6, duration: 3.0, size: "close_up", angle: "low_angle", mov: "tracking_left", subj: "拳脚拆招", act: "墨客不退反进，左右黐手黏带化劲，手腕翻转顺势格挡，两人近身拳影交错火花四溅。" },
  { order: 7, duration: 3.5, size: "extreme_close_up", angle: "eye_level", mov: "pan_left", subj: "电磁枪拔枪", act: "特工近战受阻，左手突然拔出高科技电磁手枪直抵墨客眉心，决然扣动扳机。" },
  { order: 8, duration: 3.5, size: "medium_shot", angle: "worms_eye", mov: "tracking_right", subj: "墨客子弹时间铁板桥", act: "【经典子弹时间】镜头360度极慢速环绕，墨客极限铁板桥下腰，电磁子弹旋转穿透悬浮水珠，在墨镜上方划出清晰气浪。" },
  { order: 9, duration: 2.5, size: "medium_close_up", angle: "low_angle", mov: "push_in", subj: "墨客起身特写", act: "墨客腰背借力如春藤回弹起身，墨镜上赫然反光映出特工惊恐瞪大的双眼。" },
  { order: 10, duration: 2.5, size: "full_shot", angle: "dutch_angle", mov: "tracking_right", subj: "凌空飞踢", act: "墨客借势腾空而起，在空中展开华丽的凌空飞踢（三连佛山无影脚），重重踏在特工胸膛护甲上。" },
  { order: 11, duration: 2.0, size: "wide_shot", angle: "high_angle", mov: "pull_out", subj: "特工倒飞坠地", act: "特工如炮弹般倒飞撞穿茶馆二楼的雕花木格屏风，木屑与雨瓦轰然炸裂，狠狠摔入街巷积水中。" },
  { order: 12, duration: 2.0, size: "medium_shot", angle: "eye_level", mov: "static", subj: "墨客收势", act: "墨客潇洒单膝落地后挺拔站起，单手轻拂长衫下摆，四周雨水流速瞬间恢复正常，从容收势。" },
];

// Helper to create or ensure the complete 12-shot demo project in database
async function ensureDemoProject(db: any) {
  const existing = await db.select().from(projects).where(eq(projects.id, "demo")).get();
  const seqId = "seq-demo-1";

  if (!existing) {
    await db.insert(projects).values({
      id: "demo",
      title: "矩阵·赛博宗师：雨夜茶馆决战 (The Matrix: Cyber Master)",
      story: "赛博雨夜，青瓦飞檐的古典中式茶楼隐没在全息霓虹广告与绿色数据流雨幕中。黑客武术大师墨客身着黑色立领长衫风衣踏入雨巷，与拦截的特工银狐狭路相逢。两人展开惊心动魄的近身功夫对决，经历了电磁枪拔枪、经典360度子弹时间铁板桥闪避、凌空三连踢，最终特工被踢飞撞碎雕花屏风，墨客收势伫立在雨中。",
      targetDuration: 30.0,
    });

    await db.insert(sequences).values({
      id: seqId,
      projectId: "demo",
      title: "茶馆雨夜决战主场次",
      order: 1,
    });
  }

  // Ensure all 12 shots exist in demo sequence
  const currentDemoShots = await db.select().from(shots).where(eq(shots.sequenceId, seqId)).all();
  if (currentDemoShots.length < 12) {
    await db.delete(shots).where(eq(shots.sequenceId, seqId));

    for (const s of FULL_DEMO_SHOTS) {
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
        narrativeFunction: s.order === 1 ? "环境建立" : s.order === 8 ? "高潮视效 (Bullet Time)" : "动作推进",
        lighting: "暗红霓虹与绿色数据流反光",
        audio: JSON.stringify({ sfx: "暴雨声、功夫格挡与电弧充能" }),
        imagePrompt: formatDirectorImagePrompt(s.act, s.size, s.angle, s.mov),
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

  // Attach shot_count for each project
  const enriched = await Promise.all(
    list.map(async (p) => {
      const seqs = await db.select().from(sequences).where(eq(sequences.projectId, p.id)).all();
      let totalShots = 0;
      for (const seq of seqs) {
        const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
        totalShots += shotList.length;
      }
      return {
        ...p,
        target_duration: p.targetDuration,
        shot_count: totalShots,
      };
    })
  );

  return c.json(enriched);
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
  const title = body.title || "未命名项目";
  const story = body.story || "";
  const targetDuration = Number(body.target_duration) || 30.0;

  const [newProj] = await db
    .insert(projects)
    .values({
      id,
      title,
      story,
      targetDuration,
    })
    .returning();

  // Create initial default sequence
  const seqId = crypto.randomUUID();
  await db.insert(sequences).values({
    id: seqId,
    projectId: id,
    title: "主场次 (Main Sequence)",
    order: 1,
  });

  // Always auto-generate shots from story or title
  const effectiveStory = story.trim() || title.trim();
  try {
    const settings = await getActiveSettings(db, c.env);
    const plan = await runDirectorPipeline(effectiveStory, targetDuration, {
      apiKey: settings.llmApiKey,
      apiBase: settings.llmApiBase,
      model: settings.llmModel,
    });

    for (const s of plan.shots) {
      await db.insert(shots).values({
        id: crypto.randomUUID(),
        sequenceId: seqId,
        order: s.order,
        duration: s.duration,
        shotSize: s.shot_size,
        cameraAngle: s.camera_angle,
        cameraMovement: JSON.stringify(s.camera_movement),
        subject: s.subject || "",
        action: s.action,
        dialogue: s.dialogue || "",
        narrativeFunction: s.narrative_function || "动作推进",
        lighting: s.lighting || "自然光影",
        audio: JSON.stringify(s.audio || {}),
        imagePrompt: s.image_prompt,
        videoPrompt: s.video_prompt,
        continuityData: JSON.stringify(s.continuity_data || {}),
        isDirty: true,
      });
    }
  } catch (e) {
    console.error("Auto shot generation failed during project creation:", e);
  }

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

  // Prevent deleting built-in demo project
  if (id === "demo") {
    return c.json({ error: "Built-in demo project cannot be deleted" }, 400);
  }

  // 1. Fetch all sequences for this project
  const seqs = await db.select().from(sequences).where(eq(sequences.projectId, id)).all();

  // 2. Cascade delete all shots and clean up R2 storage assets
  for (const seq of seqs) {
    const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
    
    if (c.env.STORAGE) {
      for (const s of shotList) {
        if (s.storyboardImageUrl && s.storyboardImageUrl.includes("/storage/")) {
          const key = s.storyboardImageUrl.split("/storage/")[1];
          if (key) {
            try {
              await c.env.STORAGE.delete(key);
            } catch (e) {
              console.error(`Failed to delete R2 asset ${key}:`, e);
            }
          }
        }
      }
    }

    await db.delete(shots).where(eq(shots.sequenceId, seq.id));
  }

  // 3. Delete sequences
  await db.delete(sequences).where(eq(sequences.projectId, id));

  // 4. Delete project
  await db.delete(projects).where(eq(projects.id, id));

  return c.json({ success: true, deleted_id: id });
});

export default router;
