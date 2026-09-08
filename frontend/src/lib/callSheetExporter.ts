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
    const locName = loc ? loc.name : "待确认场景";
    const lighting = s.lighting || (loc?.lighting_style) || "自然光";
    const groupKey = loc ? `${loc.id}__${lighting}` : `unbound_${s.id}`;

    if (!locationGroups.has(groupKey)) {
      locationGroups.set(groupKey, batchCounter++);
    }
    const currentBatch = locationGroups.get(groupKey)!;

    const charNames: string[] = [];
    if (s.character_ids && Array.isArray(s.character_ids) && s.character_ids.length > 0) {
      s.character_ids.forEach((cId) => {
        const name = charMap.get(cId);
        charNames.push(name || "待确认出场人物");
      });
    }

    rows.push({
      batchNumber: loc ? `批次 ${String(currentBatch).padStart(2, "0")}` : "待排期（场景未绑定）",
      order: s.order || idx + 1,
      shotSize: s.shot_size || "MS",
      cameraAngle: s.camera_angle || "平视",
      cameraMovement: s.camera_movement?.type || "固定",
      locationName: locName,
      lightingState: lighting,
      characters: charNames.join(" / ") || "待确认出场人物",
      action: s.action || "",
      dialogue: s.dialogue || "",
      duration: Number(s.duration) || 2.5,
      hasArtwork: s.is_dirty ? "待更新 · 内容未审" : s.storyboard_image_url?.trim() ? "有图片引用 · 内容未审" : "无图片引用",
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
    "计划镜头时长(秒)",
    "图片引用与审片状态",
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
