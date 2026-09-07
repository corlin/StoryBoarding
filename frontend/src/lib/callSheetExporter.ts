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
export function generateCallSheetCsvContent(
  project: ProjectModel | null,
  shots: ShotModel[],
  locations: LocationModel[] = [],
  characters: CharacterModel[] = [],
  batchTag?: string
): string {
  if (!shots || shots.length === 0) {
    throw new Error("暂无可导出的镜头数据");
  }

  const charMap = new Map<string, string>();
  characters.forEach((c) => charMap.set(c.id, c.name));

  const locMap = new Map<string, LocationModel>();
  locations.forEach((l) => locMap.set(l.id, l));

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
    const currentBatch = locationGroups.get(groupKey)!;

    const charNames: string[] = [];
    if (s.character_ids && Array.isArray(s.character_ids) && s.character_ids.length > 0) {
      s.character_ids.forEach((cId) => {
        const name = charMap.get(cId);
        if (name) charNames.push(name);
      });
    }
    if (charNames.length === 0 && s.subject) {
      charNames.push(s.subject.split(/[,，\s]/)[0]);
    }

    rows.push({
      batchNumber: `批次 ${String(currentBatch).padStart(2, "0")}`,
      order: s.order || idx + 1,
      shotSize: s.shot_size || "MS",
      cameraAngle: s.camera_angle || "平视",
      cameraMovement: s.camera_movement?.type || "固定",
      locationName: locName,
      lightingState: lighting,
      characters: charNames.join(" / ") || "未指定",
      action: s.action || "",
      dialogue: s.dialogue || "",
      duration: Number(s.duration) || 2.5,
      hasArtwork: s.storyboard_image_url ? "已打样" : "未打样",
    });
  });

  const headers = [
    "拍摄批次",
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

  return "\uFEFF" + csvLines.join("\r\n");
}

export function exportCallSheetToCsv(
  project: ProjectModel | null,
  shots: ShotModel[],
  locations: LocationModel[] = [],
  characters: CharacterModel[] = [],
  batchTag?: string
): void {
  const projectTitle = project?.title || "StoryBoarding_Project";
  const csvContent = generateCallSheetCsvContent(project, shots, locations, characters, batchTag);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const tagSuffix = batchTag ? `_批次_${batchTag}` : "";
  link.download = `${projectTitle.replace(/\s+/g, "_")}_制片顺场表${tagSuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
