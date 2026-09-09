import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { characters, dialogueLines, generationJobs, projects, takes } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { buildOpenRouterTtsRequest, chooseTtsVoice, spokenTextFromDialogue } from "../lib/tts";

const router = new Hono<{ Bindings: Bindings }>();

router.post("/tts/:dialogueId", async (c) => {
  const authUser = await getAuthUser(c.req.header("Authorization"));
  if (!authUser) return c.json({ detail: "请先登录" }, 401);

  await ensureSchema(c.env.DB);
  const db = getDb(c.env.DB);
  const dialogueId = c.req.param("dialogueId");
  const body = await c.req.json().catch(() => ({}));

  try {
    const line = await db.select().from(dialogueLines).where(eq(dialogueLines.id, dialogueId)).get();
    if (!line) return c.json({ detail: "台词记录不存在，请先保存台词" }, 404);
    const project = await db.select().from(projects).where(eq(projects.id, line.projectId)).get();
    if (!project || project.userId !== authUser.userId) return c.json({ detail: "无权访问该台词" }, 403);
    if (!line.shotId) return c.json({ detail: "台词尚未关联镜头，无法建立配音候选" }, 400);

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.ttsApiKey) {
      return c.json({ detail: "未配置 OpenRouter API Key，请先在模型设置中保存密钥", error_code: "NO_TTS_KEY" }, 400);
    }

    const spokenText = spokenTextFromDialogue(line.text, line.speaker);
    if (!spokenText) return c.json({ detail: "台词内容为空" }, 400);
    if (spokenText.length > 4000) return c.json({ detail: "单条台词超过 4000 字符，请拆分后生成" }, 400);

    const projectCharacters = await db.select().from(characters).where(eq(characters.projectId, line.projectId)).all();
    const character = projectCharacters.find((item: any) => item.name === line.speaker);
    const voice = (typeof body.voice === "string" && body.voice.trim()) || chooseTtsVoice(
      line.speaker,
      character?.voiceDna || "",
      {
        female: settings.ttsVoiceFemale,
        male: settings.ttsVoiceMale,
        narrator: settings.ttsVoiceNarrator,
      },
    );
    const speedValue = Number(body.speed ?? 1);
    const speed = Number.isFinite(speedValue) ? Math.min(2, Math.max(0.5, speedValue)) : 1;
    const model = settings.ttsModel;
    const now = new Date().toISOString();
    const jobId = crypto.randomUUID();
    const takeId = `tts-${jobId}`;

    await db.insert(generationJobs).values({
      id: jobId,
      projectId: line.projectId,
      shotId: line.shotId,
      jobType: "tts",
      provider: "openrouter",
      model,
      inputRevision: `${dialogueId}:${spokenText}`.substring(0, 500),
      parameters: JSON.stringify({ dialogue_id: dialogueId, speaker: line.speaker, voice, speed, characters: spokenText.length }),
      status: "submitted",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    let response: Response;
    try {
      response = await fetch(`${settings.ttsApiBase.replace(/\/+$/, "")}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.ttsApiKey}`,
          "HTTP-Referer": "https://storyboarding.caifu.social",
          "X-Title": "AI StoryBoarding TTS",
        },
        body: JSON.stringify(buildOpenRouterTtsRequest(model, spokenText, voice, speed)),
      });
    } catch (error: any) {
      const reason = `OpenRouter TTS 连接失败：${error?.message || error}`;
      await db.update(generationJobs).set({ status: "failed", failureReason: reason, completedAt: now, updatedAt: now })
        .where(eq(generationJobs.id, jobId));
      return c.json({ detail: reason, job_id: jobId, status: "failed" }, 502);
    }

    if (!response.ok) {
      const providerError = (await response.text()).substring(0, 1000);
      const reason = `OpenRouter TTS 返回 HTTP ${response.status}: ${providerError}`;
      await db.update(generationJobs).set({ status: "failed", failureReason: reason, completedAt: now, updatedAt: now })
        .where(eq(generationJobs.id, jobId));
      return c.json({ detail: reason, job_id: jobId, status: "failed" }, 502);
    }

    const audio = await response.arrayBuffer();
    if (!audio.byteLength || audio.byteLength > 20 * 1024 * 1024) {
      const reason = !audio.byteLength ? "OpenRouter TTS 返回了空音频" : "OpenRouter TTS 音频超过 20MB 限制";
      await db.update(generationJobs).set({ status: "failed", failureReason: reason, completedAt: now, updatedAt: now })
        .where(eq(generationJobs.id, jobId));
      return c.json({ detail: reason, job_id: jobId, status: "failed" }, 502);
    }
    if (!c.env.STORAGE) {
      const reason = "R2 storage is not configured";
      await db.update(generationJobs).set({ status: "failed", failureReason: reason, completedAt: now, updatedAt: now })
        .where(eq(generationJobs.id, jobId));
      return c.json({ detail: reason, job_id: jobId, status: "failed" }, 503);
    }

    const r2Key = `takes/${line.shotId}/${takeId}.mp3`;
    await c.env.STORAGE.put(r2Key, audio, { httpMetadata: { contentType: "audio/mpeg" } });
    const mediaUrl = `/api/assets/${r2Key}`;
    const generationId = response.headers.get("x-generation-id") || "";

    await db.insert(takes).values({
      id: takeId,
      projectId: line.projectId,
      shotId: line.shotId,
      jobId,
      takeType: "audio",
      source: "ai_generated",
      mediaUrl,
      reviewStatus: "pending",
      isAdopted: false,
      metadata: JSON.stringify({
        dialogue_id: dialogueId,
        speaker: line.speaker,
        voice,
        speed,
        model,
        characters: spokenText.length,
        generation_id: generationId,
        r2_persisted: true,
      }),
      createdAt: now,
      updatedAt: now,
    });
    await db.update(generationJobs).set({
      status: "succeeded",
      externalTaskId: generationId,
      resultUrl: mediaUrl,
      resultMetadata: JSON.stringify({ take_id: takeId, dialogue_id: dialogueId, bytes: audio.byteLength }),
      completedAt: now,
      updatedAt: now,
    }).where(eq(generationJobs.id, jobId));

    return c.json({
      status: "succeeded",
      job_id: jobId,
      take_id: takeId,
      dialogue_id: dialogueId,
      media_url: mediaUrl,
      model,
      voice,
      characters: spokenText.length,
      cost_recorded: false,
    });
  } catch (error: any) {
    console.error("[TTS Generation Error]", error);
    return c.json({ detail: `配音生成失败：${error?.message || error}` }, 500);
  }
});

export default router;
