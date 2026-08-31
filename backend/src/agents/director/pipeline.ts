export interface ShotPlan {
  order: number;
  duration: number;
  shot_size: string;
  camera_angle: string;
  camera_movement: {
    type: string;
    speed?: string;
  };
  subject?: string;
  action: string;
  dialogue?: string;
  narrative_function?: string;
  lighting?: string;
  audio?: {
    sfx?: string;
    music?: string;
  };
  image_prompt: string;
  video_prompt: string;
  continuity_data?: Record<string, any>;
}

export interface DirectorGenerationResult {
  theme: string;
  target_duration: number;
  shots: ShotPlan[];
}

export function getDirectorSystemPrompt(targetDuration: number = 30.0): string {
  let pacingGuidance = "";
  let expectedShots = 12;

  if (targetDuration <= 8.0) {
    expectedShots = 3;
    pacingGuidance = `
【5秒极速短片 / 广告黄金钩子 3 节拍规范 (目标生成 3 个镜头)】：
- 第 1 镜 (1.5s): 视觉奇观/核心悬念特写 (Hook，直接切入高潮，牢牢抓住眼球)；
- 第 2 镜 (2.0s): 核心动作爆发/动态冲撞 (Impact，最高能量推进)；
- 第 3 镜 (1.5s): 标志性定格/反转留白 (Payoff/Punchline，品牌或故事收尾)。`;
  } else if (targetDuration <= 20.0) {
    expectedShots = 6;
    pacingGuidance = `
【15秒标准商业微短片 3 幕 6 节拍规范 (目标生成 6 个镜头)】：
- 阶段一 (0~4s, 镜1-2): 空间与主角建立 (环境全景 ➔ 人物出场动机)；
- 阶段二 (4~10s, 镜3-4): 动作对峙与升级 (近景张力 ➔ 核心动态交锋)；
- 阶段三 (10~15s, 镜5-6): 高潮爆发与定格 (局部特写 ➔ 标志性收官定格)。`;
  } else {
    expectedShots = 12;
    pacingGuidance = `
【30秒好莱坞叙事大片 4 篇章 12 节拍规范 (目标生成 10~12 个镜头)】：
- 第一篇章 (0~6s, 镜1-3): 起 · 世界观建立与主角登场；
- 第二篇章 (6~15s, 镜4-6): 承 · 危机逼近与连环动作攻防；
- 第三篇章 (15~24s, 镜7-9): 转 · 子弹时间/慢动作视觉奇观与终极对抗；
- 第四篇章 (24~30s, 镜10-12): 合 · 胜负裁决与电影感余韵定格。`;
  }

  return `你是一位好莱坞顶级电影视觉导演与分镜师智能体 (AI Visual Director & Storyboard Artist)。
你的核心任务是将人类导演输入的故事或剧本，转化为符合影视工业标准的结构化分镜脚本。
${pacingGuidance}

目标时长: ${targetDuration} 秒，请规划生成恰好 ${expectedShots} 个节奏紧凑、上下动作高度连贯的电影镜头。

每个镜头必须包含：
- order: 镜头序号 (1..${expectedShots})
- duration: 镜头时长 (秒)
- shot_size: 景别 ('extreme_wide_shot' | 'wide_shot' | 'full_shot' | 'medium_shot' | 'medium_close_up' | 'close_up' | 'extreme_close_up')
- camera_angle: 角度 ('eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'birds_eye' | 'worms_eye')
- camera_movement: 运镜 (如 { "type": "crane", "speed": "slow" } 或 { "type": "push_in" })
- subject: 镜头主体描述
- action: 镜头具体动作与画面叙事 (必须承接上一镜头动势)
- dialogue: 角色对白 (可选)
- narrative_function: 视听叙事功能
- lighting: 光影基调 (统一黑白灰石墨手绘光影)
- audio: 音效 (sfx) 与音乐 (music)
- image_prompt: 专业的 2D 分镜概念草图提示词 (English)
- video_prompt: 专业的 AI 视频生成运镜提示词 (English)
- continuity_data: 空间与视线连贯性数据 ({ "screen_direction": "left_to_right" })
`;
}

