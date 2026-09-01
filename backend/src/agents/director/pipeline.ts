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
- 镜1 (0~2.5s): 空间建立与主体入画 (Establishment & Scale Staging)；
- 镜2 (2.5~5.5s): 动态穿梭与环境交互 (Kinetic Action & Interaction)；
- 镜3 (5.5~8.0s): 高光定格与余韵收尾 (Climax Resolution & Final Frame)。`;
  } else if (targetDuration <= 20.0) {
    expectedShots = 6;
    pacingGuidance = `
【20秒电影级短片 6 节拍规范 (目标生成 6 个镜头)】：
- 镜1 (0~3.0s): 空间建立 · 全景建立地理空间与主角/主体登场基调；
- 镜2 (3.0~6.5s): 场景探索 · 主体在场景中展开具体动作或展现四季/环境生动交互；
- 镜3 (6.5~10.0s): 剧情/时空转折 · 关键事件发生、光影色彩转变或动势聚焦；
- 镜4 (10.0~13.5s): 情绪/氛围蓄势 · 特写主体神态、环境细节或光影渐变；
- 镜5 (13.5~17.0s): 核心高潮/视觉奇观 · 核心高潮爆发（自然变迁极景、高燃动作或视觉奇观）；
- 镜6 (17.0~20.0s): 余韵定格 · 行动达成或时空沉淀，镜头拉远形成电影感余韵定格。`;
  } else {
    expectedShots = 12;
    pacingGuidance = `
【30秒好莱坞叙事大片 4 篇章 12 节拍规范 (目标生成 10~12 个镜头)】：
- 第一篇章 (0~6s, 镜1-3): 起 · 世界观建立与主体亮相 (Establishment & Subject Intro)；
- 第二篇章 (6~15s, 镜4-6): 承 · 剧情发展与生动探索 (Exploration & Atmospheric Escalation)；
- 第三篇章 (15~24s, 镜7-9): 转 · 关键挑战、时空突变与视觉高潮 (Turning Point & Visual Climax)；
- 第四篇章 (24~30s, 镜10-12): 合 · 目标达成与电影感余韵定格 (Resolution & Timeless Frame)。`;
  }

  return `你是一位好莱坞顶级视觉导演与 AI 视频生成大师 (Hollywood Visual Director & AI Video Master)。
你的终极任务是将用户的剧本或意向文本转化为可直接交付给 AI 视频大模型（Runway Gen-3 / 可灵 Kling 1.5 / Minimax 海螺 / Sora）进行批量生产的工业级电影分镜与黄金关键帧。

${pacingGuidance}

【核心视觉导演四大铁律 (CRITICAL DIRECTING PRINCIPLES)】:
1. 【题材与主体忠实性法则 (Genre & Subject Fidelity)】:
   - 严禁擅自篡改题材！如果用户输入的是自然风光/历史岁月（如“长城脚下日升日落寒来暑往”），核心必须是长城、山峦、四季流转与宏伟光影，**绝对严禁擅自加入任何魔幻翅膀、哥特古堡或魔法光环**！
   - 如果用户输入的是动作武侠/科幻，则遵循真实动作设计或赛博科幻硬核美学；
   - 如果用户输入的是萌宠/动物，则主体严格锁定该生物，严禁生成无关人类。

2. 【专业视听语言与景别递进 (Cinematic Staging & Dynamic Progression)】:
   - 景别（Shot Size）必须丰富交替（EWS 建立空间 -> WS 环境交互 -> MS 主体动作 -> MCU/CU 细节与情感 -> EWS 余韵定格）；
   - 运镜（Camera Movement）必须具有明确的电影动势（Crane 升降、Tracking 跟随、Push-in 推进、Pull-out 拉远）；
   - 严守 180° 运动轴线与镜头剪辑连贯性。

3. 【纯净自然生图画卷描述 (Pure Diegetic Natural Prompting)】:
   - 严禁输出 "Visual Anchor:", "Anticipation Pose:", "Action:", "Shot #", "Subject:" 等任何机械标签！
   - 必须写出主谓宾连贯、具有电影级光影层次、材质细节与空间纵深的纯英文描述句。
   - 结尾统一附加强负向约束：
     "no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen"

4. 【输出格式规范】：
请在 JSON 顶层输出：
1. "theme": 故事核心主题短语 (中英文)
2. "global_visual_anchor": 全片核心视觉基石 (纯英文描述, 包含主角/主体外观、场景美学与艺术风格)
3. "shots": 分镜头列表 (恰好 ${expectedShots} 个镜头)

