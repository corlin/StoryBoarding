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

export async function exportStoryboardSheetToPng(
  project: ProjectModel,
  shots: ShotModel[],
  options: ExportOptions = { includeHud: true }
): Promise<void> {
  if (!shots || shots.length === 0) {
    throw new Error("项目中暂无分镜头数据");
  }

  const includeHud = options.includeHud ?? true;

  // Pre-load all shot images in parallel
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

  // High-res geometry
  const cellWidth = 560;
  const cellImgHeight = 315; // 16:9
  const cellTextHeight = 105;
  const cellHeight = cellImgHeight + cellTextHeight;

  const padding = 48;
  const headerHeight = 140;
  const footerHeight = 60;
  const gap = 24;

  const canvasWidth = padding * 2 + cols * cellWidth + (cols - 1) * gap;
  const canvasHeight = padding * 2 + headerHeight + rows * cellHeight + (rows - 1) * gap + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法初始化 Canvas 绘图上下文");

  // 1. Background (Cinema Dark Slate)
  ctx.fillStyle = "#0c0f17";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Subtle background grid pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvasWidth; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y < canvasHeight; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // 2. Header Bar
  const headerY = padding + 20;

  // Top Category Pill
  ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(padding, headerY, 280, 28, 6);
  } else {
    ctx.rect(padding, headerY, 280, 28);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("🎬 好莱坞 AI 导演故事板打样单 (Previz Sheet)", padding + 12, headerY + 18);

  // Project Title
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(project.title || "未命名故事板工程", padding, headerY + 68);

  // Project Metadata Subtitle
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  const totalDur = shots.reduce((acc, s) => acc + (s.duration || 2.5), 0);
  ctx.fillText(
    `目标时长: ${project.target_duration || totalDur.toFixed(1)}s  |  镜头总数: ${count} 镜  |  画幅比例: 16:9 宽银幕电影级  |  生成时间: ${new Date().toLocaleDateString()}`,
    padding,
    headerY + 98
  );

  // Header Divider
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerY + 115);
  ctx.lineTo(canvasWidth - padding, headerY + 115);
  ctx.stroke();

  // 3. Grid Panels
  const gridStartY = padding + headerHeight + 10;

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
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(cellX, cellY, cellWidth, cellHeight, 10);
    } else {
      ctx.rect(cellX, cellY, cellWidth, cellHeight);
    }
    ctx.fill();
    ctx.stroke();

    // Draw Image / Darkroom Frame
    ctx.save();
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(cellX, cellY, cellWidth, cellImgHeight, [10, 10, 0, 0]);
    } else {
      ctx.rect(cellX, cellY, cellWidth, cellImgHeight);
    }
    ctx.clip();

    if (img) {
      ctx.drawImage(img, cellX, cellY, cellWidth, cellImgHeight);
    } else {
      // Empty dark placeholder
      ctx.fillStyle = "#1e2638";
      ctx.fillRect(cellX, cellY, cellWidth, cellImgHeight);
      ctx.fillStyle = "#64748b";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("分镜画面待渲染", cellX + cellWidth / 2, cellY + cellImgHeight / 2);
      ctx.textAlign = "left";
    }

    const movType =
      typeof shot.camera_movement === "object"
        ? (shot.camera_movement as any)?.type || "static"
        : shot.camera_movement || "static";

    // Optional: Draw Previz HUD Overlay on Canvas Image Area
    if (includeHud) {
      // Rule of Thirds Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      const w3 = cellWidth / 3;
      const h3 = cellImgHeight / 3;
      ctx.beginPath();
      ctx.moveTo(cellX + w3, cellY); ctx.lineTo(cellX + w3, cellY + cellImgHeight);
      ctx.moveTo(cellX + w3 * 2, cellY); ctx.lineTo(cellX + w3 * 2, cellY + cellImgHeight);
      ctx.moveTo(cellX, cellY + h3); ctx.lineTo(cellX + cellWidth, cellY + h3);
      ctx.moveTo(cellX, cellY + h3 * 2); ctx.lineTo(cellX + cellWidth, cellY + h3 * 2);
      ctx.stroke();

      // Focus Crosshairs (Center Reticle)
      const centerX = cellX + cellWidth / 2;
      const centerY = cellY + cellImgHeight / 2;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Motion Vector Pill at bottom of image
      const movBadgeText = getMovementBadgeText(movType);
      ctx.fillStyle = "rgba(12, 15, 23, 0.88)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 1;
      const badgeW = 150;
      const badgeH = 22;
      const badgeX = cellX + (cellWidth - badgeW) / 2;
      const badgeY = cellY + cellImgHeight - 30;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 11);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(movBadgeText, cellX + cellWidth / 2, badgeY + 15);
      ctx.textAlign = "left";
    }

    ctx.restore();

    // Image Top Badge: SHOT No · Shot Size · Duration
    const shotNoStr = String(shot.order || i + 1).padStart(2, "0");
    const sizeAbbr = SHOT_SIZE_ABBR[shot.shot_size] || (shot.shot_size || "MS").toUpperCase().slice(0, 3);
    const durStr = `${(shot.duration || 2.5).toFixed(1)}s`;

    ctx.fillStyle = "rgba(12, 15, 23, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(cellX + 12, cellY + 12, 160, 26, 6);
    } else {
      ctx.rect(cellX + 12, cellY + 12, 160, 26);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace, monospace";
    ctx.fillText(`${shotNoStr}`, cellX + 22, cellY + 29);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("·", cellX + 46, cellY + 29);

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 12px monospace, monospace";
    ctx.fillText(sizeAbbr, cellX + 58, cellY + 29);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("·", cellX + 90, cellY + 29);

    ctx.fillStyle = "#34d399";
    ctx.fillText(durStr, cellX + 102, cellY + 29);

    // Text Box Area
    const textY = cellY + cellImgHeight + 18;

    // Action Description (2 lines max)
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    wrapText(ctx, shot.action || "镜头动作推进中...", cellX + 16, textY, cellWidth - 32, 20, 2);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui, monospace";
    ctx.fillText(
      `📷 机位运镜: ${movType}  |  景别机位: ${shot.shot_size} / ${shot.camera_angle || "eye_level"}`,
      cellX + 16,
      cellY + cellHeight - 16
    );
  }

  // 4. Footer
  const footerY = canvasHeight - padding + 10;
  ctx.fillStyle = "#475569";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    "StoryBoarding AI · Hollywood Visual Previz System · 16:9 Contact Sheet Output",
    padding,
    footerY
  );

  // 5. Convert to PNG Blob and Trigger Download
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas 导出图片数据为空"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Storyboard_Sheet_${sanitizeFilename(project.title || "project")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, "image/png");
  });
}
