import { resolveDialogueSpeaker } from "@/lib/dialogueSpeaker";
/**
 * Multi-Platform AI Video Generation Prompt Engine
 * Supports:
 * 1. MiniMax Hailuo H3 (Multi-modal Picture reference & I2VA alignment format)
 * 2. ByteDance SeaDance / Seaweed 2.5 (High dynamism cinematic prompt)
 * 3. Wan 2.1 (WanX open-source video generation structured prompt)
 * 4. Runway Gen-3 & Kling (Camera movement + bracket tokens format)
 */

import { ShotModel, ProjectModel } from "@/types/shot";
import { H3CutItem, generateH3Prompt } from "./h3Prompt";

export type VideoEngineType = "minimax_h3" | "seadance" | "wan" | "runway_kling";

export interface VideoPromptEngineItem {
  id: VideoEngineType;
  name: string;
  tag: string;
  description: string;
  generateText: (shots: ShotModel[], project: ProjectModel | null) => string;
}

// 1. Camera move syntax normalizer
function formatCameraMovement(camType?: string): string {
  const map: Record<string, string> = {
    static: "Fixed tripod static shot",
    pan_left: "Slow smooth camera pan left",
    pan_right: "Slow smooth camera pan right",
    tilt_up: "Gentle cinematic tilt up",
    tilt_down: "Gentle cinematic tilt down",
    zoom_in: "Subtle slow push-in zoom",
    zoom_out: "Subtle pull-back zoom reveal",
    dolly_in: "Steadicam forward tracking push",
    dolly_out: "Slow backward dolly tracking",
    tracking: "Dynamic side tracking tracking shot",
    crane: "High-angle cinematic crane sweep",
    handheld: "Subtle organic handheld camera micro-movement, documentary realism",
    orbit: "360-degree arc orbit around subject",
  };
  return map[camType || "static"] || "Cinematic camera movement";
}

// 2. Build SeaDance 2.5 (ByteDance) Prompt Package
export function generateSeaDancePrompt(shots: ShotModel[], project: ProjectModel | null): string {
  const lines: string[] = [];
  lines.push(`# ${project?.title || "StoryBoarding"} · ByteDance SeaDance 2.5 Prompt Sequence`);
  lines.push(`# Generated at: ${new Date().toISOString()}`);
  lines.push(`# Total Shots: ${shots.length} | Recommended FPS: 24 | Dynamic Motion: High`);
  lines.push("");

  shots.forEach((shot, index) => {
    const k = index + 1;
    const duration = Number(shot.duration) || 2.5;
    const shotSize = shot.shot_size || "medium_shot";
    const cam = formatCameraMovement(shot.camera_movement?.type);
    const action = shot.action || "Subject engages in dramatic subtle movement.";
    const lighting = shot.lighting || "cinematic natural ambient lighting, volumetric soft shadows";
    const subject = shot.subject || "main character";
    const dialogue = shot.dialogue ? ` (Lip-sync line: "${shot.dialogue}")` : "";

    lines.push(`## [Shot ${k}] Duration: ${duration}s | Size: ${shotSize}`);
    lines.push(
      `Prompt: ${subject}, ${action}. ${cam}. Lighting: ${lighting}. High fidelity, 4k photorealistic, fluid cinematic motion, sharp character focus, consistent anatomy, photoreal textures.${dialogue}`
    );
    lines.push(`Negative: jitter, morphed limbs, flickering, blurry face, static painting, cartoon, over-smoothed skin, unnatural speed ramps`);
    lines.push("");
  });

  return lines.join("\n");
}

