/**
 * AI Video Generation Structured Control Rig
 * 
 * Generates machine-readable JSON + CSV data files for automated AI video
 * generation pipelines. These files map 1:1 with the burned HUD reference
 * keyframe images and can be directly consumed by batch video generation
 * APIs (MiniMax H3, ByteDance SeaDance 2.5, Wan 2.1, Runway/Kling, CogVideoX).
 *
 * Each shot entry contains:
 * - Reference frame filename (matches exported PNG in the keyframe folder)
 * - Camera movement prompt (English + Chinese bilingual)
 * - Shot size, duration, action, dialogue, lighting
 * - Negative prompt template
 * - Recommended compute tier & model routing hints
 */

import { ShotModel, ProjectModel } from "@/types/shot";

// ─── Camera Movement Prompt Mapping (EN + ZH bilingual for maximum model compatibility) ───
const CAMERA_MOVEMENT_PROMPTS: Record<string, { en: string; zh: string; vector: string }> = {
  static:         { en: "Fixed tripod static shot, no camera movement",             zh: "三脚架固定机位，无任何运动",         vector: "NONE" },
  push_in:        { en: "Slow steady push-in dolly toward subject",                 zh: "缓慢稳定推进，逼近主体",           vector: "Z+" },
  pull_out:       { en: "Slow pull-back dolly revealing environment",                zh: "缓慢后退拉远，揭示环境",           vector: "Z-" },
  pan_left:       { en: "Smooth horizontal pan left across scene",                   zh: "水平向左平稳摇镜",               vector: "X-" },
  pan_right:      { en: "Smooth horizontal pan right across scene",                  zh: "水平向右平稳摇镜",               vector: "X+" },
  tilt_up:        { en: "Gentle cinematic tilt up, low to high angle",               zh: "由低至高缓慢仰拍",               vector: "Y+" },
  tilt_down:      { en: "Gentle cinematic tilt down, high to low angle",             zh: "由高至低缓慢俯拍",               vector: "Y-" },
  tracking:       { en: "Dynamic lateral tracking shot following subject movement",  zh: "跟随主体横向运动的动态跟踪",       vector: "X±" },
  tracking_left:  { en: "Lateral tracking shot moving left with subject",            zh: "跟随主体向左横移跟拍",             vector: "X-" },
  tracking_right: { en: "Lateral tracking shot moving right with subject",           zh: "跟随主体向右横移跟拍",             vector: "X+" },
  crane:          { en: "High-angle cinematic crane sweep, ascending reveal",        zh: "升降机升起越过障碍，影院级大片感",   vector: "Y+" },
  orbit:          { en: "360-degree arc orbit around subject, dramatic reveal",      zh: "360度环绕主体旋转，戏剧性揭示",     vector: "ARC" },
  orbital:        { en: "360-degree arc orbit around subject, dramatic reveal",      zh: "360度环绕主体旋转，戏剧性揭示",     vector: "ARC" },
  arc_rotate:     { en: "Wide 360-degree arc orbit, hero reveal or climax moment",   zh: "环绕旋转弧线，英雄亮相或高潮时刻",   vector: "ARC" },
  handheld:       { en: "Subtle organic handheld micro-movement, documentary feel",  zh: "轻微手持晃动，纪实感",             vector: "MICRO" },
  zoom_in:        { en: "Subtle slow optical zoom in toward subject",                zh: "缓慢光学变焦推进",               vector: "Z+" },
  zoom_out:       { en: "Subtle optical zoom out, revealing wider context",          zh: "缓慢光学变焦拉远",               vector: "Z-" },
  dolly_in:       { en: "Steadicam forward tracking push toward subject",            zh: "稳定器前推跟进",                 vector: "Z+" },
  dolly_out:      { en: "Slow backward dolly tracking away from subject",            zh: "缓慢向后退拉跟拍",               vector: "Z-" },
};

// ─── Shot Size Mapping ───
const SHOT_SIZE_PROMPTS: Record<string, { en: string; zh: string; abbr: string }> = {
  extreme_wide_shot: { en: "Extreme wide shot, full environment establishing",  zh: "大远景·全环境建立",      abbr: "EWS" },
  wide_shot:         { en: "Wide shot, full scene with spatial context",         zh: "远景·完整空间上下文",    abbr: "WS" },
  full_shot:         { en: "Full shot, subject head-to-toe in frame",            zh: "全景全身·人物全身动作",  abbr: "FS" },
  medium_wide:       { en: "Medium wide shot, knees up framing",                 zh: "中远景·膝盖以上",       abbr: "MWS" },
  medium_shot:       { en: "Medium shot, waist-up conversational framing",       zh: "中景·腰部以上对话景别",  abbr: "MS" },
  medium:            { en: "Medium shot, waist-up conversational framing",       zh: "中景·腰部以上对话景别",  abbr: "MS" },
  medium_close_up:   { en: "Medium close-up, chest-up emotional emphasis",       zh: "中近景·胸部以上微表情",  abbr: "MCU" },
  medium_close:      { en: "Medium close-up, chest-up emotional emphasis",       zh: "中近景·胸部以上微表情",  abbr: "MCU" },
  close_up:          { en: "Close-up, face and shoulders, intense emotion",      zh: "特写·面部情感冲击",      abbr: "CU" },
  extreme_close_up:  { en: "Extreme close-up, eyes/mouth/detail, maximum tension", zh: "大特写·局部极致张力",  abbr: "ECU" },
};

