import { Hono } from "hono";
import { eq, desc, or, isNull } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { projects, sequences, shots, users, characters } from "../db/schema";
import { runDirectorPipeline, formatDirectorImagePrompt, generateAdaptiveStoryShots } from "../agents/director/pipeline";
import { scanLongformSeries } from "../agents/director/seriesScanner";
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

    const charList = await db.select().from(characters).where(eq(characters.projectId, id)).all();

    const seqs = await db.select().from(sequences).where(eq(sequences.projectId, id)).orderBy(sequences.order).all();

    const enrichedSeqs = await Promise.all(
      seqs.map(async (seq) => {
        const shotList = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).orderBy(shots.order).all();
        return {
          id: seq.id,
          project_id: seq.projectId,
          title: seq.title,
          order: seq.order,
          episode_number: seq.episodeNumber ?? 1,
          cliffhanger_summary: seq.cliffhangerSummary || "",
          target_duration: seq.targetDuration ?? 60.0,
          screenplay_text: seq.screenplayText || "",
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
            beat_type: s.beatType,
            emotional_voltage: s.emotionalVoltage,
            information_gap: s.informationGap,
            compute_tier: s.computeTier,
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
      characters: charList.map((c) => ({
        id: c.id,
        project_id: c.projectId,
        name: c.name,
        role: c.role,
        visual_anchor: c.visualAnchor,
        avatar_url: c.avatarUrl,
        personality: c.personality,
        created_at: c.createdAt,
      })),
      sequences: enrichedSeqs,
    });
  } catch (err: any) {
    console.error("[Get Project Detail Error]:", err);
    return c.json({ detail: `获取项目详情失败: ${err?.message || err}` }, 500);
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
          beatType: s.beat_type || "tension_build",
          emotionalVoltage: Number(s.emotional_voltage) || 50.0,
          informationGap: s.information_gap || "",
          computeTier: s.compute_tier || "standard",
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

// POST /api/projects/analyze-series (Stage 1: Macro Narrative Scanner)
router.post("/analyze-series", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    const settings = await getUserSettings(db, authUser?.userId);

    const body = await c.req.json().catch(() => ({}));
    const text = (body.text || body.story || "").trim();
    const targetEpisodes = Number(body.target_episodes) || 3;

    if (!text) {
      return c.json({ detail: "请输入需要解构的长篇剧本或小说故事内容" }, 400);
    }

    const analysis = await scanLongformSeries(text, targetEpisodes, {
      apiKey: settings.llmApiKey,
      apiBase: settings.llmApiBase,
      model: settings.llmModel,
    });

    return c.json(analysis);
  } catch (err: any) {
    console.error("[Analyze Series Error]:", err);
    return c.json({ detail: `长篇宏观叙事扫描失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/projects/create-series (Stage 2: Multi-Episode Series Parallel Compilation)
router.post("/create-series", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);

    if (!authUser) {
      return c.json({ detail: "请先登录后再创建多集短剧工程" }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const title = (body.title || "新多集短剧工程").trim();
    const story = (body.story || "").trim();
    const rawCharacters = Array.isArray(body.characters) ? body.characters : [];
    const rawEpisodes = Array.isArray(body.episodes) ? body.episodes : [];

    if (rawEpisodes.length === 0) {
      return c.json({ detail: "剧集列表不能为空，请至少保留 1 集" }, 400);
    }

    const settings = await getUserSettings(db, authUser.userId);
    const projectId = crypto.randomUUID();
    const baseSeed = getProjectBaseSeed(title);

    // 1. Insert Project
    const totalTargetDuration = rawEpisodes.reduce((acc: number, ep: any) => acc + (Number(ep.target_duration) || 60), 0);
    await db.insert(projects).values({
      id: projectId,
      userId: authUser.userId,
      title,
      story,
      targetDuration: totalTargetDuration,
    });

    // 2. Insert Characters
    const insertedCharacters: any[] = [];
    for (const char of rawCharacters) {
      const charId = crypto.randomUUID();
      const newChar = {
        id: charId,
        projectId,
        name: char.name || "主要角色",
        role: char.role || "protagonist",
        visualAnchor: char.visual_anchor || "",
        avatarUrl: char.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(char.name || "hero")}`,
        personality: char.personality || "",
      };
      await db.insert(characters).values(newChar);
      insertedCharacters.push(newChar);
    }

    // Global character visual context to inject into director pipeline
    const characterAnchorContext = insertedCharacters
      .filter((c) => c.visualAnchor)
      .map((c) => `[Character: ${c.name} (${c.role})] ${c.visualAnchor}`)
      .join(". ");

    // 3. Process Episodes in Parallel (Concurrent Episode Breakdown)
    const allInsertedShotTasks: { shotId: string; s: any }[] = [];
    const createdEpisodes: any[] = [];

    for (let i = 0; i < rawEpisodes.length; i++) {
      const ep = rawEpisodes[i];
      const seqId = crypto.randomUUID();
      const epDuration = Number(ep.target_duration) || 60;
      const epTitle = ep.title || `第 ${i + 1} 集`;

      await db.insert(sequences).values({
        id: seqId,
        projectId,
        title: epTitle,
        order: i + 1,
        episodeNumber: Number(ep.episode_number) || i + 1,
        cliffhangerSummary: ep.cliffhanger_hook || "",
        targetDuration: epDuration,
        screenplayText: ep.synopsis || story || "",
      });

      // Construct enriched episode context with character DNA
      const epStory = `${ep.synopsis || story}. 集尾卡点悬念：${ep.cliffhanger_hook || "悬念未决"}. 核心出场角色：${(ep.featured_characters || []).join("、")}. ${characterAnchorContext}`;

      // Fast, non-blocking narrative shot breakdown (instant 0ms response, zero Cloudflare timeout risk)
      const epShots = generateAdaptiveStoryShots(epStory, epDuration);

      for (const s of epShots) {
        const shotId = crypto.randomUUID();
        allInsertedShotTasks.push({ shotId, s });
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
          beatType: s.beat_type || "tension_build",
          emotionalVoltage: Number(s.emotional_voltage) || 50.0,
          informationGap: s.information_gap || "",
          computeTier: s.compute_tier || "standard",
          storyboardImageUrl: "",
          isDirty: false,
          isLocked: false,
        });
      }

      createdEpisodes.push({
        id: seqId,
        project_id: projectId,
        title: epTitle,
        order: i + 1,
        episode_number: Number(ep.episode_number) || i + 1,
        cliffhanger_summary: ep.cliffhanger_hook || "",
        target_duration: epDuration,
        screenplay_text: ep.synopsis || story || "",
      });
    }

    // 4. Bounded background image rendering for Episode 1 preview frames (up to 4 shots to avoid Cloudflare limit)
    if (settings.hasKey) {
      const previewTasks = allInsertedShotTasks.slice(0, 4);
      const backgroundRenderJob = async () => {
        try {
          await runConcurrentTasks(previewTasks, 2, async ({ shotId, s }) => {
            try {
              const seed = baseSeed + s.order * 1000;
              const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
              await db
                .update(shots)
                .set({
                  storyboardImageUrl: imageUrl,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(shots.id, shotId));
            } catch (imgErr) {
              console.warn(`[Image Render Fail Shot ${shotId}]:`, imgErr);
            }
          });
        } catch (bgErr) {
          console.warn("[Series Background Task Error]:", bgErr);
        }
      };

      if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
        c.executionCtx.waitUntil(backgroundRenderJob());
      }
    }

    return c.json(
      {
        id: projectId,
        title,
        story,
        target_duration: totalTargetDuration,
        characters: insertedCharacters,
        sequences: createdEpisodes,
      },
      201
    );
  } catch (err: any) {
    console.error("[Create Series Error]:", err);
    return c.json({ detail: `多集短剧工程创建失败: ${err?.message || err}` }, 500);
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

    if (Array.isArray(body.characters)) {
      for (const ch of body.characters) {
        if (ch.id) {
          const existing = await db.select().from(characters).where(eq(characters.id, ch.id)).get();
          if (existing) {
            await db.update(characters).set({
              name: ch.name || existing.name,
              role: ch.role || existing.role,
              visualAnchor: ch.visual_anchor || ch.visualAnchor || existing.visualAnchor,
              personality: ch.personality || existing.personality,
              avatarUrl: ch.avatar_url || ch.avatarUrl || existing.avatarUrl,
            }).where(eq(characters.id, ch.id));
          } else {
            await db.insert(characters).values({
              id: ch.id,
              projectId: id,
              name: ch.name,
              role: ch.role || "supporting",
              visualAnchor: ch.visual_anchor || ch.visualAnchor || "",
              personality: ch.personality || "",
              avatarUrl: ch.avatar_url || ch.avatarUrl || "",
            });
          }
        } else if (ch.name) {
          await db.insert(characters).values({
            id: crypto.randomUUID(),
            projectId: id,
            name: ch.name,
            role: ch.role || "supporting",
            visualAnchor: ch.visual_anchor || ch.visualAnchor || "",
            personality: ch.personality || "",
            avatarUrl: ch.avatar_url || ch.avatarUrl || "",
          });
        }
      }
    }

    // Return enriched project with latest characters
    const latestChars = await db.select().from(characters).where(eq(characters.projectId, id)).all();
    return c.json({
      ...updated,
      style_config: body.style_config || {},
      characters: latestChars,
    });
  } catch (err: any) {
    console.error("[Update Project Error]:", err);
    return c.json({ detail: `更新工程失败: ${err?.message || err}` }, 500);
  }
});

