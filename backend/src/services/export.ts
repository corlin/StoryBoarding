import JSZip from "jszip";
import { Project, Shot } from "../db/schema";

export const SHOT_SIZE_ABBR: Record<string, string> = {
  extreme_wide_shot: "EWS",
  wide_shot: "WS",
  full_shot: "FS",
  medium_shot: "MS",
  medium_close_up: "MCU",
  close_up: "CU",
  extreme_close_up: "ECU",
};

export function sanitizeFilename(text: string, maxLen: number = 14): string {
  if (!text) return "action";
  const cleaned = text.replace(/[\\/*?:"<>| \n\t\r,，。！!？"'“”]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return cleaned.slice(0, maxLen) || "action";
}

export function extractShotMeta(shot: Shot) {
  const shotNo = String(shot.order).padStart(2, "0");
  const sizeAbbr = SHOT_SIZE_ABBR[shot.shotSize] || (shot.shotSize || "MS").slice(0, 3).toUpperCase();
  const durVal = typeof shot.duration === "number" ? shot.duration : 2.5;
  const durStr = `${durVal.toFixed(1)}s`;

  let movType = "static";
  try {
    const mov = typeof shot.cameraMovement === "string" ? JSON.parse(shot.cameraMovement) : shot.cameraMovement;
    movType = mov?.type || "static";
  } catch {}

  const cleanAct = sanitizeFilename(shot.action, 14);
  const filename = `SHOT_${shotNo}_${sizeAbbr}_${movType}_${cleanAct}.png`;

  return {
    shotNo,
    sizeAbbr,
    durVal,
    durStr,
    movType,
    cleanAction: cleanAct,
    filename,
  };
}

export function generateShotScriptMarkdown(project: Project, shots: Shot[]): string {
  const lines = [
    `# ${project.title} — 导演分镜头脚本文档`,
    `\n> **目标时长**: ${project.targetDuration} 秒 | **镜头总数**: ${shots.length} | **标准画幅**: 16:9\n`,
    `## 故事梗概\n${project.story || "未提供故事梗概"}\n`,
    "---\n",
    "## 分镜头详细列表\n",
  ];

  for (const s of shots) {
    const meta = extractShotMeta(s);
    lines.push(`### SHOT ${meta.shotNo} · ${meta.sizeAbbr} · ${meta.durStr}`);
    lines.push(`- **景别机位**: ${s.shotSize} / ${s.cameraAngle}`);
    lines.push(`- **运镜方式**: ${meta.movType}`);
    lines.push(`- **动作调度**: ${s.action}`);
    lines.push(`- **叙事功能**: ${s.narrativeFunction || "主动作推进"}`);
    lines.push(`- **环境光影**: ${s.lighting || "黑白灰石墨光影"}`);
    lines.push(`- **声音设计**: ${s.audio}`);
    lines.push(`- **图像 Prompt**: \`${s.imagePrompt}\``);
    lines.push(`- **视频 Prompt**: \`${s.videoPrompt}\``);
    lines.push("\n---\n");
  }

  return lines.join("\n");
}

export function calculateOptimalGridLayout(shotCount: number): { layoutDesc: string; gridName: string } {
  if (shotCount <= 3) {
    return { layoutDesc: `1 × ${shotCount} horizontal strip`, gridName: `${shotCount}-panel horizontal strip (1x${shotCount} grid)` };
  }
  if (shotCount === 4) {
    return { layoutDesc: "2 × 2 grid (2 rows, 2 columns)", gridName: "4-panel contact sheet (2x2 grid)" };
  }
  if (shotCount <= 6) {
    return { layoutDesc: "2 × 3 grid (2 rows, 3 columns)", gridName: `${shotCount}-panel contact sheet (2x3 grid)` };
  }
  if (shotCount <= 8) {
    return { layoutDesc: "2 × 4 grid (2 rows, 4 columns)", gridName: `${shotCount}-panel contact sheet (2x4 grid)` };
  }
  if (shotCount <= 9) {
    return { layoutDesc: "3 × 3 grid (3 rows, 3 columns)", gridName: `${shotCount}-panel contact sheet (3x3 grid)` };
  }
  return { layoutDesc: "3 × 4 grid (3 rows, 4 columns)", gridName: `${shotCount}-panel contact sheet (3x4 grid)` };
}

export function generateDirectorGlobalPrompt(project: Project, shots: Shot[]): string {
  const count = shots.length;
  const { gridName, layoutDesc } = calculateOptimalGridLayout(count);
  const dur = project.targetDuration || 30.0;

  const shotsSummary = shots.map((s) => {
    const meta = extractShotMeta(s);
    return `* **SHOT ${meta.shotNo}** [${meta.sizeAbbr} · ${s.cameraAngle} · ${meta.movType}]: ${s.action}`;
  });

  return `# SYSTEM DIRECTIVE: PROFESSIONAL CINEMATIC STORYBOARD SHEET (PREVIZ CONTACT SHEET)

Generate ONE single 16:9 widescreen director's storyboard page containing a complete sequential panel grid (${count} panels, ${gridName}). 
This is a functional pre-production previsualization drawing, NOT a finished color illustration, NOT a promotional poster, and NOT a standalone comic book page.

## 1. CANVAS SPECIFICATIONS & LAYOUT
- Canvas Format: Single 16:9 horizontal storyboard contact sheet.
- Grid Structure: Exactly ${count} rectangular panels arranged in a clean, balanced ${layoutDesc} with distinct panel borders, outer margins, and letterbox frame.
- Sequence Flow: Strict chronological reading order (Panel 01 to Panel ${String(count).padStart(2, "0")}, left-to-right, top-to-bottom) forming a continuous ~${dur}-second film sequence.
- Panel Header: Each panel clearly displays an unobtrusive top badge: "SHOT 01" to "SHOT ${String(count).padStart(2, "0")}" with camera abbreviations.

## 2. ART STYLE & MEDIUM (CINEMATIC CONCEPT ART STORYBOARD)
- Medium: Cinematic film still concept art, professional pre-visualization keyframes, vivid color palette, three-point lighting.
- Aesthetic: Dynamic cinematic composition, clear readable structural anatomy, crisp silhouettes, volumetric atmosphere and lens depth.
- Value Hierarchy: Dramatic lighting contrast defining primary light source, edge rim light, depth planes, and subject focus.
- Explicit Exclusion: NO unfinished scribbles, NO comic book speech bubbles, NO watermark logos.

## 3. DUAL-REFERENCE ANCHOR RULES (ZERO DRIFT)
- Character Continuity ([Reference Image 1]): Strictly preserve the exact character design, facial silhouette, proportions, hairstyle, and signature wardrobe across ALL panels. Zero character face/clothing drift.
- Spatial Geography ([Reference Image 2]): Strictly preserve the environment architecture, perspective vanishing points, spatial landmarks, and set geometry across ALL panels. Zero set jumping.
- Cinematic Grammar: Strict continuity of screen direction (180-degree axis), eyeline match, and kinetic momentum between consecutive panels.

## 4. SCENE NARRATIVE & BEAT BREAKDOWN (~${dur}s Scene)
**Title / Scene:** ${project.title}
**Story Context:** ${project.story || "A cinematic narrative scene directed with rigorous visual grammar and rhythm."}

${shotsSummary.join("\n")}

## 5. RESOLUTION & TOKEN CONSTRAINTS
- Standard 16:9 widescreen pre-production contact sheet format.
- Professional clarity, high readability per panel, vivid lighting atmosphere.

## 6. NEGATIVE CONSTRAINTS
Avoid: Comic book speech bubbles, stylized sound effect texts (SFX), messy unreadable scribbles, deformed hands/anatomy, character drift, blurry details.
`;
}

export function generateAIVideoManifest(project: Project, shots: Shot[]): string {
  const lines: string[] = [
    `# ==============================================================================`,
    `# AI 视频工业级批量生成清单 (Runway Gen-3 / 可灵 Kling 1.5 / Minimax / Sora)`,
    `# 项目: ${project.title}`,
    `# 总时长: ${project.targetDuration || 30}s | 镜头总数: ${shots.length} | 画面画幅: 16:9`,
    `# ==============================================================================\n`,
  ];

  shots.forEach((s) => {
    const shotNo = String(s.order).padStart(2, "0");
    const imgUrl = s.storyboardImageUrl || "(等待首帧生成后填入直链)";
    const cont = typeof s.continuityData === "object" ? (s.continuityData as any) : {};
    lines.push(`## 【SHOT ${shotNo}】 (时长: ${s.duration}s | 景别: ${s.shotSize || "MS"} | 运镜: ${s.cameraMovement || "Push In"})`);
    lines.push(`- I2V 黄金首帧垫图 (First Frame Image URL):`);
    lines.push(`  ${imgUrl}`);
    lines.push(`- 4段式 AI 视频生动运镜词 (Video Motion Prompt):`);
    lines.push(`  ${s.videoPrompt || "Cinematic camera tracking, character executes action in 24fps motion"}`);
    lines.push(`- 镜头叙事与动作描述: ${s.action || ""}`);
    lines.push(`- 剪辑动势衔接: ${cont.motion_in || "Entry"} ➔ ${cont.motion_out || "Exit"} | 转场建议: ${cont.transition_recommendation || "Match cut on action"}`);
    lines.push(`\n------------------------------------------------------------------------------\n`);
  });

  return lines.join("\n");
}

export async function generateGenerationPackageZip(project: Project, shots: Shot[]): Promise<Uint8Array> {
  const zip = new JSZip();

  // 1. JSON spec
  const meta = {
    project_id: project.id,
    title: project.title,
    target_duration: project.targetDuration,
    shots_count: shots.length,
    shots: shots.map((s) => ({
      order: s.order,
      duration: s.duration,
      shot_size: s.shotSize,
      camera_angle: s.cameraAngle,
      camera_movement: s.cameraMovement,
      action: s.action,
      image_prompt: s.imagePrompt,
      video_prompt: s.videoPrompt,
      continuity_data: s.continuityData,
      first_frame_asset_url: s.storyboardImageUrl || "",
    })),
  };
  zip.file("shot_spec_package.json", JSON.stringify(meta, null, 2));

  // 2. AI Video Batch Prompts JSON (for external automation / API pipelines)
  const videoBatchPrompts = shots.map((s) => ({
    order: s.order,
    duration: s.duration,
    first_frame_image_url: s.storyboardImageUrl || "",
    video_prompt: s.videoPrompt || "",
    camera_movement: s.cameraMovement || "push_in",
    action: s.action || "",
    aspect_ratio: "16:9",
  }));
  zip.file("AI_VIDEO_BATCH_PROMPTS.json", JSON.stringify(videoBatchPrompts, null, 2));

  // 3. AI Video Batch Manifest TXT (for human batch copy-pasting to Kling / Runway)
  const videoManifestTxt = generateAIVideoManifest(project, shots);
  zip.file("AI_VIDEO_GENERATION_MANIFEST.txt", videoManifestTxt);

  // 4. Shot Script Markdown
  const scriptMd = generateShotScriptMarkdown(project, shots);
  zip.file("SHOT_SCRIPT.md", scriptMd);

  // 5. Director Global Prompt Markdown
  const globalPromptMd = generateDirectorGlobalPrompt(project, shots);
  zip.file("PROFESSIONAL_DIRECTOR_GLOBAL_PROMPT.md", globalPromptMd);

  return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
