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
  // Narrative OS Phase 1
  beat_type?: string; // 'hook' | 'inciting_incident' | 'tension_build' | 'plot_twist' | 'climax_payoff' | 'cliffhanger_hook'
  emotional_voltage?: number; // 0 - 100
  information_gap?: string; // 为什么看下一镜的悬念引线
  compute_tier?: "flagship" | "standard" | "economy";
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
你的终极任务是将用户的剧本或意向文本转化为工业级电影分镜脚本（包含画面动作、生动台词对白、音效与配乐设计、纯净生图提示词与视频运镜词）。

${pacingGuidance}

【核心视觉导演五大铁律 (CRITICAL DIRECTING PRINCIPLES)】:
1. 【对白与声音设计必须饱满完整 (MANDATORY Dialogue & Sound Design)】:
   - 每个镜头必须包含对应的【角色台词或画外音旁白 (dialogue)】，严禁留空！（例如：“孟姜女：'夫君，无论千山万水，我定要找到你……'” 或 “旁白：'寒冬腊月，长城脚下白骨覆雪……'”）；
   - 每个镜头必须包含具象的【音效 (sfx) 与配乐 (music)】（例如：sfx 为 "凛冽暴风雪呼啸、沉重踩雪脚步声"，music 为 "凄楚悲凉的古筝与低沉大提琴"）。

2. 【题材与主体忠实性法则 (Genre & Subject Fidelity)】:
   - 严禁擅自篡改题材！如果用户输入的是自然风光/历史岁月（如“长城”、“孟姜女哭长城”），核心必须是真实历史风貌与人物情感，**绝对严禁擅自加入任何魔幻翅膀、哥特古堡或魔法光环**！
   - 如果用户输入的是动作武侠/科幻，则遵循真实动作设计或赛博科幻硬核美学；
   - 如果用户输入的是萌宠/动物，则主体严格锁定该生物，严禁生成无关人类。

3. 【专业视听语言与景别递进 (Cinematic Staging & Dynamic Progression)】:
   - 景别（Shot Size）必须丰富交替（EWS 建立空间 -> WS 环境交互 -> MS 主体动作 -> MCU/CU 细节与情感 -> EWS 余韵定格）；
   - 运镜（Camera Movement）必须具有明确的电影动势（Crane 升降、Tracking 跟随、Push-in 推进、Pull-out 拉远）；
   - 严守 180° 运动轴线与镜头剪辑连贯性。

4. 【纯净自然生图画卷描述 (Pure Diegetic Natural Prompting)】:
   - 严禁输出 "Visual Anchor:", "Anticipation Pose:", "Action:", "Shot #", "Subject:" 等任何机械标签！
   - 必须写出主谓宾连贯、具有电影级光影层次、材质细节与空间纵深的纯英文描述句。
   - 结尾统一附加强负向约束：
     "no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen"

5. 【输出格式规范】：
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
- subject: 镜头主体描述 (如 "孟姜女" 或 "古老长城与烽火台")
- action: 具象生动的动作/画面台本描述 (中文，严禁空洞套话)
- dialogue: 角色台词或画外音旁白 (中文，必填，富有戏剧张力)
- narrative_function: 视听叙事功能 (如 "空间建立 / 悲痛哭诉 / 狂风怒吼 / 城墙坍塌 / 余韵定格")
- lighting: 光影基调 (如 "阴郁寒冬冷灰天光，侧逆光勾勒人物消瘦凄凉轮廓")
- audio: { "sfx": "呼啸寒风声、沉重脚步踩雪声", "music": "凄楚幽咽的古琴与悲壮交响" }
- beat_type: 戏剧节拍类型 ('hook' | 'inciting_incident' | 'tension_build' | 'plot_twist' | 'climax_payoff' | 'cliffhanger_hook')
- emotional_voltage: 情绪势能电压 (0~100 的整数，首镜通常为 70+开篇悬念，中段蓄压 50~80，高潮 90+，末镜为 95+绝境卡点)
- information_gap: 为什么观众必须看下一镜？(简练阐明此镜头结尾留存的信息缺口与悬念引线)
- compute_tier: 算力调度建议 ('flagship' | 'standard' | 'economy'，高潮动作/人物特写为 flagship，普通对白为 standard，空镜头为 economy)
- image_prompt: 纯净英文自然生图描述句 (Pure Visual Description in English, no labels)
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