// ─── Global Negative Prompt (Universal across all video models) ───
const NEGATIVE_PROMPT_EN = "morphed limbs, distorted face, flickering, jitter, blurry, low resolution, cartoon, painting style, unnatural motion, static frame, watermark, text overlay artifacts, over-smoothed skin, duplicated fingers";
const NEGATIVE_PROMPT_ZH = "肢体畸变, 面部扭曲, 画面闪烁, 抖动, 模糊, 低分辨率, 卡通风格, 绘画感, 不自然运动, 静态画面, 水印, 文字伪影, 皮肤过度平滑, 手指重复";

// ─── Helper: extract camera movement type string ───
function extractMovType(shot: ShotModel): string {
  return typeof shot.camera_movement === "object"
    ? (shot.camera_movement as any)?.type || "static"
    : (shot.camera_movement as string) || "static";
}

// ─── Helper: build reference frame filename (matches the PNG naming in ZIP export) ───
function buildRefFrameFilename(shot: ShotModel, index: number): string {
  const shotIndexStr = String(index + 1).padStart(3, "0");
  const sizeAbbr = SHOT_SIZE_PROMPTS[shot.shot_size]?.abbr || (shot.shot_size || "MS").toUpperCase().slice(0, 3);
  return `Shot_${shotIndexStr}_${sizeAbbr}_${(shot.duration || 2.5).toFixed(1)}s_AI参考图.png`;
}

// ═══════════════════════════════════════════════════════════════════
//  1. JSON – Full structured prompt manifest for API pipeline batch
// ═══════════════════════════════════════════════════════════════════
export interface AiVideoShotEntry {
  shot_index: number;
  shot_id: string;
  reference_frame: string;
  duration_seconds: number;
  shot_size: {
    key: string;
    abbr: string;
    prompt_en: string;
    prompt_zh: string;
  };
  camera_movement: {
    key: string;
    prompt_en: string;
    prompt_zh: string;
    vector: string;
  };
  subject: string;
  action: {
    en: string;
    zh: string;
  };
  dialogue: string | null;
  lighting: string;
  emotion: string | null;
  transition: string;
  screen_direction: string;
  negative_prompt: {
    en: string;
    zh: string;
  };
  composite_prompt: {
    en: string;
    zh: string;
  };
  compute_tier: string;
  beat_type: string | null;
  emotional_voltage: number | null;
}

export interface AiVideoControlRigManifest {
  _schema: string;
  _generator: string;
  _generated_at: string;
  project_title: string;
  aspect_ratio: string;
  total_shots: number;
  total_duration_seconds: number;
  reference_frames_folder: string;
  model_compatibility: string[];
  shots: AiVideoShotEntry[];
}

