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
- 镜1 (0~2.5s): 空间建立与主体入画 (Establishment & Scale Contrast)；
- 镜2 (2.5~5.5s): 动态穿梭与环境交互 (Kinetic Action & Interaction)；
- 镜3 (5.5~8.0s): 高光回眸与余韵定格 (Climax Pose & Resolution Frame)。`;
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

【核心视觉导演三大铁律 (CRITICAL DIRECTING PRINCIPLES)】:
1. 【主角绝对不可替换与排他法则 (Subject Invariance & Anti-Human Isolation)】:
   - 无论用户输入什么背景或风格（如“哈利波特城堡”、“漫威都市”、“古风大观园”），**核心主角永远必须是用户指定的主体（如“特立独行飞行的老鼠/小猪/龙/机器人”）**！
   - 当主角是动物/生物/载具时，**严禁生成原著人类角色（绝对严禁生成人类哈利波特、人类男孩、演员）**！背景中的城堡只是环境舞台，主角必须是该生物本身！
   - 生图提示词中必须明确其为唯一主体，严禁出现人类围观！

2. 【宏大空间 vs 迷你主体的视听尺度反差 (Scale & Hierarchy Staging)】:
   - 展现巨型建筑/宏伟世界与灵巧主角的史诗感比例对比（例如：巴掌大小的小飞鼠在巍峨霍格沃茨尖塔间穿梭，衬托其勇敢与自由）；
   - 镜头动作必须符合生物运动规律（掠过花窗、在滴水兽旁侧翼俯冲、在塔尖逆光悬停）。

3. 【纯净自然画卷提示词 (Pure Diegetic Natural Prompting)】:
   - 严禁输出 "Visual Anchor:", "Anticipation Pose:", "Action:", "Shot #", "Subject:" 等机械指令词！
   - 必须写出主谓宾连贯、具有光影层次与空间纵深的纯英文电影剧照描述句。
   - 结尾统一附加强负向约束：
     "no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, no human characters, no human wizards, no actors, full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen"

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
- subject: 镜头主角实体描述 (如 "特立独行飞行的老鼠")
- action: 具象生动的动作台本描述 (中文，严禁空洞套话)
- dialogue: 角色对白 (可选)
- narrative_function: 视听叙事功能 (如 "空间建立 / 动态穿梭 / 细节特写 / 视觉奇观 / 余韵定格")
- lighting: 光影基调 (如 "通透温暖的黄金时刻逆光，柔和轮廓光与景深虚化")
- audio: 音效 (sfx) 与音乐 (music)
- image_prompt: 纯净英文自然生图描述句 (Pure Visual Description, no labels)
- video_prompt: 4段式 AI 视频提示词 ([Camera], [Action], [Dynamics], [Quality])
- continuity_data: 镜头间剪辑流数据 ({ "screen_direction": "left_to_right" | "right_to_left", "motion_in": "入画动势", "motion_out": "出画动势", "transition_recommendation": "Match cut on action" | "Hard cut" })
`;
}

export interface ExtractedSemanticScene {
  raw: string;
  heroZh: string;
  heroEn: string;
  isNonHuman: boolean;
  environmentZh: string;
  environmentEn: string;
  styleKeywordsEn: string;
  cameraPerspectiveEn: string;
}