// PUT /api/projects/:id/sequences/:seqId/screenplay (Update literary master screenplay)
router.put("/:id/sequences/:seqId/screenplay", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");
    const seqId = c.req.param("seqId");

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录导演账号" }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const screenplayText = (body.screenplay_text || "").trim();

    const [updated] = await db
      .update(sequences)
      .set({
        screenplayText,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sequences.id, seqId))
      .returning();

    if (!updated) {
      return c.json({ detail: "Sequence not found" }, 404);
    }

    return c.json({
      status: "success",
      sequence_id: seqId,
      screenplay_text: updated.screenplayText,
    });
  } catch (err: any) {
    console.error("[Update Screenplay Error]:", err);
    return c.json({ detail: `更新剧本母本失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/projects/:id/episodes (Add next episode in workspace, inheriting global character visual DNA)
router.post("/:id/episodes", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录导演账号" }, 401);
    }

    const proj = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!proj) {
      return c.json({ detail: "Project not found" }, 404);
    }

    const body = await c.req.json();
    const episodeStory = (body.story || "").trim();
    const targetDuration = Number(body.target_duration) || 60.0;

    if (!episodeStory) {
      return c.json({ detail: "请输入下一集的剧情梗概或剧本内容" }, 400);
    }

    // 1. Calculate next episode number
    const existingSeqs = await db
      .select()
      .from(sequences)
      .where(eq(sequences.projectId, id))
      .orderBy(sequences.order)
      .all();
    const nextEpisodeNumber = existingSeqs.length + 1;
    const episodeTitle = body.title?.trim() || `第 ${nextEpisodeNumber} 集 · 危机升级`;

    // 2. Fetch all characters for this project to inherit Visual DNA
    const projectChars = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, id))
      .all();

    const charContext = projectChars.length > 0
      ? `【全局全剧角色视觉基准】\n` +
        projectChars.map((ch) => `- ${ch.name} (${ch.role}): ${ch.visualAnchor}`).join("\n") +
        `\n\n【本集剧本/情节】\n${episodeStory}`
      : episodeStory;

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.hasKey) {
      return c.json({ detail: "请先在「设置」中配置您的专属 OpenRouter API Key 后再使用 AI 导演拆镜服务" }, 400);
    }

    // 3. Run director pipeline with timeout fallback
    const directorPromise = runDirectorPipeline(charContext, targetDuration, {
      apiKey: settings.llmApiKey,
      apiBase: settings.llmApiBase,
      model: settings.llmModel,
    });

    const timeoutPromise = new Promise<{ theme: string; target_duration: number; shots: any[] }>((resolve) =>
      setTimeout(() => {
        resolve({
          theme: episodeTitle,
          target_duration: targetDuration,
          shots: generateAdaptiveStoryShots(episodeStory, targetDuration),
        });
      }, 12000)
    );

    const plan = await Promise.race([directorPromise, timeoutPromise]);

    // 4. Create new sequence in database
    const seqId = crypto.randomUUID();
    await db.insert(sequences).values({
      id: seqId,
      projectId: id,
      title: episodeTitle,
      order: nextEpisodeNumber,
      episodeNumber: nextEpisodeNumber,
      cliffhangerSummary: body.cliffhanger_summary || "危机升级悬念卡点",
      targetDuration,
    });

    // 5. Insert shots
    const baseSeed = getProjectBaseSeed(id);
    const insertedShotTasks: { shotId: string; s: any; slot: number }[] = [];

    for (let slot = 0; slot < plan.shots.length; slot++) {
      const s = plan.shots[slot];
      const shotId = crypto.randomUUID();
      insertedShotTasks.push({ shotId, s, slot: slot + 1 });

      await db.insert(shots).values({
        id: shotId,
        sequenceId: seqId,
        order: s.order || slot + 1,
        duration: s.duration || 3.0,
        shotSize: s.shot_size || "medium_shot",
        cameraAngle: s.camera_angle || "eye_level",
        cameraMovement: JSON.stringify(s.camera_movement || {}),
        subject: s.subject || "",
        action: s.action || "",
        dialogue: s.dialogue || "",
        narrativeFunction: s.narrative_function || "动作推进",
        lighting: s.lighting || "自然电影光影",
        audio: JSON.stringify(s.audio || {}),
        imagePrompt: s.image_prompt || "",
        videoPrompt: s.video_prompt || "",
        continuityData: JSON.stringify(s.continuity_data || {}),
        beatType: s.beat_type || "tension_build",
        emotionalVoltage: Number(s.emotional_voltage) || 60.0,
        informationGap: s.information_gap || "",
        computeTier: s.compute_tier || "standard",
        storyboardImageUrl: "",
        isDirty: false,
        isLocked: false,
      });
    }

    // 6. Background R2 Image Generation
    const backgroundJob = async () => {
      try {
        await runConcurrentTasks(insertedShotTasks, 3, async ({ shotId, s, slot }) => {
          const seed = baseSeed + (nextEpisodeNumber * 10000) + (slot * 1000);
          const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
          await db
            .update(shots)
            .set({ storyboardImageUrl: imageUrl, updatedAt: new Date().toISOString() })
            .where(eq(shots.id, shotId));
        });
      } catch (err) {
        console.error(`[Background Image Generation Episode ${nextEpisodeNumber} Error]:`, err);
      }
    };

    if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
      c.executionCtx.waitUntil(backgroundJob());
    } else {
      backgroundJob();
    }

    return c.json({
      status: "success",
      episode_id: seqId,
      episode_number: nextEpisodeNumber,
      episode_title: episodeTitle,
      shots_count: plan.shots.length,
    });
  } catch (err: any) {
    console.error("[Add Episode Error]:", err);
    return c.json({ detail: `新增短剧分集失败: ${err?.message || err}` }, 500);
  }
});

// POST /api/projects/:id/expand-to-series (Expand single-scene project into a multi-episode series)
router.post("/:id/expand-to-series", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const id = c.req.param("id");

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录导演账号" }, 401);
    }

    const proj = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!proj) {
      return c.json({ detail: "Project not found" }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const userPrompt = (body.continuation_prompt || "").trim();
    const episodesToAdd = Math.min(Math.max(Number(body.episodes_to_add) || 2, 1), 4);

    const existingSeqs = await db
      .select()
      .from(sequences)
      .where(eq(sequences.projectId, id))
      .orderBy(sequences.order)
      .all();

    const pilotSeq = existingSeqs[0];
    const pilotShots = pilotSeq
      ? await db.select().from(shots).where(eq(shots.sequenceId, pilotSeq.id)).orderBy(shots.order).all()
      : [];

    const existingChars = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, id))
      .all();

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.hasKey) {
      return c.json({ detail: "请先在「设置」中配置您的专属 OpenRouter API Key" }, 400);
    }

    const pilotPlotSummary = pilotShots.map((s, idx) => `${idx + 1}. [${s.subject}] ${s.action} (台词: ${s.dialogue || "无"})`).join("\n");
    const characterContext = existingChars.map((ch) => `${ch.name} (${ch.role}): ${ch.visualAnchor}`).join("\n");

    const expansionPrompt = `你是一位好莱坞商业短剧编剧总监。
当前短剧工程已有「第 1 集（Pilot）」，故事与分镜概要如下：
【第 1 集剧情概要】:
${proj.story || "第一幕：冲突爆发"}
【第 1 集分镜推进】:
${pilotPlotSummary}
【已固化角色】:
${characterContext || "主角"}

${userPrompt ? `【创作者续订后续方向与意向】:\n${userPrompt}\n` : ""}

请基于第 1 集结尾的悬念卡点，顺延创作接下来的 ${episodesToAdd} 集短剧剧本大纲。
必须输出纯合法 JSON 格式（不要包含任何 markdown 代码块标记，不要多余文字），格式如下：
{
  "episodes": [
    {
      "title": "第 2 集：反击破局",
      "synopsis": "详细剧情梗概（100~200字，必须有强烈冲突和情理之中意料之外的反转）",
      "cliffhanger_hook": "集尾生死悬念钩子（必须让观众迫不及待点击下一集）",
      "target_duration": 60.0
    }
  ]
}`;

    let parsedEpisodes: any[] = [];
    try {
      const response = await fetch(`${settings.llmApiBase || "https://openrouter.ai/api/v1"}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.llmApiKey}`,
        },
        body: JSON.stringify({
          model: settings.llmModel || "deepseek/deepseek-chat",
          temperature: 0.7,
          messages: [{ role: "user", content: expansionPrompt }],
        }),
      });
      if (response.ok) {
        const data: any = await response.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.episodes)) {
            parsedEpisodes = parsed.episodes;
          }
        }
      }
    } catch (llmErr) {
      console.warn("[Expansion LLM Warning]:", llmErr);
    }

    if (parsedEpisodes.length === 0) {
      for (let i = 1; i <= episodesToAdd; i++) {
        const epNum = existingSeqs.length + i;
        parsedEpisodes.push({
          title: `第 ${epNum} 集：${epNum === 2 ? "暗流涌动" : epNum === 3 ? "绝境反扑" : "决胜之战"}`,
          synopsis: `紧接前情，局势进一步恶化，主角面临更为严峻的双重背叛与生死考验，必须打破常规完成极限突围。`,
          cliffhanger_hook: `关键证人突然倒下，留下神秘的血色符号指向更深的幕后黑手！`,
          target_duration: 60.0,
        });
      }
    }

    const createdEpisodes: any[] = [];
    const hashString = (str: string) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
      }
      return h;
    };
    const baseSeed = 100000 + (Math.abs(hashString(id)) % 800000);

    for (let i = 0; i < parsedEpisodes.length; i++) {
      const epData = parsedEpisodes[i];
      const nextEpNum = existingSeqs.length + i + 1;
      const seqId = crypto.randomUUID();

      await db.insert(sequences).values({
        id: seqId,
        projectId: id,
        title: epData.title || `第 ${nextEpNum} 集`,
        order: nextEpNum,
        episodeNumber: nextEpNum,
        cliffhangerSummary: epData.cliffhanger_hook || "生死卡点",
        targetDuration: epData.target_duration || 60.0,
      });

      const planShots = generateAdaptiveStoryShots(epData.synopsis, epData.target_duration || 60.0);
      const insertedShotTasks: any[] = [];

      for (let slot = 0; slot < planShots.length; slot++) {
        const s = planShots[slot];
        const shotId = crypto.randomUUID();
        insertedShotTasks.push({ shotId, s, slot });

        await db.insert(shots).values({
          id: shotId,
          sequenceId: seqId,
          order: slot + 1,
          shotSize: s.shot_size || "medium_shot",
          cameraMovement: s.camera_movement ? JSON.stringify(s.camera_movement) : "{}",
          cameraAngle: s.camera_angle || "eye_level",
          subject: s.subject || "",
          action: s.action || "",
          dialogue: s.dialogue || "",
          audio: s.audio ? (typeof s.audio === "object" ? JSON.stringify(s.audio) : s.audio) : "{}",
          duration: Number(s.duration) || 3.0,
          imagePrompt: s.image_prompt || "",
          beatType: s.beat_type || (slot === planShots.length - 1 ? "cliffhanger_hook" : "tension_build"),
          emotionalVoltage: Number(s.emotional_voltage) || 60,
          informationGap: s.information_gap || "",
          computeTier: "standard",
          storyboardImageUrl: "",
          isDirty: false,
          isLocked: false,
        });
      }

      const bgTask = async () => {
        try {
          await runConcurrentTasks(insertedShotTasks, 3, async ({ shotId, s, slot }) => {
            const seed = baseSeed + (nextEpNum * 10000) + (slot * 1000);
            const imageUrl = await generateCinematicStoryboardImage(s.image_prompt, shotId, settings, c.env.STORAGE, seed);
            await db.update(shots).set({ storyboardImageUrl: imageUrl, updatedAt: new Date().toISOString() }).where(eq(shots.id, shotId));
          });
        } catch (e) {
          console.error(`[Background Image Gen Expand Ep ${nextEpNum} Error]:`, e);
        }
      };

      if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
        c.executionCtx.waitUntil(bgTask());
      } else {
        bgTask();
      }

      createdEpisodes.push({
        id: seqId,
        order: nextEpNum,
        title: epData.title,
        shots_count: planShots.length,
      });
    }

    return c.json({
      status: "success",
      message: `成功为单场戏扩写追加了 ${createdEpisodes.length} 集连载剧集！`,
      created_episodes: createdEpisodes,
    });
  } catch (err: any) {
    console.error("[Expand To Series Error]:", err);
    return c.json({ detail: `单场扩写多集短剧失败: ${err?.message || err}` }, 500);
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
