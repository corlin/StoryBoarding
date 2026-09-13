export type VideoProviderProtocol = "minimax_v1" | "minimax_v2" | "byteplus_las";
export type AudioStrategy =
  | "native_av"
  | "reference_audio_av"
  | "post_dub"
  | "performance_lipsync"
  | "silent_broll";

export type LipSyncStatus = "not_applicable" | "required" | "pending" | "verified" | "failed";

export const AUDIO_STRATEGIES: AudioStrategy[] = ["native_av", "reference_audio_av", "post_dub", "performance_lipsync", "silent_broll"];
export const LIP_SYNC_STATUSES: LipSyncStatus[] = ["not_applicable", "required", "pending", "verified", "failed"];

export interface VideoModelCapability {
  provider: "minimax" | "byteplus";
  nativeAudio: boolean;
  audioReference: boolean;
  audioOnlyReference: boolean;
  voiceReference: boolean;
  maxAudioRefs: number;
  minDuration: number;
  maxDuration: number;
  resolutions: string[];
  outputAudioSampleRate?: number;
  dialogueLanguages: string[];
  supportsLipSyncEdit: boolean;
}

export const VIDEO_MODEL_CAPABILITIES: Record<string, VideoModelCapability> = {
  "MiniMax-H3": {
    provider: "minimax",
    nativeAudio: true,
    audioReference: true,
    audioOnlyReference: true,
    voiceReference: true,
    maxAudioRefs: 3,
    minDuration: 4,
    maxDuration: 15,
    resolutions: ["768P", "2K"],
    outputAudioSampleRate: 32000,
    dialogueLanguages: ["zh", "en", "ja", "ko", "es", "fr", "de", "it", "pt", "ru", "ar"],
    supportsLipSyncEdit: false,
  },
  "MiniMax-H3-Max": {
    provider: "minimax",
    nativeAudio: true,
    audioReference: false,
    audioOnlyReference: false,
    voiceReference: false,
    maxAudioRefs: 0,
    minDuration: 5,
    maxDuration: 15,
    resolutions: ["480P", "768P"],
    outputAudioSampleRate: 32000,
    dialogueLanguages: ["zh", "en", "ja", "ko", "es", "fr", "de", "it", "pt", "ru", "ar"],
    supportsLipSyncEdit: false,
  },
  "MiniMax-Hailuo-2.3": {
    provider: "minimax",
    nativeAudio: false,
    audioReference: false,
    audioOnlyReference: false,
    voiceReference: false,
    maxAudioRefs: 0,
    minDuration: 6,
    maxDuration: 10,
    resolutions: ["768P", "1080P"],
    dialogueLanguages: [],
    supportsLipSyncEdit: false,
  },
  "MiniMax-Hailuo-02": {
    provider: "minimax",
    nativeAudio: false,
    audioReference: false,
    audioOnlyReference: false,
    voiceReference: false,
    maxAudioRefs: 0,
    minDuration: 6,
    maxDuration: 10,
    resolutions: ["512P", "768P", "1080P"],
    dialogueLanguages: [],
    supportsLipSyncEdit: false,
  },
  "dreamina-seedance-2-5-260628": {
    provider: "byteplus",
    nativeAudio: true,
    audioReference: true,
    audioOnlyReference: true,
    voiceReference: true,
    maxAudioRefs: 10,
    minDuration: 4,
    maxDuration: 30,
    resolutions: ["480p", "720p"],
    dialogueLanguages: ["multi"],
    supportsLipSyncEdit: true,
  },
  "dreamina-seedance-2-0-260128": {
    provider: "byteplus",
    nativeAudio: true,
    audioReference: true,
    audioOnlyReference: false,
    voiceReference: true,
    maxAudioRefs: 3,
    minDuration: 4,
    maxDuration: 15,
    resolutions: ["480p", "720p", "1080p", "4k"],
    dialogueLanguages: ["multi"],
    supportsLipSyncEdit: false,
  },
};

export interface ResolvedVideoProviderConfig {
  provider: "minimax" | "byteplus";
  protocol: VideoProviderProtocol;
  model: string;
  baseUrl: string;
  submitUrl: string;
  queryUrl: (taskId: string) => string;
  capability: VideoModelCapability;
}

function stripApiVersion(value: string) {
  return value.trim().replace(/\/+$/, "").replace(/\/api\/v1$/i, "").replace(/\/v[12]$/i, "");
}

function normalizeMiniMaxOrigin(apiBase: string) {
  return stripApiVersion(apiBase || "https://api.minimax.cn");
}

