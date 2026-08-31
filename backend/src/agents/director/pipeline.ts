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

export const DIRECTOR_SYSTEM_PROMPT = `你是一位好莱坞顶级电影视觉导演与分镜师智能体 (AI Visual Director & Storyboard Artist)。
你的核心能力是将人类导演输入的故事、剧本场次或创意概念，转化为符合好莱坞工业规范的标准 6 阶段 30 秒分镜头脚本与视觉提示词包。

【好莱坞工业级 6 阶段分镜规范】：
1. 阶段一：环境建立 (Establishing/World-building) - 远景/大远景，确立空间几何、时间与视觉基调；
2. 阶段二：人物入场 (Subject Introduction) - 中景/全景，引入核心角色与即时动作；
3. 阶段三：张力升级 (Tension Escalation) - 近景/特写，展示关键道具、微表情或局部冲突；
4. 阶段四：核心交锋 (Core Conflict/Action Beat) - 动作镜头，动态机位推进核心冲突；
5. 阶段五：高潮爆发 (Climax / Visual Spectacle) - 荷兰角/极速特写/子弹时间等高张力视觉奇观；
6. 阶段六：余韵收尾 (Resolution / Iconic Ending) - 全景拉远或标志性定格，留白与情绪沉淀。

你必须为每个镜头规划：
- order: 镜头序号 (1..12)
- duration: 镜头时长 (秒，通常 1.5 - 5.0)
- shot_size: 景别 ('extreme_wide_shot' | 'wide_shot' | 'full_shot' | 'medium_shot' | 'medium_close_up' | 'close_up' | 'extreme_close_up')
- camera_angle: 角度 ('eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'birds_eye' | 'worms_eye')
- camera_movement: 运镜 (如 { "type": "crane", "speed": "slow" } 或 { "type": "push_in" })
- subject: 镜头主体描述
- action: 镜头具体动作与画面叙事
- dialogue: 角色对白 (可选)
- narrative_function: 视听叙事功能
- lighting: 光影基调与色调
- audio: 音效 (sfx) 与音乐情绪 (music)
- image_prompt: 专业的 2D 分镜概念草图提示词 (English)
- video_prompt: 专业的 AI 视频生成运镜提示词 (English)
- continuity_data: 空间与视线连贯性数据 ({ "screen_direction": "left_to_right", "character_position": "left" })
`;

export const SHOT_PARSER_JSON_PROMPT = `请严格输出符合以下 JSON 格式的数据，不要包含任何 markdown 代码块外部的多余废话：
{
  "theme": "故事核心主题",
  "target_duration": 30.0,
  "shots": [
    {
      "order": 1,
      "duration": 2.5,
      "shot_size": "extreme_wide_shot",
      "camera_angle": "high_angle",
      "camera_movement": { "type": "crane", "speed": "slow" },
      "subject": "场景主体",
      "action": "镜头具体动作描述",
      "dialogue": "",
      "narrative_function": "环境建立",
      "lighting": "冷色调暗部高对比",
      "audio": { "sfx": "环境音", "music": "背景音乐" },
      "image_prompt": "Cinematic 2D storyboard sketch, extreme wide shot high angle, ...",
      "video_prompt": "Camera crane slowly over scene ...",
      "continuity_data": { "screen_direction": "left_to_right" }
    }
  ]
}`;