【每个镜头字段规范】：
- order: 镜头序号 (1..${expectedShots})
- duration: 镜头时长 (秒, 适合 2.5s~5s 的视频生成窗口)
- shot_size: 景别 ('extreme_wide_shot' | 'wide_shot' | 'full_shot' | 'medium_shot' | 'medium_close_up' | 'close_up' | 'extreme_close_up')
- camera_angle: 角度 ('eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'birds_eye' | 'worms_eye')
- camera_movement: 运镜 ({ "type": "push_in" | "tracking_right" | "arc_rotate" | "crane" | "tilt_up", "speed": "fast" | "medium" | "slow" })
- subject: 镜头主体描述 (如 "万里长城与烽火台" 或 "主角人物")
- action: 具象生动的动作/画面台本描述 (中文，严禁空洞套话)
- dialogue: 角色对白 (可选)
- narrative_function: 视听叙事功能 (如 "空间建立 / 春夏生机 / 晚霞暮光 / 深秋红叶 / 寒冬积雪 / 余韵定格")
- lighting: 光影基调 (如 "通透晨曦金光，丁达尔漫射光与山脉云海景深")
- audio: 音效 (sfx) 与音乐 (music)
- image_prompt: 纯净英文自然生图描述句 (Pure Visual Description, no labels)
- video_prompt: 4段式 AI 视频提示词 ([Camera], [Action], [Dynamics], [Quality])
- continuity_data: 镜头间剪辑流数据 ({ "screen_direction": "left_to_right" | "right_to_left", "motion_in": "入画动势", "motion_out": "出画动势", "transition_recommendation": "Match cut on action" | "Cross dissolve" | "Hard cut" })
`;
}

export interface ExtractedSemanticScene {
  raw: string;
  genre: "landscape" | "classical" | "scifi" | "action" | "creature" | "fantasy" | "urban" | "general";
  isLandscape: boolean;
  isNonHuman: boolean;
  heroZh: string;
  heroEn: string;
  environmentZh: string;
  environmentEn: string;
  styleKeywordsEn: string;
  cameraPerspectiveEn: string;
}

// Universal Semantic Parser that accurately classifies Genre, Subject & World Backdrop
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

  // 2. Genre Classification
  let genre: ExtractedSemanticScene["genre"] = "general";
  let isLandscape = false;
  let isNonHuman = false;

  if (/长城|山脉|风景|风光|四季|春夏秋冬|日升日落|寒来暑往|雪景|大漠|黄河|自然|星空|草原|江河|故宫|山川/i.test(raw)) {
    genre = "landscape";
    isLandscape = true;
  } else if (/武侠|古风|国风|水墨|江湖|唐宋|汉服|剑客|功夫|茶馆/i.test(raw)) {
    genre = "classical";
  } else if (/赛博朋克|科幻|未来|机械|黑客|AI|机甲|霓虹|太空/i.test(raw)) {
    genre = "scifi";
  } else if (/魔法|巫师|哈利波特|霍格沃茨|奇幻|精灵|仙侠|魔戒/i.test(raw)) {
    genre = "fantasy";
  } else if (/老鼠|鼠|猪|小猪|猫|狗|鸟|鹰|雀|龙|兔|动物|小兽|宠物/i.test(raw)) {
    genre = "creature";
    isNonHuman = true;
  } else if (/现代|都市|办公室|写字楼|咖啡馆|商业|街头|职场/i.test(raw)) {
    genre = "urban";
  }

  // 3. Subject & Environment Separation
  let heroPart = raw;
  let envPart = "";

  const splitMatches = raw.split(/[，,；;。以作为]+(?:以|在|以.*?为背景|为背景|背景是|场景是|风格是|风格|中)/i);
  if (splitMatches.length >= 2 && splitMatches[0].trim().length > 1) {
    heroPart = splitMatches[0].trim();
    envPart = splitMatches.slice(1).join(" ").trim();
  } else {
    const bgMatch = raw.match(/^(.*?)[，,\s]+(?:以|在)?(.*?)(?:为背景|风格|的世界|中)?$/);
    if (bgMatch && bgMatch[1] && bgMatch[2]) {
      heroPart = bgMatch[1].trim();
      envPart = bgMatch[2].trim();
    }
  }

  heroPart = heroPart
    .replace(/(?:无人机视角|航拍视角|俯瞰视角|仰视视角|全景视角|以|为背景|作为背景)/gi, "")
    .replace(/^[，,\s、:：]+|[，,\s、:：]+$/g, "")
    .trim() || raw;

  // 4. Synthesize English Hero & Environment with High Fidelity
  let heroZh = heroPart;
  let heroEn = "";
  let environmentZh = envPart;
  let environmentEn = "";
  let styleKeywordsEn = "";

  if (isLandscape) {
    if (/长城/i.test(raw)) {
      heroZh = "雄伟万里长城与连绵烽火台";
      heroEn = "the majestic Great Wall of China with ancient stone battlements and fortified watchtowers";
      environmentZh = "蜿蜒崇山峻岭与四季变幻的雄浑天地";
      environmentEn = "colossal winding mountain ridges, misty valley depths, dynamic seasonal skies from sunrise dawn to sunset and starry night";
      styleKeywordsEn = "National Geographic masterwork landscape cinematography, 35mm film still, photorealistic ancient stone brick textures, epic documentary scale, natural volumetric atmospheric sunlight, zero humans, pure timeless heritage";
    } else {
      heroZh = heroPart;
      heroEn = `majestic natural landscape feature of ${heroPart}`;
      environmentZh = envPart || "雄伟壮丽的大自然山川";
      environmentEn = "grand natural panoramic vista with dramatic weather and atmospheric depth";
      styleKeywordsEn = "Epic landscape cinematography, 35mm film still, natural volumetric lighting, photorealistic terrain textures, zero humans";
    }
  } else if (genre === "creature") {
    if (/老鼠|鼠/i.test(heroPart)) {
      heroZh = "特立独行飞行的老鼠";
      heroEn = "an adventurous tiny field mouse with glossy dark eyes, twitching whiskers, and soft velvety fur";
    } else if (/猪|小猪/i.test(heroPart)) {
      heroZh = "可爱灵巧的粉色小猪";
      heroEn = "a charming miniature pink piglet with expressive joyful eyes and a stylish knitted scarf";
    } else if (/猫|小猫/i.test(heroPart)) {
      heroZh = "灵动机敏的小猫";
      heroEn = "a sleek agile cat with luminous amber eyes and soft textured fur";
    } else if (/狗|小狗/i.test(heroPart)) {
      heroZh = "活泼忠诚的小狗";
      heroEn = "a joyful loyal puppy with expressive floppy ears and golden fur";
    } else {
      heroZh = heroPart;
      heroEn = `a distinct and expressive stylized animal character (${heroPart})`;
    }
    environmentZh = envPart || "宁静优美的自然环境";
    environmentEn = "charming atmospheric environment with rich tactile textures and soft daylight";
    styleKeywordsEn = "Cinematic stylized character animation style, charming personality, warm volumetric lighting, rich shallow depth of field";
  } else if (genre === "classical") {
    heroZh = heroPart || "东方武者与历史人物";
    heroEn = `a classical Chinese protagonist in authentic historical attire (${heroPart})`;
    environmentZh = envPart || "中国古典青石庭院与远山水墨";
    environmentEn = "traditional classical Chinese architecture, ancient stone tiles, misty mountain silhouettes, poetic oriental atmosphere";
    styleKeywordsEn = "Traditional Chinese classical cinema aesthetic, elegant oriental lighting, painterly atmosphere, authentic period textures";
  } else if (genre === "scifi") {
    heroZh = heroPart || "赛博主角与机械主体";
    heroEn = `a futuristic sci-fi protagonist with high-tech gear (${heroPart})`;
    environmentZh = envPart || "霓虹闪烁的未来科幻都市天际线";
    environmentEn = "futuristic cyberpunk neon-lit megalopolis, towering skyscrapers, holographic billboards, atmospheric rain reflections";
    styleKeywordsEn = "Cinematic sci-fi concept art, high-tech volumetric neon lighting, anamorphic lens flares, crisp rim lighting";
  } else if (genre === "fantasy") {
    heroZh = heroPart || "奇幻冒险主角";
    heroEn = `a mystical fantasy adventurer (${heroPart})`;
    environmentZh = envPart || "宏伟古老的奇幻城堡与魔法森林";
    environmentEn = "majestic ancient stone castle spires, mystical ancient forest, floating magical particles";
    styleKeywordsEn = "Magical fantasy cinematic film still, warm golden hour backlighting, floating mystical dust motes, rich atmospheric depth";
  } else if (genre === "urban") {
    heroZh = heroPart || "现代都市主角";
    heroEn = `a modern professional protagonist (${heroPart})`;
    environmentZh = envPart || "现代简约建筑与明亮都市空间";
    environmentEn = "contemporary architectural interior and bright city backdrop with clean reflections";
    styleKeywordsEn = "Contemporary cinematic realism, soft natural studio lighting, elegant commercial photography, realistic textures";
  } else {
    heroZh = heroPart;
    heroEn = `a distinct protagonist (${heroPart})`;
    environmentZh = envPart || "电影级真实场景环境";
    environmentEn = "cinematic environment with rich spatial depth and natural lighting";
    styleKeywordsEn = "Cinematic 35mm film still, professional pre-production keyframe, natural lighting and atmospheric depth";
  }

  return {
    raw,
    genre,
    isLandscape,
    isNonHuman,
    heroZh,
    heroEn,
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

// Generate natural, fluid, Hollywood-grade image prompts using 4-layer diegetic synthesis
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
    extreme_wide_shot: "Extreme wide panoramic establishing shot",
    wide_shot: "Wide shot with expansive environmental staging",
    full_shot: "Full shot framing the subject completely",
    medium_shot: "Medium shot with dynamic balanced staging",
    medium_close_up: "Medium close-up focusing on subject expression and focal detail",
    close_up: "Intimate close-up capturing exquisite textures and fine emotion",
    extreme_close_up: "Macro extreme close-up detail shot",
  };
  const angleMap: Record<string, string> = {
    eye_level: "eye-level viewpoint",
    low_angle: "dramatic low-angle perspective looking up",
    high_angle: "elevated high-angle overview looking down",
    dutch_angle: "dynamic tilted dutch angle",
    birds_eye: "overhead bird's-eye vantage point",
    worms_eye: "ground-level dramatic perspective",
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
    crane: "elevating crane soaring vantage point",
    static: "locked-off balanced composition",
  };

  const parsed = parseSemanticScene(`${context?.globalAnchor || ""} ${context?.storyContext || ""} ${action}`);
  const readableSize = sizeMap[size] || "Wide shot";
  const readableAngle = angleMap[angle] || "cinematic perspective";
  const readableViewpoint = movViewpointMap[mov] || parsed.cameraPerspectiveEn;

  // Clean action string
  let cleanAction = action
    .replace(/^(?:无人机视角|航拍视角|俯瞰视角|第\d+镜|SHOT\s*#?\d+)[:：\s\.]*/gi, "")
    .replace(/[““”'‘’]/g, "")
    .trim();

  if (!cleanAction || cleanAction.length < 4) {
    cleanAction = `${parsed.heroZh}在${parsed.environmentZh}中展现生动视听画面`;
  }

  // Build Layer 2 & 3: Diegetic Subject & Environment interaction
  let promptCore = "";
  if (parsed.isLandscape) {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} in ${parsed.environmentEn}. Action and atmosphere: ${cleanAction}. ${parsed.styleKeywordsEn}.`;
  } else if (size === "extreme_wide_shot" || size === "wide_shot") {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} situated within ${parsed.environmentEn}. Visual action: ${cleanAction}. ${parsed.styleKeywordsEn}.`;
  } else if (size === "close_up" || size === "medium_close_up" || size === "extreme_close_up") {
    promptCore = `${readableSize}, ${readableAngle}. Detailed focus on ${parsed.heroEn}, capturing fine authentic textures and expressive lighting. Action: ${cleanAction}. Background shows ${parsed.environmentEn} softly blurred with rich cinematic bokeh. ${parsed.styleKeywordsEn}.`;
  } else {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} executing dynamic movement: ${cleanAction}, interacting with ${parsed.environmentEn}. Crisp rim lighting and rich depth. ${parsed.styleKeywordsEn}.`;
  }

  // Layer 4: Contextual Anti-Pollution Negatives
  let contextualAnti = "";
  if (parsed.isLandscape) {
    contextualAnti = "Strictly NO human characters, NO human actors, NO people, NO fantasy wings, NO magical circles, NO gothic spires, NO anime distortion, realistic landscape cinematography,";
  } else if (parsed.isNonHuman) {
    contextualAnti = "The creature is the solitary protagonist. Strictly NO human beings, NO people, NO actors in frame,";
  }

  const negativeClause = `no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, no typography, ${contextualAnti} full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen`;

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
    push_in: "Slow dramatic push-in shot accelerating forward toward the focal point",
    pull_out: "Smooth pull-out tracking shot expanding into the wider environment",
    tracking_right: "Dynamic Steadicam tracking shot moving right alongside the subject",
    tracking_left: "High-speed Steadicam tracking shot moving left with kinetic momentum",
    pan_right: "Fluid cinematic pan right revealing the expanding scene",
    pan_left: "Fast cinematic pan left following the subject's motion",
    tilt_up: "Dramatic tilt-up camera motion rising from base to summit",
    tilt_down: "Descending tilt-down shot tracking downward trajectory",
    arc_rotate: "360-degree orbital rotation around the focal element",
    crane: "Elevating crane shot rising above the scene with sweeping spatial depth",
    static: "Locked-off cinematic camera capturing atmospheric environmental motion",
  };

  const cameraTraj = movMap[movType] || `Cinematic camera tracking ${movType || "smoothly"}`;
  const cleanAction = action.replace(/["“”'‘’]/g, "'").trim() || "subject unfolds in dramatic cinematic motion";
  const subjectName = context?.subject || "Subject";
  const screenDir = context?.screenDirection || "left_to_right";

  return `[Camera]: ${cameraTraj}. [Action]: ${subjectName} presents ${cleanAction}, maintaining continuous visual momentum across the 16:9 frame in ${screenDir} trajectory. [Dynamics]: Natural atmospheric environmental flow, dynamic weather physics, volumetric lighting shifts. [Quality]: Smooth 24fps cinematic temporal motion, realistic momentum physics, continuous seamless trajectory, no morphing, no distortion.`;
}

// Generate story-adaptive storyboard with genre-aware cinematic beats
export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = (storyText || "").trim() || "未命名故事分镜";
  const scene = parseSemanticScene(cleanStory);
  const hero = scene.heroZh;
  const env = scene.environmentZh;

  let targetCount = 12;
  if (targetDuration <= 8.0) targetCount = 3;
  else if (targetDuration <= 20.0) targetCount = 6;

  const durPerShot = Number((targetDuration / targetCount).toFixed(1)) || 2.5;

  let baseArcs: Array<{ size: string; angle: string; mov: string; func: string; act: string; lighting?: string }> = [];

  // Branch 1: Landscape / Heritage / Four Seasons Time-Lapse (e.g. 《长城脚下日升日落寒来暑往》)
  if (scene.isLandscape) {
    if (targetCount <= 3) {
      baseArcs = [
        {
          size: "extreme_wide_shot",
          angle: "high_angle",
          mov: "crane",
          func: "晨曦破晓与宏大建立",
          act: `晨曦破晓 · 金色朝阳穿透连绵云海，照亮群山间蜿蜒万里的${hero}，建立宏大壮丽的空间格局`,
          lighting: "清晨第一缕金色阳光穿透薄雾，侧逆光勾勒山脊与古老石砖轮廓",
        },
        {
          size: "wide_shot",
          angle: "eye_level",
          mov: "tracking_right",
          func: "四季光影与岁月流转",
          act: `岁月流转 · 春夏郁郁葱葱与深秋漫山红叶在时光延时中交替，${hero}在苍茫天地间傲然屹立`,
          lighting: "温暖通透的自然日光，四季斑斓的大地色彩与层次分明的大气透视",
        },
        {
          size: "medium_close_up",
          angle: "low_angle",
          mov: "pull_out",
          func: "星轨流转与千古余韵",
          act: `千古定格 · 寒冬瑞雪与夜幕星轨在${hero}上空缓缓流转，镜头缓缓拉升，形成永恒史诗感的电影定格`,
          lighting: "冷峻幽蓝的夜空与璀璨星河银光，静谧沉稳的电影质感",
        },
      ];
    } else if (targetCount <= 6) {
      baseArcs = [
        {
          size: "extreme_wide_shot",
          angle: "high_angle",
          mov: "crane",
          func: "晨曦破晓",
          act: `晨曦日出 · 破晓时分，金色朝阳穿透连绵云海，照亮群山间巍峨蜿蜒的${hero}全貌`,
          lighting: "清晨第一缕金色阳光穿透山岚薄雾，漫射光柔和照亮山巅",
        },
        {
          size: "wide_shot",
          angle: "eye_level",
          mov: "tracking_right",
          func: "春夏生机",
          act: `春夏时节 · 阳光明媚洒在葱郁苍翠的群山山峦，古老烽火台在蓝天白云下威严屹立`,
          lighting: "明亮清澈的正午自然光，山间草木葱绿，生机盎然",
        },
        {
          size: "medium_shot",
          angle: "low_angle",
          mov: "push_in",
          func: "晚霞暮色",
          act: `晚霞余晖 · 傍晚时分，绚烂金红色的夕阳余晖洒在沧桑斑驳的青砖石垛口上，光影拉长`,
          lighting: "浓郁温暖的黄金时刻（Golden Hour）逆光，暖橙色斜阳与深长阴影交错",
        },
        {
          size: "medium_close_up",
          angle: "eye_level",
          mov: "static",
          func: "深秋霜降",
          act: `深秋红叶 · 石阶两侧漫山红叶如火，秋风卷起金黄落叶掠过古老石阶与箭楼垛口`,
          lighting: "秋日通透的斜射光，红叶与黄叶色彩饱和明艳，空气通透清爽",
        },
        {
          size: "close_up",
          angle: "low_angle",
          mov: "push_in",
          func: "寒冬大雪",
          act: `寒冬积雪 · 寒冬腊月，漫天鹅毛大雪覆盖冰封的烽火台垛口与苍茫山脊，冷峻庄严`,
          lighting: "清冷苍茫的雪天漫射天光，白雪与深灰色古砖形成鲜明高反差",
        },
        {
          size: "extreme_wide_shot",
          angle: "high_angle",
          mov: "pull_out",
          func: "星轨余韵",
          act: `斗转星移 · 璀璨银河与绚烂星轨在古老${hero}上空缓缓流转，镜头升起拉远，定格岁月沧桑`,
          lighting: "静谧深邃的浩瀚星空与银河微光，电影级大片余韵",
        },
      ];
    } else {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "春之破晓", act: `早春破晓 · 初升朝阳穿透春雾，${hero}在初融积雪与嫩绿山岭间苏醒` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "山花烂漫", act: `山花绽放 · 烂漫山花在${hero}石墙两侧迎风盛开，蜂蝶飞舞，春意盎然` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "盛夏雷雨", act: `盛夏风云 · 乌云翻滚与壮丽雷暴掠过山脉，暴雨洗刷古老砖石，雄浑壮烈` },
        { size: "full_shot", angle: "eye_level", mov: "pan_right", func: "雨过天晴", act: `雨后初霁 · 阳光冲破云层，一道绚丽彩虹横跨在苍翠山峦与${hero}之上` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "初秋晨霜", act: `初秋清晨 · 晶莹晨露凝聚在古老城砖缝隙的草叶上，微风拂动` },
        { size: "wide_shot", angle: "high_angle", mov: "tracking_left", func: "万山红遍", act: `金秋盛景 · 漫山红叶与金黄落叶铺满山谷，群山层林尽染，气势磅礴` },
        { size: "medium_shot", angle: "dutch_angle", mov: "tilt_up", func: "秋风肃杀", act: `晚秋夕照 · 苍茫晚霞映照烽火台古老箭孔，古老砖石承载岁月斑驳` },
        { size: "close_up", angle: "low_angle", mov: "push_in", func: "初雪降临", act: `初冬飞雪 · 第一场雪花静静飘落在坚固的城垛上，冷峻肃穆` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "冰封雪裹", act: `深冬严寒 · 冰棱倒挂在烽火台挑檐，白雪皑皑覆盖整片山脉脊线` },
        { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "雪霁天晴", act: `雪后晴空 · 极度通透的蔚蓝天空下，银装素裹的长城如巨龙蜿蜒` },
        { size: "wide_shot", angle: "high_angle", mov: "arc_rotate", func: "暮色沉降", act: `日暮黄昏 · 最后一抹夕阳将雪白山脊染成金红色，天地苍茫` },
        { size: "extreme_wide_shot", angle: "high_angle", mov: "pull_out", func: "千古星辰", act: `星移斗转 · 璀璨银河星海在古老长城上空缓缓旋转流逝，余韵悠长定格` },
      ];
    }
  }
  // Branch 2: Character / Action / Martial Arts / Sci-Fi
  else if (scene.genre === "action" || scene.genre === "classical" || scene.genre === "scifi") {
    if (targetCount <= 3) {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "世界观建立", act: `空间建立 · ${hero}置身于${env}中，气场冷峻内敛，建立宏大对决格局` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "核心交锋", act: `核心交锋 · ${hero}迅猛发力展开凌厉身法，招式破风而出，光影激烈变幻` },
        { size: "medium_close_up", angle: "eye_level", mov: "pull_out", func: "胜负定格", act: `胜负定格 · 激战平息，特写${hero}沉稳自信的眼神，镜头缓缓拉开定格` },
      ];
    } else if (targetCount <= 6) {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "世界观建立", act: `环境建立 · ${hero}伫立在${env}的开阔视野中，气氛凝重蓄势待发` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "步入战场", act: `步入对局 · ${hero}稳步向前移动，周身环境与光影随脚步动态流转` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "冲突起势", act: `动势交锋 · 冲突骤然爆发，${hero}侧身避让并展开迅疾反制，身法凌厉` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "眼神蓄力", act: `专注蓄势 · 特写${hero}坚毅沉着的眼神与肌肉微表情，逆光勾勒轮廓` },
        { size: "close_up", angle: "low_angle", mov: "push_in", func: "核心高潮", act: `终极爆发 · ${hero}全力出击施展核心绝技，视觉冲击力与动作张力拉满` },
        { size: "wide_shot", angle: "eye_level", mov: "pull_out", func: "余韵定格", act: `尘埃落定 · 招式收尾气流渐平，${hero}傲然屹立，镜头拉远形成电影感定格` },
      ];
    } else {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "起 · 宏观建立", act: `远景建立 · 展现${env}的宏伟格局与氛围基调` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "起 · 主角亮相", act: `主角亮相 · ${hero}步入场景，展现沉稳身姿` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "承 · 探索推进", act: `环境交互 · ${hero}观察周围动静，身形敏捷穿梭` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "承 · 危机察觉", act: `察觉异常 · ${hero}骤然停步，视线敏锐锁定目标` },
        { size: "close_up", angle: "low_angle", mov: "push_in", func: "转 · 决意迎战", act: `战意确立 · 特写坚决神态，摆出迎战起手势` },
        { size: "full_shot", angle: "eye_level", mov: "tracking_left", func: "转 · 疾速冲刺", act: `急速突进 · ${hero}身形如电向前发起高速冲刺` },
        { size: "medium_shot", angle: "dutch_angle", mov: "pan_right", func: "转 · 空中机动", act: `腾空机动 · 在复杂空间中灵活腾挪翻转避开阻碍` },
        { size: "extreme_close_up", angle: "eye_level", mov: "push_in", func: "转 · 瞬间聚焦", act: `极致特写 · 瞳孔中倒映出的光芒与决绝意念` },
        { size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", func: "转 · 环绕高光", act: `环绕镜头 · 360度环绕捕捉动作蓄力最高峰` },
        { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "激 · 核心高潮", act: `核心爆发 · 全力爆发终极决招，视觉张力拉满` },
        { size: "wide_shot", angle: "high_angle", mov: "pull_out", func: "合 · 局势平息", act: `胜负平息 · 冲击波散去，${hero}从容收势伫立` },
        { size: "extreme_wide_shot", angle: "eye_level", mov: "crane", func: "合 · 史诗定格", act: `余韵悠长 · 镜头升起拉远融入壮丽背景，定格余韵` },
      ];
    }
  }
  // Branch 3: Animal / Creature / Animation
  else if (scene.isNonHuman || scene.genre === "creature") {
    if (targetCount <= 3) {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "空间建立", act: `空镜入画 · 灵巧可爱的${hero}在美丽的${env}中登场，建立萌趣世界观` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "动态探索", act: `灵动穿梭 · ${hero}好奇地在场景中敏捷穿行探索，动作轻盈灵巧` },
        { size: "medium_close_up", angle: "low_angle", mov: "push_in", func: "高光回眸", act: `高光回眸 · ${hero}停下回眸，眼神纯真自信，微风拂动毛发，镜头缓缓拉开定格` },
      ];
    } else if (targetCount <= 6) {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "空间建立", act: `全景建立 · 展现${env}的优美风光，${hero}轻快登场` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "场景探索", act: `好奇探索 · ${hero}在环境中灵巧穿行，展现生动可爱的动作细节` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "意外发现", act: `意外惊喜 · ${hero}突然发现前方有趣的目标，好奇心爆棚` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "神态专注", act: `神态特写 · 特写${hero}专注坚毅的小眼神与精致微表情，萌态十足` },
        { size: "close_up", angle: "low_angle", mov: "push_in", func: "高光奔跑", act: `全力冲刺 · ${hero}全力向前冲刺跃起，动作轻盈充满活力` },
        { size: "wide_shot", angle: "eye_level", mov: "pull_out", func: "余韵定格", act: `惬意定格 · ${hero}成功达成目标，在阳光下惬意享受，镜头拉远定格` },
      ];
    } else {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "世界建立", act: `全景建立 · 美丽温馨的${env}全貌建立` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "萌趣亮相", act: `萌趣亮相 · ${hero}欢快步入画面，展示可爱外貌` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "环境互动", act: `趣味互动 · ${hero}与环境中的物件好奇互动` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "萌态发现", act: `发现线索 · ${hero}耳朵微动，视线锁定前方` },
        { size: "close_up", angle: "low_angle", mov: "push_in", func: "下定决心", act: `笃定眼神 · 特写${hero}充满斗志的小眼神` },
        { size: "full_shot", angle: "eye_level", mov: "tracking_left", func: "轻巧跃进", act: `轻巧跃进 · ${hero}敏捷向前轻盈奔跑` },
        { size: "medium_shot", angle: "dutch_angle", mov: "pan_right", func: "翻越障碍", act: `翻越障碍 · 灵巧避开途中障碍，动作行云流水` },
        { size: "extreme_close_up", angle: "eye_level", mov: "push_in", func: "毛发细节", act: `纤细特写 · 特写柔软毛发与晶莹纯真的瞳孔` },
        { size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", func: "环绕高光", act: `环绕高光 · 环绕运镜展现${hero}悬停或驻足的高光瞬间` },
        { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "活力冲刺", act: `精彩冲刺 · 全力一跃突破终点，活力四射` },
        { size: "wide_shot", angle: "high_angle", mov: "pull_out", func: "欢欣满足", act: `欢欣庆祝 · ${hero}开心驻足，阳光洒满周身` },
        { size: "extreme_wide_shot", angle: "eye_level", mov: "crane", func: "温馨定格", act: `温馨定格 · ${hero}向着远方阳光前行，镜头缓缓拉开定格` },
      ];
    }
  }
  // Branch 4: Modern Urban / Commercial / General Narrative
  else {
    if (targetCount <= 3) {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "都市建立", act: `空间建立 · 展现${env}的现代开阔空间，${hero}从容入画` },
        { size: "medium_shot", angle: "eye_level", mov: "push_in", func: "专注交互", act: `专注行动 · ${hero}专注投入当前核心事项，动作专业干练` },
        { size: "medium_close_up", angle: "low_angle", mov: "pull_out", func: "高光定格", act: `自信定格 · 特写${hero}从容自信的神态，镜头平稳拉开定格` },
      ];
    } else if (targetCount <= 6) {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "空间建立", act: `全景建立 · 现代都市与开阔${env}全景，建立故事空间` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "步入场景", act: `从容步入 · ${hero}步入场景，展现干练优雅的气场` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "专注行动", act: `深度投入 · ${hero}专注操作或互动，细节展现专业与专注` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "灵感触动", act: `灵感闪现 · 特写${hero}沉思微表情，眼中闪烁出自信光芒` },
        { size: "close_up", angle: "low_angle", mov: "push_in", func: "核心突破", act: `突破高光 · 关键成果达成，神采奕奕，动作笃定有力` },
        { size: "wide_shot", angle: "eye_level", mov: "pull_out", func: "从容收尾", act: `从容定格 · ${hero}展现释怀微笑，镜头拉开形成现代电影感定格` },
      ];
    } else {
      baseArcs = [
        { size: "extreme_wide_shot", angle: "high_angle", mov: "crane", func: "起 · 城市建立", act: `城市全景 · 晨光中的现代都市天际线与开阔${env}` },
        { size: "wide_shot", angle: "eye_level", mov: "tracking_right", func: "起 · 人物步入", act: `人物登场 · ${hero}步伐坚定步入空间` },
        { size: "medium_shot", angle: "low_angle", mov: "push_in", func: "承 · 空间互动", act: `环境交互 · ${hero}与空间中的核心元素展开互动` },
        { size: "medium_close_up", angle: "eye_level", mov: "static", func: "承 · 专注投入", act: `专注神态 · 特写沉稳干练的专业工作/生活状态` },
        { size: "close_up", angle: "low_angle", mov: "push_in", func: "承 · 细节捕捉", act: `精细操作 · 手部动作与工具/道具的高清细节呈现` },
        { size: "full_shot", angle: "eye_level", mov: "tracking_left", func: "转 · 节奏提速", act: `步伐加快 · 节奏转换，${hero}快速推进关键行动` },
        { size: "medium_shot", angle: "dutch_angle", mov: "pan_right", func: "转 · 攻克难题", act: `沉着应对 · 面对突发情况展现敏锐决策力` },
        { size: "extreme_close_up", angle: "eye_level", mov: "push_in", func: "转 · 眼神聚焦", act: `眼神特写 · 瞳孔中倒映出清晰成果与专注光芒` },
        { size: "medium_close_up", angle: "eye_level", mov: "arc_rotate", func: "转 · 灵感高光", act: `环绕镜头 · 弧线运镜捕捉突破时刻的高光神态` },
        { size: "full_shot", angle: "low_angle", mov: "tilt_up", func: "合 · 完美收官", act: `成果展现 · 核心目标圆满达成，气场全开` },
        { size: "wide_shot", angle: "high_angle", mov: "pull_out", func: "合 · 释怀从容", act: `从容驻足 · 阳光透过玻璃窗洒满空间，氛围温暖舒适` },
        { size: "extreme_wide_shot", angle: "eye_level", mov: "crane", func: "合 · 现代定格", act: `余韵悠长 · 镜头徐徐拉远与现代都市空间融为一体，定格` },
      ];
    }
  }

  return baseArcs.map((arc, idx) => {
    const screenDirection = idx % 2 === 0 ? "left_to_right" : "right_to_left";
    const imagePrompt = formatDirectorImagePrompt(
      arc.act,
      arc.size,
      arc.angle,
      arc.mov,
      {
        order: idx + 1,
        subject: hero,
        storyContext: cleanStory.slice(0, 100),
      }
    );

    const videoPrompt = formatDirectorVideoPrompt(
      arc.act,
      arc.mov,
      arc.size,
      {
        order: idx + 1,
        subject: hero,
        screenDirection,
      }
    );

    return {
      order: idx + 1,
      duration: durPerShot,
      shot_size: arc.size,
      camera_angle: arc.angle,
      camera_movement: {
        type: arc.mov,
        speed: "medium",
      },
      subject: hero,
      action: arc.act,
      narrative_function: arc.func,
      lighting: arc.lighting || (scene.isLandscape ? "通透自然光影，层次分明的大气透视" : "电影级通透主光源与柔和轮廓光"),
      audio: {
        sfx: scene.isLandscape ? "自然风声、鸟鸣与岁月风霜音效" : "环境音效与影视原声配乐",
        music: scene.isLandscape ? "雄浑壮阔的史诗弦乐配乐" : "节奏紧凑的电影原声",
      },
      image_prompt: imagePrompt,
      video_prompt: videoPrompt,
      continuity_data: {
        screen_direction: screenDirection,
        motion_in: `Shot #${idx + 1} entry kinetic momentum from ${screenDirection}`,
        motion_out: `Shot #${idx + 1} exit kinetic momentum forward`,
        transition_recommendation: idx === baseArcs.length - 1 ? "Fade to black" : "Match cut on action",
      },
    };
  });
}

// Full-featured Hollywood Director pipeline with LLM generation and genre-adaptive fallback
export async function generateDirectorPipeline(
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
      const userMessage = `【故事剧本内容】：\n${storyText}\n\n【目标时长】：${targetDuration} 秒（请严格规划 ${expectedCount} 个分镜头）。请直接输出纯 JSON 对象（不要附加其他说明文字），格式如下：\n{\n  "theme": "故事主题",\n  "global_visual_anchor": "主角/主体外观特征与核心场景基石 (纯英文自然描述句，严禁包含任何文字标签)",\n  "shots": [ ... ]\n}`;

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
                let contextualAnti = "";
                if (parsedScene.isLandscape) {
                  contextualAnti = "Strictly NO humans, NO actors, NO magical spires, NO fantasy wings, realistic 35mm landscape photography,";
                } else if (parsedScene.isNonHuman) {
                  contextualAnti = "The creature is the solitary protagonist. Strictly NO humans, NO actors,";
                }
                finalImgPrompt = cleanPromptOfMetaPollution(
                  `${parsedScene.heroEn}. ${globalAnchor}. ${rawImgPrompt}. no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, no typography, ${contextualAnti} full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen`
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

export const runDirectorPipeline = generateDirectorPipeline;
