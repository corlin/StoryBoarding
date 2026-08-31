import { DIRECTOR_SYSTEM_PROMPT, SHOT_PARSER_JSON_PROMPT } from "./prompts";

export interface ShotPlan {
  order: number;
  duration: number;
  shot_size: string;
  camera_angle: string;
  camera_movement: { type: string; speed?: string };
  subject?: string;
  action: string;
  dialogue?: string;
  narrative_function?: string;
  lighting?: string;
  audio?: { sfx?: string; music?: string };
  image_prompt: string;
  video_prompt: string;
  continuity_data?: {
    character_position?: string;
    screen_direction?: string;
    lighting_axis?: string;
  };
}

export interface DirectorGenerationResult {
  theme: string;
  target_duration: number;
  shots: ShotPlan[];
}

export function formatDirectorImagePrompt(action: string, shotSize: string, cameraAngle: string, movement: string): string {
  const cleanAction = (action || "").trim();
  return (
    `Professional pre-production director's storyboard sketch, 16:9 cinematic frame, ` +
    `rough graphite and dark pencil construction lines, bold confident gestural strokes, ` +
    `selective grayscale wash shading, clear silhouette staging, directional movement arrows, ` +
    `${shotSize}, ${cameraAngle}, camera ${movement}, ${cleanAction} ` +
    `--no speech balloons, comic panels, manga screentones, finished 3D render, saturated color painting, photorealistic film still, text paragraphs`
  );
}

