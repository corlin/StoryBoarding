import { ProjectModel, ShotModel } from "@/types/shot";
import { normalizeAssetUrl } from "@/lib/api";

export const SHOT_SIZE_ABBR: Record<string, string> = {
  extreme_wide_shot: "EWS",
  wide_shot: "WS",
  full_shot: "FS",
  medium_shot: "MS",
  medium_close_up: "MCU",
  close_up: "CU",
  extreme_close_up: "ECU",
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => resolve(null);
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

function sanitizeFilename(text: string): string {
  return (
    (text || "storyboard")
      .replace(/[\\/*?:"<>| \n\t\r,，。！!？"'“”]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30) || "storyboard"
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2
) {
  if (!text) return;
  const chars = Array.from(text);
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(line + "...", x, y);
        return;
      }
      ctx.fillText(line, x, y);
      line = chars[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function getMovementBadgeText(movType: string): string {
  switch (movType) {
    case "push_in":
      return "PUSH IN ➔ (推进)";
    case "pull_out":
      return "PULL OUT ⤺ (拉远)";
    case "tracking_right":
    case "pan_right":
      return "TRACKING R ━━━━►";
    case "tracking_left":
    case "pan_left":
      return "◄━━━━ TRACKING L";
    case "crane":
    case "tilt_up":
      return "▲ CRANE / TILT UP";
    case "tilt_down":
      return "▼ TILT DOWN";
    case "arc_rotate":
      return "⟳ 360° ARC";
    default:
      return "⊡ LOCKED STATIC";
  }
}

export interface ExportOptions {
  includeHud?: boolean;
}

// Lightweight, instant, 1K-standard Previz draft sheet
export async function exportStoryboardSheetToPng(
  project: ProjectModel,
  shots: ShotModel[],
  options: ExportOptions = { includeHud: true }
): Promise<void> {
  if (!shots || shots.length === 0) {
    throw new Error("项目中暂无分镜头数据");
  }

  const includeHud = options.includeHud ?? true;

  // Pre-load images in parallel
  const imagePromises = shots.map((s) =>
    s.storyboard_image_url ? loadImage(normalizeAssetUrl(s.storyboard_image_url)) : Promise.resolve(null)
  );
  const loadedImages = await Promise.all(imagePromises);

  // Grid calculation
  const count = shots.length;
  let cols = 3;
  if (count <= 2) cols = 2;
  else if (count <= 4) cols = 2;
  else if (count <= 9) cols = 3;
  else cols = 4;

  const rows = Math.ceil(count / cols);

  // Compact, fast, lightweight Previz Draft Dimensions (<1K total width)
  const cellWidth = 380;
  const cellImgHeight = 214; // 16:9 widescreen ratio
  const cellTextHeight = 86;
  const cellHeight = cellImgHeight + cellTextHeight;

  const padding = 28;
  const headerHeight = 96;
  const footerHeight = 44;
  const gap = 16;

  const canvasWidth = padding * 2 + cols * cellWidth + (cols - 1) * gap;
  const canvasHeight = padding * 2 + headerHeight + rows * cellHeight + (rows - 1) * gap + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法初始化 Canvas 绘图上下文");

  // 1. Background (Cinema Darkroom)
  ctx.fillStyle = "#0c0f17";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Header
  const headerY = padding + 8;

  // Header Title
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(project.title || "导演分镜头草图打样单", padding, headerY + 24);

  // Header Subtitle
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  const totalDur = shots.reduce((acc, s) => acc + (s.duration || 2.5), 0);
  ctx.fillText(
    `Previz 草图  |  时长: ${project.target_duration || totalDur.toFixed(1)}s  |  共 ${count} 镜  |  16:9 故事板  |  ${new Date().toLocaleDateString()}`,
    padding,
    headerY + 48
  );

  // Divider line
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerY + 64);
  ctx.lineTo(canvasWidth - padding, headerY + 64);
  ctx.stroke();

  // 3. Grid Panels
  const gridStartY = padding + headerHeight;

  for (let i = 0; i < count; i++) {
    const shot = shots[i];
    const img = loadedImages[i];
    const colIndex = i % cols;
    const rowIndex = Math.floor(i / cols);

    const cellX = padding + colIndex * (cellWidth + gap);
    const cellY = gridStartY + rowIndex * (cellHeight + gap);

    // Cell Outer Card Container
    ctx.fillStyle = "#141923";
    ctx.strokeStyle = "#273142";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(cellX, cellY, cellWidth, cellHeight, 8);
    } else {
      ctx.rect(cellX, cellY, cellWidth, cellHeight);
    }
    ctx.fill();
    ctx.stroke();

    // Draw Image / Graphite Placeholder
    ctx.save();
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(cellX, cellY, cellWidth, cellImgHeight, [8, 8, 0, 0]);
    } else {
      ctx.rect(cellX, cellY, cellWidth, cellImgHeight);
    }
    ctx.clip();

    if (img) {
      ctx.drawImage(img, cellX, cellY, cellWidth, cellImgHeight);
    } else {
      // Clean graphite film draft placeholder
      ctx.fillStyle = "#161d2d";
      ctx.fillRect(cellX, cellY, cellWidth, cellImgHeight);

      // Center crosshair
      ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cellX + cellWidth / 2 - 16, cellY + cellImgHeight / 2);
      ctx.lineTo(cellX + cellWidth / 2 + 16, cellY + cellImgHeight / 2);
      ctx.moveTo(cellX + cellWidth / 2, cellY + cellImgHeight / 2 - 16);
      ctx.lineTo(cellX + cellWidth / 2, cellY + cellImgHeight / 2 + 16);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`SHOT ${String(shot.order || i + 1).padStart(2, "0")} · 草图`, cellX + cellWidth / 2, cellY + cellImgHeight / 2 + 24);
      ctx.textAlign = "left";
    }

    const movType =
      typeof shot.camera_movement === "object"
        ? (shot.camera_movement as any)?.type || "static"
        : shot.camera_movement || "static";

    // Optional: Draw Previz HUD
    if (includeHud) {
      // Safe Crop Marks
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1;
      const safeInset = 6;
      const markLen = 5;
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(cellX + safeInset, cellY + safeInset + markLen);
      ctx.lineTo(cellX + safeInset, cellY + safeInset);
      ctx.lineTo(cellX + safeInset + markLen, cellY + safeInset);
      // Top-Right
      ctx.moveTo(cellX + cellWidth - safeInset - markLen, cellY + safeInset);
      ctx.lineTo(cellX + cellWidth - safeInset, cellY + safeInset);
      ctx.lineTo(cellX + cellWidth - safeInset, cellY + safeInset + markLen);
      // Bottom-Left
      ctx.moveTo(cellX + safeInset, cellY + cellImgHeight - safeInset - markLen);
      ctx.lineTo(cellX + safeInset, cellY + cellImgHeight - safeInset);
      ctx.lineTo(cellX + safeInset + markLen, cellY + cellImgHeight - safeInset);
      // Bottom-Right
      ctx.moveTo(cellX + cellWidth - safeInset - markLen, cellY + cellImgHeight - safeInset);
      ctx.lineTo(cellX + cellWidth - safeInset, cellY + cellImgHeight - safeInset);
      ctx.lineTo(cellX + cellWidth - safeInset, cellY + cellImgHeight - safeInset - markLen);
      ctx.stroke();

      // Motion Vector Badge at bottom
      const movBadgeText = getMovementBadgeText(movType);
      ctx.fillStyle = "rgba(12, 15, 23, 0.85)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1;
      const badgeW = 130;
      const badgeH = 18;
      const badgeX = cellX + (cellWidth - badgeW) / 2;
      const badgeY = cellY + cellImgHeight - 24;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 9);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(movBadgeText, cellX + cellWidth / 2, badgeY + 12);
      ctx.textAlign = "left";
    }

    ctx.restore();

    // Top Badge: SHOT No · Shot Size · Duration
    const shotNoStr = String(shot.order || i + 1).padStart(2, "0");
    const sizeAbbr = SHOT_SIZE_ABBR[shot.shot_size] || (shot.shot_size || "MS").toUpperCase().slice(0, 3);
    const durStr = `${(shot.duration || 2.5).toFixed(1)}s`;

    ctx.fillStyle = "rgba(12, 15, 23, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(cellX + 8, cellY + 8, 128, 22, 4);
    } else {
      ctx.rect(cellX + 8, cellY + 8, 128, 22);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`${shotNoStr}`, cellX + 16, cellY + 22);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("·", cellX + 36, cellY + 22);

    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(sizeAbbr, cellX + 46, cellY + 22);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("·", cellX + 72, cellY + 22);

    ctx.fillStyle = "#34d399";
    ctx.fillText(durStr, cellX + 82, cellY + 22);

    // Text Box Area
    const textY = cellY + cellImgHeight + 14;

    // Action Description (2 lines max)
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    wrapText(ctx, shot.action || "镜头动作推进中...", cellX + 10, textY, cellWidth - 20, 16, 2);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui, monospace";
    ctx.fillText(
      `机位: ${movType} · ${shot.shot_size} / ${shot.camera_angle || "eye_level"}`,
      cellX + 10,
      cellY + cellHeight - 10
    );
  }

  // 4. Footer
  const footerY = canvasHeight - padding + 8;
  ctx.fillStyle = "#475569";
  ctx.font = "11px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    "StoryBoarding AI · 导演视觉故事板工作草图 (Previz Draft Sheet)",
    padding,
    footerY
  );

  // 5. Convert to lightweight PNG Blob and trigger instant download (< 300KB)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas 导出图片数据为空"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Storyboard_Draft_${sanitizeFilename(project.title || "project")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, "image/png");
  });
}
