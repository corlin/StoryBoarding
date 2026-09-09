/**
 * 模型配置统一类型规约 (Model Configuration Specification)
 *
 * 本文件是模型配置页面的单一事实来源 (Single Source of Truth)，
 * 统一定义：Provider 类型、模型配置结构、默认值常量。
 *
 * 命名约定：
 * - 前端内部状态 / 类型：camelCase
 * - 后端 API 传输：snake_case（在 api.ts 层做转换）
 * - 数据库存储 (customSettings)：camelCase
 */

// ============================================================
// Provider 类型定义
// ============================================================

/** LLM / 图像模型支持的 Provider 协议 */
export type LlmProviderType = "openrouter" | "openai_compatible";
export type ImageProviderType = "openrouter" | "openai_compatible";
export type VideoProviderType = "minimax";
export type TtsProviderType = "openrouter";

// ============================================================
// 模型选项 (用于下拉选择)
// ============================================================

export interface ModelOption {
  /** 模型唯一 ID (传给 API 的 model 参数) */
  id: string;
  /** 展示名称 */
  label: string;
  /** 简短描述 / 卖点 */
  description?: string;
  /** 是否为推荐模型 */
  recommended?: boolean;
  /** 是否为默认模型 */
  isDefault?: boolean;
}

// ============================================================
// 单个模型通道配置 (LLM / Image / Video 共用结构)
// ============================================================

export interface ModelChannelConfig {
  /** Provider 协议类型 */
  provider: string;
  /** API Base URL */
  apiBase: string;
  /** API Key (明文仅在内存中，不持久化到前端 state) */
  apiKey: string;
  /** 模型 ID */
  model: string;
  /** 服务端是否已存储加密密钥 */
  hasKey: boolean;
}

// ============================================================
// TTS 专属配置
// ============================================================

export interface TtsConfig {
  /** TTS API Base URL (默认复用 LLM 的 OpenRouter 端点) */
  apiBase: string;
  /** Speech 模型 ID */
  model: string;
  /** 默认女声音色 */
  voiceFemale: string;
  /** 默认男声音色 */
  voiceMale: string;
  /** 默认旁白音色 */
  voiceNarrator: string;
}

// ============================================================
// 完整用户 Provider 配置 (前端内部状态)
// ============================================================

export interface ProviderConfigState {
  llm: ModelChannelConfig;
  image: ModelChannelConfig;
  video: ModelChannelConfig;
  tts: TtsConfig;
  /** 图像是否复用 LLM API Key (OpenRouter 共享密钥场景) */
  syncImageKeyWithLlm: boolean;
}

// ============================================================
// 后端 API 传输格式 (snake_case)
// ============================================================

export interface ProviderConfigApiResponse {
  llm_provider: string;
  has_llm_key: boolean;
  llm_api_key_masked: string;
  llm_api_key: string;
  llm_api_base: string;
  llm_model: string;
  image_provider: string;
  has_image_key: boolean;
  image_api_key_masked: string;
  image_api_key: string;
  image_api_base: string;
  image_model: string;
  video_provider: string;
  has_video_key: boolean;
  video_api_key_masked: string;
  video_api_key: string;
  video_api_base: string;
  video_model: string;
  tts_provider: string;
  tts_uses_llm_key: boolean;
  tts_api_base: string;
  tts_model: string;
  tts_voice_female: string;
  tts_voice_male: string;
  tts_voice_narrator: string;
}

export interface ProviderConfigApiPayload {
  llm_provider: string;
  llm_api_base: string;
  llm_api_key?: string;
  llm_model: string;
  image_provider: string;
  image_api_base: string;
  image_api_key?: string;
  image_model: string;
  video_provider: string;
  video_api_base: string;
  video_api_key?: string;
  video_model: string;
  tts_api_base: string;
  tts_model: string;
  tts_voice_female: string;
  tts_voice_male: string;
  tts_voice_narrator: string;
}

// ============================================================
// 默认值常量 (单一事实来源)
// ============================================================

export const DEFAULT_LLM_CONFIG: Omit<ModelChannelConfig, "apiKey" | "hasKey"> = {
  provider: "openrouter",
  apiBase: "https://openrouter.ai/api/v1",
  model: "deepseek/deepseek-chat",
};

