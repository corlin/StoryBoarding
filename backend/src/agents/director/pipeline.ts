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
【8秒短片 3 节拍规范 (目标生成 3 个镜头)】：
- 镜1 (0~2.5s): 世界观与核心主体建立 (Establishment & Intro)；
- 镜2 (2.5~5.5s): 核心动态交互与剧情高潮 (Dynamic Action & Climax)；
- 镜3 (5.5~8.0s): 余韵定格与结局收尾 (Resolution & Final Frame)。`;
  } else if (targetDuration <= 20.0) {
    expectedShots = 6;
    pacingGuidance = `
【20秒电影级短片 6 节拍规范 (目标生成 6 个镜头)】：
- 镜1 (0~3.0s): 环境建立 · 全景建立空间地理与核心主体视觉基调；
- 镜2 (3.0~6.5s): 主体展开 · 主角在场景中展开标志性动态行动；
- 镜3 (6.5~10.0s): 剧情转折 · 遭遇关键剧情事件或环境交互，视线与动势聚焦；
- 镜4 (10.0~13.5s): 情绪蓄势 · 特写主角专注神态与关键动作起势；
- 镜5 (13.5~17.0s): 核心高潮 · 核心行动高潮爆发，动态视觉奇观贯穿全屏；
- 镜6 (17.0~20.0s): 余韵定格 · 行动达成，镜头拉远形成电影感余韵定格。`;
  } else {
    expectedShots = 12;
    pacingGuidance = `
【30秒好莱坞叙事大片 4 篇章 12 节拍规范 (目标生成 10~12 个镜头)】：
- 第一篇章 (0~6s, 镜1-3): 起 · 世界观建立与主角亮相 (Establishment & Protagonist Intro)；
- 第二篇章 (6~15s, 镜4-6): 承 · 剧情发展与主体生动探索 (Exploration & Narrative Escalation)；
- 第三篇章 (15~24s, 镜7-9): 转 · 关键挑战与视觉奇观高潮 (Key Turning Point & Visual Climax)；
- 第四篇章 (24~30s, 镜10-12): 合 · 目标达成与电影感余韵定格 (Resolution & Final Frame)。`;
  }

  return `你是一位好莱坞顶级视觉导演与 AI 视频生成大师 (Hollywood Visual Director & AI Video Master)。
你的终极任务是将剧本转化为可直接交付给 AI 视频大模型（Runway Gen-3 / 可灵 Kling 1.5 / Minimax 海螺 / Sora）进行 I2V（图生视频）与 T2V 批量生产的工业级电影分镜与黄金关键帧。

${pacingGuidance}

【全题材与主角一致性最高准则】：
1. 严格围绕用户输入的具体主角（如人物、动物、古典建筑、科幻世界等）和具体题材展开。
2. 将用户提到的“无人机视角/俯视/特写”等机位词归入镜头摄影机视角，绝对不能把“无人机”误当成故事主角去写现代军事谍战！
3. 精准继承用户指定的艺术风格与美学调性（如“皮克斯 3D 动画”、“红楼梦中国古典园林”等），并在所有提示词中保持高度统一。

【生图提示词 (image_prompt) 纯净视觉规范 (CRITICAL)】：
- 必须是纯粹的英文视觉描述句（Pure Visual Description），严禁包含任何元数据标签或文字前缀！
- 绝对严禁输出 "Visual Anchor:", "Anticipation Pose:", "Action:", "Shot #", "Screen direction:", "Subject:" 等词汇（这些词会被生图模型画成漫画对白与乱码文本框！）。
- 绝对禁止画面出现真实摄影器材（如 camera crane, tripod, drone equipment）。
- 提示词末尾统一附加去字样负向约束: "no text, no speech bubbles, no dialogue boxes, no labels, no watermark, no camera equipment, no tripods, no film crew, clean diegetic scene, 16:9 widescreen"

【输出格式规范】：
请在 JSON 顶层输出：
1. "theme": 故事核心主题短语 (中英文)
2. "global_visual_anchor": 全片核心视觉基石 (纯英文描述, 包含主角外观、场景美学与艺术风格)
3. "shots": 分镜头列表 (恰好 ${expectedShots} 个镜头)

