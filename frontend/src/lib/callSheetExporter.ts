import { ShotModel, ProjectModel, LocationModel, CharacterModel } from "@/types/shot";

/**
 * Escapes a field for standard CSV formatting (RFC 4180)
 */
function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and triggers download of a professional Call Sheet (顺场表) CSV file.
 * Includes UTF-8 Byte Order Mark (\uFEFF) to guarantee proper display in Microsoft Excel on Windows/macOS.
 */
export function exportCallSheetToCsv(
  project: ProjectModel | null,
  shots: ShotModel[],
  locations: LocationModel[] = [],
  characters: CharacterModel[] = []
): void {
  if (!shots || shots.length === 0) {
    throw new Error("暂无可导出的镜头数据");
  }

  const projectTitle = project?.title || "StoryBoarding_Project";

  // Build character lookup map
  const charMap = new Map<string, string>();
  characters.forEach((c) => charMap.set(c.id, c.name));

  // Build location lookup map
  const locMap = new Map<string, LocationModel>();
  locations.forEach((l) => locMap.set(l.id, l));

  // Group shots by (Location + Lighting State)
  type CsvRow = {
    batchNumber: string;
    order: number;
    shotSize: string;
    cameraAngle: string;
    cameraMovement: string;
    locationName: string;
    lightingState: string;
    characters: string;
    action: string;
    dialogue: string;
    duration: number;
    hasArtwork: string;
  };

  const rows: CsvRow[] = [];
  const locationGroups = new Map<string, number>();
  let batchCounter = 1;

  shots.forEach((s, idx) => {
    const loc = locMap.get(s.location_id || "");
    const locName = loc ? loc.name : s.subject?.split(/[,，\s]/)[0] || "通用主场景";
    const lighting = s.lighting || (loc?.lighting_style) || "自然光";
    const groupKey = `${locName}__${lighting}`;

    if (!locationGroups.has(groupKey)) {
      locationGroups.set(groupKey, batchCounter++);
    }
    const bId = `B${locationGroups.get(groupKey)}`;

    // Resolve featured characters
    const charNames: string[] = [];
    if (s.character_ids && s.character_ids.length > 0) {
      s.character_ids.forEach((cId) => {
        const name = charMap.get(cId);
        if (name) charNames.push(name);
      });
    }
    if (charNames.length === 0 && characters.length > 0) {
      characters.forEach((ch) => {
        const q = ch.name.trim();
        if (
          q &&
          ((s.subject && s.subject.includes(q)) ||
            (s.action && s.action.includes(q)) ||
            (s.dialogue && s.dialogue.includes(q)))
        ) {
          charNames.push(q);
        }
      });
    }

    const movType =
      typeof s.camera_movement === "object"
        ? (s.camera_movement as any)?.type || "static"
        : s.camera_movement || "static";

    rows.push({
      batchNumber: bId,
      order: idx + 1,
      shotSize: s.shot_size ? s.shot_size.toUpperCase() : "MS",
      cameraAngle: s.camera_angle || "eye_level",
      cameraMovement: movType,
      locationName: locName,
      lightingState: lighting,
      characters: charNames.join("、") || "全景/空镜",
      action: s.action || "",
      dialogue: s.dialogue ? `“${s.dialogue}”` : "",
      duration: Number(s.duration) || 2.5,
      hasArtwork: s.storyboard_image_url ? "已显影" : "待冲印",
    });
  });

  // Table Headers
  const headers = [
    "生产批次",
    "分镜序号",
    "景别",
    "视线机位",
    "摄影调度运镜",
    "拍摄场景/空间",
    "光影状态",
    "出场人物",
    "画面动作描述",
    "对白台词",
    "预估时长(秒)",
    "画面打样状态",
  ];

  const csvLines: string[] = [];
  csvLines.push(headers.map(escapeCsvField).join(","));

  rows.forEach((r) => {
    const line = [
      escapeCsvField(r.batchNumber),
      escapeCsvField(r.order),
      escapeCsvField(r.shotSize),
      escapeCsvField(r.cameraAngle),
      escapeCsvField(r.cameraMovement),
      escapeCsvField(r.locationName),
      escapeCsvField(r.lightingState),
      escapeCsvField(r.characters),
      escapeCsvField(r.action),
      escapeCsvField(r.dialogue),
      escapeCsvField(r.duration),
      escapeCsvField(r.hasArtwork),
    ];
    csvLines.push(line.join(","));
  });

  // UTF-8 BOM prefix for seamless Microsoft Excel rendering
  const csvContent = "\uFEFF" + csvLines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectTitle.replace(/\s+/g, "_")}_制片顺场表_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
