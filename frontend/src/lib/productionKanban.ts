import { resolveDialogueSpeaker } from "@/lib/dialogueSpeaker";

export interface ProductionShotIdentity {
  shot_id: string;
  sequence_id?: string;
  episode_number?: number;
  episode_title?: string;
  order: number;
  duration: number;
  dialogue?: string;
}

export function compareProductionShots(a: ProductionShotIdentity, b: ProductionShotIdentity): number {
  return (a.episode_number || 1) - (b.episode_number || 1) || a.order - b.order;
}

export function productionShotLabel(shot: ProductionShotIdentity): string {
  return `EP ${String(shot.episode_number || 1).padStart(2, "0")} · SHOT ${String(shot.order).padStart(2, "0")}`;
}

export function productionMediaFileBase(shot: ProductionShotIdentity): string {
  return `ep_${String(shot.episode_number || 1).padStart(2, "0")}_shot_${String(shot.order).padStart(2, "0")}`;
}

export function estimateVideoGeneration(duration: number, ratePerSecond = 0.5) {
  const billableDuration = Math.min(Math.max(Math.round(duration || 5), 4), 15);
  return {
    billableDuration,
    estimatedCost: Math.round(billableDuration * ratePerSecond * 100) / 100,
  };
}

export function deriveDialogueLineFromShot(shot: ProductionShotIdentity) {
  const dialogue = (shot.dialogue || "").trim();
  if (!dialogue) return null;
  const attribution = resolveDialogueSpeaker({ dialogue }, []);
  return {
    id: null,
    shotId: shot.shot_id,
    speaker: attribution.speakerName,
    text: dialogue,
    performance: "",
    actualDuration: 0,
    plannedDuration: shot.duration || 0,
    orderIndex: 0,
    derivedFromShot: true,
  };
}