// Universal Semantic Parser that cleanly separates Hero Entity from World Backdrop
export function parseSemanticScene(text: string): ExtractedSemanticScene {
  const raw = (text || "").trim();

  // 1. Camera Viewpoint Detection
  let cameraPerspectiveEn = "cinematic perspective";
  if (/无人机|航拍|俯瞰|鸟瞰/i.test(raw)) {
    cameraPerspectiveEn = "sweeping aerial high-angle vantage point";
  } else if (/特写|微距/i.test(raw)) {
    cameraPerspectiveEn = "macro intimate close-up vantage";
  } else if (/仰视|仰拍|低角度/i.test(raw)) {
    cameraPerspectiveEn = "dramatic low-angle towering perspective";
  } else if (/全景|远景/i.test(raw)) {
    cameraPerspectiveEn = "expansive panoramic wide perspective";
  }

  // 2. Intelligent Subject & Environment Decomposition
  // Split user prompt into potential Subject Clause vs Environment/Style Clause
  let heroPart = raw;
  let envPart = "";

  const splitMatches = raw.split(/[，,；;。以作为]+(?:以|在|以.*?为背景|为背景|背景是|场景是|风格是|风格|中)/i);
  if (splitMatches.length >= 2 && splitMatches[0].trim().length > 1) {
    heroPart = splitMatches[0].trim();
    envPart = splitMatches.slice(1).join(" ").trim();
  } else {
    // Check keyword splits
    const bgMatch = raw.match(/^(.*?)[，,\s]+(?:以|在)?(.*?)(?:为背景|风格|的世界|中)?$/);
    if (bgMatch && bgMatch[1] && bgMatch[2]) {
      heroPart = bgMatch[1].trim();
      envPart = bgMatch[2].trim();
    }
  }

  // Clean heroPart from leftover camera/background words
  heroPart = heroPart
    .replace(/(?:无人机视角|航拍视角|俯瞰视角|仰视视角|全景视角|以|为背景|作为背景)/gi, "")
    .replace(/^[，,\s、:：]+|[，,\s、:：]+$/g, "")
    .trim() || "故事主角";

  // 3. Dynamic English Hero Synthesis (Universal Creature / Human Detection)
  let heroZh = heroPart;
  let heroEn = "";
  let isNonHuman = false;

  if (/老鼠|鼠|仓鼠|松鼠/i.test(heroPart)) {
    isNonHuman = true;
    heroZh = "特立独行飞行的老鼠";
    heroEn = "a tiny adventurous flying field mouse with delicate translucent fairy wings, glossy obsidian eyes, twitching whiskers, and soft velvety fur";
  } else if (/猪|小猪|粉猪|飞天猪/i.test(heroPart)) {
    isNonHuman = true;
    heroZh = "特立独行飞行的粉色小猪";
    heroEn = "an adorable miniature flying pink piglet with delicate feathered white wings and a stylish knitted scarf";
  } else if (/猫|小猫|飞天猫/i.test(heroPart)) {
    isNonHuman = true;
    heroZh = "灵动可爱的小猫";
    heroEn = "a sleek agile stylized flying cat with luminous eyes, soft fur, and delicate feathered wings";
  } else if (/狗|小狗|修勾/i.test(heroPart)) {
    isNonHuman = true;
    heroZh = "机灵活泼的小狗";
    heroEn = "a joyful loyal charming puppy with expressive floppy ears and soft golden fur";
  } else if (/龙|飞龙|小龙/i.test(heroPart)) {
    isNonHuman = true;
    heroZh = "奇幻飞龙";
    heroEn = "a majestic miniature glowing winged dragon with iridescent scales and luminous golden eyes";
  } else if (/鸟|鹰|雀/i.test(heroPart)) {
    isNonHuman = true;
    heroZh = "灵动飞鸟";
    heroEn = "a magnificent stylized bird with vibrant feathers and sleek aerodynamic wings";
  } else if (/机器人|机甲/i.test(heroPart)) {
    isNonHuman = true;
    heroZh = "智能飞行机器人";
    heroEn = "a sleek compact autonomous hovering robot with matte-white plating and cyan optical sensors";
  } else {
    // General Entity
    heroZh = heroPart;
    heroEn = `a distinct and unique stylized protagonist (${heroPart})`;
  }

  // 4. Dynamic Environment & Style Synthesis
  let environmentZh = envPart || "奇幻壮丽世界";
  let environmentEn = "majestic cinematic environment with rich spatial depth";
  let styleKeywordsEn = "Cinematic concept art, 16:9 widescreen composition, professional pre-production keyframe, dramatic lighting";

  if (/哈利波特|霍格沃茨|魔法|巫师|城堡/i.test(raw)) {
    environmentZh = "晚霞中的哥特魔法古堡与高耸尖塔群";
    environmentEn = "majestic ancient stone gothic wizarding castle, colossal towering spires, arched bridges, cobblestone alleyway in background at sunset";
    styleKeywordsEn = "Magical fantasy cinematic film still, warm golden hour backlighting, floating mystical dust motes, rich atmospheric depth";
  } else if (/红楼梦|大观园|古典|古风|国风|水墨/i.test(raw)) {
    environmentZh = "古典大观园亭台楼阁与荷塘垂柳";
    environmentEn = "Grand View Garden classical Chinese pavilions, carved wooden verandas, weeping willows, stone bridges, serene lotus ponds";
    styleKeywordsEn = "Traditional Chinese classical oriental aesthetic, poetic atmospheric lighting, elegant misty depth";
  } else if (/皮克斯|迪士尼|3D卡通|3D动画/i.test(raw)) {
    environmentZh = "色彩明丽的童话梦幻空间";
    environmentEn = "vibrant whimsical fairytale realm with rich color palettes and soft volumetric daylight";
    styleKeywordsEn = "Stylized 3D Pixar Disney animation aesthetic, charming character modeling, warm volumetric studio lighting";
  } else if (/赛博朋克|未来|科幻|霓虹/i.test(raw)) {
    environmentZh = "霓虹闪烁的未来科幻都市天际线";
    environmentEn = "futuristic cyberpunk neon-lit megalopolis, towering skyscrapers, holographic billboards, sky-traffic light trails in background";
    styleKeywordsEn = "Cinematic cyberpunk sci-fi concept art, high-tech volumetric neon lighting, anamorphic lens flare";
  }

  return {
    raw,
    heroZh,
    heroEn,
    isNonHuman,
    environmentZh,
    environmentEn,
    styleKeywordsEn,
    cameraPerspectiveEn,
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

// Generate natural, fluid, Hollywood-grade image prompts
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
    extreme_wide_shot: "Extreme wide establishing shot",
    wide_shot: "Wide shot with environmental staging",
    full_shot: "Full shot framing the protagonist completely",
    medium_shot: "Medium shot with dynamic waist-up staging",
    medium_close_up: "Medium close-up focusing on character expression",
    close_up: "Intimate close-up capturing fine details and emotion",
    extreme_close_up: "Macro extreme close-up detail",
  };
  const angleMap: Record<string, string> = {
    eye_level: "eye-level viewpoint",
    low_angle: "dramatic low-angle perspective looking up",
    high_angle: "elevated high-angle overview looking down",
    dutch_angle: "dynamic tilted dutch angle",
    birds_eye: "overhead bird's-eye vantage",
    worms_eye: "ground-level dramatic vantage",
  };
  const movViewpointMap: Record<string, string> = {
    push_in: "forward dynamic tracking",
    pull_out: "expansive pulling-back perspective",
    tracking_right: "lateral tracking motion to the right",
    tracking_left: "lateral tracking motion to the left",
    pan_right: "sweeping pan vantage",
    pan_left: "sweeping pan vantage",
    tilt_up: "low tilt-up angle",
    tilt_down: "high tilt-down angle",
    arc_rotate: "orbital three-quarter viewpoint",
    crane: "elevated soaring vantage point",
    static: "locked-off balanced composition",
  };

  const parsed = parseSemanticScene(`${context?.globalAnchor || ""} ${context?.storyContext || ""} ${action}`);
  const readableSize = sizeMap[size] || "Wide shot";
  const readableAngle = angleMap[angle] || "cinematic perspective";
  const readableViewpoint = movViewpointMap[mov] || parsed.cameraPerspectiveEn;

  // Clean action string
  let cleanAction = action
    .replace(/^(?:无人机视角|航拍视角|俯瞰视角|系列剧中的城堡为背景|哈利波特系列剧风格|哈利波特风格|第\d+镜|SHOT\s*#?\d+)[:：\s\.]*/gi, "")
    .replace(/[““”'‘’]/g, "")
    .trim();

  if (!cleanAction || cleanAction.length < 4) {
    cleanAction = `${parsed.heroZh}在${parsed.environmentZh}中展开优美灵动的飞行动态`;
  }

  // Construct Natural Cinematic Prompt
  const antiHumanClause = parsed.isNonHuman
    ? "The creature is the solitary protagonist. Strictly NO human beings, NO human boys, NO wizards, NO people, NO actors in frame."
    : "";

  let promptCore = "";
  if (size === "extreme_wide_shot" || size === "wide_shot") {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} soaring with freedom across ${parsed.environmentEn}. Cinematic scale contrast highlighting the solitary miniature creature against the colossal majestic architecture. ${cleanAction}. ${parsed.styleKeywordsEn}.`;
  } else if (size === "close_up" || size === "medium_close_up" || size === "extreme_close_up") {
    promptCore = `${readableSize}, ${readableAngle}. Detailed focus on ${parsed.heroEn}, capturing exquisite textures, expressive determined eyes, and delicate wing flutter. ${cleanAction}. Background shows ${parsed.environmentEn} softly blurred with rich cinematic bokeh. ${parsed.styleKeywordsEn}.`;
  } else {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} executing kinetic dynamic movement: ${cleanAction}, interacting with ${parsed.environmentEn}. Crisp silhouette lighting, rim light on edges. ${parsed.styleKeywordsEn}.`;
  }

  const negativeClause = `no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, no typography, ${antiHumanClause} full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen`;

  return cleanPromptOfMetaPollution(`${promptCore} ${negativeClause}`);
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

// Generate story-adaptive storyboard with genuine visual actions & scale contrast
export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = (storyText || "").trim() || "未命名故事分镜";
  const scene = parseSemanticScene(cleanStory);
  const hero = scene.heroZh;
  const env = scene.environmentZh;

  let targetCount = 12;
  if (targetDuration <= 8.0) targetCount = 3;
  else if (targetDuration <= 20.0) targetCount = 6;

  const durPerShot = Number((targetDuration / targetCount).toFixed(1)) || 2.5;

  const custom3Arcs = [
    {
      size: "extreme_wide_shot",
      angle: "high_angle",
      mov: "crane",
      func: "空间建立与主体入画",
      act: `全景空镜入画 · 迷你${hero}在夕阳映照的雄伟${env}群尖顶间翱翔，建立宏大世界观与体量反差`,
    },
    {
      size: "wide_shot",
      angle: "eye_level",
      mov: "tracking_right",
      func: "动态穿梭与环境交互",
      act: `动态穿梭 · ${hero}急速侧翼俯冲掠过古老建筑彩色玻璃花窗与石雕滴水兽，展现敏捷灵动的飞行轨迹`,
    },
    {
      size: "medium_close_up",
      angle: "low_angle",
      mov: "push_in",
      func: "高光定格与余韵收尾",
      act: `高光定格 · ${hero}在空中灵动悬停回眸，双耳微颤，眼神倔强自信，逆光勾勒茸毛与羽翼轮廓，镜头缓缓拉开定格`,
    },
  ];

  const custom6Arcs = [
    {
      size: "extreme_wide_shot",
      angle: "high_angle",
      mov: "crane",
      func: "空间建立",
      act: `远景入画 · 迷你${hero}在宏伟${env}的晚霞天际线上空展翅翱翔，建立空间宏大感与体量反差`,
    },
    {
      size: "wide_shot",
      angle: "eye_level",
      mov: "tracking_right",
      func: "场景探索",
      act: `高速穿梭 · ${hero}俯冲滑翔穿过复古狭窄街巷与奇特建筑群，展现生动敏捷的飞行动态`,
    },
    {
      size: "medium_shot",
      angle: "low_angle",
      mov: "push_in",
      func: "转折互动",
      act: `空中机动 · ${hero}在半空中急速侧翼翻转减速，视线锁定前方发光的神秘目标，动势聚焦`,
    },
    {
      size: "medium_close_up",
      angle: "eye_level",
      mov: "static",
      func: "神态蓄势",
      act: `神态特写 · 特写${hero}专注倔强的眼神与精致微表情，微风拂动茸毛，逆光勾勒通透轮廓`,
    },
    {
      size: "close_up",
      angle: "low_angle",
      mov: "push_in",
      func: "高潮奇观",
      act: `高潮冲刺 · ${hero}全力加速冲刺穿透光环，周身带起绚丽发光的魔法粒子光带，视觉奇观拉满`,
    },
    {
      size: "wide_shot",
      angle: "eye_level",
      mov: "pull_out",
      func: "余韵定格",
      act: `余韵定格 · ${hero}向着远方壮丽地平线平稳滑翔远去，镜头缓缓升起拉远形成电影感余韵定格`,
    },
  ];

  const custom12Arcs = [
    { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "世界观建立", act: `远景入画 · 迷你${hero}在宏伟${env}晚霞上空翱翔，建立宏大世界观` },
    { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "主角亮相", act: `主角亮相 · ${hero}展翅滑翔亮相，展现特立独行的飞行动态` },
    { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "场景探索", act: `街巷穿梭 · ${hero}穿梭于复古建筑与雕像之间，生动交互` },
    { size: "medium_close_up", angle: "eye_level", mov: "static", func: "发现线索", act: `视线锁定 · ${hero}发现前方神秘发光目标，空中减速锁定视线` },
    { size: "close_up", angle: "low_angle", mov: "push_in", func: "意图确立", act: `下定决心 · 特写${hero}专注眼神与微表情，下定决心采取行动` },
    { size: "full_shot", angle: "eye_level", mov: "tracking_left", func: "行动加速", act: `全力俯冲 · ${hero}振翅加速向前冲刺，动势逐步提升` },
    { size: "medium_shot", angle: "dutch_angle", mov: "pan_right", func: "动态挑战", act: `空中机动 · ${hero}敏捷避开空中障碍物，灵活翻转机动` },
    { size: "extreme_close_up", angle: "eye_level", mov: "push_in", func: "细节特写", act: `极致特写 · 倒映在${hero}瞳孔中的光芒与飞翔微动` },
    { size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", func: "视觉焦点", act: `环绕高光 · 环绕运镜展现${hero}悬浮空中的高光时刻` },
    { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "高潮爆发", act: `核心高潮 · ${hero}全力冲刺穿透光环，奇观特效拉满` },
    { size: "wide_shot", angle: "high_angle", mov: "pull_out", func: "局势平息", act: `目标达成 · ${hero}在天空中平稳盘旋，气流渐息` },
    { size: "extreme_wide_shot", angle: "eye_level", mov: "crane", func: "余韵定格", act: `余韵定格 · ${hero}向着夕阳天际线飞去，镜头升起拉远定格` },
  ];

  let baseArcs = custom12Arcs;
  if (targetCount <= 3) baseArcs = custom3Arcs;
  else if (targetCount <= 6) baseArcs = custom6Arcs;

  const shots: ShotPlan[] = [];

  for (let i = 1; i <= targetCount; i++) {
    const pattern = baseArcs[(i - 1) % baseArcs.length];
    const screenDirection = i % 2 === 0 ? "right_to_left" : "left_to_right";

    const imgPrompt = formatDirectorImagePrompt(pattern.act, pattern.size, pattern.angle, pattern.mov, {
      order: i,
      storyContext: hero,
      globalAnchor: scene.styleKeywordsEn,
    });

    const vidPrompt = formatDirectorVideoPrompt(pattern.act, pattern.mov, pattern.size, {
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
      action: pattern.act,
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
      const userMessage = `【故事剧本内容】：\n${storyText}\n\n【目标时长】：${targetDuration} 秒（请严格规划 ${expectedCount} 个分镜头）。请直接输出纯 JSON 对象（不要附加其他说明文字），格式如下：\n{\n  "theme": "故事主题",\n  "global_visual_anchor": "主角外观特征与核心场景基石 (纯英文自然描述句，严禁包含任何文字标签)",\n  "shots": [ ... ]\n}`;

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
            const parsedScene = parseSemanticScene(storyText);
            const globalAnchor = cleanPromptOfMetaPollution(parsed.global_visual_anchor || parsedScene.styleKeywordsEn);

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
                    subject: s.subject || parsedScene.heroZh,
                    storyContext: storyText.slice(0, 80),
                    globalAnchor: globalAnchor,
                  }
                );
              } else {
                const antiHuman = parsedScene.isNonHuman ? "The creature is the solitary protagonist. Strictly NO humans, NO actors." : "";
                finalImgPrompt = cleanPromptOfMetaPollution(
                  `${parsedScene.heroEn}. ${globalAnchor}. ${rawImgPrompt}. no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, no typography, ${antiHuman} full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen`
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
                    subject: s.subject || parsedScene.heroZh,
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
                subject: s.subject || parsedScene.heroZh,
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
              theme: parsed.theme || parsedScene.heroZh,
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
  const parsedScene = parseSemanticScene(storyText);
  const fallbackShots = generateAdaptiveStoryShots(storyText, targetDuration);
  return {
    theme: parsedScene.heroZh,
    target_duration: targetDuration,
    shots: fallbackShots,
  };
}