export function generateAiVideoControlRigJson(
  shots: ShotModel[],
  project: ProjectModel | null
): string {
  const manifest: AiVideoControlRigManifest = {
    _schema: "storyboarding-ai-video-control-rig/v1",
    _generator: "StoryBoarding AI Director Studio v2.1",
    _generated_at: new Date().toISOString(),
    project_title: project?.title || "Untitled",
    aspect_ratio: project?.aspect_ratio || "16:9",
    total_shots: shots.length,
    total_duration_seconds: shots.reduce((sum, s) => sum + (s.duration || 2.5), 0),
    reference_frames_folder: "00_AI视频生成全景参考图集_含机位运镜标识/",
    model_compatibility: [
      "MiniMax Hailuo H3 (I2V/T2V)",
      "ByteDance SeaDance 2.5 (Seaweed)",
      "Alibaba Wan 2.1 (WanX)",
      "Runway Gen-3 Alpha Turbo",
      "Kuaishou Kling 2.0",
      "CogVideoX-5B (Open-source)",
    ],
    shots: shots.map((shot, idx) => {
      const movType = extractMovType(shot);
      const movPrompt = CAMERA_MOVEMENT_PROMPTS[movType] || CAMERA_MOVEMENT_PROMPTS.static;
      const sizePrompt = SHOT_SIZE_PROMPTS[shot.shot_size] || SHOT_SIZE_PROMPTS.medium_shot;
      const screenDir = shot.character_direction || "L➔R";
      const action = shot.action || "";
      const subject = shot.subject || "主体人物";

      // Composite prompt: Subject + Action + Camera + Lighting + Quality
      const compositeEn = [
        subject,
        action,
        movPrompt.en,
        `Lighting: ${shot.lighting || "cinematic natural ambient light"}`,
        "High fidelity, 4K photorealistic, fluid cinematic motion, sharp focus, consistent anatomy",
        shot.dialogue ? `(Lip-sync dialogue: "${shot.dialogue}")` : "",
      ].filter(Boolean).join(". ");

      const compositeZh = [
        subject,
        action,
        movPrompt.zh,
        `光影: ${shot.lighting || "电影级自然环境光"}`,
        "高保真, 4K 真实影像质感, 流畅电影级运动, 锐利对焦, 一致人体解剖结构",
        shot.dialogue ? `(口型对齐台词:「${shot.dialogue}」)` : "",
      ].filter(Boolean).join("。");

      return {
        shot_index: idx + 1,
        shot_id: shot.id,
        reference_frame: buildRefFrameFilename(shot, idx),
        duration_seconds: shot.duration || 2.5,
        shot_size: {
          key: shot.shot_size || "medium_shot",
          abbr: sizePrompt.abbr,
          prompt_en: sizePrompt.en,
          prompt_zh: sizePrompt.zh,
        },
        camera_movement: {
          key: movType,
          prompt_en: movPrompt.en,
          prompt_zh: movPrompt.zh,
          vector: movPrompt.vector,
        },
        subject,
        action: { en: action, zh: action },
        dialogue: shot.dialogue || null,
        lighting: shot.lighting || "cinematic natural ambient light",
        emotion: shot.emotion || null,
        transition: shot.transition || "cut",
        screen_direction: screenDir,
        negative_prompt: {
          en: NEGATIVE_PROMPT_EN,
          zh: NEGATIVE_PROMPT_ZH,
        },
        composite_prompt: {
          en: compositeEn,
          zh: compositeZh,
        },
        compute_tier: shot.compute_tier || "standard",
        beat_type: shot.beat_type || null,
        emotional_voltage: shot.emotional_voltage ?? null,
      };
    }),
  };

  return JSON.stringify(manifest, null, 2);
}

// ═══════════════════════════════════════════════════════════════════
//  2. CSV – Flat tabular control rig for spreadsheet / pandas batch
// ═══════════════════════════════════════════════════════════════════
function escapeCsvField(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function generateAiVideoControlRigCsv(
  shots: ShotModel[],
  project: ProjectModel | null
): string {
  const header = [
    "shot_index",
    "reference_frame",
    "duration_s",
    "shot_size",
    "shot_size_abbr",
    "camera_movement",
    "camera_vector",
    "camera_prompt_en",
    "camera_prompt_zh",
    "subject",
    "action",
    "dialogue",
    "lighting",
    "emotion",
    "transition",
    "screen_direction",
    "composite_prompt_en",
    "negative_prompt_en",
    "compute_tier",
    "beat_type",
    "emotional_voltage",
  ].join(",");

  const rows = shots.map((shot, idx) => {
    const movType = extractMovType(shot);
    const movPrompt = CAMERA_MOVEMENT_PROMPTS[movType] || CAMERA_MOVEMENT_PROMPTS.static;
    const sizePrompt = SHOT_SIZE_PROMPTS[shot.shot_size] || SHOT_SIZE_PROMPTS.medium_shot;
    const screenDir = shot.character_direction || "L➔R";
    const subject = shot.subject || "主体人物";
    const action = shot.action || "";

    const compositeEn = [
      subject, action, movPrompt.en,
      `Lighting: ${shot.lighting || "cinematic natural ambient light"}`,
      "4K photorealistic, fluid motion, sharp focus",
    ].filter(Boolean).join(". ");

    return [
      idx + 1,
      escapeCsvField(buildRefFrameFilename(shot, idx)),
      (shot.duration || 2.5).toFixed(1),
      escapeCsvField(shot.shot_size || "medium_shot"),
      sizePrompt.abbr,
      escapeCsvField(movType),
      movPrompt.vector,
      escapeCsvField(movPrompt.en),
      escapeCsvField(movPrompt.zh),
      escapeCsvField(subject),
      escapeCsvField(action),
      escapeCsvField(shot.dialogue || ""),
      escapeCsvField(shot.lighting || "cinematic natural ambient light"),
      escapeCsvField(shot.emotion || ""),
      escapeCsvField(shot.transition || "cut"),
      escapeCsvField(screenDir),
      escapeCsvField(compositeEn),
      escapeCsvField(NEGATIVE_PROMPT_EN),
      shot.compute_tier || "standard",
      shot.beat_type || "",
      shot.emotional_voltage ?? "",
    ].join(",");
  });

  // UTF-8 BOM for Excel compatibility
  return "\uFEFF" + [header, ...rows].join("\n");
}