export function resolveVideoProviderConfig(provider: string, apiBase: string, model: string): ResolvedVideoProviderConfig {
  const resolvedProvider = provider === "byteplus" || model.startsWith("dreamina-seedance-") ? "byteplus" : "minimax";
  const fallbackModel = resolvedProvider === "byteplus" ? "dreamina-seedance-2-5-260628" : "MiniMax-H3";
  const requestedModel = model || fallbackModel;
  const resolvedModel = requestedModel === "video-01-h3" ? "MiniMax-H3" : requestedModel;
  const capability = VIDEO_MODEL_CAPABILITIES[resolvedModel];
  if (!capability) throw new Error(`不支持的视频模型：${resolvedModel}`);
  if (capability.provider !== resolvedProvider) {
    throw new Error(`视频供应商 ${resolvedProvider} 与模型 ${resolvedModel} 不匹配`);
  }

  if (resolvedProvider === "byteplus") {
    const rawBaseUrl = (apiBase || "https://operator.las.ap-southeast-1.bytepluses.com")
      .trim().replace(/\/+$/, "").replace(/\/contents\/generations\/tasks$/i, "");
    const baseUrl = /\/api\/v1$/i.test(rawBaseUrl) ? rawBaseUrl : `${rawBaseUrl}/api/v1`;
    const submitUrl = `${baseUrl}/contents/generations/tasks`;
    return {
      provider: resolvedProvider,
      protocol: "byteplus_las",
      model: resolvedModel,
      baseUrl,
      submitUrl,
      queryUrl: (taskId) => `${submitUrl}/${encodeURIComponent(taskId)}`,
      capability,
    };
  }

  const baseUrl = normalizeMiniMaxOrigin(apiBase);
  const protocol: VideoProviderProtocol = resolvedModel.startsWith("MiniMax-H3") ? "minimax_v2" : "minimax_v1";
  return {
    provider: resolvedProvider,
    protocol,
    model: resolvedModel,
    baseUrl,
    submitUrl: `${baseUrl}/${protocol === "minimax_v2" ? "v2" : "v1"}/video_generation`,
    queryUrl: protocol === "minimax_v2"
      ? (taskId) => `${baseUrl}/v2/query/video_generation/${encodeURIComponent(taskId)}`
      : (taskId) => `${baseUrl}/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`,
    capability,
  };
}

export function recommendedAudioStrategy(dialogue: string, isVoiceover = false): AudioStrategy {
  const text = (dialogue || "").trim();
  if (!text) return "native_av";
  if (isVoiceover || /^(旁白|画外音|内心|narrator)\s*[：:]/i.test(text)) return "post_dub";
  return "reference_audio_av";
}

export function lipSyncStatusForStrategy(strategy: AudioStrategy, dialogue: string, isVoiceover = false): LipSyncStatus {
  if (!(dialogue || "").trim() || isVoiceover || strategy === "silent_broll") return "not_applicable";
  if (strategy === "post_dub") return "required";
  return "pending";
}

export function recommendedShotAudioWorkflow(dialogue: string, isVoiceover = false) {
  const inferredVoiceover = isVoiceover || /^(旁白|画外音|内心|narrator)\s*[：:]/i.test((dialogue || "").trim());
  const audioStrategy = recommendedAudioStrategy(dialogue, inferredVoiceover);
  return {
    audioStrategy,
    lipSyncStatus: lipSyncStatusForStrategy(audioStrategy, dialogue, inferredVoiceover),
  };
}

export interface VideoGenerationInput {
  prompt: string;
  aspectRatio: "9:16" | "16:9" | string;
  duration: number;
  firstFrameImage: string;
  audioStrategy: AudioStrategy;
  referenceAudioUrls: string[];
  referenceAudioDurations?: number[];
  referenceAudioSizes?: number[];
  referenceAudioMimeTypes?: string[];
}

