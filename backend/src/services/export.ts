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

export function generateCharacterAndLocationBibleMarkdown(
  project: Project,
  characters: any[] = [],
  locations: any[] = []
): string {
  const isVertical = project.aspectRatio === "9:16";
  const lines = [
    `# ${project.title} — 角色与空间资产设定集 (Character & Location Bible)`,
    `\n> **项目画幅**: ${isVertical ? "9:16 竖屏微短剧" : "16:9 宽画幅电影"} | **角色总数**: ${characters.length} | **场景总数**: ${locations.length}\n`,
    "## 🎭 角色视觉 DNA 档案 (Character Roster)\n",
  ];

  if (characters.length === 0) {
    lines.push("*暂无角色资产录入*\n");
  } else {
    for (const c of characters) {
      lines.push(`### 【${c.name}】(${c.role === "protagonist" ? "主角" : c.role === "antagonist" ? "反派" : "配角"})`);
      if (c.avatarUrl) lines.push(`- **定妆肖像直链**: ${c.avatarUrl}`);
      lines.push(`- **性格与身份特征**: ${c.personality || "未填写"}`);
      lines.push(`- **英文视觉 DNA 提示词 (Visual Anchor)**:\n  \`${c.visualAnchor || "A photorealistic character..."}\``);
      if (c.turnaroundPrompt) {
        lines.push(`- **多角度定妆三视图提示词 (Model Sheet)**:\n  \`${c.turnaroundPrompt}\``);
      }
      let costumes: string[] = [];
      try {
        costumes = typeof c.costumeVariants === "string" ? JSON.parse(c.costumeVariants) : c.costumeVariants || [];
      } catch {}
      if (costumes.length > 0) {
        lines.push(`- **多套服装造型变体**:`);
        costumes.forEach((costume: string, idx: number) => {
          lines.push(`  ${idx + 1}. \`${costume}\``);
        });
      }
      lines.push("\n---\n");
    }
  }

  lines.push("## 🏛️ 空间与场景资产设定 (Location Bible)\n");
  if (locations.length === 0) {
    lines.push("*暂无场景资产录入*\n");
  } else {
    for (const loc of locations) {
      lines.push(`### 【${loc.name}】(${loc.environmentType === "interior" ? "室内" : loc.environmentType === "exterior" ? "室外" : "抽象/概念"})`);
      if (loc.referenceImageUrl) lines.push(`- **概念设计图直链**: ${loc.referenceImageUrl}`);
      lines.push(`- **光影与氛围风格**: ${loc.lightingStyle || "自然光"}`);
      lines.push(`- **场景空间提示词 (Visual Anchor)**:\n  \`${loc.visualAnchor || ""}\``);
      lines.push("\n---\n");
    }
  }

  return lines.join("\n");
}

export function generateShotScriptMarkdown(
  project: Project,
  shots: Shot[],
  sequences?: any[],
  characters?: any[],
  locations?: any[]
): string {
  const isVertical = project.aspectRatio === "9:16";
  const charMap = new Map((characters || []).map((c) => [c.id, c.name]));
  const locMap = new Map((locations || []).map((l) => [l.id, l.name]));

  const lines = [
    `# ${project.title} — 导演分镜头脚本文档`,
    `\n> **目标时长**: ${project.targetDuration} 秒 | **分集总数**: ${sequences && sequences.length > 0 ? sequences.length : 1} 集 | **镜头总数**: ${shots.length} | **画幅**: ${isVertical ? "9:16 竖屏微短剧" : "16:9 宽画幅电影"}\n`,
    `## 故事梗概\n${project.story || "未提供故事梗概"}\n`,
    "---\n",
  ];

  const renderShotDetails = (s: Shot, epNum?: number) => {
    const meta = extractShotMeta(s);
    const epPrefix = epNum ? `EP${epNum} · ` : "";
    lines.push(`### ${epPrefix}SHOT ${meta.shotNo} · ${meta.sizeAbbr} · ${meta.durStr}`);
    lines.push(`- **景别机位**: ${s.shotSize} / ${s.cameraAngle}`);
    lines.push(`- **运镜方式**: ${meta.movType}`);

    // Characters & Location binding
    let charIds: string[] = [];
    try {
      charIds = typeof (s as any).characterIds === "string" ? JSON.parse((s as any).characterIds) : (s as any).characterIds || [];
    } catch {}
    if (charIds.length > 0) {
      const names = charIds.map((id) => charMap.get(id) || id).join("、");
      lines.push(`- **登场角色**: ${names}`);
    }
    const locId = (s as any).locationId;
    if (locId && locMap.has(locId)) {
      lines.push(`- **绑定场景**: ${locMap.get(locId)}`);
    }

    lines.push(`- **动作调度**: ${s.action}`);
    if (s.dialogue) lines.push(`- **角色台词**: “${s.dialogue}”`);
    if ((s as any).screenText) {
      lines.push(`- **🔤 屏幕文字/花字 (Screen Text)**: **【${(s as any).screenText}】** (样式: ${(s as any).screenTextStyle || "醒目冲击"})`);
    }
    lines.push(`- **戏剧节拍**: ${s.beatType || "情绪推进"} (${s.emotionalVoltage || 50}V)`);
    lines.push(`- **图像 Prompt**: \`${s.imagePrompt}\``);
    if (s.videoPrompt) lines.push(`- **视频运镜 Prompt**: \`${s.videoPrompt}\``);
    lines.push("\n---\n");
  };

  if (sequences && sequences.length > 1) {
    for (const seq of sequences) {
      const epNum = seq.episodeNumber || seq.order || 1;
      const seqShots = shots.filter((s) => s.sequenceId === seq.id);
      const epDuration = seqShots.reduce((acc, s) => acc + (s.duration || 2.5), 0);

      lines.push(`## 🎬 EPISODE ${String(epNum).padStart(2, "0")}: ${seq.title || `第 ${epNum} 集`}`);
      lines.push(`> **本集片长**: ${epDuration.toFixed(1)}s | **镜头数**: ${seqShots.length} 镜 | **集尾生死卡点**: ${seq.cliffhangerSummary || "危机推进"}\n`);

      for (const s of seqShots) {
        renderShotDetails(s, epNum);
      }
    }
  } else {
    lines.push("## 分镜头详细列表\n");
    for (const s of shots) {
      renderShotDetails(s);
    }
  }

  return lines.join("\n");
}

