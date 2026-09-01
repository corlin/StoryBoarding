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
- 镜1 (0~2.5s): 世界观与核心主角亮相 (Establishment & Hero Intro)；
- 镜2 (2.5~5.5s): 核心动态交互与剧情高潮 (Dynamic Action & Climax)；
- 镜3 (5.5~8.0s): 余韵定格与结局收尾 (Resolution & Final Frame)。`;
  } else if (targetDuration <= 20.0) {
    expectedShots = 6;
    pacingGuidance = `
【20秒电影级短片 6 节拍规范 (目标生成 6 个镜头)】：
- 镜1 (0~3.0s): 空间建立 · 全景建立空间地理与主角翱翔/登场基调；
- 镜2 (3.0~6.5s): 场景探索 · 主角在场景中展开具体动作，展现生动环境交互；
- 镜3 (6.5~10.0s): 剧情转折 · 遭遇关键剧情事件或特殊道具，视线与动势聚焦；
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

【主角绝对不可替换第一定律 (Subject Invariance & Anti-Hijacking) - 最高优先级】:
1. 无论用户输入什么艺术风格（如“哈利波特”、“漫威”、“赛博朋克”、“红楼梦”等），主角永远必须是用户设定的核心生物/实体（例如“一只特立独行飞行的猪”）！
2. 绝对禁止将主角替换为 IP 原著人类角色（绝对严禁生成哈利波特本人、赫敏、蜘蛛侠等）！
3. IP 风格必须仅作为主角身处的【环境背景】与【道具装扮】（例如：一只长着小翅膀的呆萌粉色小猪在霍格沃茨城堡上空翱翔，戴着小巫师围巾）。
4. 每一个镜头的 "image_prompt" 开头必须强制写出主角的具体外貌特征（如 "Hero subject is a distinct cute flying pink pig with delicate feathered wings..."）。

【多角色/多主体互动与正反打调度法则 (Multi-Character & Shot-Reverse-Shot Rules)】:
1. 当剧本中涉及多角色互动时（如“小猪与黑猫”或“双人对话/对峙”）：
   - 严禁在所有特写/近景中强行挤入多个人物导致肢体粘连变形；
   - 遵循好莱坞正反打镜头语法：
     * 建立镜头 (EWS/WS): 确立双主体空间站位与 180° 轴线关系；
     * 正打镜头 (MS/MCU): 以核心主角为唯一焦点，视线朝向另一角色方向；
     * 反打镜头 (MS/MCU): 以互动角色为视觉焦点，展现生动反应与交互；
     * 关键交汇 (CU/FS): 展现二者视线或动作交汇的高光时刻。

【严禁生成海报边框与商业 LOGO (Anti-Border & Anti-Logo)】:
- 严禁在画面边缘生成任何金色相框、装饰边框、卡牌花纹、商业文字或 IP Logo（如 Harry Potter、Disney 水印）；
- 必须是 16:9 全幅纯净电影剧照，结尾统一附加强负向约束：
  "no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no movie title watermark, no text, no human Harry Potter, no real actors, full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen"

