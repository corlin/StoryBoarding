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
    `\n> **目标时长**: ${project.targetDuration} 秒 | **镜头总数**: ${shots.length} | **生成平台**: Cloudflare Edge Storyboard\n`,
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
    lines.push(`- **环境光影**: ${s.lighting || "自然光"}`);
    lines.push(`- **声音设计**: ${s.audio}`);
    lines.push(`- **图像 Prompt**: \`${s.imagePrompt}\``);
    lines.push(`- **视频 Prompt**: \`${s.videoPrompt}\``);
    lines.push("\n---\n");
  }

  return lines.join("\n");
}

export function generateDirectorGlobalPrompt(project: Project, shots: Shot[]): string {
  const shotsSummary = shots.map((s) => {
    const meta = extractShotMeta(s);
    return `* **SHOT ${meta.shotNo}** [${meta.sizeAbbr} · ${s.cameraAngle} · ${meta.movType}]: ${s.action}`;
  });

  return `## PROFESSIONAL DIRECTOR’S STORYBOARD — GLOBAL PROMPT

Create **one complete professional director’s storyboard sheet** for the following short scene:

**Story / Scene:**
${project.title}
${project.story || "A cinematic narrative scene directed with rigorous visual grammar and rhythm."}

### 1. Final Output Format

* Generate **one single 16:9 horizontal storyboard page**.
* The page must contain **exactly ${shots.length} separate cinematic panels**, arranged in a clean **4 × 3 grid** (or balanced multi-panel grid).
* Show the entire storyboard sheet in one image.
* Do not generate a single enlarged frame, isolated illustration, film still, concept artwork, key visual, poster, or finished comic page.
* Every panel must have a clearly defined border and sufficient spacing from adjacent panels.
* The reading order must be unambiguous: **left to right, top to bottom**.

### 2. Panel Labels and Production Notes

Every panel must include:

* A clearly visible shot number: **SHOT 01–SHOT ${String(shots.length).padStart(2, "0")}**
* A concise shot description
* The shot size where appropriate: **EWS, WS, FS, MS, MCU, CU, ECU**
* A camera angle or movement note when relevant
* Simple directional arrows for camera movement, character movement, or eye-line direction when helpful

Keep all annotations short, clean, legible, and production-oriented. They must not obscure the main action.

### 3. Narrative Structure and Timing (~30s Continuous Sequence)

The ${shots.length} panels form **one complete, continuous short-film sequence lasting approximately ${project.targetDuration} seconds**:

${shotsSummary.join("\n")}

### 4. Cinematic Shot Design

Design the sequence as a director’s visual plan rather than a collection of attractive images:
* Preserve the **180-degree rule** unless an intentional transition clearly establishes a new axis.
* Maintain consistent eye lines and screen direction across all cuts.
* Use match-on-action and preserve momentum between consecutive panels.
* Avoid unexplained jump cuts, random camera positions, or sudden spatial reversals.

### 5. Character Reference Rules (Reference Image 1)

**Reference Image 1 is the mandatory character continuity reference.**
* Character Anchor: Protagonist master in black changshan coat and dark glasses, athletic martial arts physique, immutable facial structure, costume and accessories.
* Lock facial structure, hairstyle, body proportions, apparent age, costume, and handheld props.
* Strict negative: No face drift, no costume changes, no hairstyle changes, no age drift.

### 6. Environment Reference Rules (Reference Image 2)

**Reference Image 2 is the mandatory environment and visual-world reference.**
* Environment Anchor: Cyberpunk ancient Chinese tea house in heavy rain, red holographic lanterns, wet reflective stone alleyway, consistent architectural geometry and lighting.
* Lock overall location, architectural structure, landmarks, spatial relationships, perspective logic, and lighting atmosphere.
* Strict negative: Do not relocate landmarks or break established spatial perspective.

### 7. Storyboard Drawing Style

Render the entire sheet as a **professional pre-production storyboard drawn for a film director**:
* Black, white, and restrained grayscale only.
* Rough graphite or dark pencil lines with bold, confident construction strokes.
* Fast gestural drawing with simplified but readable anatomy.
* Clear silhouettes and staging with directional movement arrows.
* Selective grayscale shading for depth and focus with unfinished previsualization quality.

### 8. Continuity Requirements

* Maintain strict character, costume, prop, handedness, spatial geography, and lighting continuity across all ${shots.length} panels.

### 9. Negative Constraints

Do not create:
* A single enlarged illustration, poster, or key visual.
* A comic-book page, manga page, speech balloons, or long dialogue paragraphs.
* Finished 3D render, saturated color painting, or photorealistic film still.
* Duplicate panels, character drift, or abrupt drawing style changes.

### 10. Final Quality Check
* Entire 16:9 storyboard page visible, clearly separated panels with numbered tags (SHOT 01–${String(shots.length).padStart(2, "0")}), reads naturally left-to-right, feels like ~30 seconds of one continuous short film.
`;
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
    })),
  };
  zip.file("shot_spec_package.json", JSON.stringify(meta, null, 2));

  // 2. Shot Script Markdown
  const scriptMd = generateShotScriptMarkdown(project, shots);
  zip.file("SHOT_SCRIPT.md", scriptMd);

  // 3. Director Global Prompt Markdown
  const globalPromptMd = generateDirectorGlobalPrompt(project, shots);
  zip.file("PROFESSIONAL_DIRECTOR_GLOBAL_PROMPT.md", globalPromptMd);

  return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