// 3. Build Wan 2.1 (WanX) Prompt Package
export function generateWanPrompt(shots: ShotModel[], project: ProjectModel | null): string {
  const lines: string[] = [];
  lines.push(`# Wan 2.1 (万象开源/API) 视频生成提示词工程包`);
  lines.push(`# 项目: ${project?.title || "未命名"} | 镜头数: ${shots.length}`);
  lines.push(`# 格式规范: [主体与动作] + [运镜轨迹] + [光影氛围] + [画质与物理权重]`);
  lines.push("");

  shots.forEach((shot, index) => {
    const k = index + 1;
    const duration = Number(shot.duration) || 2.5;
    const cam = formatCameraMovement(shot.camera_movement?.type);
    const action = shot.action || "人物进行符合情境的肢体与眼神调度";
    const subject = shot.subject || "主角";
    const lighting = shot.lighting || "电影级自然冷光与面部轮廓光";
    const dialogue = shot.dialogue ? ` 对白语境:「${shot.dialogue}」` : "";

    lines.push(`### 镜头 ${k} (${duration}秒 · ${shot.shot_size || "MS"})`);
    lines.push(
      `正面提示词 (Prompt): ${subject}，${action}。运镜轨迹: ${cam}。光影色彩: ${lighting}。真实电影胶片质感，逼真物理流体与衣褶摆动，无伪影，原生 24fps 运镜节奏。${dialogue}`
    );
    lines.push(
      `反向提示词 (Negative Prompt): 画面卡顿, 肢体畸形, 面部扭曲, 画面闪烁, 假塑料质感, 低分辨率, 伪动态`
    );
    lines.push("");
  });

  return lines.join("\n");
}

// 4. Build Runway Gen-3 / Kling Prompt Package
export function generateRunwayKlingPrompt(shots: ShotModel[], project: ProjectModel | null): string {
  const lines: string[] = [];
  lines.push(`# Runway Gen-3 Alpha & Kling AI 工业机位提示词包`);
  lines.push(`# 语法标准: Camera: [...] | Subject: [...] | Atmosphere: [...]`);
  lines.push("");

  shots.forEach((shot, index) => {
    const k = index + 1;
    const duration = Number(shot.duration) || 2.5;
    const cam = formatCameraMovement(shot.camera_movement?.type);
    const action = shot.action || "Natural cinematic character movement";
    const subject = shot.subject || "Subject";
    const lighting = shot.lighting || "Moody cinematic grading, 35mm look";

    lines.push(`// Shot ${k} (${duration}s)`);
    lines.push(`Camera: ${cam}`);
    lines.push(`Subject: ${subject} — ${action}`);
    lines.push(`Lighting: ${lighting}`);
    lines.push(`Style: 35mm film still, photorealistic, continuous motion vectors, 4k ultra-detailed --motion 5`);
    lines.push("");
  });

  return lines.join("\n");
}

// Consolidated Multi-Engine Definitions
export const VIDEO_PROMPT_ENGINES: VideoPromptEngineItem[] = [
  {
    id: "minimax_h3",
    name: "MiniMax 海螺 H3",
    tag: "首尾帧/对齐图",
    description: "多图连续对齐语法 (I2VA) 与音画多模态协同提示词",
    generateText: (shots, project) => {
      const cuts: H3CutItem[] = shots.map((s, idx) => ({
        id: s.id,
        order: idx + 1,
        seconds: Number(s.duration) || 2.5,
        shotSize: s.shot_size,
        cameraMovement: s.camera_movement?.type,
        action: s.action,
        dialogue: s.dialogue,
        speakerName: resolveDialogueSpeaker(s, project?.characters || []).speakerName,
      }));
      return generateH3Prompt(cuts, { lang: "en" });
    },
  },
  {
    id: "seadance",
    name: "ByteDance 剪映 SeaDance 2.5",
    tag: "高动态/短剧",
    description: "字节跳动高爆发动作连贯性与精细运镜语法",
    generateText: generateSeaDancePrompt,
  },
  {
    id: "wan",
    name: "Wan 2.1 (万象开源)",
    tag: "物理真实/24FPS",
    description: "阿里 Wan 2.1 开源视频大模型结构化多机位提示词",
    generateText: generateWanPrompt,
  },
  {
    id: "runway_kling",
    name: "Runway Gen-3 / 可灵 Kling",
    tag: "商业影视机位",
    description: "Runway Gen-3 与快手可灵工业机位与运动矢量参数",
    generateText: generateRunwayKlingPrompt,
  },
];
