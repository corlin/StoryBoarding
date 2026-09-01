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
  let expectedShots = 12;
  let pacingGuidance = "";

  if (targetDuration <= 8.0) {
    expectedShots = 3;
    pacingGuidance = `
【8秒高燃短视频 3 节拍规范 (目标生成 3 个镜头)】：
- 镜1 (0~2.5s): 强视觉奇观抓眼登场，建立核心危机；
- 镜2 (2.5~5.5s): 极速动作攻防交锋，动态高潮爆发；
- 镜3 (5.5~8.0s): 终极定格与戏剧悬念反转。`;
  } else if (targetDuration <= 20.0) {
    expectedShots = 6;
    pacingGuidance = `
【20秒商业大片 6 节拍规范 (目标生成 6 个镜头)】：
- 镜1-2 (0~6s): 场景世界观切入与主角动作登场；
- 镜3-4 (6~14s): 对立冲突爆发与连环运镜追击；
- 镜5-6 (14~20s): 绝杀视觉奇观与电影感收尾定格。`;
  } else {
    expectedShots = 12;
    pacingGuidance = `
【30秒好莱坞叙事大片 4 篇章 12 节拍规范 (目标生成 10~12 个镜头)】：
- 第一篇章 (0~6s, 镜1-3): 起 · 世界观建立与主角登场 (Establishment & Intro)；
- 第二篇章 (6~15s, 镜4-6): 承 · 危机逼近与连环动作攻防 (Escalation & Combat)；
- 第三篇章 (15~24s, 镜7-9): 转 · 子弹时间/慢动作视觉奇观与终极对抗 (Climax & Bullet-Time)；
- 第四篇章 (24~30s, 镜10-12): 合 · 胜负裁决与电影感余韵定格 (Resolution & Final Frame)。`;
  }

  return `你是一位好莱坞顶级视觉导演与 AI 视频生成大师 (Hollywood Visual Director & AI Video Master)。
你的终极任务是将剧本转化为可直接交付给 AI 视频大模型（Runway Gen-3 / 可灵 Kling 1.5 / Minimax 海螺 / Sora）进行 I2V（图生视频）与 T2V 批量生产的工业级电影分镜与黄金关键帧。

${pacingGuidance}

【全片视觉与角色特征锚点（Global Visual Anchor）要求】：
请在 JSON 顶层输出：
1. "theme": 故事核心主题短语 (中英文)
2. "global_visual_anchor": 全片核心视觉与角色基石 (英文, 包含主角外观特征、核心场景基调与美术风格，如 "Protagonist is a martial artist in black cybernetic coat, dark neon-lit rain alleyway, high-tension cinematic graphite sketch")
3. "shots": 分镜头列表 (恰好 ${expectedShots} 个镜头)

【每个镜头字段规范】：
- order: 镜头序号 (1..${expectedShots})
- duration: 镜头时长 (秒, 适合 2.5s~5s 的视频生成窗口)
- shot_size: 景别 ('extreme_wide_shot' | 'wide_shot' | 'full_shot' | 'medium_shot' | 'medium_close_up' | 'close_up' | 'extreme_close_up')
- camera_angle: 角度 ('eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'birds_eye' | 'worms_eye')
- camera_movement: 运镜 ({ "type": "push_in" | "tracking_right" | "arc_rotate" | "crane" | "tilt_up", "speed": "fast" | "medium" | "slow" })
- subject: 镜头主体描述
- action: 镜头具体动作与画面叙事 (详细描述人物肢体蓄力、动态交互与视线)
- dialogue: 角色对白 (可选)
- narrative_function: 视听叙事功能 (如 "核心动作交锋 / 视觉奇观展示")
- lighting: 光影基调 (如 "高反差黑白石墨光影，侧逆光轮廓光")
- audio: 音效 (sfx) 与音乐 (music)
- image_prompt: 极其详尽的【I2V 黄金第一帧 (Keyframe Anchor)】英文生图提示词 (English)，必须严格满足：
  1) 全局主角外观特征 (Character Consistency Anchor)
  2) 三层景深视差构图 (3-Plane Depth: Foreground Framing + Midground Subject + Background Vanishing Point)
  3) 清晰动作起势定格 (Kinetic Anticipation Pose: 动作爆发前 0.1s 定格，关节分明无黏连)
  4) 空间背景与轮廓光 (Environment & Rim Lighting)
  5) 固定风格与去模糊后缀: "2d monochrome graphite film storyboard sketch, 16:9 widescreen composition, professional pre-viz illustration, clean pencil line art, tonal graphite shading, sharp focus, zero motion blur, clean anatomical proportions, no color, no speech bubbles, no text"
- video_prompt: 专业的【4段式 AI 视频生动提示词 (English)】(专为 Runway Gen-3 / 可灵 Kling 1.5 / Minimax 优化)，格式严格包含：
  1) [Camera Trajectory & Velocity]: 运镜轨迹与物理动量 (如 "Dynamic low-angle Steadicam tracking forward at medium speed, panning smoothly to follow action")
  2) [Subject Starting Pose & Dynamic Evolution]: 角色从首帧起势姿态到爆发动作演变 (如 "Protagonist begins in low crouch stance and propels forward in explosive sprint, lunging with blade")
  3) [Physical Simulation & Environmental Dynamics]: 布料飘动、雨滴飞溅、火花烟雾流体物理 (如 "Trench coat billows violently in crosswind, raindrops splash dynamically off shoulders with volumetric mist")
  4) [Motion Control & Temporal Coherence]: 帧率节奏与防畸变约束 ("Smooth 24fps cinematic temporal motion, realistic human momentum physics, continuous seamless trajectory, no morphing, no distortion")
- continuity_data: 镜头间剪辑流数据 ({ "screen_direction": "left_to_right" | "right_to_left", "motion_in": "入画动势", "motion_out": "出画动势", "transition_recommendation": "Match cut on action" | "Hard action cut" })
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
    globalAnchor?: string;
  }
): string {
  const sizeMap: Record<string, string> = {
    extreme_wide_shot: "extreme wide shot (EWS), deep depth of field",
    wide_shot: "wide shot (WS), spatial environment framing",
    full_shot: "full shot (FS), full body kinetic pose visible",
    medium_shot: "medium shot (MS), clear waist-up dynamic staging",
    medium_close_up: "medium close up (MCU), chest-up tension",
    close_up: "close up (CU), shallow depth of field, intense focus",
    extreme_close_up: "extreme close up (ECU), macro detail, micro-expression",
  };
  const angleMap: Record<string, string> = {
    eye_level: "eye level shot, grounded perspective",
    low_angle: "low angle looking up, dramatic towering perspective",
    high_angle: "high angle looking down, spatial tactical overview",
    dutch_angle: "dutch tilt angle, high dynamic tension and kinetic diagonal",
    birds_eye: "overhead bird's eye view, geometric layout",
    worms_eye: "ground-level worm's eye perspective, explosive scale",
  };

  const readableSize = sizeMap[size] || size || "medium shot";
  const readableAngle = angleMap[angle] || angle || "eye level shot";
  const shotNo = context?.order ? `Shot #${String(context.order).padStart(2, "0")}` : "Shot";
  const dir = context?.screenDirection || "left_to_right";
  const subject = context?.subject ? `Subject: ${context.subject}. ` : "";
  const globalAnchor = context?.globalAnchor || context?.storyContext || "";

  let continuityClause = "";
  if (context?.prevShot) {
    const cleanPrev = context.prevShot.action.slice(0, 50).replace(/["“”'‘’]/g, "'");
    continuityClause = `Continuing from previous shot where ${cleanPrev}, `;
  }

  const baseStyle = "2d monochrome graphite film storyboard sketch, professional pre-production concept art, 16:9 widescreen composition, high contrast pencil line art, tonal graphite shading, cinematic 3-plane depth staging (foreground anchor, midground subject, background perspective)";

  return `${baseStyle}. ${globalAnchor ? `Visual Anchor: ${globalAnchor}. ` : ""}${readableSize}, ${readableAngle}, camera ${mov}. ${continuityClause}${shotNo} - ${subject}Anticipation Pose & Action: ${action}. Screen direction: ${dir}, 180-degree action axis locked. Sharp focus, zero motion blur, clean anatomical proportions, crisp linework, no color, no speech bubbles, ready for I2V video keyframe.`;
}

export function formatDirectorVideoPrompt(
  action: string,
  movType: string,
  shotSize: string,
  context?: {
    order?: number;
    subject?: string;
    screenDirection?: string;
    prevShot?: { order: number; action: string };
  }
): string {
  const movMap: Record<string, string> = {
    push_in: "Slow dramatic push-in shot accelerating forward toward the subject",
    pull_out: "Smooth pull-out tracking shot expanding into the wider environment",
    tracking_right: "Dynamic Steadicam tracking shot moving right alongside the character",
    tracking_left: "High-speed Steadicam tracking shot moving left with kinetic momentum",
    pan_right: "Fluid cinematic pan right revealing the expanding action",
    pan_left: "Fast whip-pan left following the subject's explosive motion",
    tilt_up: "Dramatic tilt-up camera motion from ground to subject's imposing stance",
    tilt_down: "Descending tilt-down shot tracking falling debris and impact point",
    arc_rotate: "360-degree orbital bullet-time arc rotation around the focal action",
    crane: "Elevating crane shot rising above the scene with sweeping spatial depth",
    static: "Locked-off cinematic camera with intense subject internal motion",
  };

  const cameraTraj = movMap[movType] || `Cinematic camera tracking ${movType || "smoothly"}`;
  const cleanAction = action.replace(/["“”'‘’]/g, "'").trim() || "character executes dynamic action";
  const subjectName = context?.subject || "Protagonist";
  const screenDir = context?.screenDirection || "left_to_right";

  return `[Camera]: ${cameraTraj}. [Action]: ${subjectName} begins in sharp anticipation pose and executes ${cleanAction}, maintaining continuous kinetic momentum across the 16:9 frame in ${screenDir} trajectory. [Dynamics]: Atmospheric environmental particle flow, dynamic cloth physics billowing in wind, volumetric lighting shifts. [Quality]: Smooth 24fps cinematic temporal motion, realistic momentum physics, continuous seamless trajectory, no morphing, no distortion.`;
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
    const screenDirection = i % 2 === 0 ? "right_to_left" : "left_to_right";

    const imgPrompt = formatDirectorImagePrompt(sentenceAct, pattern.size, pattern.angle, pattern.mov, {
      order: i,
      prevShot,
      screenDirection,
      storyContext: topic,
    });

    const vidPrompt = formatDirectorVideoPrompt(sentenceAct, pattern.mov, pattern.size, {
      order: i,
      subject: topic,
      screenDirection,
      prevShot,
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
      lighting: "高反差黑白石墨光影，侧逆光轮廓光",
      audio: { sfx: "雨声、脚步声、重低音打击" },
      image_prompt: imgPrompt,
      video_prompt: vidPrompt,
      continuity_data: {
        screen_direction: screenDirection,
        motion_in: `Shot #${i} entry kinetic momentum from ${screenDirection}`,
        motion_out: `Shot #${i} exit kinetic momentum to follow next cut`,
        transition_recommendation: i === targetCount ? "Fade to black" : "Match cut on action",
      },
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
      const userMessage = `【故事剧本内容】：\n${storyText}\n\n【目标时长】：${targetDuration} 秒（请严格规划 ${expectedCount} 个分镜头）。请直接输出纯 JSON 对象（不要附加其他说明文字），格式如下：\n{\n  "theme": "故事主题",\n  "global_visual_anchor": "主角外观特征与核心场景基石 (英文)",\n  "shots": [ ... ]\n}`;

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
            const globalAnchor = parsed.global_visual_anchor || storyText.slice(0, 100);

            // Post-process with 4-pillar continuity prompt builder & standard 4-part video prompt
            const enrichedShots: ShotPlan[] = parsed.shots.map((s: any, idx: number) => {
              const prev = idx > 0 ? { order: idx, action: parsed.shots[idx - 1].action } : undefined;
              const rawImgPrompt = (s.image_prompt || "").trim();
              const screenDirection = s.continuity_data?.screen_direction || (idx % 2 === 0 ? "left_to_right" : "right_to_left");
              const movType = s.camera_movement?.type || "push_in";

              let finalImgPrompt = rawImgPrompt;
              if (!rawImgPrompt || rawImgPrompt.length < 25) {
                finalImgPrompt = formatDirectorImagePrompt(
                  s.action || "",
                  s.shot_size || "medium_shot",
                  s.camera_angle || "eye_level",
                  movType,
                  {
                    order: s.order || idx + 1,
                    subject: s.subject,
                    prevShot: prev,
                    screenDirection,
                    storyContext: storyText.slice(0, 80),
                    globalAnchor: globalAnchor,
                  }
                );
              } else if (globalAnchor && !rawImgPrompt.toLowerCase().includes(globalAnchor.toLowerCase().slice(0, 20))) {
                finalImgPrompt = `Visual Anchor: ${globalAnchor}. ${rawImgPrompt}`;
              }

              let finalVidPrompt = (s.video_prompt || "").trim();
              if (!finalVidPrompt || finalVidPrompt.length < 25 || !finalVidPrompt.includes("[")) {
                finalVidPrompt = formatDirectorVideoPrompt(
                  s.action || "",
                  movType,
                  s.shot_size || "medium_shot",
                  {
                    order: s.order || idx + 1,
                    subject: s.subject || globalAnchor.slice(0, 30),
                    screenDirection,
                    prevShot: prev,
                  }
                );
              }

              const continuityData = typeof s.continuity_data === "object" ? s.continuity_data : {};
              continuityData.screen_direction = screenDirection;
              if (!continuityData.motion_in) continuityData.motion_in = `Shot #${idx + 1} entry kinetic momentum from ${screenDirection}`;
              if (!continuityData.motion_out) continuityData.motion_out = `Shot #${idx + 1} exit kinetic momentum forward`;
              if (!continuityData.transition_recommendation) {
                continuityData.transition_recommendation = idx === parsed.shots.length - 1 ? "Fade to black" : "Match cut on action";
              }

              return {
                order: s.order || idx + 1,
                duration: Number(s.duration) || Number((targetDuration / parsed.shots.length).toFixed(1)) || 2.5,
                shot_size: s.shot_size || "medium_shot",
                camera_angle: s.camera_angle || "eye_level",
                camera_movement: typeof s.camera_movement === "object" ? s.camera_movement : { type: "push_in", speed: "medium" },
                subject: s.subject || "",
                action: s.action || "",
                dialogue: s.dialogue || "",
                narrative_function: s.narrative_function || "动作推进",
                lighting: s.lighting || "高反差黑白石墨光影，侧逆光轮廓光",
                audio: typeof s.audio === "object" ? s.audio : { sfx: "环境音" },
                image_prompt: finalImgPrompt,
                video_prompt: finalVidPrompt,
                continuity_data: continuityData,
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
