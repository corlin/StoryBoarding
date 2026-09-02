import { Hono } from "hono";
import { eq, desc, or, isNull } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { projects, sequences, shots, systemSettings, users } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt, generateAdaptiveStoryShots } from "../agents/director/pipeline";
import { generateCinematicStoryboardImage, runConcurrentTasks, getProjectBaseSeed } from "./generation";
import { getAuthUser, getUserSettings } from "../lib/auth";

const router = new Hono<{ Bindings: Bindings }>();

// GET /api/projects (Scoped by authenticated user)
router.get("/", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);

    let allProjects: any[] = [];
    if (authUser) {
      allProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, authUser.userId))
        .orderBy(desc(projects.createdAt))
        .all();
    } else {
      allProjects = [];
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
