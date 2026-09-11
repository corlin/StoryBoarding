import { ProjectModel, ShotModel } from "@/types/shot";

export interface DiagnosticItem {
  id: string;
  stage: "outline" | "cast" | "art" | "script" | "storyboard";
  stageLabel: string;
  ruleName: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  suggestion?: string;
  jumpTarget: "tradeoffs" | "bible_characters" | "bible_scenes" | "bible_props" | "script" | "storyboard";
}

export function computeProjectQualityDiagnostics(
  project: ProjectModel | null,
  shots: ShotModel[] = []
): { diagnostics: DiagnosticItem[]; score: number } {
  if (!project) return { diagnostics: [], score: 100 };
  const items: DiagnosticItem[] = [];

  const characters = project.characters || [];
  const locations = project.locations || [];
  const props = project.props || [];
  const sequences = project.sequences || [];
  const totalEps = sequences.length || 1;

  // 1. OUTLINE GATES
  const leads = characters.filter((c) => c.role === "protagonist" || c.role === "antagonist");
  if (leads.length >= 1 && leads.length <= 5) {
    items.push({
      id: "outline_leads",
      stage: "outline",
      stageLabel: "大纲与角色档",
      ruleName: "主角组规模 (1–5 人)",
      status: "pass",
      detail: `当前主角组共有 ${leads.length} 人，观众心智与注意力负荷合理。`,
      jumpTarget: "bible_characters",
    });
  } else if (leads.length === 0) {
    items.push({
      id: "outline_leads",
      stage: "outline",
      stageLabel: "大纲与角色档",
      ruleName: "主角组规模 (1–5 人)",
      status: "fail",
      detail: "未定义任何主角或反派角色，观众无法建立情感代入焦点。",
      suggestion: "请在设定集中标记至少 1 位主角 (Protagonist) 与 1 位关键对抗对手 (Antagonist)。",
      jumpTarget: "bible_characters",
    });
  } else {
    items.push({
      id: "outline_leads",
      stage: "outline",
      stageLabel: "大纲与角色档",
      ruleName: "主角组规模 (1–5 人)",
      status: "warn",
      detail: `主角组多达 ${leads.length} 人，容易分散观众焦点与情感沉浸。`,
      suggestion: "建议合并边缘配角或降级为客串配角，聚焦核心双雄/三角关系。",
      jumpTarget: "bible_characters",
    });
  }

  // 2. CAST GATES
  const uncostumedChars = characters.filter((c) => !c.visual_anchor && !c.avatar_url);
  if (characters.length > 0 && uncostumedChars.length === 0) {
    items.push({
      id: "cast_visual_anchor",
      stage: "cast",
      stageLabel: "选角与定妆",
      ruleName: "角色外貌特征与定妆覆盖率",
      status: "pass",
      detail: "所有登场角色均已确立视觉特征描写或已冲印定妆底照。",
      jumpTarget: "bible_characters",
    });
  } else if (uncostumedChars.length > 0) {
    items.push({
      id: "cast_visual_anchor",
      stage: "cast",
      stageLabel: "选角与定妆",
      ruleName: "角色外貌特征与定妆覆盖率",
      status: "warn",
      detail: `有 ${uncostumedChars.length} 位角色缺少外貌描写或定妆底图 (${uncostumedChars.map(c => c.name).join(", ")})。`,
      suggestion: "进入人物小传补充发型、身材或服饰描写，并一键冲印定妆三视图。",
      jumpTarget: "bible_characters",
    });
  }

  // 3. ART GATES
  const unanchoredLocs = locations.filter((l) => !l.visual_anchor && !l.design_summary);
  if (locations.length > 0 && unanchoredLocs.length === 0) {
    items.push({
      id: "art_locations",
      stage: "art",
      stageLabel: "场景空间基准",
      ruleName: "核心场景空间锚点确立",
      status: "pass",
      detail: "全剧场景均已建立清晰的内/外景空间与光影基准。",
      jumpTarget: "bible_scenes",
    });
  } else if (unanchoredLocs.length > 0) {
    items.push({
      id: "art_locations",
      stage: "art",
      stageLabel: "场景空间基准",
      ruleName: "核心场景空间锚点确立",
      status: "warn",
      detail: `有 ${unanchoredLocs.length} 个场景缺少细节空间描述 (${unanchoredLocs.map(l => l.name).join(", ")})。`,
      suggestion: "在设定集中完善空间进深、色调与主光源基准。",
      jumpTarget: "bible_scenes",
    });
  }

  // 4. SCRIPT GATES
  const missingScriptSeqs = sequences.filter((s) => !s.screenplay_text?.trim());
  if (sequences.length > 0 && missingScriptSeqs.length === 0) {
    items.push({
      id: "script_text_coverage",
      stage: "script",
      stageLabel: "剧本完整度",
      ruleName: "各集剧本文字对齐",
      status: "pass",
      detail: "全部集数均具备规范的剧情台本与动作叙事。",
      jumpTarget: "script",
    });
  } else if (missingScriptSeqs.length > 0) {
    items.push({
      id: "script_text_coverage",
      stage: "script",
      stageLabel: "剧本完整度",
      ruleName: "各集剧本文字对齐",
      status: "fail",
      detail: `有 ${missingScriptSeqs.length} 集剧本尚未填充台本内容。`,
      suggestion: "请使用剧本工坊编辑剧本或通过 AI 拆镜扩写剧情。",
      jumpTarget: "script",
    });
  }

  // 5. STORYBOARD GATES
  const unrenderedShots = shots.filter((s) => !s.storyboard_image_url);
  if (shots.length > 0 && unrenderedShots.length === 0) {
    items.push({
      id: "storyboard_render_ratio",
      stage: "storyboard",
      stageLabel: "分镜冲印度",
      ruleName: "分镜画面显影覆盖率",
      status: "pass",
      detail: `当前场次 ${shots.length} 个镜头已全部完成冲印显影。`,
      jumpTarget: "storyboard",
    });
  } else if (unrenderedShots.length > 0) {
    items.push({
      id: "storyboard_render_ratio",
      stage: "storyboard",
      stageLabel: "分镜冲印度",
      ruleName: "分镜画面显影覆盖率",
      status: unrenderedShots.length === shots.length ? "fail" : "warn",
      detail: `尚有 ${unrenderedShots.length}/${shots.length} 个镜头处于待显影状态。`,
      suggestion: "可点击分镜工坊顶部「冲印全部镜头」进行批量加速渲染。",
      jumpTarget: "storyboard",
    });
  }

  // Calculate score (pass = 100%, warn = -10%, fail = -25%)
  const total = items.length || 1;
  const fails = items.filter((i) => i.status === "fail").length;
  const warns = items.filter((i) => i.status === "warn").length;
  const score = Math.max(0, Math.min(100, Math.round(100 - (fails * 25 + warns * 10))));

  return { diagnostics: items, score };
}
