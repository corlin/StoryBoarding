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

export function estimateVideoGeneration(duration: number, model = "MiniMax-Hailuo-02") {
  let billableDuration: number;
  if (model === "MiniMax-H3") billableDuration = Math.max(4, Math.min(15, Math.ceil(duration || 4)));
  else if (model === "MiniMax-H3-Max") billableDuration = Math.max(5, Math.min(15, Math.ceil(duration || 5)));
  else if (model === "dreamina-seedance-2-5-260628") billableDuration = Math.max(4, Math.min(30, Math.ceil(duration || 4)));
  else if (model.startsWith("dreamina-seedance-")) billableDuration = Math.max(4, Math.min(15, Math.ceil(duration || 4)));
  else billableDuration = duration > 6 ? 10 : 6;
  return {
    billableDuration,
  };
}

export function planVideoGeneration(aspectRatio: string, hasFirstFrame: boolean, duration: number, model = "MiniMax-Hailuo-02") {
  const { billableDuration } = estimateVideoGeneration(duration, model);
  const generationMode = hasFirstFrame ? "image_to_video" : "text_to_video";
  const isLegacyHailuo = model.startsWith("MiniMax-Hailuo-");
  return {
    billableDuration,
    generationMode,
    usesFirstFrameAspectConstraint: hasFirstFrame,
    requiresLandscapeFallbackConfirmation: isLegacyHailuo && aspectRatio === "9:16" && !hasFirstFrame,
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
    isVoiceover: attribution.speakerName === "旁白",
    language: "zh-CN",
    voiceConsentStatus: "unverified",
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
  audioStrategy: "native_av" | "reference_audio_av" | "post_dub" | "performance_lipsync" | "silent_broll";
  lipSyncStatus: "not_applicable" | "required" | "pending" | "verified" | "failed";
  preserveSourceAudio: boolean;
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

function metadata(value: any): Record<string, any> {
  const raw = value?.metadata;
  if (raw && typeof raw === "object") return raw;
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
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

  if (requiredVisualKind === "video") {
    const unresolvedLipSync = orderedShots.filter((shot) => {
      if (!String(shot.dialogue || "").trim()) return false;
      const adoptedId = field<string>(shot, "adopted_take_id", "adoptedTakeId");
      const visual = takes.find((take) => take.id === adoptedId);
      const visualMetadata = metadata(visual);
      const status = field<string>(shot, "lip_sync_status", "lipSyncStatus") || visualMetadata.lip_sync_status || "required";
      return status !== "verified" && status !== "not_applicable";
    });
    if (unresolvedLipSync.length) {
      const labels = unresolvedLipSync.slice(0, 5).map(productionShotLabel).join("、");
      throw new Error(`${unresolvedLipSync.length} 个对白镜头尚未通过口型验收（${labels}），请完成口型重定向或人工确认`);
    }
  }

  let timeline = 0;
  const subtitles: PreviewSubtitleCue[] = [];
  const clips = orderedShots.map((shot) => {
    const shotId = field<string>(shot, "shot_id", "shotId") || shot.id;
    const adoptedId = field<string>(shot, "adopted_take_id", "adoptedTakeId")!;
    const visual = takes.find((take) => take.id === adoptedId)!;
    const visualMetadata = metadata(visual);
    const audioStrategy = (field<string>(shot, "audio_strategy", "audioStrategy") || visualMetadata.audio_strategy || "post_dub") as PreviewAssemblyClip["audioStrategy"];
    const lipSyncStatus = (field<string>(shot, "lip_sync_status", "lipSyncStatus") || visualMetadata.lip_sync_status || "not_applicable") as PreviewAssemblyClip["lipSyncStatus"];
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
    const generatedJointAudio = visualMetadata.native_audio === true &&
      (audioStrategy === "native_av" || audioStrategy === "reference_audio_av" || audioStrategy === "performance_lipsync");
    if (generatedJointAudio || audioStrategy === "silent_broll") {
      audioTakeIds.splice(0);
      audioUrls.splice(0);
    }
    const preserveSourceAudio = generatedJointAudio && audioUrls.length === 0;
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
      audioStrategy,
      lipSyncStatus,
      preserveSourceAudio,
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

export function buildPreviewClipCommands(clip: Pick<PreviewAssemblyClip, "duration" | "visualKind" | "audioUrls"> & Partial<Pick<PreviewAssemblyClip, "preserveSourceAudio">>, index: number, aspectRatio: string) {
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
    "-i", visualInput, "-vf", filter, "-t", duration,
    ...(clip.preserveSourceAudio ? ["-map", "0:v:0", "-map", "0:a:0", "-ar", "48000", "-ac", "2", "-c:a", "aac"] : ["-an"]),
    "-c:v", "libx264", "-preset", "ultrafast", "-movflags", "+faststart", silentVideo,
  ];
  const audioInputs = clip.audioUrls.flatMap((_, audioIndex) => ["-i", `audio_${key}_${audioIndex}.input`]);
  const audioLabels = clip.audioUrls.map((_, audioIndex) => `[${audioIndex}:a]`).join("");
  const audio = clip.audioUrls.length
    ? [...audioInputs, "-filter_complex", `${audioLabels}concat=n=${clip.audioUrls.length}:v=0:a=1[a];[a]apad,atrim=duration=${duration}[aout]`, "-map", "[aout]", "-ar", "48000", "-ac", "2", "-c:a", "aac", audioOutput]
    : [];
  const mux = clip.audioUrls.length
    ? ["-i", silentVideo, "-i", audioOutput, "-c:v", "copy", "-c:a", "copy", "-t", duration, output]
    : clip.preserveSourceAudio
      ? ["-i", silentVideo, "-c", "copy", "-t", duration, output]
    : ["-i", silentVideo, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-c:v", "copy", "-c:a", "aac", "-t", duration, output];
  return { key, visualInput, silentVideo, audioOutput, output, visual, audio, mux };
}
