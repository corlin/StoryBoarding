/**
 * MiniMax Hailuo H3 Prompt & Multi-Modal Alignment Engine
 * Aligned with /Users/corlin/2026/shuohao-skills/skills/novel-storyboard
 */

export interface H3CutItem {
  id: string;
  order: number;
  seconds: number;
  shotSize?: string;
  cameraMovement?: string;
  action: string;
  dialogue?: string;
  dialogueEmotion?: string;
  speakerName?: string;
  characters?: string[];
  props?: string[];
  beatsRange?: [number, number];
}

export const H3_TOKENS = {
  zh: {
    i2va: "目标视频在 0.00 秒处完全参照图 1（来自镜头 1）。",
    alignHead: "参考图与目标视频的对齐——",
    alignItem: (k: number, t: string) => `图 ${k}（来自镜头 ${k}）对齐目标视频 ${t} 秒处`,
    alignTail: "。",
    fields: ["整体视听描述：", "整体音景：", "非叙事配乐："],
    shot: (k: number) => `[镜头 ${k}]`,
    cutMark: (k: number, time: string) => `[镜头 ${k}] 于 ${time}，`,
  },
  en: {
    i2va: "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.",
    alignHead: "How the reference pictures align with the target video — ",
    alignItem: (k: number, t: string) => `Picture ${k} (from Shot ${k}) aligns with the ${t}-second mark of the target video`,
    alignTail: ".",
    fields: ["integrated_multimodal_description:", "overall_soundscape:", "non_diegetic_music:"],
    shot: (k: number) => `[Shot ${k}]`,
    cutMark: (k: number, time: string) => `[Shot ${k}] At ${time},`,
  },
};

export function cutStarts(cuts: { seconds: number }[]): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const c of cuts) {
    starts.push(Math.round(t * 10) / 10);
    t += c?.seconds || 0;
  }
  return starts;
}

export function h3CutTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.round((t - Math.floor(t)) * 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function h3AlignmentLine(cuts: { seconds: number }[], lang: "en" | "zh" = "en"): string {
  const tk = H3_TOKENS[lang] || H3_TOKENS.en;
  if (!cuts || cuts.length <= 1) return tk.i2va;
  const starts = cutStarts(cuts);
  const parts = cuts.map((_, i) => tk.alignItem(i + 1, starts[i].toFixed(2)));
  return `${tk.alignHead}${parts.join(lang === "en" ? "; " : "；")}${tk.alignTail}`;
}

export function generateH3Prompt(
  cuts: H3CutItem[],
  options: {
    lang?: "en" | "zh";
    style?: string;
    soundscape?: string;
    music?: string;
  } = {}
): string {
  const lang = options.lang || "en";
  const tk = H3_TOKENS[lang] || H3_TOKENS.en;
  const starts = cutStarts(cuts);

  // 1. Header Alignment Line
  const header = h3AlignmentLine(cuts, lang);

  // 2. Integrated Multimodal Description
  const descriptionLines: string[] = [];
  cuts.forEach((c, idx) => {
    const k = idx + 1;
    const isFirst = idx === 0;
    const timeStr = h3CutTime(starts[idx]);

    let cutPrefix = "";
    if (isFirst) {
      cutPrefix = lang === "en" ? `[Shot 1] Cinematic, live-action, cold gray-green palette.` : `[镜头 1] 电影质感，实拍风格。`;
    } else {
      cutPrefix = lang === "en" ? `[Shot ${k}] At ${timeStr}, the camera cuts to <Picture ${k}>:` : `[镜头 ${k}] 于 ${timeStr}，镜头切至<图 ${k}>：`;
    }

    // Camera move mapping
    const cam = c.cameraMovement || "Static Shot";
    const camStr = lang === "en" ? `The camera executes a ${cam}.` : `摄影机执行 ${cam} 调度。`;

    // Action narrative
    const actStr = c.action || (lang === "en" ? "Subject performs dramatic movement." : "主体展开剧情动作调度。");

    // Dialogue format: preserve Chinese in <d>[Chinese] ... </d>
    let dialStr = "";
    if (c.dialogue && c.dialogue.trim().length > 0) {
      const cleanDialogue = c.dialogue.trim();
      const speaker = c.speakerName || (lang === "en" ? "the character" : "角色");
      const emotion = c.dialogueEmotion ? ` (${c.dialogueEmotion})` : "";
      if (lang === "en") {
        dialStr = ` ${speaker}${emotion} speaks: <d>[Chinese] ${cleanDialogue}</d>`;
      } else {
        dialStr = ` ${speaker}${emotion} 说道：<d>[Chinese] ${cleanDialogue}</d>`;
      }
    }

    descriptionLines.push(`${cutPrefix} ${actStr} ${camStr}${dialStr}`.trim());
  });

  // 3. Overall soundscape
  const defaultSound =
    options.soundscape ||
    (lang === "en"
      ? "Environmental ambiance, soft footsteps, atmospheric presence with natural diegetic texture."
      : "自然环境声场、沉稳脚步声与空间混响。");

  // 4. Non-diegetic music
  const defaultMusic =
    options.music ||
    (lang === "en"
      ? "Subtle low-register ambient score with restrained dramatic tension."
      : "低沉压抑的环境背景弦乐，烘托悬念张力。");

  return [
    header,
    "",
    tk.fields[0],
    descriptionLines.join("\n"),
    "",
    `${tk.fields[1]} ${defaultSound}`,
    "",
    `${tk.fields[2]} ${defaultMusic}`,
  ].join("\n");
}
