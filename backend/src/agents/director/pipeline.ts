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

// Generate story-adaptive fallback storyboard based on user's actual story text
export function generateAdaptiveStoryShots(storyText: string, targetDuration: number = 30.0): ShotPlan[] {
  const cleanStory = (storyText || "").trim();
  const sentences = cleanStory
    ? cleanStory.split(/[。！？\n\.\!\?]/).map(s => s.trim()).filter(Boolean)
    : ["故事开篇与空间建立", "主角入场与冲突展开", "核心动作与关键交锋", "决战高潮与胜负分晓", "收尾定格与情绪沉淀"];

  const durPerShot = Number((targetDuration / 6).toFixed(1)) || 5.0;

  const s1 = sentences[0] || "空间与环境大视角展开";
  const s2 = sentences[1] || sentences[0] || "主角置身于核心场景中";
  const s3 = sentences[2] || "关键细节与情绪特写";
  const s4 = sentences[3] || sentences[1] || "动作升级与冲突推进";
  const s5 = sentences[4] || sentences[2] || "冲突达到最顶点";
  const s6 = sentences[5] || sentences[sentences.length - 1] || "故事落幕，镜头缓缓拉远收尾";

  return [
    {
      order: 1,
      duration: durPerShot,
      shot_size: "extreme_wide_shot",
      camera_angle: "high_angle",
      camera_movement: { type: "crane", speed: "slow" },
      subject: "宏观空间与开篇环境",
      action: `【开篇建立镜头】：${s1}`,
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
      subject: "主角出场与动机建立",
      action: `【人物入场】：${s2}`,
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
      subject: "核心关键特写",
      action: `【细节张力】：${s3}`,
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
      subject: "冲突爆发与动作交互",
      action: `【动作推进】：${s4}`,
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
      subject: "高潮瞬间定格",
      action: `【全场高潮】：${s5}`,
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
      subject: "结局余韵与落幕",
      action: `【意境收尾】：${s6}`,
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