【每个镜头字段规范】：
- order: 镜头序号 (1..${expectedShots})
- duration: 镜头时长 (秒, 适合 2.5s~5s 的视频生成窗口)
- shot_size: 景别 ('extreme_wide_shot' | 'wide_shot' | 'full_shot' | 'medium_shot' | 'medium_close_up' | 'close_up' | 'extreme_close_up')
- camera_angle: 角度 ('eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'birds_eye' | 'worms_eye')
- camera_movement: 运镜 ({ "type": "push_in" | "tracking_right" | "arc_rotate" | "crane" | "tilt_up", "speed": "fast" | "medium" | "slow" })
- subject: 镜头主体描述 (如 "大观园亭台楼阁与游览人物")
- action: 镜头具体动作与画面叙事 (中文描述)
- dialogue: 角色对白 (可选)
- narrative_function: 视听叙事功能 (如 "空间建立 / 主体漫步 / 细节特写 / 视觉奇观 / 余韵定格")
- lighting: 光影基调 (如 "明亮温暖的皮克斯电影级光影，柔和天光与通透景深")
- audio: 音效 (sfx) 与音乐 (music)
- image_prompt: 纯净英文生图提示词 (Pure Visual Description, no labels, no prefixes)
- video_prompt: 4段式 AI 视频提示词 ([Camera], [Action], [Dynamics], [Quality])
- continuity_data: 镜头间剪辑流数据 ({ "screen_direction": "left_to_right" | "right_to_left", "motion_in": "入画动势", "motion_out": "出画动势", "transition_recommendation": "Match cut on action" | "Hard cut" })
`;
}

export interface ExtractedStoryCore {
  raw: string;
  cleanSubject: string;
  coreScene: string;
  styleKeywords: string;
  cameraPerspective: string;
  fullTitle: string;
}

export function extractStoryCore(text: string): ExtractedStoryCore {
  const raw = (text || "").trim();
  let cleaned = raw;

  let cameraPerspective = "";
  const perspectivePatterns = [
    { regex: /(?:无人机视角|无人机航拍|航拍视角|航拍|俯瞰视角|俯瞰|鸟瞰)/gi, en: "aerial drone panoramic vantage point, sweeping high-angle view" },
    { regex: /(?:特写视角|宏观特写|微距特写)/gi, en: "macro detailed close-up perspective" },
    { regex: /(?:第一人称视角|第一人称|主观视角|POV)/gi, en: "first-person point-of-view perspective" },
    { regex: /(?:低角度仰视|低角度|仰拍|仰视视角)/gi, en: "grounded low-angle towering perspective" },
    { regex: /(?:全景视角|大远景|全景)/gi, en: "expansive panoramic wide perspective" },
    { regex: /(?:摇臂镜头|长镜头|斯坦尼康)/gi, en: "smooth sweeping cinematic vantage" },
  ];

  for (const p of perspectivePatterns) {
    if (p.regex.test(cleaned)) {
      cameraPerspective = p.en;
      cleaned = cleaned.replace(p.regex, "").replace(/^[，,\s、:：]+|[，,\s、:：]+$/g, "").trim();
    }
  }

  const stylePatterns = [
    { regex: /(?:皮克斯风格|皮克斯|迪士尼风格|迪士尼|3D动画|3D卡通|三维卡通|卡通风格|卡通)/gi, en: "Stylized 3D Pixar Disney animation aesthetic, charming stylized character forms, rich vibrant color palette, warm volumetric studio lighting" },
    { regex: /(?:红楼梦|大观园|中国古风|古典园林|古风|国风|水墨|仙侠)/gi, en: "Grand View Garden Dream of the Red Chamber traditional Chinese classical architecture, ornate pavilions, weeping willows, stone bridges, lotus ponds, poetic oriental aesthetic" },
    { regex: /(?:二次元|日漫风格|日漫|动漫风格|动漫|新海诚|吉卜力|2D动画)/gi, en: "Vibrant 2D Japanese anime aesthetic, clean cel-shaded lines, Makoto Shinkai lighting, evocative sky" },
    { regex: /(?:赛博朋克|赛博|未来科幻|科幻|机甲)/gi, en: "Cyberpunk sci-fi aesthetic, high-tech neon lighting, atmospheric haze, futuristic holographic reflections" },
    { regex: /(?:写实电影|真人电影|写实|电影质感|8K写实)/gi, en: "Photorealistic 35mm cinematic film still, anamorphic lens, natural depth of field, dramatic three-point lighting" },
  ];

  const matchedStyles: string[] = [];
  for (const sp of stylePatterns) {
    if (sp.regex.test(raw)) {
      matchedStyles.push(sp.en);
    }
  }

  let styleKeywords = matchedStyles.length > 0 
    ? matchedStyles.join(", ") 
    : "Cinematic concept art, 16:9 widescreen composition, professional pre-production keyframe, dramatic lighting, rich atmospheric depth";

  const cleanSubject = cleaned || raw || "精彩故事主角与场景";

  return {
    raw,
    cleanSubject,
    coreScene: cleaned,
    styleKeywords,
    cameraPerspective: cameraPerspective || "cinematic perspective",
    fullTitle: raw,
  };
}

export function cleanPromptOfMetaPollution(prompt: string): string {
  if (!prompt) return "";
  return prompt
    .replace(/\b(?:Visual Anchor|Character Consistency|Subject|Image Prompt|Keyframe Prompt|Anticipation Pose\s*&\s*Action|Screen direction|180-degree(?:\s*action)?\s*axis\s*locked|Continuing from previous shot where)\b[:：\s]*/gi, " ")
    .replace(/\bShot\s*#?\d+\s*[-:]*/gi, " ")
    .replace(/["“”'‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDirectorImagePrompt(
  action: string,
  size: string,
  angle: string,
  mov: string,
  context?: {
    storyContext?: string;
    subject?: string;
    order?: number;
    globalAnchor?: string;
  }
): string {
  const sizeMap: Record<string, string> = {
    extreme_wide_shot: "extreme wide shot",
    wide_shot: "wide establishing shot",
    full_shot: "full shot framing subject completely",
    medium_shot: "medium shot, clear dynamic staging",
    medium_close_up: "medium close-up, focused upper body",
    close_up: "close-up shot, sharp focus on subject",
    extreme_close_up: "extreme close-up macro detail",
  };
  const angleMap: Record<string, string> = {
    eye_level: "eye-level perspective",
    low_angle: "low-angle dramatic perspective",
    high_angle: "high-angle vantage point",
    dutch_angle: "dynamic tilted angle",
    birds_eye: "overhead bird's-eye view",
    worms_eye: "ground-level worm's-eye view",
  };
  const movViewpointMap: Record<string, string> = {
    push_in: "forward dynamic viewpoint",
    pull_out: "expansive wide perspective",
    tracking_right: "lateral tracking viewpoint",
    tracking_left: "lateral tracking viewpoint",
    pan_right: "wide lateral vantage",
    pan_left: "wide lateral vantage",
    tilt_up: "grounded low viewpoint",
    tilt_down: "elevated high vantage",
    arc_rotate: "three-quarter orbital viewpoint",
    crane: "elevated high-angle aerial vantage point",
    static: "locked-off balanced composition",
  };

  const entities = extractStoryCore(`${context?.globalAnchor || ""} ${context?.storyContext || ""} ${action}`);
  const readableSize = sizeMap[size] || "medium shot";
  const readableAngle = angleMap[angle] || "eye-level perspective";
  const readableViewpoint = movViewpointMap[mov] || entities.cameraPerspective || "cinematic perspective";

  const cleanAction = action
    .replace(/^(?:无人机视角|航拍视角|俯瞰视角|第\d+镜|SHOT\s*#?\d+)[:：\s]*/gi, "")
    .replace(/[““”'‘’]/g, "")
    .trim() || entities.cleanSubject;

  const cleanAnchor = cleanPromptOfMetaPollution(context?.globalAnchor || "");
  const parts: string[] = [];

  parts.push(entities.styleKeywords);
  if (cleanAnchor) {
    parts.push(cleanAnchor);
  } else if (entities.cleanSubject) {
    parts.push(entities.cleanSubject);
  }

  parts.push(`${readableSize}, ${readableAngle}, ${readableViewpoint}`);
  if (cleanAction && cleanAction !== cleanAnchor) {
    parts.push(cleanAction);
  }

  parts.push("vibrant atmospheric lighting, depth staging with foreground framing and background vanishing point");
  parts.push("no text, no speech bubbles, no dialogue boxes, no labels, no watermark, no camera equipment, no tripods, no film crew, no borders, clean diegetic artwork, 16:9 widescreen");

  return parts.filter(Boolean).join(". ");
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

  return `[Camera]: ${cameraTraj}. [Action]: ${subjectName} begins in sharp anticipation pose and executes ${cleanAction}, maintaining continuous kinetic momentum across the 16:9 frame in ${screenDir} trajectory. [Dynamics]: Atmospheric environmental particle flow, dynamic physics, volumetric lighting shifts. [Quality]: Smooth 24fps cinematic temporal motion, realistic momentum physics, continuous seamless trajectory, no morphing, no distortion.`;
}

export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = (storyText || "").trim() || "未命名故事分镜";
  const entities = extractStoryCore(cleanStory);

  const sentences = entities.cleanSubject
    .split(/[。！？\n\.\!\?；;]/)
    .map((s) => s.replace(/^(?:无人机视角|航拍视角|俯瞰视角)[:：\s]*/gi, "").trim())
    .filter(Boolean);

  let targetCount = 12;
  if (targetDuration <= 8.0) targetCount = 3;
  else if (targetDuration <= 20.0) targetCount = 6;

  const durPerShot = Number((targetDuration / targetCount).toFixed(1)) || 2.5;
  const coreTopic = entities.cleanSubject.slice(0, 35) || "精彩故事全景";

  const universal6Arcs = [
    { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "环境建立", act: `${coreTopic}：全景建立故事空间与核心主体视觉基调` },
    { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "主体展开", act: `${coreTopic}：漫步与探索展开标志性动态行动，展现生动建筑与环境细节` },
    { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "剧情推进", act: `${coreTopic}：移步换景，视线与动势聚焦于核心景点与主体互动` },
    { size: "medium_close_up", angle: "eye_level", mov: "static", func: "情绪蓄势", act: `${coreTopic}：特写主角专注神态与精致细节，展现生动表现力` },
    { size: "close_up", angle: "low_angle", mov: "push_in", func: "核心高潮", act: `${coreTopic}：核心高潮全景展开，秀美华丽的视觉奇观贯穿全屏` },
    { size: "wide_shot", angle: "eye_level", mov: "pull_out", func: "余韵定格", act: `${coreTopic}：游览达成，镜头缓缓拉开形成优美电影感余韵定格` },
  ];

  const universal12Arcs = [
    { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "世界观建立", act: `${coreTopic}：全景建立故事空间与世界观基调` },
    { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "主角亮相", act: `${coreTopic}：主角正式亮相并展开标志性动作` },
    { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "探索互动", act: `${coreTopic}：主角与场景环境展开生动交互` },
    { size: "medium_close_up", angle: "eye_level", mov: "static", func: "发现线索", act: `${coreTopic}：遭遇关键剧情事件，视线锁定新目标` },
    { size: "close_up", angle: "low_angle", mov: "push_in", func: "意图确立", act: `${coreTopic}：特写专注神态，下定决心采取行动` },
    { size: "full_shot", angle: "eye_level", mov: "tracking_left", func: "行动展开", act: `${coreTopic}：全面启动核心行动，动势逐步加速` },
    { size: "medium_shot", angle: "dutch_angle", mov: "pan_right", func: "动态挑战", act: `${coreTopic}：面对动态挑战与场景转折，灵活应对` },
    { size: "extreme_close_up", angle: "eye_level", mov: "push_in", func: "细节特写", act: `${coreTopic}：微表情与局部关键特征极致细节特写` },
    { size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", func: "视觉焦点", act: `${coreTopic}：环绕运镜展现核心高光时刻` },
    { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "高潮爆发", act: `${coreTopic}：核心高潮爆发，奇观画面拉满` },
    { size: "wide_shot", angle: "high_angle", mov: "pull_out", func: "局势平息", act: `${coreTopic}：关键目标达成，周围环境逐渐平息` },
    { size: "extreme_wide_shot", angle: "eye_level", mov: "crane", func: "余韵定格", act: `${coreTopic}：镜头升起拉远，形成电影感余韵定格` },
  ];

  const baseArcs = targetCount <= 6 ? universal6Arcs : universal12Arcs;
  const shots: ShotPlan[] = [];

  for (let i = 1; i <= targetCount; i++) {
    const pattern = baseArcs[(i - 1) % baseArcs.length];
    const sentenceAct = sentences[i - 1] ? `${sentences[i - 1]}` : pattern.act;
    const screenDirection = i % 2 === 0 ? "right_to_left" : "left_to_right";

    const imgPrompt = formatDirectorImagePrompt(sentenceAct, pattern.size, pattern.angle, pattern.mov, {
      order: i,
      storyContext: coreTopic,
      globalAnchor: entities.styleKeywords,
    });

    const vidPrompt = formatDirectorVideoPrompt(sentenceAct, pattern.mov, pattern.size, {
      order: i,
      subject: coreTopic,
      screenDirection,
    });

    shots.push({
      order: i,
      duration: durPerShot,
      shot_size: pattern.size,
      camera_angle: pattern.angle,
      camera_movement: { type: pattern.mov, speed: "medium" },
      subject: coreTopic,
      action: sentenceAct,
      dialogue: "",
      narrative_function: pattern.func,
      lighting: "通透电影光影，主光源分明，侧逆光轮廓光清晰",
      audio: { sfx: "环境音效、优美古典配乐" },
      image_prompt: imgPrompt,
      video_prompt: vidPrompt,
      continuity_data: {
        screen_direction: screenDirection,
        motion_in: `Shot #${i} entry kinetic momentum from ${screenDirection}`,
        motion_out: `Shot #${i} exit kinetic momentum forward`,
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
      const userMessage = `【故事剧本内容】：\n${storyText}\n\n【目标时长】：${targetDuration} 秒（请严格规划 ${expectedCount} 个分镜头）。请直接输出纯 JSON 对象（不要附加其他说明文字），格式如下：\n{\n  "theme": "故事主题",\n  "global_visual_anchor": "主角外观特征与核心场景基石 (纯英文场景画风描述，严禁包含任何文字标签)",\n  "shots": [ ... ]\n}`;

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
            const entities = extractStoryCore(storyText);
            const globalAnchor = cleanPromptOfMetaPollution(parsed.global_visual_anchor || entities.styleKeywords);

            const enrichedShots: ShotPlan[] = parsed.shots.map((s: any, idx: number) => {
              const prev = idx > 0 ? { order: idx, action: parsed.shots[idx - 1].action } : undefined;
              const rawImgPrompt = cleanPromptOfMetaPollution(s.image_prompt || "");
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
                    subject: s.subject || entities.cleanSubject,
                    storyContext: storyText.slice(0, 80),
                    globalAnchor: globalAnchor,
                  }
                );
              } else {
                finalImgPrompt = cleanPromptOfMetaPollution(
                  `${globalAnchor}. ${rawImgPrompt}. no text, no speech bubbles, no dialogue boxes, no labels, no watermark, no camera equipment, no tripods, clean diegetic artwork, 16:9 widescreen`
                );
              }

              let finalVidPrompt = (s.video_prompt || "").trim();
              if (!finalVidPrompt || finalVidPrompt.length < 25 || !finalVidPrompt.includes("[")) {
                finalVidPrompt = formatDirectorVideoPrompt(
                  s.action || "",
                  movType,
                  s.shot_size || "medium_shot",
                  {
                    order: s.order || idx + 1,
                    subject: s.subject || entities.cleanSubject,
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
                subject: s.subject || entities.cleanSubject,
                action: s.action || "",
                dialogue: s.dialogue || "",
                narrative_function: s.narrative_function || "主体漫步与场景展现",
                lighting: s.lighting || "通透电影光影，主光源分明，侧逆光轮廓光清晰",
                audio: typeof s.audio === "object" ? s.audio : { sfx: "环境音效、优美古典配乐" },
                image_prompt: finalImgPrompt,
                video_prompt: finalVidPrompt,
                continuity_data: continuityData,
              };
            });

            return {
              theme: parsed.theme || entities.cleanSubject,
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
  const entities = extractStoryCore(storyText);
  const fallbackShots = generateAdaptiveStoryShots(storyText, targetDuration);
  return {
    theme: entities.cleanSubject,
    target_duration: targetDuration,
    shots: fallbackShots,
  };
}
