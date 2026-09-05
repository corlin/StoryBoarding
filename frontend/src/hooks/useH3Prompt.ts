import { useMemo, useCallback } from "react";
import { ShotModel } from "@/types/shot";
import { H3CutItem, generateH3Prompt } from "@/lib/h3Prompt";

/**
 * 将 ShotModel 映射为 MiniMax H3 规范的切片对象
 */
export function buildH3CutItem(shot: ShotModel, order: number = 1): H3CutItem {
  const movType = typeof shot.camera_movement === "object"
    ? (shot.camera_movement as any)?.type
    : shot.camera_movement;

  return {
    id: shot.id,
    order,
    seconds: Number(shot.duration) || 2.5,
    shotSize: shot.shot_size,
    cameraMovement: movType,
    action: shot.action || "",
    dialogue: shot.dialogue || "",
    dialogueEmotion: shot.dialogue_emotion,
    speakerName: shot.subject,
    beatsRange: shot.beats_range,
  };
}

/**
 * 批量将多个分镜统一转换为标准 H3 连贯提示词
 */
export function buildBatchH3(
  shots: ShotModel[],
  options?: { lang?: "en" | "zh"; style?: string; soundscape?: string; music?: string }
): string {
  if (!shots || shots.length === 0) return "";
  const h3Cuts = shots.map((s, idx) => buildH3CutItem(s, idx + 1));
  return generateH3Prompt(h3Cuts, options);
}

/**
 * 单个分镜的 H3 提示词管理 Hook
 */
export function useH3Prompt(
  shot: ShotModel | null,
  options: { lang?: "en" | "zh"; style?: string; soundscape?: string; music?: string } = { lang: "en" }
) {
  const compile = useCallback(
    (langOverride?: "en" | "zh") => {
      if (!shot) return "";
      const cut = buildH3CutItem(shot, 1);
      return generateH3Prompt([cut], { ...options, lang: langOverride || options.lang || "en" });
    },
    [shot, options]
  );

  const initialPrompt = useMemo(() => {
    if (!shot) return "";
    return shot.h3_prompt || compile();
  }, [shot, compile]);

  return {
    compile,
    prompt: initialPrompt,
  };
}