// Universal Input Boundary Normalizer for extreme short/long scripts and multilingual inputs
export function normalizeAndPreprocessStory(text: string): string {
  if (!text) return "未命名故事剧本";
  let cleaned = text.trim();

  // If ultra-short input (< 12 characters), enrich context naturally
  if (cleaned.length < 12) {
    if (/长城|故宫|山脉|风光|风景|自然/i.test(cleaned)) {
      cleaned = `雄伟连绵的${cleaned}，在破晓日出与四季变迁的光影流转中展现宏大壮丽画卷。`;
    } else if (/黑客|赛博|未来|科幻/i.test(cleaned)) {
      cleaned = `霓虹闪烁的未来都市中，${cleaned}展开紧张刺激的追逐交锋。`;
    } else if (/猪|猫|狗|老鼠|鸟|萌宠|动物/i.test(cleaned)) {
      cleaned = `灵巧可爱的${cleaned}在优美的天地间开启生动有趣的奇妙探索。`;
    } else if (/武侠|江湖|剑客|功夫/i.test(cleaned)) {
      cleaned = `烟雨江湖古典意境中，${cleaned}施展凌厉身法展开巅峰对决。`;
    } else if (/孟姜女/i.test(cleaned)) {
      cleaned = `孟姜女千里寻夫至长城脚下，闻夫已死，悲恸哭倒长城八百里的历史悲壮传奇。`;
    }
  }

  // If ultra-long input (> 800 characters), safely preserve first 600 characters for key beats
  if (cleaned.length > 800) {
    cleaned = cleaned.slice(0, 800).trim();
  }

  return cleaned;
}