【分镜台本动作真实具象化 (Concrete Action Directing)】:
- 严禁输出“漫步与探索展开标志性动态行动”、“移步换景”等无意义公文套话！
- 必须针对主角写出具体的视觉动作（如“小猪展翅翱翔俯冲”、“小猪在空中减速悬停好奇注视发光魔药瓶”）。

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
- subject: 镜头主角实体描述 (如 "特立独行飞行的粉色小猪")
- action: 镜头具体动作与画面叙事 (具象的动作台本，中文描述)
- dialogue: 角色对白 (可选)
- narrative_function: 视听叙事功能 (如 "空间建立 / 场景探索 / 转折互动 / 神态蓄势 / 视觉奇观 / 余韵定格")
- lighting: 光影基调 (如 "明亮温暖的电影级光影，柔和天光与通透景深")
- audio: 音效 (sfx) 与音乐 (music)
- image_prompt: 纯净英文生图提示词 (Pure Visual Description, no labels, no prefixes)
- video_prompt: 4段式 AI 视频提示词 ([Camera], [Action], [Dynamics], [Quality])
- continuity_data: 镜头间剪辑流数据 ({ "screen_direction": "left_to_right" | "right_to_left", "motion_in": "入画动势", "motion_out": "出画动势", "transition_recommendation": "Match cut on action" | "Hard cut" })
`;
}

export interface ExtractedHeroAndWorld {
  raw: string;
  heroSubjectZh: string;
  heroSubjectEn: string;
  styleKeywordsEn: string;
  sceneEnvironmentEn: string;
  cameraPerspective: string;
  cleanActionBase: string;
}

export function extractHeroAndWorld(text: string): ExtractedHeroAndWorld {
  const raw = (text || "").trim();
  let cleaned = raw;

  // 1. Extract Camera Perspectives
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

  // 2. Extract & Strip Style Themes (Decouple Style from Hero Subject)
  let styleKeywordsEn = "";
  let sceneEnvironmentEn = "";

  const stylePatterns = [
    {
      regex: /(?:哈利波特系列剧风格|哈利波特风格|哈利波特|霍格沃茨|魔法世界|魔幻古堡)/gi,
      styleEn: "Magical fantasy cinematic aesthetic, mystical atmosphere, warm golden hour and floating magical sparks",
      sceneEn: "majestic ancient stone gothic wizarding castle, towering spires, arched bridges, cobblestone alleyway in background",
    },
    {
      regex: /(?:皮克斯风格|皮克斯|迪士尼风格|迪士尼|3D动画|3D卡通|三维卡通|卡通风格|卡通)/gi,
      styleEn: "Stylized 3D Pixar Disney animation aesthetic, charming stylized character modeling, rich vibrant color palette, warm volumetric studio lighting",
      sceneEn: "colorful vibrant world with soft volumetric lighting and rich depth of field",
    },
    {
      regex: /(?:红楼梦|大观园|中国古风|古典园林|古风|国风|水墨|仙侠)/gi,
      styleEn: "Traditional Chinese classical aesthetic, poetic oriental atmosphere, elegant atmospheric mist",
      sceneEn: "Grand View Garden classical Chinese pavilions, ornate carved wooden verandas, weeping willows, stone bridges, serene lotus ponds",
    },
    {
      regex: /(?:赛博朋克|赛博|未来科幻|科幻|机甲)/gi,
      styleEn: "Cyberpunk sci-fi aesthetic, high-tech neon lighting, atmospheric haze, futuristic reflections",
      sceneEn: "futuristic neon-lit metropolis, towering skyscrapers, holographic signs, flying vehicle skylines in background",
    },
    {
      regex: /(?:二次元|日漫风格|日漫|动漫风格|动漫|新海诚|吉卜力|2D动画)/gi,
      styleEn: "Vibrant 2D Japanese anime aesthetic, clean cel-shaded lines, Makoto Shinkai luminous sky lighting",
      sceneEn: "scenic anime landscape with dramatic clouds and emotional sky",
    },
    {
      regex: /(?:写实电影|真人电影|写实|电影质感|8K写实)/gi,
      styleEn: "Photorealistic 35mm cinematic film still, natural depth of field, dramatic three-point lighting",
      sceneEn: "cinematic realistic environment with natural atmospheric depth",
    },
  ];

  for (const sp of stylePatterns) {
    if (sp.regex.test(cleaned) || sp.regex.test(raw)) {
      styleKeywordsEn = sp.styleEn;
      sceneEnvironmentEn = sp.sceneEn;
      cleaned = cleaned.replace(sp.regex, "").replace(/^[，,\s、:：]+|[，,\s、:：]+$/g, "").trim();
      break;
    }
  }

  if (!styleKeywordsEn) {
    styleKeywordsEn = "Cinematic concept art, 16:9 widescreen composition, professional pre-production keyframe, dramatic lighting";
    sceneEnvironmentEn = "cinematic atmospheric environment with rich spatial depth";
  }

  // 3. Extract & Lock Core Protagonist Hero Subject (Subject Invariance)
  let heroSubjectZh = cleaned || "主角";
  let heroSubjectEn = "";

  if (/猪|小猪|粉猪|飞天猪|小粉猪/i.test(raw)) {
    heroSubjectZh = "特立独行飞行的粉色小猪";
    heroSubjectEn = "a distinct adorable flying pink pig with delicate feathered wings, expressive determined eyes, wearing a tiny stylish scarf";
  } else if (/猫|小猫|飞天猫/i.test(raw)) {
    heroSubjectZh = "灵动可爱的小猫";
    heroSubjectEn = "a charming adorable stylized cat with bright curious eyes and soft fluffy fur";
  } else if (/狗|小狗|修勾/i.test(raw)) {
    heroSubjectZh = "机灵活泼的小狗";
    heroSubjectEn = "a lively charming stylized dog with joyful expressive features";
  } else if (/贾宝玉|林黛玉|大观园游人/i.test(raw)) {
    heroSubjectZh = "大观园人物与游览者";
    heroSubjectEn = "elegant classical Chinese characters dressed in traditional silk robes";
  } else if (/机器人|机甲/i.test(raw)) {
    heroSubjectZh = "独特智能机器人";
    heroSubjectEn = "a unique sleek autonomous stylized robot with glowing optical sensors";
  } else {
    heroSubjectZh = cleaned || "故事主角";
    heroSubjectEn = `the protagonist character (${cleaned || "main character"})`;
  }

  return {
    raw,
    heroSubjectZh,
    heroSubjectEn,
    styleKeywordsEn,
    sceneEnvironmentEn,
    cameraPerspective: cameraPerspective || "cinematic perspective",
    cleanActionBase: cleaned || heroSubjectZh,
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
    extreme_wide_shot: "extreme wide establishing shot, deep depth of field",
    wide_shot: "wide shot framing subject in environment",
    full_shot: "full shot framing the hero subject completely",
    medium_shot: "medium shot, clear waist-up dynamic staging",
    medium_close_up: "medium close-up, focused upper body",
    close_up: "close-up shot, sharp focus on subject facial expression and details",
    extreme_close_up: "extreme close-up macro detail, micro-expression",
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

  const parsed = extractHeroAndWorld(`${context?.globalAnchor || ""} ${context?.storyContext || ""} ${action}`);
  const readableSize = sizeMap[size] || "medium shot";
  const readableAngle = angleMap[angle] || "eye-level perspective";
  const readableViewpoint = movViewpointMap[mov] || parsed.cameraPerspective || "cinematic perspective";

  // Clean action string
  const cleanAction = action
    .replace(/^(?:无人机视角|航拍视角|俯瞰视角|哈利波特系列剧风格|哈利波特风格|第\d+镜|SHOT\s*#?\d+)[:：\s]*/gi, "")
    .replace(/[““”'‘’]/g, "")
    .trim() || `${parsed.heroSubjectZh}展开精彩行动`;

  // BUILD PURE VISUAL IMAGE PROMPT - SUBJECT FIRST INVARIANCE
  const parts: string[] = [];

  // 1. Art Style & Lighting Base
  parts.push(parsed.styleKeywordsEn);

  // 2. HERO SUBJECT (MANDATORY AT FRONT)
  parts.push(`Hero subject is ${parsed.heroSubjectEn}`);

  // 3. Scene Environment (Decoupled from hero)
  parts.push(`set against ${parsed.sceneEnvironmentEn}`);

  // 4. Framing & Viewpoint
  parts.push(`${readableSize}, ${readableAngle}, ${readableViewpoint}`);

  // 5. Dynamic Action
  parts.push(`Visual action: ${cleanAction}`);

  // 6. Atmospheric Lighting
  parts.push("vibrant golden lighting, crisp rim light, volumetric atmospheric depth");

  // 7. CRITICAL ANTI-LOGO / ANTI-FRAME / ANTI-POSTER NEGATIVES
  parts.push(
    "no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text, no movie title watermark, no typography, no human Harry Potter, no real actors, full bleed widescreen film still, edge-to-edge diegetic scene, no camera equipment, no tripods, 16:9 widescreen"
  );

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

// Generate story-adaptive fallback storyboard based on user's actual story text
export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = (storyText || "").trim() || "未命名故事分镜";
  const parsed = extractHeroAndWorld(cleanStory);
  const hero = parsed.heroSubjectZh;

  const sentences = parsed.cleanActionBase
    .split(/[。！？\n\.\!\?；;]/)
    .map((s) => s.replace(/^(?:无人机视角|航拍视角|俯瞰视角|哈利波特系列剧风格)[:：\s]*/gi, "").trim())
    .filter(Boolean);

  let targetCount = 12;
  if (targetDuration <= 8.0) targetCount = 3;
  else if (targetDuration <= 20.0) targetCount = 6;

  const durPerShot = Number((targetDuration / targetCount).toFixed(1)) || 2.5;

  const universal3Arcs = [
    { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "世界观与主角建立", act: `${hero}在宏大奇幻城堡与晚霞天际线上空展翅翱翔，建立世界观与飞行轨迹` },
    { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "场景探索与动态交互", act: `${hero}俯冲穿过狭窄复古的街巷，好奇掠过发光的橱窗与特色建筑` },
    { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "高光定格与余韵收尾", act: `${hero}在空中灵动悬停回眸，眼神倔强自信，镜头缓缓推进形成电影感余韵定格` },
  ];

  const universal6Arcs = [
    { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "空间建立", act: `${hero}在宏大奇幻城堡与晚霞天际线上空展翅翱翔，建立世界观` },
    { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "场景探索", act: `${hero}俯冲滑翔穿过复古街巷与奇特建筑群，展现生动动态` },
    { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "转折互动", act: `${hero}空中急转减速，视线锁定前方发光的神秘道具，动势聚焦` },
    { size: "medium_close_up", angle: "eye_level", mov: "static", func: "神态蓄势", act: `特写${hero}专注倔强的眼神与精致微表情，微风吹拂，灵动生动` },
    { size: "close_up", angle: "low_angle", mov: "push_in", func: "高潮奇观", act: `${hero}加速冲刺穿透光环，周身带起绚丽发光的魔法粒子轨迹` },
    { size: "wide_shot", angle: "eye_level", mov: "pull_out", func: "余韵定格", act: `${hero}向着远方地平线平稳滑翔远去，镜头缓缓拉开定格` },
  ];

  const universal12Arcs = [
    { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "世界观建立", act: `${hero}在宏大奇幻城堡与晚霞天际线上空展翅翱翔，建立世界观` },
    { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "主角亮相", act: `${hero}正式亮相展翅滑翔，展现标志性特立独行动态` },
    { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "场景探索", act: `${hero}穿梭于复古街巷与建筑之间，与奇幻环境生动交互` },
    { size: "medium_close_up", angle: "eye_level", mov: "static", func: "发现线索", act: `${hero}发现前方神秘发光目标，空中减速锁定视线` },
    { size: "close_up", angle: "low_angle", mov: "push_in", func: "意图确立", act: `特写${hero}专注眼神与微表情，下定决心采取行动` },
    { size: "full_shot", angle: "eye_level", mov: "tracking_left", func: "行动加速", act: `${hero}振翅加速向前俯冲，动势逐步提升` },
    { size: "medium_shot", angle: "dutch_angle", mov: "pan_right", func: "动态挑战", act: `${hero}敏捷避开空中障碍物，灵活翻转机动` },
    { size: "extreme_close_up", angle: "eye_level", mov: "push_in", func: "细节特写", act: `极致特写${hero}双眼中的光芒倒影与飞翔微动` },
    { size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", func: "视觉焦点", act: `环绕运镜展现${hero}悬浮空中的高光时刻` },
    { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "高潮爆发", act: `${hero}全力冲刺穿透核心光环，高潮视觉奇观拉满` },
    { size: "wide_shot", angle: "high_angle", mov: "pull_out", func: "局势平息", act: `目标达成，${hero}在天空中平稳盘旋，气流渐息` },
    { size: "extreme_wide_shot", angle: "eye_level", mov: "crane", func: "余韵定格", act: `${hero}向着夕阳天际线飞去，镜头升起拉远形成电影感余韵定格` },
  ];

  let baseArcs = universal12Arcs;
  if (targetCount <= 3) baseArcs = universal3Arcs;
  else if (targetCount <= 6) baseArcs = universal6Arcs;

  const shots: ShotPlan[] = [];

  for (let i = 1; i <= targetCount; i++) {
    const pattern = baseArcs[(i - 1) % baseArcs.length];
    const sentenceAct = sentences[i - 1] ? `${sentences[i - 1]}` : pattern.act;
    const screenDirection = i % 2 === 0 ? "right_to_left" : "left_to_right";

    const imgPrompt = formatDirectorImagePrompt(sentenceAct, pattern.size, pattern.angle, pattern.mov, {
      order: i,
      storyContext: hero,
      globalAnchor: parsed.styleKeywordsEn,
    });

    const vidPrompt = formatDirectorVideoPrompt(sentenceAct, pattern.mov, pattern.size, {
      order: i,
      subject: hero,
      screenDirection,
    });

    shots.push({
      order: i,
      duration: durPerShot,
      shot_size: pattern.size,
      camera_angle: pattern.angle,
      camera_movement: { type: pattern.mov, speed: "medium" },
      subject: hero,
      action: sentenceAct,
      dialogue: "",
      narrative_function: pattern.func,
      lighting: "通透电影光影，主光源分明，侧逆光轮廓光清晰",
      audio: { sfx: "环境音效、优美配乐" },
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
            const parsedEntities = extractHeroAndWorld(storyText);
            const globalAnchor = cleanPromptOfMetaPollution(parsed.global_visual_anchor || parsedEntities.styleKeywordsEn);

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
                    subject: s.subject || parsedEntities.heroSubjectZh,
                    storyContext: storyText.slice(0, 80),
                    globalAnchor: globalAnchor,
                  }
                );
              } else {
                finalImgPrompt = cleanPromptOfMetaPollution(
                  `Hero subject is ${parsedEntities.heroSubjectEn}. ${globalAnchor}. ${rawImgPrompt}. no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text, no movie title watermark, no typography, no human Harry Potter, no real actors, full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen`
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
                    subject: s.subject || parsedEntities.heroSubjectZh,
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
                subject: s.subject || parsedEntities.heroSubjectZh,
                action: s.action || "",
                dialogue: s.dialogue || "",
                narrative_function: s.narrative_function || "主体动作与场景展现",
                lighting: s.lighting || "通透电影光影，主光源分明，侧逆光轮廓光清晰",
                audio: typeof s.audio === "object" ? s.audio : { sfx: "环境音效、优美配乐" },
                image_prompt: finalImgPrompt,
                video_prompt: finalVidPrompt,
                continuity_data: continuityData,
              };
            });

            return {
              theme: parsed.theme || parsedEntities.heroSubjectZh,
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
  const parsedEntities = extractHeroAndWorld(storyText);
  const fallbackShots = generateAdaptiveStoryShots(storyText, targetDuration);
  return {
    theme: parsedEntities.heroSubjectZh,
    target_duration: targetDuration,
    shots: fallbackShots,
  };
}