export function calculateOptimalGridLayout(shotCount: number, isVertical: boolean = false): { layoutDesc: string; gridName: string } {
  if (isVertical) {
    if (shotCount <= 3) {
      return { layoutDesc: `1 × ${shotCount} vertical strip (1 column, ${shotCount} stacked panels)`, gridName: `${shotCount}-panel mobile vertical strip (1x${shotCount} grid)` };
    }
    if (shotCount <= 6) {
      return { layoutDesc: "3 × 2 grid (3 rows, 2 vertical columns)", gridName: `${shotCount}-panel mobile contact sheet (3x2 vertical grid)` };
    }
    if (shotCount <= 9) {
      return { layoutDesc: "3 × 3 grid (3 rows, 3 vertical columns)", gridName: `${shotCount}-panel mobile contact sheet (3x3 vertical grid)` };
    }
    return { layoutDesc: "4 × 3 grid (4 rows, 3 vertical columns)", gridName: `${shotCount}-panel mobile contact sheet (4x3 vertical grid)` };
  }

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
  const isVertical = project.aspectRatio === "9:16";
  const count = shots.length;
  const { gridName, layoutDesc } = calculateOptimalGridLayout(count, isVertical);
  const dur = project.targetDuration || 30.0;
  const aspectDesc = isVertical ? "9:16 mobile vertical short drama format" : "16:9 widescreen director format";

  const shotsSummary = shots.map((s) => {
    const meta = extractShotMeta(s);
    return `* **SHOT ${meta.shotNo}** [${meta.sizeAbbr} · ${s.cameraAngle} · ${meta.movType}]: ${s.action}`;
  });

  return `# SYSTEM DIRECTIVE: PROFESSIONAL ${isVertical ? "VERTICAL SHORT DRAMA" : "CINEMATIC"} STORYBOARD SHEET (PREVIZ CONTACT SHEET)

Generate ONE single ${isVertical ? "9:16 vertical mobile" : "16:9 widescreen"} director's storyboard page containing a complete sequential panel grid (${count} panels, ${gridName}). 
This is a functional pre-production previsualization drawing, NOT a finished color illustration, NOT a promotional poster, and NOT a standalone comic book page.

## 1. CANVAS SPECIFICATIONS & LAYOUT
- Canvas Format: Single ${isVertical ? "9:16 vertical (height > width)" : "16:9 horizontal"} storyboard contact sheet.
- Grid Structure: Exactly ${count} rectangular ${isVertical ? "9:16 vertical" : "16:9 horizontal"} panels arranged in a clean, balanced ${layoutDesc} with distinct panel borders, outer margins, and frame.
- Sequence Flow: Strict chronological reading order (Panel 01 to Panel ${String(count).padStart(2, "0")}, top-to-bottom, left-to-right) forming a continuous ~${dur}-second film sequence.
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
**Format:** ${aspectDesc}
**Story Context:** ${project.story || "A cinematic narrative scene directed with rigorous visual grammar and rhythm."}

${shotsSummary.join("\n")}

## 5. RESOLUTION & TOKEN CONSTRAINTS
- Standard ${isVertical ? "9:16 vertical mobile" : "16:9 widescreen"} pre-production contact sheet format.
- Professional clarity, high readability per panel, vivid lighting atmosphere.

## 6. NEGATIVE CONSTRAINTS
Avoid: Comic book speech bubbles, stylized sound effect texts (SFX), messy unreadable scribbles, deformed hands/anatomy, character drift, blurry details.
`;
}