// Universal Semantic Parser that accurately classifies Genre, Subject & World Backdrop
export function parseSemanticScene(text: string): ExtractedSemanticScene {
  const raw = normalizeAndPreprocessStory(text);

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

  if (/长城脚下日升日落|四季|春夏秋冬|日升日落|寒来暑往|雪景|大漠|黄河|自然风光|星空|草原|江河|山川/i.test(raw) && !/孟姜女|人|战|英雄|故事/i.test(raw)) {
    genre = "landscape";
    isLandscape = true;
  } else if (/孟姜女|武侠|古风|国风|水墨|江湖|唐宋|汉服|历史|典故|剑客|功夫|茶馆/i.test(raw)) {
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
    heroZh = "雄伟万里长城与连绵烽火台";
    heroEn = "the majestic Great Wall of China with ancient stone battlements and fortified watchtowers";
    environmentZh = "蜿蜒崇山峻岭与四季变幻的雄浑天地";
    environmentEn = "colossal winding mountain ridges, misty valley depths, dynamic seasonal skies from sunrise dawn to sunset and starry night";
    styleKeywordsEn = "National Geographic masterwork landscape cinematography, 35mm film still, photorealistic ancient stone brick textures, epic documentary scale, natural volumetric atmospheric sunlight, zero humans, pure timeless heritage";
  } else if (/孟姜女/i.test(raw)) {
    heroZh = "孟姜女";
    heroEn = "Meng Jiangnu, a devoted ancient Chinese woman in weathered traditional linen robes";
    environmentZh = "风雪苍茫的万里长城古关隘";
    environmentEn = "ancient snow-swept Great Wall stone fortress, desolate barren mountains, swirling snow blizzard in background";
    styleKeywordsEn = "Cinematic historical drama film still, realistic 35mm film grain, emotional dramatic natural lighting, authentic ancient Chinese attire and stone fortress textures";
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
    environmentZh = envPart || "中国古典青石关隘与远山水墨";
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

// Synthesize pure, cinematic, natural English action descriptions from Chinese text
export function synthesizeEnglishVisualAction(chineseAction: string, genre: string): string {
  if (!chineseAction) return "unfolds in dramatic cinematic composition";
  if (/^[a-zA-Z0-9\s,.'":;-]+$/.test(chineseAction) && chineseAction.length > 10) {
    return chineseAction.trim();
  }

  const act = chineseAction.toLowerCase();
  const fragments: string[] = [];

  // Sunrise / Dawn
  if (/晨曦|破晓|日出|清晨|朝阳/.test(act)) {
    fragments.push("golden sunrise dawn breaking through sea of morning mountain mist and cloud inversion");
  }
  // Summer / Spring Green
  else if (/春夏|葱郁|春季|草木|生机|山花|绿/.test(act)) {
    fragments.push("vibrant lush green summer mountain slopes bathed in clear natural cinematic daylight");
  }
  // Sunset / Golden hour
  else if (/晚霞|夕阳|日暮|暮色|黄昏|余晖/.test(act)) {
    fragments.push("dramatic golden hour sunset illuminating ancient weathered stone brick textures with warm long shadows");
  }
  // Autumn / Foliage
  else if (/深秋|金秋|红叶|落叶|霜降/.test(act)) {
    fragments.push("breathtaking autumn red and golden foliage fluttering across ancient stone pathways and mountain ridge");
  }
  // Winter / Snow / Crying Meng Jiangnu
  else if (/寒冬|大雪|积雪|飞雪|冰封|霜雪|哭倒|悲恸|寻夫/.test(act)) {
    fragments.push("emotional dramatic scene in winter blizzard with snow falling over cold stone fortress walls");
  }
  // Starry sky / Galaxy
  else if (/星轨|银河|斗转星移|星辰|夜空/.test(act)) {
    fragments.push("celestial night sky with rotating Milky Way galaxy and star trails over timeless landscape");
  }
  // Combat / Martial arts
  else if (/交锋|身法|出招|对决|迎战|反制|拔剑/.test(act)) {
    fragments.push("executing razor-sharp martial kinetic movement with intense focused energy and fluid motion");
  }
  // Dash / Sprint
  else if (/冲刺|奔跑|疾速|俯冲|跃起|突进/.test(act)) {
    fragments.push("accelerating forward in high-speed dynamic dash with kinetic motion blur on periphery");
  }
  // Close-up / Expression
  else if (/特写|神态|眼神|蓄势|微表情|凝重|泪光/.test(act)) {
    fragments.push("intimate close-up capturing intense emotional tearful expression and dramatic lighting");
  }
  // Stepping in
  else if (/步入|亮相|登场|伫立|入画|前行/.test(act)) {
    fragments.push("commanding presence walking forward along mountain path with cinematic depth");
  }
  // Resolution / Final
  else if (/定格|余韵|平息|从容|远去/.test(act)) {
    fragments.push("tranquil cinematic resolution frame as camera pulls back into expansive horizon");
  }

  if (fragments.length > 0) {
    return fragments.join(", ");
  }

  if (genre === "landscape") {
    return "panoramic landscape unfolding with rich atmospheric depth and natural lighting";
  }
  return "executing dynamic cinematic action with fluid motion and spatial depth";
}

// Generate natural, fluid, 100% Pure English Hollywood-grade image prompts
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
  const englishVisualAction = synthesizeEnglishVisualAction(action, parsed.genre);

  // Build Layer 2 & 3: Diegetic Subject & Environment interaction in 100% Pure English
  let promptCore = "";
  if (parsed.isLandscape) {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} in ${parsed.environmentEn}. Visual atmosphere: ${englishVisualAction}. ${parsed.styleKeywordsEn}.`;
  } else if (size === "extreme_wide_shot" || size === "wide_shot") {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} situated within ${parsed.environmentEn}. Action: ${englishVisualAction}. ${parsed.styleKeywordsEn}.`;
  } else if (size === "close_up" || size === "medium_close_up" || size === "extreme_close_up") {
    promptCore = `${readableSize}, ${readableAngle}. Detailed focus on ${parsed.heroEn}, capturing fine authentic textures and expressive lighting. Action: ${englishVisualAction}. Background shows ${parsed.environmentEn} softly blurred with rich cinematic bokeh. ${parsed.styleKeywordsEn}.`;
  } else {
    promptCore = `${readableSize}, ${readableAngle}, ${readableViewpoint}. ${parsed.heroEn} executing dynamic movement: ${englishVisualAction}, interacting with ${parsed.environmentEn}. Crisp rim lighting and rich depth. ${parsed.styleKeywordsEn}.`;
  }

  // Layer 4: Contextual Anti-Pollution Negatives
  let contextualAnti = "";
  if (parsed.isLandscape) {
    contextualAnti = "Strictly NO human characters, NO human actors, NO people, NO fantasy wings, NO magical circles, NO gothic spires, NO anime distortion, realistic landscape cinematography,";
  } else if (parsed.isNonHuman) {
    contextualAnti = "The creature is the solitary protagonist. Strictly NO human beings, NO people, NO actors in frame,";
  }

  const negativeClause = `no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, no speech bubbles, no comic dialogue bubble, no text balloon, no subtitle bar, no english subtitles, no captions, no typography, no letters, no words, ${contextualAnti} full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen`;

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

// Generate story-adaptive storyboard with genre-aware cinematic beats, vivid dialogues & full audio design
export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = normalizeAndPreprocessStory(storyText);
  const scene = parseSemanticScene(cleanStory);
  const hero = scene.heroZh;
  const env = scene.environmentZh;

  let targetCount = 12;
  if (targetDuration <= 8.0) targetCount = 3;
  else if (targetDuration <= 20.0) targetCount = 6;

  const durPerShot = Number((targetDuration / targetCount).toFixed(1)) || 2.5;

  let baseArcs: Array<{
    size: string;
    angle: string;
    mov: string;
    func: string;
    act: string;
    dialogue: string;
    sfx: string;
    music: string;
    lighting?: string;
  }> = [];

  // Special Branch: Meng Jiangnu / Classical Historical Tragedy
  if (/孟姜女/i.test(cleanStory)) {
    baseArcs = [
      {
        size: "extreme_wide_shot",
        angle: "high_angle",
        mov: "crane",
        func: "空间建立",
        act: `孟姜女身着粗布破衣，伫立在蜿蜒崎岖的寒风山路上，遥望着远方巍峨冷峻的万里古城墙。`,
        dialogue: `旁白：“秋风萧瑟，万里迢迢，孟姜女携寒衣千里寻夫至关隘。”`,
        sfx: "呼啸北风声、枯枝折断声、衣袂猎猎作响",
        music: "凄清低回的古箫与悲壮大提琴",
        lighting: "阴郁苍凉的灰暗天光，远山烟岚薄雾弥漫",
      },
      {
        size: "wide_shot",
        angle: "low_angle",
        mov: "tracking_right",
        func: "艰难跋涉",
        act: `孟姜女背着破旧包裹，沿崎岖乱石山路坚定前行，脚下草鞋磨破，身形瘦弱却步履坚韧。`,
        dialogue: `孟姜女：“夫君……无论千山万水，我定要寻到你。”`,
        sfx: "沉重的踩石脚步声、微弱喘息声、远方筑城劳役的号子声",
        music: "节奏沉重缓慢的古琴与低沉打击乐",
        lighting: "冷色调漫射日光，乱石山脊质感嶙峋",
      },
      {
        size: "medium_shot",
        angle: "eye_level",
        mov: "push_in",
        func: "惊闻噩耗",
        act: `孟姜女停下脚步，向修城劳役打听夫君下落，得知万杞梁已劳累身亡筑入城墙，手中寒衣跌落尘土。`,
        dialogue: `老劳役：“姑娘莫找了……万杞梁他早已累死，尸骨就埋在这城墙下了……”`,
        sfx: "寒衣落地轻响、心跳重击声、瞬间耳鸣失真",
        music: "琵琶悲音骤断，转入极度压抑的悬疑低音弦乐",
        lighting: "斜阳如血，将二人影子拉得极长极深",
      },
      {
        size: "close_up",
        angle: "eye_level",
        mov: "push_in",
        func: "悲恸欲绝",
        act: `特写孟姜女双眼泛起泪光，眼神从难以置信转为撕心裂肺的绝望，泪水决堤滑落脸颊。`,
        dialogue: `孟姜女：“杞梁……天呐！还我夫君来啊——！”`,
        sfx: "悲恸哭泣声、雷声隐隐自天际滚滚而来",
        music: "高亢凄厉的二胡独奏，如泣如诉，直刺人心",
        lighting: "乌云压顶，暗调光影打在泪流满面的面部轮廓上",
      },
      {
        size: "full_shot",
        angle: "low_angle",
        mov: "tilt_up",
        func: "哭倒长城",
        act: `孟姜女扑倒在巍峨城墙脚下痛哭失声，天昏地暗，狂风大作，坚固的古城墙轰然崩塌八百里。`,
        dialogue: `旁白：“天地同悲，风云变色，一哭城崩八百里，白骨累累现荒野。”`,
        sfx: "狂暴雷霆霹雳声、古城巨石崩塌轰鸣巨响、漫天尘土呼啸",
        music: "全乐团悲壮交响齐鸣，情绪爆发至最高峰",
        lighting: "雷电划破苍穹的闪烁高反差白光，尘土飞扬",
      },
      {
        size: "extreme_wide_shot",
        angle: "high_angle",
        mov: "pull_out",
        func: "千古余韵",
        act: `风暴渐息，夕阳残血映照着崩塌的长城废墟与跪伏的身影，镜头缓缓升起拉远，定格千古绝唱。`,
        dialogue: `旁白：“千古长城今犹在，何处再寻孟姜女。”`,
        sfx: "凄清晚风吹过荒野废墟声、远方归鸦哀鸣",
        music: "悠远空灵的洞箫独奏，余音袅袅",
        lighting: "苍凉壮阔的残阳晚霞，天地一片血红与金黄",
      },
    ];
  }
  // Branch 1: Pure Landscape / Four Seasons Time-Lapse (e.g. 《长城脚下日升日落寒来暑往》)
  else if (scene.isLandscape) {
    if (targetCount <= 3) {
      baseArcs = [
        {
          size: "extreme_wide_shot",
          angle: "high_angle",
          mov: "crane",
          func: "晨曦破晓",
          act: `晨曦破晓 · 金色朝阳穿透连绵云海，照亮群山间蜿蜒万里的${hero}，建立宏大壮丽的空间格局。`,
          dialogue: `旁白：“万里长城，千载沧桑，破晓金光普照山河。”`,
          sfx: "清晨山风呼啸、晨鸟清脆啼鸣",
          music: "宏大悠扬的古风交响乐起势",
          lighting: "清晨第一缕金色阳光穿透薄雾，侧逆光勾勒山脊与古老石砖轮廓",
        },
        {
          size: "wide_shot",
          angle: "eye_level",
          mov: "tracking_right",
          func: "四季流转",
          act: `岁月流转 · 春夏郁郁葱葱与深秋漫山红叶在时光延时中交替，${hero}在苍茫天地间傲然屹立。`,
          dialogue: `旁白：“寒来暑往，春华秋实，古老烽燧见证岁月流转。”`,
          sfx: "林间风吹树叶沙沙声、落叶飘零声",
          music: "温暖抒情的笛声与弦乐交织",
          lighting: "温暖通透的自然日光，四季斑斓的大地色彩",
        },
        {
          size: "medium_close_up",
          angle: "low_angle",
          mov: "pull_out",
          func: "千古定格",
          act: `千古定格 · 寒冬瑞雪与夜幕星轨在${hero}上空缓缓流转，镜头缓缓拉升，形成永恒史诗感的电影定格。`,
          dialogue: `旁白：“斗转星移，江山依旧，巍峨长城屹立千秋。”`,
          sfx: "夜空静谧微风声、悠远回音",
          music: "空灵深邃的史诗终章余韵",
          lighting: "冷峻幽蓝的夜空与璀璨星河银光",
        },
      ];
    } else {
      baseArcs = [
        {
          size: "extreme_wide_shot",
          angle: "high_angle",
          mov: "crane",
          func: "晨曦破晓",
          act: `晨曦日出 · 破晓时分，金色朝阳穿透连绵云海，照亮群山间巍峨蜿蜒的${hero}全貌。`,
          dialogue: `旁白：“破晓时分，第一缕晨曦破云而出，洒在苍茫大地之上。”`,
          sfx: "清晨山风声、群鸟飞掠长空清鸣",
          music: "悠远清亮的古琴与弦乐缓缓铺陈",
          lighting: "清晨金色朝阳，漫射光柔和照亮山巅",
        },
        {
          size: "wide_shot",
          angle: "eye_level",
          mov: "tracking_right",
          func: "春夏生机",
          act: `春夏时节 · 阳光明媚洒在葱郁苍翠的群山山峦，古老烽火台在蓝天白云下威严屹立。`,
          dialogue: `旁白：“春夏交替，绿树漫山，古老的关隘焕发蓬勃生机。”`,
          sfx: "微风吹拂树梢沙沙声、山间流水声",
          music: "明朗温婉的笛声与轻快弦乐",
          lighting: "明亮清澈的正午自然光，生机盎然",
        },
        {
          size: "medium_shot",
          angle: "low_angle",
          mov: "push_in",
          func: "晚霞暮色",
          act: `晚霞余晖 · 傍晚时分，绚烂金红色的夕阳余晖洒在沧桑斑驳的青砖石垛口上，光影拉长。`,
          dialogue: `旁白：“夕阳如血，残阳晚照，斑驳城砖印刻着无声的历史。”`,
          sfx: "归鸦啼鸣、暮风沉重掠过垛口",
          music: "沧桑厚重的大提琴与古埙乐",
          lighting: "黄金时刻（Golden Hour）暖橙色斜阳逆光",
        },
        {
          size: "medium_close_up",
          angle: "eye_level",
          mov: "static",
          func: "深秋霜降",
          act: `深秋红叶 · 石阶两侧漫山红叶如火，秋风卷起金黄落叶掠过古老石阶与箭楼垛口。`,
          dialogue: `旁白：“霜降秋深，层林尽染，落叶随风飘向天际。”`,
          sfx: "秋风扫落叶声、萧瑟风鸣",
          music: "凄清深情的琵琶与抒情弦乐",
          lighting: "秋日通透斜射光，红叶饱和明艳",
        },
        {
          size: "close_up",
          angle: "low_angle",
          mov: "push_in",
          func: "寒冬大雪",
          act: `寒冬积雪 · 寒冬腊月，漫天鹅毛大雪覆盖冰封的烽火台垛口与苍茫山脊，冷峻庄严。`,
          dialogue: `旁白：“隆冬飞雪，千里冰封，天地苍茫唯此长城屹立。”`,
          sfx: "暴风雪呼啸声、冰雪碎落声",
          music: "肃穆冰冷的低音管弦乐",
          lighting: "清冷雪天漫射天光，高反差白雪与古砖",
        },
        {
          size: "extreme_wide_shot",
          angle: "high_angle",
          mov: "pull_out",
          func: "星轨余韵",
          act: `斗转星移 · 璀璨银河与绚烂星轨在古老${hero}上空缓缓流转，镜头升起拉远，定格岁月沧桑。`,
          dialogue: `旁白：“斗转星移，山河永固，历史的长卷在此永恒定格。”`,
          sfx: "夜空静谧微风声、浩渺空灵回音",
          music: "壮丽恢弘的史诗终章交响乐",
          lighting: "浩瀚星空与银河微光",
        },
      ];
    }
  }
  // Branch 2: Character / Action / Classical / Sci-Fi
  else if (scene.genre === "action" || scene.genre === "classical" || scene.genre === "scifi") {
    baseArcs = [
      {
        size: "extreme_wide_shot",
        angle: "high_angle",
        mov: "crane",
        func: "世界观建立",
        act: `环境建立 · ${hero}伫立在${env}的开阔视野中，气氛凝重蓄势待发。`,
        dialogue: `旁白：“风云际会，宿命之战终将在此展开。”`,
        sfx: "风雷隐隐、沉重脚步踏地声",
        music: "低沉压抑的战鼓与急促弦乐",
        lighting: "阴郁沉稳的电影主光源",
      },
      {
        size: "wide_shot",
        angle: "eye_level",
        mov: "tracking_right",
        func: "步入战场",
        act: `步入对局 · ${hero}稳步向前移动，周身环境与光影随脚步动态流转。`,
        dialogue: `${hero}：“既然来了，便不必多言，拔剑吧。”`,
        sfx: "兵刃出鞘清脆龙吟声、气流呼啸",
        music: "快节奏琵琶与激烈律动古琴",
        lighting: "侧逆光勾勒坚毅身影",
      },
      {
        size: "medium_shot",
        angle: "low_angle",
        mov: "push_in",
        func: "冲突起势",
        act: `动势交锋 · 冲突骤然爆发，${hero}侧身避让并展开迅疾反制，身法凌厉如电。`,
        dialogue: `对手：“好身法！再接我一招！”`,
        sfx: "破空拳风声、兵刃激烈撞击金铁交鸣声",
        music: "高燃紧凑的动作打击乐",
        lighting: "激烈交锋动态光影变幻",
      },
      {
        size: "medium_close_up",
        angle: "eye_level",
        mov: "static",
        func: "眼神蓄力",
        act: `专注蓄势 · 特写${hero}坚毅沉着的眼神与肌肉微表情，逆光勾勒轮廓。`,
        dialogue: `${hero}：“一招，定乾坤。”`,
        sfx: "真气凝聚嗡鸣声、沉重心跳重音",
        music: "配乐瞬间静止，唯留紧张心跳声",
        lighting: "极具张力的高反差硬光",
      },
      {
        size: "close_up",
        angle: "low_angle",
        mov: "push_in",
        func: "核心高潮",
        act: `终极爆发 · ${hero}全力出击施展核心绝技，视觉冲击力与动作张力拉满。`,
        dialogue: `${hero}：“破——！”`,
        sfx: "气劲爆裂巨响、地面碎石飞溅破空声",
        music: "全乐团高潮交响齐奏",
        lighting: "高亮能量冲击光芒",
      },
      {
        size: "wide_shot",
        angle: "eye_level",
        mov: "pull_out",
        func: "余韵定格",
        act: `尘埃落定 · 招式收尾气流渐平，${hero}傲然屹立，镜头拉远形成电影感定格。`,
        dialogue: `旁白：“胜负已分，尘埃落定，江湖唯余此豪迈传奇。”`,
        sfx: "微风吹动衣襟声、尘埃落地轻响",
        music: "悠远舒缓的古风余韵终曲",
        lighting: "暖色夕阳柔光洒满大地",
      },
    ];
  }
  // Branch 3: Animal / Creature / Animation
  else if (scene.isNonHuman || scene.genre === "creature") {
    baseArcs = [
      {
        size: "extreme_wide_shot",
        angle: "high_angle",
        mov: "crane",
        func: "空间建立",
        act: `全景建立 · 展现${env}的优美风光，${hero}轻快登场，充满萌趣。`,
        dialogue: `旁白：“在阳光明媚的森林里，住着一只充满好奇心的小家伙。”`,
        sfx: "清晨鸟鸣声、欢快溪水流动声",
        music: "轻快活泼的木管乐与铃铛声",
        lighting: "温暖通透的童话晨光",
      },
      {
        size: "wide_shot",
        angle: "eye_level",
        mov: "tracking_right",
        func: "场景探索",
        act: `好奇探索 · ${hero}在环境中灵巧穿行，展现生动可爱的动作细节。`,
        dialogue: `${hero}：“哇！今天一定要去山那边看看新世界！”`,
        sfx: "轻快的小脚步哒哒声、草丛沙沙声",
        music: "充满弹性的跳跃节奏打击乐",
        lighting: "斑驳树影与温暖阳光",
      },
      {
        size: "medium_shot",
        angle: "low_angle",
        mov: "push_in",
        func: "意外发现",
        act: `意外惊喜 · ${hero}突然发现前方有趣的目标，好奇心爆棚。`,
        dialogue: `${hero}：“咦？那是藏在花丛里的神秘宝物吗？”`,
        sfx: "魔法微光叮咚声、清脆风铃声",
        music: "悬疑俏皮的八音盒旋律",
        lighting: "局部发光高光轮廓",
      },
      {
        size: "medium_close_up",
        angle: "eye_level",
        mov: "static",
        func: "神态专注",
        act: `神态特写 · 特写${hero}专注坚毅的小眼神与精致微表情，萌态十足。`,
        dialogue: `${hero}：“看我的，我一定能做到！”`,
        sfx: "深吸气声、蓄势发力轻微哼声",
        music: "逐渐激昂坚定的上行旋律",
        lighting: "柔和眼神光，毛发质感细腻",
      },
      {
        size: "close_up",
        angle: "low_angle",
        mov: "push_in",
        func: "高光奔跑",
        act: `全力冲刺 · ${hero}全力向前冲刺跃起，动作轻盈充满活力。`,
        dialogue: `${hero}：“冲啊——！我们成功啦！”`,
        sfx: "破风呼啸声、欢快的笑声",
        music: "热烈欢快的高潮交响",
        lighting: "金光灿烂的逆光飞跃",
      },
      {
        size: "wide_shot",
        angle: "eye_level",
        mov: "pull_out",
        func: "余韵定格",
        act: `惬意定格 · ${hero}成功达成目标，在阳光下惬意享受，镜头拉远定格。`,
        dialogue: `旁白：“最美好的冒险，永远在充满勇气的旅途之中。”`,
        sfx: "微风拂过草地声、小兽满足的呼吸声",
        music: "温馨治愈的摇篮曲余韵",
        lighting: "温暖黄昏夕阳天光",
      },
    ];
  }
  // Branch 4: Modern Urban / Commercial
  else {
    baseArcs = [
      {
        size: "extreme_wide_shot",
        angle: "high_angle",
        mov: "crane",
        func: "空间建立",
        act: `全景建立 · 现代都市与开阔${env}全景，建立故事空间。`,
        dialogue: `旁白：“城市的每一个清晨，都始于一份对完美的执着。”`,
        sfx: "远方城市车流声、咖啡机研磨萃取声",
        music: "现代律动电子爵士乐",
        lighting: "现代通透大落地窗晨光",
      },
      {
        size: "wide_shot",
        angle: "eye_level",
        mov: "tracking_right",
        func: "步入场景",
        act: `从容步入 · ${hero}步入场景，展现干练优雅的气场。`,
        dialogue: `${hero}：“今天，把每一个细节做到极致。”`,
        sfx: "清脆高跟鞋/皮鞋脚步声、文件翻阅声",
        music: "充满前进感的现代节奏律动",
        lighting: "柔和室内漫射光",
      },
      {
        size: "medium_shot",
        angle: "low_angle",
        mov: "push_in",
        func: "专注行动",
        act: `深度投入 · ${hero}专注操作或互动，细节展现专业与专注。`,
        dialogue: `${hero}：“关键核心点就在这里，重新构架。”`,
        sfx: "键盘敲击声、光标点击确认音",
        music: "富有张力的合成器低音",
        lighting: "屏幕光映衬面部轮廓",
      },
      {
        size: "medium_close_up",
        angle: "eye_level",
        mov: "static",
        func: "灵感触动",
        act: `灵感闪现 · 特写${hero}沉思微表情，眼中闪烁出自信光芒。`,
        dialogue: `${hero}：“找到了，这就是最好的解法。”`,
        sfx: "灵感叮响声、平稳呼吸声",
        music: "明亮上扬的高频钢琴音符",
        lighting: "柔和眼神光，专业自信神态",
      },
      {
        size: "close_up",
        angle: "low_angle",
        mov: "push_in",
        func: "核心突破",
        act: `突破高光 · 关键成果达成，神采奕奕，动作笃定有力。`,
        dialogue: `旁白：“每一次突破，都在重新定义无限可能。”`,
        sfx: "成果确认音效、掌声回音",
        music: "激昂大气的现代商业交响",
        lighting: "明亮透彻的高光打光",
      },
      {
        size: "wide_shot",
        angle: "eye_level",
        mov: "pull_out",
        func: "从容收尾",
        act: `从容定格 · ${hero}展现释怀微笑，镜头拉开形成现代电影感定格。`,
        dialogue: `旁白：“创想无界，从此刻出发。”`,
        sfx: "城市远景环境声",
        music: "温暖通透的品牌声音标识",
        lighting: "落日余晖洒满现代建筑",
      },
    ];
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

    const totalCount = baseArcs.length;
    let beatType = "tension_build";
    let emotionalVoltage = 50;
    let infoGap = "人物行动推进中，潜藏危机正在积蓄";
    let computeTier: "flagship" | "standard" | "economy" = "standard";

    if (idx === 0) {
      beatType = "hook";
      emotionalVoltage = 78;
      infoGap = "开篇核心悬念锁定：突发危机或主角面临生死抉择";
      computeTier = "flagship";
    } else if (idx === totalCount - 1) {
      beatType = "cliffhanger_hook";
      emotionalVoltage = 96;
      infoGap = "绝境悬念卡点：突发重大变故，强迫观众期待下一集";
      computeTier = "flagship";
    } else if (arc.size.includes("close") || arc.act.includes("高潮") || arc.act.includes("冲刺") || arc.act.includes("对决")) {
      beatType = "climax_payoff";
      emotionalVoltage = 90;
      infoGap = "戏剧冲突临界引爆，胜负生死即刻分晓";
      computeTier = "flagship";
    } else if (arc.size.includes("extreme_wide")) {
      beatType = "inciting_incident";
      emotionalVoltage = 40;
      infoGap = "宏大世界观徐徐铺开，风暴即将来临";
      computeTier = "economy";
    } else {
      beatType = "tension_build";
      emotionalVoltage = Math.min(85, Math.round(45 + (idx / totalCount) * 40));
      infoGap = "矛盾层层递进，双方博弈进入白热化阶段";
      computeTier = "standard";
    }

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
      dialogue: arc.dialogue || "",
      narrative_function: arc.func,
      lighting: arc.lighting || (scene.isLandscape ? "通透自然光影，层次分明的大气透视" : "电影级通透主光源与柔和轮廓光"),
      audio: {
        sfx: arc.sfx || "环境音效与现场音效",
        music: arc.music || "影视原声配乐",
      },
      image_prompt: imagePrompt,
      video_prompt: videoPrompt,
      continuity_data: {
        screen_direction: screenDirection,
        motion_in: `Shot #${idx + 1} entry kinetic momentum from ${screenDirection}`,
        motion_out: `Shot #${idx + 1} exit kinetic momentum forward`,
        transition_recommendation: idx === baseArcs.length - 1 ? "Fade to black" : "Match cut on action",
      },
      beat_type: beatType,
      emotional_voltage: emotionalVoltage,
      information_gap: infoGap,
      compute_tier: computeTier,
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

  const preprocessedStory = normalizeAndPreprocessStory(storyText);

  let expectedCount = 12;
  if (targetDuration <= 8.0) expectedCount = 3;
  else if (targetDuration <= 20.0) expectedCount = 6;

  if (apiKey) {
    try {
      const systemPrompt = getDirectorSystemPrompt(targetDuration);
      const userMessage = `【故事剧本内容】：\n${preprocessedStory}\n\n【目标时长】：${targetDuration} 秒（请严格规划 ${expectedCount} 个分镜头）。请直接输出纯 JSON 对象（不要附加其他说明文字），格式如下：\n{\n  "theme": "故事主题",\n  "global_visual_anchor": "主角/主体外观特征与核心场景基石 (纯英文自然描述句，严禁包含任何文字标签)",\n  "shots": [ ... ]\n}`;

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
            const parsedScene = parseSemanticScene(preprocessedStory);
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
                    storyContext: preprocessedStory.slice(0, 80),
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
                  `${parsedScene.heroEn}. ${globalAnchor}. ${rawImgPrompt}. no poster frame, no decorative golden borders, no ornate card borders, no trading card frame, no franchise logo, no text watermark, no speech bubbles, no dialogue subtitles, no typography, ${contextualAnti} full bleed widescreen film still, edge-to-edge diegetic scene, 16:9 widescreen`
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

              const totalParsed = parsed.shots.length || 1;
              const beatType = s.beat_type || (idx === 0 ? "hook" : idx === totalParsed - 1 ? "cliffhanger_hook" : s.shot_size?.includes("close") ? "climax_payoff" : "tension_build");
              const emotionalVoltage = Number(s.emotional_voltage) || (idx === 0 ? 78 : idx === totalParsed - 1 ? 96 : Math.min(92, Math.round(45 + (idx / totalParsed) * 45)));
              const infoGap = (s.information_gap || "").trim() || (idx === totalParsed - 1 ? "绝境反转未解，强刺激驱动下一集" : "危机步步紧逼，行动后果悬念未决");
              const computeTier = s.compute_tier || (beatType === "climax_payoff" || beatType === "cliffhanger_hook" ? "flagship" : "standard");

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
                audio: typeof s.audio === "object" ? s.audio : { sfx: "环境音效、现场音效", music: "影视配乐" },
                image_prompt: finalImgPrompt,
                video_prompt: finalVidPrompt,
                continuity_data: continuityData,
                beat_type: beatType,
                emotional_voltage: emotionalVoltage,
                information_gap: infoGap,
                compute_tier: computeTier,
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
  const parsedScene = parseSemanticScene(preprocessedStory);
  const fallbackShots = generateAdaptiveStoryShots(preprocessedStory, targetDuration);
  return {
    theme: parsedScene.heroZh,
    target_duration: targetDuration,
    shots: fallbackShots,
  };
}

export const runDirectorPipeline = generateDirectorPipeline;