export function getDefaultDemoShots(): ShotPlan[] {
  return [
    {
      order: 1,
      duration: 5.0,
      shot_size: "extreme_wide_shot",
      camera_angle: "high_angle",
      camera_movement: { type: "crane", speed: "slow" },
      subject: "古风茶楼与赛博雨巷",
      action: "站在雨中的悬浮茶楼前，霓虹广告投影在湿漉地面上形成扭曲倒影",
      narrative_function: "建立世界观与雨夜空间环境",
      lighting: "冷调暗红霓虹与绿色数据流反光",
      audio: { sfx: "暴雨声、全息霓虹电流嗡鸣", music: "低沉压抑的电子合成器大提琴" },
      image_prompt: formatDirectorImagePrompt("站在雨中的悬浮茶楼前，霓虹广告投影在湿漉地面上形成扭曲倒影", "extreme_wide_shot", "high_angle", "crane"),
      video_prompt: "Camera crane down slowly revealing cyberpunk tea house in heavy matrix data rain",
      continuity_data: { character_position: "center", screen_direction: "left_to_right", lighting_axis: "backlight" },
    },
    {
      order: 2,
      duration: 4.0,
      shot_size: "medium_shot",
      camera_angle: "low_angle",
      camera_movement: { type: "push_in", speed: "medium" },
      subject: "特工银狐出场",
      action: "从巷道阴影中走出，液压关节发出机械声，等离子短棍展开时迸发蓝色电弧",
      narrative_function: "引入对立危机与对手特征",
      lighting: "等离子蓝色冷光照亮冷峻面部轮廓",
      audio: { sfx: "机械骨骼充能声、等离子电弧噼啪声", music: "节奏加快的机械打击乐" },
      image_prompt: formatDirectorImagePrompt("特工从巷道阴影中走出，等离子短棍展开时迸发蓝色电弧", "medium_shot", "low_angle", "push_in"),
      video_prompt: "Camera push in on cyborg agent emerging from shadows igniting plasma baton",
      continuity_data: { character_position: "right", screen_direction: "right_to_left", lighting_axis: "side_light" },
    },
    {
      order: 3,
      duration: 3.0,
      shot_size: "close_up",
      camera_angle: "dutch_angle",
      camera_movement: { type: "static", speed: "none" },
      subject: "特工扣动电磁枪",
      action: "机械手指扣动电磁枪扳机，武器充能时浮现红色能量纹路",
      narrative_function: "危机触发与冲突爆发瞬间",
      lighting: "电磁枪红光自下而上照亮特工手部",
      audio: { sfx: "高频充能尖鸣声、扳机清脆咬合声", music: "心跳重音戛然而止" },
      image_prompt: formatDirectorImagePrompt("机械手指扣动电磁枪扳机，武器充能时浮现红色能量纹路", "close_up", "dutch_angle", "static"),
      video_prompt: "Static close up of cybernetic finger pulling high tech railgun trigger with red energy glow",
      continuity_data: { character_position: "center", screen_direction: "right_to_left", lighting_axis: "rim_light" },
    },
    {
      order: 4,
      duration: 6.0,
      shot_size: "medium_close_up",
      camera_angle: "eye_level",
      camera_movement: { type: "pan_right", speed: "fast" },
      subject: "墨客宗师子弹时间避弹",
      action: "以太极云手动作侧身避弹，折扇展开形成电磁屏障，雨滴在力场周围悬浮",
      narrative_function: "视觉高潮之子弹时间博弈",
      lighting: "屏障淡青色流光照亮宗师黑色风衣与墨镜",
      audio: { sfx: "子弹时间低频混响、水滴悬浮空灵音效", music: "传统竹笛与赛博重音交织" },
      image_prompt: formatDirectorImagePrompt("以太极云手动作侧身避弹，折扇展开形成电磁屏障，雨滴在力场周围悬浮", "medium_close_up", "eye_level", "pan_right"),
      video_prompt: "Dynamic bullet time camera pan around martial artist deflecting electromagnetic bullet with energy folding fan",
      continuity_data: { character_position: "left", screen_direction: "left_to_right", lighting_axis: "front_rim" },
    },
    {
      order: 5,
      duration: 5.0,
      shot_size: "wide_shot",
      camera_angle: "high_angle",
      camera_movement: { type: "crane_down", speed: "fast" },
      subject: "凌空飞踢命中特工",
      action: "被电磁弹击中的瞬间，纳米材料碎片呈量子态扩散，特工被踢飞撞碎雕花屏风",
      narrative_function: "决战高潮与胜负分晓",
      lighting: "撞碎屏风后露出的室内昏黄灯光与雨幕交融",
      audio: { sfx: "木质屏风碎裂巨响、电流失控爆鸣", music: "交响重音重重砸落" },
      image_prompt: formatDirectorImagePrompt("特工被踢飞撞碎雕花屏风，纳米碎片与木屑四溅", "wide_shot", "high_angle", "crane_down"),
      video_prompt: "Crane down tracking martial kick launching agent through ancient wooden screen",
      continuity_data: { character_position: "right", screen_direction: "left_to_right", lighting_axis: "top_down" },
    },
    {
      order: 6,
      duration: 7.0,
      shot_size: "full_shot",
      camera_angle: "eye_level",
      camera_movement: { type: "tracking_back", speed: "slow" },
      subject: "墨客收势伫立雨中",
      action: "收扇负手而立，风衣下摆缓缓落下，背后悬浮着破碎的茶楼全息投影",
      narrative_function: "战斗收势与意境收尾",
      lighting: "柔和雨丝反光与微弱全息绿光",
      audio: { sfx: "收扇啪嗒一声、雨滴落入水洼清脆声", music: "渐弱空灵的古琴独奏" },
      image_prompt: formatDirectorImagePrompt("收扇负手而立，风衣下摆缓缓落下，背后悬浮着破碎的茶楼全息投影", "full_shot", "eye_level", "tracking_back"),
      video_prompt: "Camera tracking back slowly as master stands still in rain closing his fan with serene atmosphere",
      continuity_data: { character_position: "center", screen_direction: "center", lighting_axis: "ambient" },
    }
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

  // If no API key provided, return rich cinematic demo sequence
  if (!apiKey || !apiKey.trim()) {
    return {
      theme: "矩阵赛博雨夜武侠对决",
      target_duration: targetDuration,
      shots: getDefaultDemoShots(),
    };
  }

  const promptMessage = `
【故事内容与导演意图】：
${story}

【目标短片时长】：${targetDuration} 秒

请严格遵循 6 阶段 12 镜头的好莱坞工业分镜规范，完成完整的分镜规划，并直接输出合法 JSON。
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
        theme: "AI 导演分镜规划",
        target_duration: targetDuration,
        shots: getDefaultDemoShots(),
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
      theme: parsed.theme || "AI 导演分镜规划",
      target_duration: Number(parsed.target_duration) || targetDuration,
      shots: shots.length > 0 ? shots : getDefaultDemoShots(),
    };
  } catch (error) {
    console.error("Director pipeline execution error:", error);
    return {
      theme: "AI 导演分镜规划 (离线模式)",
      target_duration: targetDuration,
      shots: getDefaultDemoShots(),
    };
  }
}