export function buildVideoProviderRequest(config: ResolvedVideoProviderConfig, input: VideoGenerationInput) {
  const duration = Math.max(config.capability.minDuration, Math.min(config.capability.maxDuration, Math.ceil(input.duration || config.capability.minDuration)));
  const availableReferenceAudioUrls = input.referenceAudioUrls.filter(Boolean);
  const requiresAudioReference = input.audioStrategy === "reference_audio_av" || input.audioStrategy === "performance_lipsync";
  if (input.audioStrategy === "native_av" && !config.capability.nativeAudio) {
    throw new Error(`${config.model} 不生成原生音轨，请选择后期配音或无对白 B-roll 策略`);
  }
  if (input.audioStrategy === "performance_lipsync" && !config.capability.supportsLipSyncEdit) {
    throw new Error(`${config.model} 不支持口型专项处理，请改用参考音频联合生成或支持口型编辑的模型`);
  }
  if (requiresAudioReference && availableReferenceAudioUrls.length > config.capability.maxAudioRefs) {
    throw new Error(`${config.model} 最多接受 ${config.capability.maxAudioRefs} 条参考音频，请先合并对白或拆分镜头`);
  }
  const referenceAudioUrls = availableReferenceAudioUrls.slice(0, config.capability.maxAudioRefs);
  if (requiresAudioReference && !config.capability.audioReference) {
    throw new Error(`${config.model} 不支持参考音频，请选择原生音视频或后期配音策略`);
  }
  if (requiresAudioReference && referenceAudioUrls.length === 0) {
    throw new Error("参考音频驱动需要先生成并采用至少一条对白音频");
  }
  if (requiresAudioReference && !input.firstFrameImage && !config.capability.audioOnlyReference) {
    throw new Error(`${config.model} 的参考音频不能单独输入，请同时提供参考图像或改用支持纯音频参考的模型`);
  }
  if (requiresAudioReference) {
    const durations = input.referenceAudioDurations || [];
    const sizes = input.referenceAudioSizes || [];
    const mimeTypes = input.referenceAudioMimeTypes || [];
    if (durations.length !== referenceAudioUrls.length || durations.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error("参考音频缺少可验证的时长，请先完成音频分析或重新生成");
    }
    if (sizes.length !== referenceAudioUrls.length || sizes.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error("参考音频缺少可验证的文件大小，请重新上传或生成");
    }
    if (mimeTypes.length !== referenceAudioUrls.length || mimeTypes.some((value) => !value)) {
      throw new Error("参考音频缺少可验证的 WAV/MP3 格式信息，请重新上传或生成");
    }
    const invalidDuration = durations.find((value) => value < 2 || value > config.capability.maxDuration);
    if (invalidDuration !== undefined) {
      throw new Error(`${config.model} 的单条参考音频须为 2–${config.capability.maxDuration} 秒`);
    }
    const totalDuration = durations.reduce((sum, value) => sum + value, 0);
    if (totalDuration > config.capability.maxDuration) {
      throw new Error(`${config.model} 的参考音频总时长不能超过 ${config.capability.maxDuration} 秒`);
    }
    if (sizes.some((value) => value > 15 * 1024 * 1024)) {
      throw new Error(`${config.model} 的单条参考音频不能超过 15 MB`);
    }
    if (mimeTypes.some((value) => !/^audio\/(mpeg|mp3|wav|x-wav)$/i.test(value))) {
      throw new Error(`${config.model} 的参考音频仅支持 WAV 或 MP3`);
    }
  }

  if (config.protocol === "minimax_v1") {
    const legacyDuration = duration > 6 ? 10 : 6;
    const body: Record<string, any> = {
      model: config.model,
      prompt: input.prompt.substring(0, 2000),
      resolution: "768P",
      duration: legacyDuration,
    };
    if (input.firstFrameImage) body.first_frame_image = input.firstFrameImage;
    return { url: config.submitUrl, body, duration: legacyDuration, generationMode: input.firstFrameImage ? "image_to_video" : "text_to_video" };
  }

  const content: Array<Record<string, any>> = [{ type: "text", text: input.prompt.substring(0, 7000) }];
  const usesReferences = requiresAudioReference && referenceAudioUrls.length > 0;
  if (input.firstFrameImage) {
    content.push({
      type: "image_url",
      image_url: { url: input.firstFrameImage },
      role: usesReferences ? "reference_image" : "first_frame",
    });
  }
  for (const url of usesReferences ? referenceAudioUrls : []) {
    content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" });
  }

  if (config.protocol === "minimax_v2") {
    return {
      url: config.submitUrl,
      body: {
        model: config.model,
        content,
        resolution: "768P",
        duration,
        ratio: usesReferences || !input.firstFrameImage ? input.aspectRatio : "adaptive",
      },
      duration,
      generationMode: usesReferences ? "reference_to_video" : input.firstFrameImage ? "image_to_video" : "text_to_video",
    };
  }

  return {
    url: config.submitUrl,
    body: {
      model: config.model,
      content,
      generate_audio: input.audioStrategy !== "post_dub" && input.audioStrategy !== "silent_broll",
      resolution: "720p",
      duration,
      ratio: input.aspectRatio,
      watermark: false,
    },
    duration,
    generationMode: usesReferences ? "reference_to_video" : input.firstFrameImage ? "image_to_video" : "text_to_video",
  };
}

function normalizeStatus(status: string) {
  if (["Success", "success", "succeeded", "completed", "done"].includes(status)) return "succeeded";
  if (["Fail", "failed", "error", "expired"].includes(status)) return "failed";
  if (["Cancelled", "cancelled"].includes(status)) return "cancelled";
  if (["Queueing", "Preparing", "Processing", "queued", "running", "processing", "submitted"].includes(status)) return "processing";
  return status || "processing";
}

export function parseVideoProviderPoll(config: ResolvedVideoProviderConfig, payload: any) {
  const task = payload?.task || payload?.data || payload || {};
  const rawStatus = task?.status || "";
  const content = task?.content || task?.output || {};
  return {
    status: normalizeStatus(rawStatus),
    videoUrl: content?.url || content?.video_url || task?.video_url || "",
    fileId: task?.file_id || "",
    error: task?.error_message || task?.base_resp?.status_msg || task?.error?.message || payload?.error?.message ||
      (rawStatus === "expired" ? "供应商任务已过期" : ""),
    duration: Number(task?.duration || 0),
    resolution: task?.resolution || "",
    ratio: task?.ratio || "",
    rawStatus,
  };
}
