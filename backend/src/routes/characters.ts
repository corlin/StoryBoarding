import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { characters, shots } from "../db/schema";
import { getAuthUser, getUserSettings } from "../lib/auth";
import { saveImageToR2 } from "../lib/storage";

const router = new Hono<{ Bindings: Bindings }>();

// Pre-curated Multi-Angle Turnaround & Model Sheet Prompts
export const TURNAROUND_PROMPT_PRESETS = [
  {
    id: "turnaround_3view",
    name: "工业三视图定妆 (Front/Side/Back 3-View)",
    category: "standard",
    description: "标准工业级全身三视图，正视、侧视、后背视线对齐，适合 3D 建模与多角度生图垫图",
    template:
      "character sheet, full body turnaround, front view, side profile view, back view, neutral A-pose, clean neutral studio lighting, plain white background, cinematic realistic character design, precise facial alignment, 8k uhd",
  },
  {
    id: "turnaround_portrait_3quarter",
    name: "电影级特写与 3/4 侧脸定妆 (Close-up & 3/4 View)",
    category: "cinematic",
    description: "聚焦面部骨骼、发型、眼神与微表情的多角度面容库，极大增强面部识别与一致性",
    template:
      "character model sheet, multi-angle facial portraits, front view, 3/4 dynamic view, sharp profile view, neutral calm gaze, dramatic chiaroscuro movie lighting, clean neutral grey backdrop, 85mm portrait lens, ultra-detailed skin texture, 8k",
  },
  {
    id: "turnaround_drama_urban",
    name: "都市短剧男女主轻奢定妆卡 (Urban Drama Lookbook)",
    category: "drama",
    description: "专为短剧定制的都市霸总、精英女主现代时尚造型卡，包含全身与半身双机位",
    template:
      "cinematic fashion lookbook, dual-angle character sheet, full body standing pose and waist-up medium portrait, modern tailored luxury wardrobe, sophisticated styling, soft rim light, 35mm cinematic film still, photorealistic, 8k resolution",
  },
  {
    id: "turnaround_anime_cel",
    name: "二次元/国风动漫立绘定妆 (Anime Character Sheet)",
    category: "stylized",
    description: "适用于动漫与国风分镜，清晰线稿与赛璐璐光影，包含表情变化与全身正侧面",
    template:
      "anime character design sheet, multiple angles, full body front view and 3/4 view, detailed facial expression sketches, clean lineart, vibrant cel shading, neutral pose, character turnaround, white background, masterpiece",
  },
];

// GET /api/characters/turnaround-presets
router.get("/turnaround-presets", (c) => {
  return c.json({ presets: TURNAROUND_PROMPT_PRESETS });
});

// POST /api/characters/:id/generate-avatar (AI 一键生成多角度定妆照并存入 R2)
router.post("/:id/generate-avatar", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const charId = c.req.param("id");

    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);
    if (!authUser) {
      return c.json({ detail: "请先登录导演账号" }, 401);
    }

    const char = await db.select().from(characters).where(eq(characters.id, charId)).get();
    if (!char) {
      return c.json({ detail: "角色不存在" }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const customPrompt = body.prompt?.trim();
    const presetId = body.preset_id;

    let basePrompt = customPrompt || char.turnaroundPrompt || "";
    if (!basePrompt && presetId) {
      const p = TURNAROUND_PROMPT_PRESETS.find((x) => x.id === presetId);
      if (p) basePrompt = p.template;
    }

    // Compose final prompt combining Visual DNA + Turnaround structure
    const visualDNA = char.visualAnchor || `${char.name}, ${char.personality || "charismatic person"}`;
    const finalPrompt = basePrompt
      ? `${visualDNA}, ${basePrompt}`
      : `${visualDNA}, character model sheet, multi-angle facial turnaround, front view and 3/4 view, clean studio lighting, white backdrop, 8k uhd`;

    const settings = await getUserSettings(db, authUser.userId);
    if (!settings.hasKey) {
      return c.json({ detail: "请先在设置中配置 OpenRouter API Key" }, 400);
    }

    const apiKey = settings.llmApiKey;
    const apiBase = settings.llmApiBase || "https://openrouter.ai/api/v1";
    const model = settings.imageModel || "google/gemini-2.5-flash-image";

    let rawImageUrl = "";

    // 1. Try standard /images/generations or multimodal chat
    try {
      const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: finalPrompt,
          n: 1,
          size: "1024x1024",
          aspect_ratio: "1:1",
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as any;
        rawImageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || "";
      }
    } catch (e) {
      console.warn("Standard /images/generations failed for character avatar:", e);
    }

    // Fallback: Multimodal Chat Completions
    if (!rawImageUrl) {
      try {
        const chatResp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://storyboarding.caifu.social",
            "X-Title": "AI StoryBoarding Character Turnaround",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: finalPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (chatResp.ok) {
          const chatData = (await chatResp.json()) as any;
          const msg = chatData.choices?.[0]?.message;
          if (msg?.images?.[0]) {
            const img = msg.images[0];
            rawImageUrl = typeof img === "string" ? img : img?.image_url?.url || img?.url || "";
          } else if (msg?.content) {
            const mdMatch = msg.content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
            if (mdMatch?.[1]) rawImageUrl = mdMatch[1];
          }
        }
      } catch (e) {
        console.warn("Chat completions fallback for avatar failed:", e);
      }
    }

    if (!rawImageUrl) {
      return c.json({ detail: "定妆照生成失败，请检查图像生成模型配置或重试" }, 502);
    }

    // 2. Persist to R2
    const r2Key = `characters/${charId}/avatar_${Date.now()}.jpg`;
    const r2Url = await saveImageToR2(rawImageUrl, r2Key, c.env.STORAGE);
    const finalUrl = r2Url || rawImageUrl;

    // 3. Update character in DB
    const [updated] = await db
      .update(characters)
      .set({
        avatarUrl: finalUrl,
        turnaroundPrompt: customPrompt || char.turnaroundPrompt || basePrompt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(characters.id, charId))
      .returning();

    return c.json({
      success: true,
      character: {
        id: updated.id,
        name: updated.name,
        avatar_url: updated.avatarUrl,
        turnaround_prompt: updated.turnaroundPrompt,
        visual_anchor: updated.visualAnchor,
      },
    });
  } catch (err: any) {
    console.error("Generate avatar error:", err);
    return c.json({ detail: `生成定妆照异常: ${err?.message || err}` }, 500);
  }
});

// POST /api/characters/:id/set-from-shot (从分镜画面一键回设为角色定妆照)
router.post("/:id/set-from-shot", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const charId = c.req.param("id");
    const body = await c.req.json();

    let imageUrl = body.image_url;
    if (!imageUrl && body.shot_id) {
      const shot = await db.select().from(shots).where(eq(shots.id, body.shot_id)).get();
      imageUrl = shot?.storyboardImageUrl;
    }

    if (!imageUrl) {
      return c.json({ detail: "未提供有效的定妆图片地址或对应镜头尚未生成图片" }, 400);
    }

    const [updated] = await db
      .update(characters)
      .set({
        avatarUrl: imageUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(characters.id, charId))
      .returning();

    return c.json({
      success: true,
      character: {
        id: updated.id,
        name: updated.name,
        avatar_url: updated.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error("Set avatar from shot error:", err);
    return c.json({ detail: `回设角色定妆照失败: ${err?.message || err}` }, 500);
  }
});

export default router;