export function formatDirectorImagePrompt(
  action: string,
  size: string,
  angle: string,
  mov: string,
  context?: {
    storyContext?: string;
    subject?: string;
    prevShot?: { order: number; action: string; shotSize?: string };
    screenDirection?: string;
    order?: number;
  }
): string {
  const sizeMap: Record<string, string> = {
    extreme_wide_shot: "extreme wide shot (EWS)",
    wide_shot: "wide shot (WS)",
    full_shot: "full shot (FS)",
    medium_shot: "medium shot (MS)",
    medium_close_up: "medium close up (MCU)",
    close_up: "close up (CU)",
    extreme_close_up: "extreme close up (ECU)",
  };
  const angleMap: Record<string, string> = {
    eye_level: "eye level",
    low_angle: "low angle looking up",
    high_angle: "high angle looking down",
    dutch_angle: "dutch angle tilted",
    birds_eye: "overhead bird's eye view",
    worms_eye: "worm's eye perspective",
  };

  const readableSize = sizeMap[size] || size;
  const readableAngle = angleMap[angle] || angle;
  const shotNo = context?.order ? `SHOT ${String(context.order).padStart(2, "0")}` : "SHOT";
  const dir = context?.screenDirection || "left_to_right";

  let continuityClause = "";
  if (context?.prevShot) {
    const cleanPrev = context.prevShot.action.slice(0, 45).replace(/"/g, "'");
    continuityClause = `Continuing from SHOT ${String(context.prevShot.order).padStart(2, "0")} where ${cleanPrev}, `;
  }

  return `Monochrome grayscale rough graphite storyboard sketch, ${readableSize}, ${readableAngle}, camera ${mov}. ${continuityClause}${shotNo} action: ${action}. Screen direction: ${dir}, maintaining 180-degree action axis. Clean gestural pencil linework, unfinished pre-viz aesthetic, standard 16:9 draft, no color, no comic bubbles.`;
}

// Generate story-adaptive fallback storyboard based on user's actual story text
export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = (storyText || "").trim() || "未命名故事分镜";
  const sentences = cleanStory
    .split(/[。！？\n\.\!\?；;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  let targetCount = 12;
  if (targetDuration <= 8.0) targetCount = 3;
  else if (targetDuration <= 20.0) targetCount = 6;

  const durPerShot = Number((targetDuration / targetCount).toFixed(1)) || 2.5;
  const topic = cleanStory.slice(0, 30);

  const fallbackPatterns = [
    { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "环境建立", act: `${topic}：全景建立空间与视觉基调` },
    { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "人物出场", act: `主角步入雨夜场景，动作沉稳，带出环境细节` },
    { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "动机显现", act: `对立角色现身，气氛骤然紧张，双方视线锁定` },
    { size: "medium_close_up", angle: "eye_level", mov: "static", func: "起手对峙", act: `主角单手摆出起手架势，特写专注微表情` },
    { size: "close_up", angle: "low_angle", mov: "push_in", func: "危机爆发", act: `对手瞬间突进，攻击破空而至` },
    { size: "full_shot", angle: "eye_level", mov: "tracking_left", func: "核心交锋", act: `两人在暴雨中激烈交锋，拳风激荡带起水雾` },
    { size: "medium_shot", angle: "dutch_angle", mov: "pan_right", func: "连环攻防", act: `倾斜机位快速摇移，沉桥封手化解攻势` },
    { size: "extreme_close_up", angle: "eye_level", mov: "push_in", func: "局部受创", act: `关键部位受到重击，视觉冲击力拉满` },
    { size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", func: "子弹时间", act: `360度子弹时间慢动作，主角侧身避开致命攻击` },
    { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "终极一击", act: `凌空飞踏重重轰中对手，将其击退` },
    { size: "wide_shot", angle: "high_angle", mov: "pull_out", func: "局势落幕", act: `对手倒地化为数据消散，雨水逐渐平息` },
    { size: "extreme_wide_shot", angle: "eye_level", mov: "crane", func: "余韵定格", act: `镜头缓缓升起拉远，主角独立于雨夜，定格收尾` },
  ];

  const shots: ShotPlan[] = [];

  for (let i = 1; i <= targetCount; i++) {
    const pattern = fallbackPatterns[(i - 1) % fallbackPatterns.length];
    const sentenceAct = sentences[i - 1] ? `${sentences[i - 1]}` : pattern.act;
    const prevShot = i > 1 ? { order: i - 1, action: shots[i - 2].action } : undefined;

    const imgPrompt = formatDirectorImagePrompt(sentenceAct, pattern.size, pattern.angle, pattern.mov, {
      order: i,
      prevShot,
      screenDirection: i % 2 === 0 ? "right_to_left" : "left_to_right",
      storyContext: topic,
    });

    shots.push({
      order: i,
      duration: durPerShot,
      shot_size: pattern.size,
      camera_angle: pattern.angle,
      camera_movement: { type: pattern.mov, speed: "medium" },
      subject: topic,
      action: sentenceAct,
      dialogue: "",
      narrative_function: pattern.func,
      lighting: "黑白灰石墨光影",
      audio: { sfx: "雨声、脚步声" },
      image_prompt: imgPrompt,
      video_prompt: `Cinematic movie camera ${pattern.mov}, ${sentenceAct}, 16:9 film still`,
      continuity_data: { screen_direction: i % 2 === 0 ? "right_to_left" : "left_to_right" },
    });
  }

  return shots;
}

export async function runDirectorPipeline(
  storyText: string,
  targetDuration: number = 30.0,
  options: {
    apiKey?: string;
    apiBase?: string;
    model?: string;
  } = {}
): Promise<DirectorGenerationResult> {
  const apiKey = options.apiKey?.trim();
  const apiBase = options.apiBase?.trim() || "https://openrouter.ai/api/v1";
  const model = options.model?.trim() || "deepseek/deepseek-chat";

  let expectedCount = 12;
  if (targetDuration <= 8.0) expectedCount = 3;
  else if (targetDuration <= 20.0) expectedCount = 6;

  if (apiKey) {
    try {
      const systemPrompt = getDirectorSystemPrompt(targetDuration);
      const userMessage = `【故事剧本内容】：\n${storyText}\n\n【目标时长】：${targetDuration} 秒（请严格规划 ${expectedCount} 个分镜头）。请直接输出纯 JSON 对象（不要附加其他说明文字），格式如下：\n{\n  "theme": "故事主题",\n  "shots": [ ... ]\n}`;

      const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://storyboarding.caifu.social",
          "X-Title": "AI StoryBoarding",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as any;
        const rawContent = data.choices?.[0]?.message?.content || "";
        if (rawContent) {
          // Robust universal JSON extraction (handles markdown ```json ... ``` and plain text)
          let jsonStr = rawContent.trim();
          const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (mdMatch && mdMatch[1]) {
            jsonStr = mdMatch[1].trim();
          } else {
            const start = jsonStr.indexOf("{");
            const end = jsonStr.lastIndexOf("}");
            if (start !== -1 && end !== -1 && end > start) {
              jsonStr = jsonStr.slice(start, end + 1);
            }
          }

          const parsed = JSON.parse(jsonStr);
          if (parsed.shots && Array.isArray(parsed.shots) && parsed.shots.length > 0) {
            // Post-process with 4-pillar continuity prompt builder
            const enrichedShots: ShotPlan[] = parsed.shots.map((s: any, idx: number) => {
              const prev = idx > 0 ? { order: idx, action: parsed.shots[idx - 1].action } : undefined;
              const imgPrompt = formatDirectorImagePrompt(
                s.action || "",
                s.shot_size || "medium_shot",
                s.camera_angle || "eye_level",
                s.camera_movement?.type || "static",
                {
                  order: s.order || idx + 1,
                  prevShot: prev,
                  screenDirection: s.continuity_data?.screen_direction || (idx % 2 === 0 ? "left_to_right" : "right_to_left"),
                  storyContext: storyText.slice(0, 80),
                }
              );

              return {
                order: s.order || idx + 1,
                duration: Number(s.duration) || Number((targetDuration / parsed.shots.length).toFixed(1)) || 2.5,
                shot_size: s.shot_size || "medium_shot",
                camera_angle: s.camera_angle || "eye_level",
                camera_movement: typeof s.camera_movement === "object" ? s.camera_movement : { type: "static" },
                subject: s.subject || "",
                action: s.action || "",
                dialogue: s.dialogue || "",
                narrative_function: s.narrative_function || "动作推进",
                lighting: s.lighting || "黑白灰石墨光影",
                audio: typeof s.audio === "object" ? s.audio : { sfx: "环境音" },
                image_prompt: imgPrompt,
                video_prompt: s.video_prompt || `Cinematic camera, ${s.action}`,
                continuity_data: typeof s.continuity_data === "object" ? s.continuity_data : { screen_direction: "left_to_right" },
              };
            });

            return {
              theme: parsed.theme || storyText.slice(0, 20),
              target_duration: targetDuration,
              shots: enrichedShots,
            };
          }
        }
      } else {
        const errText = await resp.text();
        console.error(`[Director LLM Upstream Error HTTP ${resp.status}]:`, errText);
      }
    } catch (e: any) {
      console.warn("Director pipeline LLM call fallback:", e?.message || e);
    }
  }

  // Fallback to intelligent story-adaptive breakdown
  const fallbackShots = generateAdaptiveStoryShots(storyText, targetDuration);
  return {
    theme: storyText.slice(0, 20) || "好莱坞智能分镜",
    target_duration: targetDuration,
    shots: fallbackShots,
  };
}