export const DEFAULT_IMAGE_CONFIG: Omit<ModelChannelConfig, "apiKey" | "hasKey"> = {
  provider: "openrouter",
  apiBase: "https://openrouter.ai/api/v1",
  model: "bytedance-seed/seedream-5-0-lite",
};

export const DEFAULT_VIDEO_CONFIG: Omit<ModelChannelConfig, "apiKey" | "hasKey"> = {
  provider: "minimax",
  apiBase: "https://api.minimax.cn/v1",
  model: "MiniMax-Hailuo-02",
};

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  apiBase: "https://openrouter.ai/api/v1",
  model: "hexgrad/kokoro-82m",
  voiceFemale: "zf_xiaoxiao",
  voiceMale: "zm_yunxi",
  voiceNarrator: "zf_xiaobei",
};

/** 默认 Worker Endpoint (官方生产服务) */
export const DEFAULT_WORKER_ENDPOINT = "https://storyboarding-api.caifu.social";

// ============================================================
// 连通性测试状态
// ============================================================

export type TestStatus = "idle" | "testing" | "ok" | "err";

export interface ModelTestResult {
  status: TestStatus;
  message: string;
}

// ============================================================
// 适配器：API 响应 -> 前端状态
// ============================================================

export function apiResponseToState(res: ProviderConfigApiResponse): ProviderConfigState {
  return {
    llm: {
      provider: res.llm_provider || DEFAULT_LLM_CONFIG.provider,
      apiBase: res.llm_api_base || DEFAULT_LLM_CONFIG.apiBase,
      apiKey: "", // 明文严格不回填
      model: res.llm_model || DEFAULT_LLM_CONFIG.model,
      hasKey: Boolean(res.has_llm_key || res.llm_api_key_masked),
    },
    image: {
      provider: res.image_provider || DEFAULT_IMAGE_CONFIG.provider,
      apiBase: res.image_api_base || DEFAULT_IMAGE_CONFIG.apiBase,
      apiKey: "",
      model: res.image_model || DEFAULT_IMAGE_CONFIG.model,
      hasKey: Boolean(res.has_image_key || res.image_api_key_masked),
    },
    video: {
      provider: res.video_provider || DEFAULT_VIDEO_CONFIG.provider,
      apiBase: res.video_api_base || DEFAULT_VIDEO_CONFIG.apiBase,
      apiKey: "",
      model: res.video_model || DEFAULT_VIDEO_CONFIG.model,
      hasKey: Boolean(res.has_video_key || res.video_api_key_masked),
    },
    tts: {
      apiBase: res.tts_api_base || res.llm_api_base || DEFAULT_TTS_CONFIG.apiBase,
      model: res.tts_model || DEFAULT_TTS_CONFIG.model,
      voiceFemale: res.tts_voice_female || DEFAULT_TTS_CONFIG.voiceFemale,
      voiceMale: res.tts_voice_male || DEFAULT_TTS_CONFIG.voiceMale,
      voiceNarrator: res.tts_voice_narrator || DEFAULT_TTS_CONFIG.voiceNarrator,
    },
    syncImageKeyWithLlm: true,
  };
}

// ============================================================
// 适配器：前端状态 -> API 提交载荷
// ============================================================

export function stateToApiPayload(state: ProviderConfigState): ProviderConfigApiPayload {
  const finalImageKey = state.syncImageKeyWithLlm && state.llm.apiKey
    ? state.llm.apiKey
    : state.image.apiKey;

  return {
    llm_provider: state.llm.provider,
    llm_api_base: state.llm.apiBase,
    llm_api_key: state.llm.apiKey.trim() || undefined,
    llm_model: state.llm.model,
    image_provider: state.image.provider,
    image_api_base: state.image.apiBase,
    image_api_key: finalImageKey.trim() || undefined,
    image_model: state.image.model,
    video_provider: state.video.provider,
    video_api_base: state.video.apiBase,
    video_api_key: state.video.apiKey.trim() || undefined,
    video_model: state.video.model,
    tts_api_base: state.tts.apiBase,
    tts_model: state.tts.model,
    tts_voice_female: state.tts.voiceFemale,
    tts_voice_male: state.tts.voiceMale,
    tts_voice_narrator: state.tts.voiceNarrator,
  };
}
