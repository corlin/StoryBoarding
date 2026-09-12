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

export interface ProductionTtsConfig {
  model: string;
  voiceFemale: string;
  voiceMale: string;
  voiceNarrator: string;
}

export interface ProductionTtsVoiceOption {
  value: string;
  label: string;
}

export function configuredTtsVoiceOptions(config: ProductionTtsConfig): ProductionTtsVoiceOption[] {
  const candidates = [
    { value: config.voiceFemale.trim(), label: "设置默认女声" },
    { value: config.voiceMale.trim(), label: "设置默认男声" },
    { value: config.voiceNarrator.trim(), label: "设置默认旁白" },
  ];
  const seen = new Set<string>();
  return candidates.filter(({ value }) => value && !seen.has(value) && seen.add(value));
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

export function estimateVideoGeneration(duration: number) {
  const billableDuration = duration > 6 ? 10 : 6;
  return {
    billableDuration,
  };
}

export function planVideoGeneration(aspectRatio: string, hasFirstFrame: boolean, duration: number) {
  const { billableDuration } = estimateVideoGeneration(duration);
  const generationMode = hasFirstFrame ? "image_to_video" : "text_to_video";
  return {
    billableDuration,
    generationMode,
    usesFirstFrameAspectConstraint: hasFirstFrame,
    requiresLandscapeFallbackConfirmation: aspectRatio === "9:16" && !hasFirstFrame,
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

export interface PreviewAssemblyClip {
  shotId: string;
  sequenceId: string;
  episodeNumber: number;
  order: number;
  duration: number;
  visualTakeId: string;
  visualUrl: string;
  visualKind: "video" | "image";
  audioTakeIds: string[];
  audioUrls: string[];
}

export interface PreviewSubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface PreviewAssemblyPlan {
  clips: PreviewAssemblyClip[];
  subtitles: PreviewSubtitleCue[];
  totalDuration: number;
}

function field<T = any>(value: any, snake: string, camel: string): T | undefined {
  return value?.[snake] ?? value?.[camel];
}

function buildAssemblyPlan(
  shots: any[],
  takes: any[],
  dialogueLines: any[],
  requiredVisualKind?: "video",
): PreviewAssemblyPlan {
  const orderedShots = [...shots].sort(compareProductionShots);
  const missing = orderedShots.filter((shot) => {
    const adoptedId = field<string>(shot, "adopted_take_id", "adoptedTakeId");
    return !takes.some((take) => {
      const takeType = field(take, "take_type", "takeType");
      return take.id === adoptedId &&
        takeType !== "audio" &&
        (!requiredVisualKind || takeType === requiredVisualKind) &&
        (!requiredVisualKind || Boolean(field(take, "is_adopted", "isAdopted"))) &&
        field(take, "media_url", "mediaUrl");
    });
  });
  if (missing.length) {
    const missingLabels = missing.slice(0, 5).map(productionShotLabel).join("、");
    if (requiredVisualKind === "video") {
      throw new Error(`${missing.length} 个镜头缺少已采用视频片段（${missingLabels}），请先生成并采用视频`);
    }
    throw new Error(`${missing.length} 个镜头缺少已采用画面（${missingLabels}），暂不能合成预演片`);
  }

  let timeline = 0;
  const subtitles: PreviewSubtitleCue[] = [];
  const clips = orderedShots.map((shot) => {
    const shotId = field<string>(shot, "shot_id", "shotId") || shot.id;
    const adoptedId = field<string>(shot, "adopted_take_id", "adoptedTakeId")!;
    const visual = takes.find((take) => take.id === adoptedId)!;
    const duration = Math.max(
      requiredVisualKind === "video"
        ? Number(visual.duration) || Number(shot.duration) || 2
        : Number(shot.duration) || Number(visual.duration) || 2,
      0.1,
    );
    const lines = dialogueLines
      .filter((line) => field(line, "shot_id", "shotId") === shotId)
      .sort((a, b) => Number(field(a, "order_index", "orderIndex") || 0) - Number(field(b, "order_index", "orderIndex") || 0));
    const audioTakeIds: string[] = [];
    const audioUrls: string[] = [];
    let lineOffset = 0;
    for (const line of lines) {
      const audioVersion = field<string>(line, "audio_version", "audioVersion");
      const audio = takes.find((take) => take.id === audioVersion && field(take, "take_type", "takeType") === "audio" && field(take, "media_url", "mediaUrl"));
      if (audio) {
        audioTakeIds.push(audio.id);
        audioUrls.push(field<string>(audio, "media_url", "mediaUrl")!);
      }
      const text = String(line.text || "").trim();
      if (text) {
        const cueDuration = Math.max(Number(field(line, "actual_duration", "actualDuration")) || Number(field(line, "planned_duration", "plannedDuration")) || duration, 0.1);
        const cueStart = timeline + lineOffset;
        const cueEnd = Math.min(timeline + duration, cueStart + cueDuration);
        if (cueEnd > cueStart) subtitles.push({ start: cueStart, end: cueEnd, text: `${line.speaker ? `${line.speaker}：` : ""}${text}` });
        lineOffset += cueDuration;
      }
    }
    if (!lines.length && String(shot.dialogue || "").trim()) {
      subtitles.push({ start: timeline, end: timeline + duration, text: String(shot.dialogue).trim() });
    }
    if (!audioUrls.length) {
      for (const take of takes) {
        if (
          field(take, "shot_id", "shotId") === shotId &&
          field(take, "take_type", "takeType") === "audio" &&
          Boolean(field(take, "is_adopted", "isAdopted")) &&
          field(take, "media_url", "mediaUrl")
        ) {
          audioTakeIds.push(take.id);
          audioUrls.push(field<string>(take, "media_url", "mediaUrl")!);
        }
      }
    }
    const clip: PreviewAssemblyClip = {
      shotId,
      sequenceId: field<string>(shot, "sequence_id", "sequenceId") || "",
      episodeNumber: Number(field(shot, "episode_number", "episodeNumber")) || 1,
      order: Number(shot.order) || 1,
      duration,
      visualTakeId: visual.id,
      visualUrl: field<string>(visual, "media_url", "mediaUrl")!,
      visualKind: field(visual, "take_type", "takeType") === "video" ? "video" : "image",
      audioTakeIds,
      audioUrls,
    };
    timeline += duration;
    return clip;
  });

  return { clips, subtitles, totalDuration: timeline };
}

export function buildPreviewAssemblyPlan(shots: any[], takes: any[], dialogueLines: any[]): PreviewAssemblyPlan {
  return buildAssemblyPlan(shots, takes, dialogueLines);
}

export function buildVideoAssemblyPlan(shots: any[], takes: any[], dialogueLines: any[]): PreviewAssemblyPlan {
  return buildAssemblyPlan(shots, takes, dialogueLines, "video");
}

function srtTime(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

export function previewSubtitlesToSrt(cues: PreviewSubtitleCue[]): string {
  return cues.map((cue, index) => `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`).join("\n");
}

export function buildPreviewClipCommands(clip: Pick<PreviewAssemblyClip, "duration" | "visualKind" | "audioUrls">, index: number, aspectRatio: string) {
  const key = String(index).padStart(3, "0");
  const visualInput = `visual_${key}.input`;
  const silentVideo = `silent_${key}.mp4`;
  const audioOutput = `audio_${key}.m4a`;
  const output = `clip_${key}.mp4`;
  const [width, height] = aspectRatio === "16:9" ? [1280, 720] : [720, 1280];
  const duration = String(Math.max(clip.duration, 0.1));
  const holdLastFrame = clip.visualKind === "video" ? `,tpad=stop_mode=clone:stop_duration=${duration}` : "";
  const filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black${holdLastFrame},fps=24,format=yuv420p`;
  const visual = [
    ...(clip.visualKind === "image" ? ["-loop", "1"] : []),
    "-i", visualInput, "-vf", filter, "-t", duration, "-an",
    "-c:v", "libx264", "-preset", "ultrafast", "-movflags", "+faststart", silentVideo,
  ];
  const audioInputs = clip.audioUrls.flatMap((_, audioIndex) => ["-i", `audio_${key}_${audioIndex}.input`]);
  const audioLabels = clip.audioUrls.map((_, audioIndex) => `[${audioIndex}:a]`).join("");
  const audio = clip.audioUrls.length
    ? [...audioInputs, "-filter_complex", `${audioLabels}concat=n=${clip.audioUrls.length}:v=0:a=1[a];[a]apad,atrim=duration=${duration}[aout]`, "-map", "[aout]", "-ar", "48000", "-ac", "2", "-c:a", "aac", audioOutput]
    : [];
  const mux = clip.audioUrls.length
    ? ["-i", silentVideo, "-i", audioOutput, "-c:v", "copy", "-c:a", "copy", "-t", duration, output]
    : ["-i", silentVideo, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-c:v", "copy", "-c:a", "aac", "-t", duration, output];
  return { key, visualInput, silentVideo, audioOutput, output, visual, audio, mux };
}
