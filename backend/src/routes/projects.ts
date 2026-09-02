import { Hono } from "hono";
import { eq, desc, or, isNull } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { projects, sequences, shots, systemSettings, users } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt, generateAdaptiveStoryShots } from "../agents/director/pipeline";
import { generateCinematicStoryboardImage, runConcurrentTasks, getProjectBaseSeed } from "./generation";
import { getAuthUser, getUserSettings } from "../lib/auth";

const router = new Hono<{ Bindings: Bindings }>();

const FULL_DEMO_SHOTS = [
  { order: 1, duration: 2.5, size: "extreme_wide_shot", angle: "high_angle", mov: "crane", subj: "古风茶楼与赛博雨夜", act: "俯瞰赛博雨夜，青瓦飞檐的古风茶楼悬挂着发光的红灯笼，周围环绕着绿色全息数据流与密集的雨幕。", dialogue: "旁白：“在矩阵最深处的古旧节点，数据洪流正悄然汇聚。”", sfx: "暴雨倾盆声、全息数据流低鸣", music: "赛博古风电子合成器与低沉大提琴" },
  { order: 2, duration: 2.0, size: "wide_shot", angle: "eye_level", mov: "tracking_right", subj: "墨客 (Moke)", act: "墨客身穿黑色立领长衫风衣，戴着黑色墨镜，缓步踏过水洼，皮靴带起一圈圈慢动作水花涟漪。", dialogue: "墨客：“该来的，终究逃不过。”", sfx: "皮靴踩碎积水水花声、衣风猎猎", music: "压抑紧迫的战鼓低频心跳" },
  { order: 3, duration: 2.0, size: "medium_shot", angle: "low_angle", mov: "push_in", subj: "特工银狐 (Agent Fox)", act: "特工银狐从茶馆暗影中缓步走出，右手微抬，袖口机械装置发出淡蓝色充能微光。", dialogue: "特工银狐：“异常代码‘墨客’，你的权限已被吊销。”", sfx: "高频电流充能嗡鸣声、雨水蒸发咝咝声", music: "尖锐紧张的高音弦乐" },
  { order: 4, duration: 2.0, size: "medium_close_up", angle: "eye_level", mov: "static", subj: "墨客 (Moke)", act: "墨客停下脚步，右手单掌微展摆出咏春问手架势，雨水顺着黑色墨镜边缘滴落。", dialogue: "墨客：“矩阵的规则，由我来改写。”", sfx: "雨滴滑落青石脆响、沉重呼吸声", music: "配乐骤停，唯留极度安静的雨声" },
  { order: 5, duration: 2.0, size: "close_up", angle: "low_angle", mov: "push_in", subj: "特工银狐 (Agent Fox)", act: "特工银狐双目泛起红色扫描光圈，身形瞬间化作模糊残影暴起突进。", dialogue: "特工银狐：“执行彻底抹杀！”", sfx: "空气撕裂音爆声、机械关节暴响", music: "高燃重金属电子鼓点切入" },
  { order: 6, duration: 1.5, size: "full_shot", angle: "eye_level", mov: "tracking_left", subj: "核心交锋 (Combat)", act: "两人在暴雨中短兵相接，拳风与格挡带起激荡的白色雨雾与撞击冲击波。", dialogue: "墨客：“破！”", sfx: "拳拳到肉沉重轰鸣、冲击波炸裂", music: "快节奏交响打击乐" },
  { order: 7, duration: 1.5, size: "medium_shot", angle: "dutch_angle", mov: "pan_right", subj: "连环攻防 (Matrix Combat)", act: "倾斜机位快速摇移，墨客沉桥封手化解连环刺击，反手一记寸劲击退银狐。", dialogue: "特工银狐：“不可能……你的运算速度……”", sfx: "骨骼交错脆响、短促闷哼", music: "激烈升调交响乐" },
  { order: 8, duration: 1.5, size: "extreme_close_up", angle: "eye_level", mov: "push_in", subj: "特工银狐受创", act: "特工银狐受到重击，面部仿生皮肤瞬间发生像素化数据撕裂闪烁。", dialogue: "系统警报：“核心代码崩溃率 78%……”", sfx: "机械故障杂音、数字代码撕裂爆鸣", music: "失真低音轰鸣" },
  { order: 9, duration: 3.5, size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", subj: "子弹时间 (Bullet Time)", act: "360度子弹时间慢动作环绕，墨客侧身避开撕裂空气的超音速弹道，水珠在空中静止悬停。", dialogue: "墨客：“天下武功，唯快不破。”", sfx: "超慢动作子弹音爆、悬停水滴共振声", music: "史诗级慢动作唯美弦乐升华" },
  { order: 10, duration: 2.0, size: "full_shot", angle: "low_angle", mov: "tilt_up", subj: "终极一击 (Finishing Strike)", act: "仰角机位上摇，墨客凌空踏步飞膝重重轰在特工银狐胸口，将其撞飞破门而入。", dialogue: "墨客：“归零！”", sfx: "巨力轰击音爆、木门碎裂轰然巨响", music: "全乐团高潮交响合鸣" },
  { order: 11, duration: 2.5, size: "wide_shot", angle: "high_angle", mov: "pull_out", subj: "胜负已分 (Resolution)", act: "特工银狐倒在碎裂的茶楼门槛中化为绿色数据碎片消散，雨水逐渐平息。", dialogue: "旁白：“数据归于虚无，夜雨洗净尘埃。”", sfx: "代码消散颗粒声、细雨沥沥", music: "悠扬深邃的古琴与清澈钢琴" },
  { order: 12, duration: 3.0, size: "extreme_wide_shot", angle: "eye_level", mov: "crane", subj: "黑客墨客背影 (Ending)", act: "镜头缓缓升起拉远，墨客收势独立于青石街道，头顶的红灯笼在雨夜霓虹中摇曳定格。", dialogue: "墨客：“下一个节点，见。”", sfx: "夜风拂过灯笼轻微晃动声", music: "空灵悠远的赛博江湖余韵" },
];

async function ensureDemoProject(db: any) {
  const existing = await db.select().from(projects).where(eq(projects.id, "demo")).get();
  if (!existing) {
    await db.insert(projects).values({
      id: "demo",
      title: "黑客帝国：矩阵对决 (Hollywood Demo)",
      story: "雨夜赛博朋克茶馆前，黑客墨客遭遇矩阵特工银狐，展开一场咏春拳与子弹时间的终极对决。",
      targetDuration: 30.0,
    });
  }

  let seq = await db.select().from(sequences).where(eq(sequences.projectId, "demo")).get();
  if (!seq) {
    const seqId = "seq-demo-matrix";
    await db.insert(sequences).values({
      id: seqId,
      projectId: "demo",
      title: "雨夜茶楼对决 (Tea House Showdown)",
      order: 1,
    });
    seq = { id: seqId, projectId: "demo", title: "雨夜茶楼对决 (Tea House Showdown)", order: 1, createdAt: "", updatedAt: "" };
  }

  const existingShots = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).all();
  if (existingShots.length < 12 || !existingShots[0]?.dialogue) {
    await db.delete(shots).where(eq(shots.sequenceId, seq.id));

    for (const item of FULL_DEMO_SHOTS) {
      const cleanPrompt = item.act.replace(/[^\w\s,\.\-]/g, " ").trim();
      const demoImgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        `cinematic 2d monochrome graphite film storyboard illustration, 16:9 widescreen, ${cleanPrompt}, cyberpunk tea house martial arts matrix aesthetic`
      )}?width=512&height=288&seed=${item.order * 1000 + 42}&model=flux&nologo=true`;

      await db.insert(shots).values({
        id: `shot-demo-${String(item.order).padStart(2, "0")}`,
        sequenceId: seq.id,
        order: item.order,
        duration: item.duration,
        shotSize: item.size,
        cameraAngle: item.angle,
        cameraMovement: JSON.stringify({ type: item.mov }),
        subject: item.subj,
        action: item.act,
        dialogue: item.dialogue,
        narrativeFunction: item.order <= 4 ? "空间与人物建立" : item.order <= 8 ? "动作交锋与升级" : "子弹时间高潮与终局",
        lighting: "黑白灰石墨手绘光影",
        audio: JSON.stringify({ sfx: item.sfx, music: item.music }),
        imagePrompt: formatDirectorImagePrompt(item.act, item.size, item.angle, item.mov),
        videoPrompt: `Cinematic movie camera ${item.mov}, ${item.act}, 4k film still`,
        continuityData: JSON.stringify({ screen_direction: item.order % 2 === 0 ? "right_to_left" : "left_to_right" }),
        storyboardImageUrl: demoImgUrl,
        isDirty: false,
        isLocked: false,
      });
    }
  }
}

// GET /api/projects (Scoped by authenticated user + Demo)
router.get("/", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    await ensureDemoProject(db);

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);

    let allProjects: any[] = [];
    if (authUser) {
      allProjects = await db
        .select()
        .from(projects)
        .where(or(eq(projects.userId, authUser.userId), eq(projects.id, "demo")))
        .orderBy(desc(projects.createdAt))
        .all();
    } else {
      allProjects = await db
        .select()
        .from(projects)
        .where(or(isNull(projects.userId), eq(projects.id, "demo")))
        .orderBy(desc(projects.createdAt))
        .all();
    }

    const enriched = await Promise.all(
      allProjects.map(async (p) => {
        const seqs = await db.select().from(sequences).where(eq(sequences.projectId, p.id)).all();
        let totalShots = 0;
        let coverImageUrl = "";
        const previewImages: string[] = [];

        for (const s of seqs) {
          const shotList = await db.select().from(shots).where(eq(shots.sequenceId, s.id)).orderBy(shots.order).all();
          totalShots += shotList.length;
          for (const shot of shotList) {
            if (shot.storyboardImageUrl) {
              if (!coverImageUrl) coverImageUrl = shot.storyboardImageUrl;
              if (previewImages.length < 3) previewImages.push(shot.storyboardImageUrl);
            }
          }
        }

        return {
          id: p.id,
          user_id: p.userId,
          title: p.title,
          story: p.story,
          target_duration: p.targetDuration,
          shot_count: totalShots,
          cover_image_url: coverImageUrl,
          preview_images: previewImages,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        };
      })
    );

    return c.json(enriched);
  } catch (err: any) {
    console.error("[Get Projects Error]:", err);
    return c.json({ detail: `获取工程列表失败: ${err?.message || err}` }, 500);
  }
});

// GET /api/projects/:id
router.get("/:id", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");

    if (id === "demo" || id === "demo-matrix-cyber-master") {
      await ensureDemoProject(db);
    }

    const proj = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!proj) {
      return c.json({ detail: "Project not found" }, 404);
    }

    const seqs = await db.select().from(sequences).where(eq(sequences.projectId, id)).orderBy(sequences.order).all();

    const enrichedSeqs = await Promise.all(
      seqs.map(async (seq) => {
        const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).orderBy(shots.order).all();
        return {
          id: seq.id,
          project_id: seq.projectId,
          title: seq.title,
          order: seq.order,
          shots: shotList.map((s) => ({
            id: s.id,
            sequence_id: s.sequenceId,
            order: s.order,
            duration: s.duration,
            shot_size: s.shotSize,
            camera_angle: s.cameraAngle,
            camera_movement: s.cameraMovement ? JSON.parse(s.cameraMovement) : { type: "static" },
            subject: s.subject,
            action: s.action,
            dialogue: s.dialogue,
            narrative_function: s.narrativeFunction,
            lighting: s.lighting,
            audio: s.audio ? JSON.parse(s.audio) : {},
            image_prompt: s.imagePrompt,
            video_prompt: s.videoPrompt,
            continuity_data: s.continuityData ? JSON.parse(s.continuityData) : {},
            storyboard_image_url: s.storyboardImageUrl || "",
            is_dirty: s.isDirty,
            is_locked: s.isLocked,
            created_at: s.createdAt,
            updated_at: s.updatedAt,
          })),
        };
      })
    );

    return c.json({
      id: proj.id,
      user_id: proj.userId,
      title: proj.title,
      story: proj.story,
      target_duration: proj.targetDuration,
      created_at: proj.createdAt,
      updated_at: proj.updatedAt,
      sequences: enrichedSeqs,
    });
  } catch (err: any) {
    console.error("[Get Project Detail Error]:", err);
    return c.json({ detail: `获取项目详情失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/projects/:id/clone (1-Click Clone Demo or Project for Authenticated User)
router.post("/:id/clone", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const srcId = c.req.param("id");
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);

    if (!authUser) {
      return c.json({ detail: "请先登录或注册导演账号后再克隆工程" }, 401);
    }

    if (srcId === "demo") {
      await ensureDemoProject(db);
    }

    const srcProj = await db.select().from(projects).where(eq(projects.id, srcId)).get();
    if (!srcProj) {
      return c.json({ detail: "源项目不存在" }, 404);
    }

    const newProjId = crypto.randomUUID();
    const newTitle = `${srcProj.title} (我的副本)`;

    const [clonedProj] = await db
      .insert(projects)
      .values({
        id: newProjId,
        userId: authUser.userId,
        title: newTitle,
        story: srcProj.story,
        targetDuration: srcProj.targetDuration,
      })
      .returning();

    const srcSeqs = await db.select().from(sequences).where(eq(sequences.projectId, srcId)).orderBy(sequences.order).all();

    for (const seq of srcSeqs) {
      const newSeqId = crypto.randomUUID();
      await db.insert(sequences).values({
        id: newSeqId,
        projectId: newProjId,
        title: seq.title,
        order: seq.order,
      });

      const srcShots = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).orderBy(shots.order).all();
      for (const s of srcShots) {
        await db.insert(shots).values({
          id: crypto.randomUUID(),
          sequenceId: newSeqId,
          order: s.order,
          duration: s.duration,
          shotSize: s.shotSize,
          cameraAngle: s.cameraAngle,
          cameraMovement: s.cameraMovement,
          subject: s.subject,
          action: s.action,
          dialogue: s.dialogue,
          narrativeFunction: s.narrativeFunction,
          lighting: s.lighting,
          audio: s.audio,
          imagePrompt: s.imagePrompt,
          videoPrompt: s.videoPrompt,
          continuityData: s.continuityData,
          storyboardImageUrl: s.storyboardImageUrl,
          isDirty: false,
          isLocked: s.isLocked,
        });
      }
    }

    return c.json(
      {
        id: clonedProj.id,
        user_id: clonedProj.userId,
        title: clonedProj.title,
        story: clonedProj.story,
        target_duration: clonedProj.targetDuration,
        created_at: clonedProj.createdAt,
      },
      201
    );
  } catch (err: any) {
    console.error("[Clone Project Error]:", err);
    return c.json({ detail: `克隆项目失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/projects (Auto-generate real AI visual storyboards concurrently with seed chain)
router.post("/", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const title = body.title || "未命名项目";
    const story = body.story || "";
    const targetDuration = Number(body.target_duration) || 30.0;

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);

    if (!authUser) {
      return c.json({ detail: "请先登录或注册导演账号后再创建分镜工程" }, 401);
    }

    const [newProj] = await db
      .insert(projects)
      .values({
        id,
        userId: authUser.userId,
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

    const effectiveStory = story.trim() || title.trim();
    const baseSeed = getProjectBaseSeed(id);

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.hasKey) {
      return c.json({ detail: "请先在「设置」中配置您的专属 OpenRouter API Key 后再使用 AI 导演服务" }, 400);
    }

    try {
      // 10s strict timeout wrapper with graceful adaptive fallback
      const directorPromise = runDirectorPipeline(effectiveStory, targetDuration, {
        apiKey: settings.llmApiKey,
        apiBase: settings.llmApiBase,
        model: settings.llmModel,
      });

      const timeoutPromise = new Promise<{ theme: string; target_duration: number; shots: any[] }>((resolve) =>
        setTimeout(() => {
          console.warn(`[Project Creation] LLM breakdown exceeded 10s, utilizing high-quality adaptive fallback`);
          resolve({
            theme: effectiveStory.slice(0, 30) || "AI 导演项目",
            target_duration: targetDuration,
            shots: generateAdaptiveStoryShots(effectiveStory, targetDuration),
          });
        }, 10000)
      );

      const plan = await Promise.race([directorPromise, timeoutPromise]);

      // Fast instant insertion of structured director shots into D1
      const insertedShotTasks: { shotId: string; s: any }[] = [];
      for (const s of plan.shots) {
        const shotId = crypto.randomUUID();
        insertedShotTasks.push({ shotId, s });
        await db.insert(shots).values({
          id: shotId,
          sequenceId: seqId,
          order: s.order,
          duration: s.duration,
          shotSize: s.shot_size,
          cameraAngle: s.camera_angle,
          cameraMovement: JSON.stringify(s.camera_movement || {}),
          subject: s.subject || "",
          action: s.action,
          dialogue: s.dialogue || "",
          narrativeFunction: s.narrative_function || "动作推进",
          lighting: s.lighting || "黑白灰石墨光影",
          audio: JSON.stringify(s.audio || {}),
          imagePrompt: s.image_prompt,
          videoPrompt: s.video_prompt,
          continuityData: JSON.stringify(s.continuity_data || {}),
          storyboardImageUrl: "",
          isDirty: false,
          isLocked: false,
        });
      }

      // Background image rendering
      const backgroundRenderJob = async () => {
        try {
          await runConcurrentTasks(insertedShotTasks, 3, async ({ shotId, s }) => {
            const seed = baseSeed + s.order * 1000;
            const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
            await db
              .update(shots)
              .set({
                storyboardImageUrl: imageUrl,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(shots.id, shotId));
          });
          console.log(`[Worker Background Task] Successfully rendered all ${insertedShotTasks.length} shots to R2 for project ${id}`);
        } catch (bgErr) {
          console.error(`[Worker Background Task] Error rendering shots for project ${id}:`, bgErr);
        }
      };

      if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
        c.executionCtx.waitUntil(backgroundRenderJob());
      } else {
        backgroundRenderJob();
      }
    } catch (e) {
      console.error("Auto shot breakdown error during project creation:", e);
    }

    return c.json(newProj, 201);
  } catch (err: any) {
    console.error("[Create Project Error]:", err);
    return c.json({ detail: `创建工程失败: ${err?.message || err}` }, 500);
  }
});

// PUT /api/projects/:id
router.put("/:id", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");
    const body = await c.req.json();

    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.story !== undefined) updates.story = body.story;
    if (body.target_duration !== undefined) updates.targetDuration = Number(body.target_duration);
    updates.updatedAt = new Date().toISOString();

    const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    if (!updated) {
      return c.json({ detail: "Project not found" }, 404);
    }

    return c.json(updated);
  } catch (err: any) {
    console.error("[Update Project Error]:", err);
    return c.json({ detail: `更新工程失败: ${err?.message || err}` }, 500);
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");

    if (id === "demo") {
      return c.json({ detail: "官方演示项目不允许删除" }, 403);
    }

    const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();
    if (!deleted) {
      return c.json({ detail: "Project not found" }, 404);
    }

    return c.json({ success: true });
  } catch (err: any) {
    console.error("[Delete Project Error]:", err);
    return c.json({ detail: `删除工程失败: ${err?.message || err}` }, 500);
  }
});

export default router;