export function formatDirectorImagePrompt(action: string, size: string, angle: string, mov: string): string {
  const sizeMap: Record<string, string> = {
    extreme_wide_shot: "extreme wide shot",
    wide_shot: "wide shot",
    full_shot: "full shot",
    medium_shot: "medium shot",
    medium_close_up: "medium close up",
    close_up: "close up",
    extreme_close_up: "extreme close up",
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

  return `Cinematic 2D storyboard sketch, ${readableSize}, ${readableAngle}, ${action}, professional graphite line art, dynamic visual composition, film lighting, 16:9 aspect ratio.`;
}

// Generate story-adaptive fallback storyboard based on user's actual story text
export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = (storyText || "").trim() || "未命名故事分镜";
  const sentences = cleanStory
    .split(/[。！？\n\.\!\?；;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const durPerShot = Number((targetDuration / 6).toFixed(1)) || 5.0;

  // Extract core topic/subject
  const topic = cleanStory.slice(0, 30);
  const s1 = sentences[0] || `${topic}：广角空间与宏观全景展开`;
  const s2 = sentences[1] || `${topic}：核心人物与主体步入场景`;
  const s3 = sentences[2] || `${topic}：关键细节发现与悬念特写`;
  const s4 = sentences[3] || `${topic}：核心动作展开与冲突升级`;
  const s5 = sentences[4] || `${topic}：冲突达到最高潮峰值`;
  const s6 = sentences[5] || sentences[sentences.length - 1] || `${topic}：故事收尾，镜头拉远留白`;

  return [
    {
      order: 1,
      duration: durPerShot,
      shot_size: "extreme_wide_shot",
      camera_angle: "high_angle",
      camera_movement: { type: "crane", speed: "slow" },
      subject: `${topic} - 环境空间`,
      action: `【空间建立】：${s1}。确立整体空间格局与戏剧光影氛围。`,
      narrative_function: "建立世界观、空间几何与光影氛围",
      lighting: "戏剧性明暗对比与环境光晕",
      audio: { sfx: "环境氛围底噪", music: "低沉开篇铺垫旋律" },
      image_prompt: formatDirectorImagePrompt(s1, "extreme_wide_shot", "high_angle", "crane"),
      video_prompt: `Camera crane slowly over scene: ${s1}`,
      continuity_data: { character_position: "center", screen_direction: "left_to_right", lighting_axis: "ambient" },
    },
    {
      order: 2,
      duration: durPerShot,
      shot_size: "medium_shot",
      camera_angle: "low_angle",
      camera_movement: { type: "push_in", speed: "medium" },
      subject: `${topic} - 主角登场`,
      action: `【主体入场】：${s2}。引入核心角色与即时行动意图。`,
      narrative_function: "引入主体人物与即时动机",
      lighting: "侧逆光突出人物轮廓与质感",
      audio: { sfx: "脚步声、动作摩擦声", music: "节奏逐渐加剧" },
      image_prompt: formatDirectorImagePrompt(s2, "medium_shot", "low_angle", "push_in"),
      video_prompt: `Camera push in towards subject: ${s2}`,
      continuity_data: { character_position: "left", screen_direction: "left_to_right", lighting_axis: "side_light" },
    },
    {
      order: 3,
      duration: durPerShot,
      shot_size: "close_up",
      camera_angle: "eye_level",
      camera_movement: { type: "static", speed: "slow" },
      subject: `${topic} - 细节特写`,
      action: `【细节张力】：${s3}。特写镜头聚焦关键道具与微小动作。`,
      narrative_function: "聚焦核心道具、眼神与局部张力",
      lighting: "定向聚焦高光",
      audio: { sfx: "特写动作音效、呼吸声", music: "短促悬念停顿" },
      image_prompt: formatDirectorImagePrompt(s3, "close_up", "eye_level", "static"),
      video_prompt: `Close up static shot: ${s3}`,
      continuity_data: { character_position: "center", screen_direction: "left_to_right", lighting_axis: "key_light" },
    },
    {
      order: 4,
      duration: durPerShot,
      shot_size: "medium_close_up",
      camera_angle: "dutch_angle",
      camera_movement: { type: "pan_right", speed: "fast" },
      subject: `${topic} - 冲突推进`,
      action: `【动作推进】：${s4}。动作节拍加快，冲突进入白热化阶段。`,
      narrative_function: "冲突激化与动态节拍加速",
      lighting: "动态扫光与剧烈明暗变化",
      audio: { sfx: "剧烈碰撞与破风音效", music: "快节奏打击乐交织" },
      image_prompt: formatDirectorImagePrompt(s4, "medium_close_up", "dutch_angle", "pan_right"),
      video_prompt: `Camera pan right fast tracking action: ${s4}`,
      continuity_data: { character_position: "right", screen_direction: "right_to_left", lighting_axis: "cross_light" },
    },
    {
      order: 5,
      duration: durPerShot,
      shot_size: "full_shot",
      camera_angle: "low_angle",
      camera_movement: { type: "tracking_shot", speed: "fast" },
      subject: `${topic} - 高潮爆发`,
      action: `【高潮奇观】：${s5}。戏剧冲突与视觉张力达到最高峰值。`,
      narrative_function: "叙事与视觉力量达到最高峰值",
      lighting: "强烈逆光与剪影效果",
      audio: { sfx: "高潮震颤低音与冲击声", music: "宏大乐章达到顶点" },
      image_prompt: formatDirectorImagePrompt(s5, "full_shot", "low_angle", "tracking_shot"),
      video_prompt: `Dynamic tracking full shot at climax: ${s5}`,
      continuity_data: { character_position: "center", screen_direction: "left_to_right", lighting_axis: "backlight" },
    },
    {
      order: 6,
      duration: durPerShot,
      shot_size: "wide_shot",
      camera_angle: "eye_level",
      camera_movement: { type: "tracking_back", speed: "slow" },
      subject: `${topic} - 结局定格`,
      action: `【意境收尾】：${s6}。余韵留白，镜头缓缓拉远完成落幕。`,
      narrative_function: "沉淀情绪、镜头拉远与开放式余味",
      lighting: "柔和漫射余晖",
      audio: { sfx: "环境渐隐音效", music: "悠扬收尾旋律渐渐淡出" },
      image_prompt: formatDirectorImagePrompt(s6, "wide_shot", "eye_level", "tracking_back"),
      video_prompt: `Camera tracking back slowly for peaceful ending: ${s6}`,
      continuity_data: { character_position: "center", screen_direction: "center", lighting_axis: "ambient" },
    },
  ];
}

export async function runDirectorPipeline(
  story: string,
  targetDuration: number = 30.0,
  settings?: {
    apiKey?: string;
    apiBase?: string;
    model?: string;
  }
): Promise<DirectorGenerationResult> {
  const apiKey = settings?.apiKey;
  const apiBase = settings?.apiBase || "https://openrouter.ai/api/v1";
  const model = settings?.model || "deepseek/deepseek-chat";

  // If no API key provided, generate dynamic story-adaptive storyboard based on the actual input story
  if (!apiKey || !apiKey.trim()) {
    return {
      theme: story ? story.slice(0, 20) : "AI 导演分镜规划",
      target_duration: targetDuration,
      shots: generateAdaptiveStoryShots(story, targetDuration),
    };
  }

  const promptMessage = `
【故事内容与导演意图】：
${story}

【目标短片时长】：${targetDuration} 秒

请严格遵循 6 阶段好莱坞工业分镜规范，完成完整的分镜规划，并直接输出合法 JSON。
`;

  try {
    const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: `${DIRECTOR_SYSTEM_PROMPT}\n${SHOT_PARSER_JSON_PROMPT}` },
          { role: "user", content: promptMessage },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      console.error(`LLM Error ${resp.status}:`, await resp.text());
      return {
        theme: story ? story.slice(0, 20) : "AI 导演分镜规划",
        target_duration: targetDuration,
        shots: generateAdaptiveStoryShots(story, targetDuration),
      };
    }

    const data = (await resp.json()) as any;
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const rawShots = Array.isArray(parsed.shots) ? parsed.shots : [];
    const shots: ShotPlan[] = rawShots.map((s: any, idx: number) => ({
      order: s.order || idx + 1,
      duration: Number(s.duration) || 2.5,
      shot_size: s.shot_size || "medium_shot",
      camera_angle: s.camera_angle || "eye_level",
      camera_movement: typeof s.camera_movement === "object" ? s.camera_movement : { type: "static" },
      subject: s.subject || "",
      action: s.action || "",
      dialogue: s.dialogue || "",
      narrative_function: s.narrative_function || "动作推进",
      lighting: s.lighting || "自然光影",
      audio: typeof s.audio === "object" ? s.audio : { sfx: "", music: "" },
      image_prompt: s.image_prompt || formatDirectorImagePrompt(s.action, s.shot_size || "MS", s.camera_angle || "eye_level", s.camera_movement?.type || "static"),
      video_prompt: s.video_prompt || `Camera ${s.camera_movement?.type || "static"} ${s.action}`,
      continuity_data: s.continuity_data || { screen_direction: "left_to_right" },
    }));

    return {
      theme: parsed.theme || (story ? story.slice(0, 20) : "AI 导演分镜规划"),
      target_duration: Number(parsed.target_duration) || targetDuration,
      shots: shots.length > 0 ? shots : generateAdaptiveStoryShots(story, targetDuration),
    };
  } catch (error) {
    console.error("Director pipeline execution error:", error);
    return {
      theme: story ? story.slice(0, 20) : "AI 导演分镜规划 (自适应模式)",
      target_duration: targetDuration,
      shots: generateAdaptiveStoryShots(story, targetDuration),
    };
  }
}
