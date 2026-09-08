import type { CharacterModel, ShotModel } from "@/types/shot";

/** Dialogue attribution is distinct from who appears in the image. */
export function resolveDialogueSpeaker(shot: Pick<ShotModel, "dialogue">, characters: CharacterModel[] = []) {
  const dialogue = (shot.dialogue || "").trim();
  // Accept explicit screenplay labels, including performance directions. Never infer
  // speech from subject/action or the order of character_ids (which describe cast).
  const labels = Array.from(dialogue.matchAll(/(?:^|\n)\s*([^\n：:“”"「」]{1,40}?)\s*[：:]/g))
    .map((match) => match[1].replace(/\s*[（(][^）)]*[）)]\s*$/, "").trim());
  const unique = Array.from(new Set(labels));
  if (unique.length !== 1) return { speakerName: "待确认说话者", voiceDna: "待确认音色", status: "unresolved" as const };
  const name = unique[0];
  const narrator = /^(旁白|画外音|narrator|voice[- ]?over)$/i.test(name);
  const character = characters.find((c) => c.name.trim() === name);
  return {
    speakerName: narrator ? "旁白" : name,
    voiceDna: character?.voice_dna || character?.voiceDna || "待确认音色",
    status: narrator || character ? "resolved" as const : "unresolved" as const,
  };
}

export function buildVoiceAlignmentRows(shots: ShotModel[], characters: CharacterModel[]) {
  return shots.filter((shot) => shot.dialogue?.trim()).map((shot, index) => ({
    index: index + 1,
    shotId: shot.id,
    shotOrder: shot.order,
    ...resolveDialogueSpeaker(shot, characters),
    dialogue: shot.dialogue || "",
    emotion: shot.dialogue_emotion || shot.emotion || "正常叙事",
    duration: shot.duration || 2.5,
    durationBasis: "planned_shot" as const,
  }));
}

export function voiceAlignmentCsv(rows: ReturnType<typeof buildVoiceAlignmentRows>) {
  const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
  return [
    ["序号", "镜头ID", "镜头号", "说话角色", "声音特征/音色Prompt", "台词文本", "情感语气", "计划镜头时长(秒)", "说话者状态"],
    ...rows.map((d) => [d.index, d.shotId, d.shotOrder, d.speakerName, d.voiceDna, d.dialogue, d.emotion, d.duration, d.status]),
  ].map((row) => row.map(quote).join(",")).join("\n");
}
