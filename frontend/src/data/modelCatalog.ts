/**
 * 模型目录 (Model Catalog)
 *
 * 集中管理所有 AI 模型的预设选项，包括：
 * - LLM 语言模型 (Director Agent 用)
 * - 图像生成模型 (Storyboard 分镜图用)
 * - 视频生成模型
 * - Provider 预设
 *
 * 新增模型时只需在此文件添加条目，UI 自动渲染。
 */

import type { ModelOption, LlmProviderType, ImageProviderType, VideoProviderType } from "@/types/modelConfig";

// ============================================================
// LLM 语言模型目录
// ============================================================

export const LLM_MODELS: ModelOption[] = [
  {
    id: "deepseek/deepseek-chat",
    label: "deepseek/deepseek-chat",
    description: "超快中英文拆镜",
    recommended: true,
    isDefault: true,
  },
  {
    id: "deepseek/deepseek-r1",
    label: "deepseek/deepseek-r1",
    description: "深度推理思考",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    label: "qwen/qwen-2.5-72b-instruct",
    description: "千问大模型",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "meta-llama/llama-3.3-70b-instruct",
    description: "Llama 3.3 70B",
  },
  {
    id: "openai/gpt-4o",
    label: "openai/gpt-4o",
    description: "GPT-4o",
  },
];

// ============================================================
// 图像生成模型目录
// ============================================================

export const IMAGE_MODELS: ModelOption[] = [
  {
    id: "bytedance-seed/seedream-5-0-lite",
    label: "bytedance-seed/seedream-5-0-lite",
    description: "字节跳动 Seedream 5.0 Lite 极速轻量",
    isDefault: true,
  },
  {
    id: "bytedance-seed/seedream-5-0-pro",
    label: "bytedance-seed/seedream-5-0-pro",
    description: "字节跳动 Seedream 5.0 Pro 旗舰超清",
    recommended: true,
  },
  {
    id: "bytedance-seed/seedream-4.5",
    label: "bytedance-seed/seedream-4.5",
    description: "字节跳动 Seedream 4.5 电影级生图",
  },
  {
    id: "qwen/qwen-image-3-pro",
    label: "qwen/qwen-image-3-pro",
    description: "阿里千问 Qwen Image 3 Pro 旗舰生图",
    recommended: true,
  },
  {
    id: "openai/gpt-image-2",
    label: "openai/gpt-image-2",
    description: "OpenAI 最新超清电影分镜",
  },
  {
    id: "google/gemini-3.1-flash-image",
    label: "google/gemini-3.1-flash-image",
    description: "Google 最新超快分镜生图",
  },
  {
    id: "google/gemini-2.5-flash-image",
    label: "google/gemini-2.5-flash-image",
    description: "Google 纳米香蕉生图",
  },
  {
    id: "x-ai/grok-imagine-image-2.0",
    label: "x-ai/grok-imagine-image-2.0",
    description: "极快高保真",
  },
  {
    id: "black-forest-labs/flux-1-schnell",
    label: "black-forest-labs/flux-1-schnell",
    description: "Flux 极速",
  },
  {
    id: "black-forest-labs/flux-1-dev",
    label: "black-forest-labs/flux-1-dev",
    description: "Flux 精细",
  },
  {
    id: "recraft/recraft-20b-svg",
    label: "recraft/recraft-20b-svg",
    description: "矢量速写风格",
  },
  {
    id: "openai/dall-e-3",
    label: "openai/dall-e-3",
    description: "DALL-E 3",
  },
];

// ============================================================
// 视频生成模型目录
// ============================================================

export const VIDEO_MODELS: ModelOption[] = [
  {
    id: "MiniMax-Hailuo-2.3",
    label: "MiniMax-Hailuo-2.3",
    description: "768P/1080P · 6/10s",
    recommended: true,
  },
  {
    id: "MiniMax-Hailuo-02",
    label: "MiniMax-Hailuo-02",
    description: "768P/1080P · 6/10s",
    isDefault: true,
  },
];

// ============================================================
// Provider 选项
// ============================================================

export const LLM_PROVIDERS: Array<{ value: LlmProviderType; label: string }> = [
  { value: "openrouter", label: "OpenRouter (推荐)" },
  { value: "openai_compatible", label: "OpenAI Compatible (Direct / OneAPI)" },
];

export const IMAGE_PROVIDERS: Array<{ value: ImageProviderType; label: string }> = [
  { value: "openrouter", label: "OpenRouter Dedicated /images" },
  { value: "openai_compatible", label: "OpenAI DALL-E 3 / Proxy" },
];

export const VIDEO_PROVIDERS: Array<{ value: VideoProviderType; label: string }> = [
  { value: "minimax", label: "MiniMax (H3 视频生成)" },
];

// ============================================================
// Provider 切换时的预设 (apiBase + 默认 model)
// ============================================================

export const LLM_PROVIDER_PRESETS: Record<LlmProviderType, { apiBase: string; model: string }> = {
  openrouter: {
    apiBase: "https://openrouter.ai/api/v1",
    model: "deepseek/deepseek-chat",
  },
  openai_compatible: {
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
};

export const IMAGE_PROVIDER_PRESETS: Record<ImageProviderType, { apiBase: string; model: string }> = {
  openrouter: {
    apiBase: "https://openrouter.ai/api/v1",
    model: "bytedance-seed/seedream-5-0-lite",
  },
  openai_compatible: {
    apiBase: "https://api.openai.com/v1",
    model: "dall-e-3",
  },
};

export const VIDEO_PROVIDER_PRESETS: Record<VideoProviderType, { apiBase: string; model: string }> = {
  minimax: {
    apiBase: "https://api.minimax.cn/v1",
    model: "MiniMax-Hailuo-02",
  },
};

// ============================================================
// OpenRouter 一键推荐预设 (应用全部通道)
// ============================================================

export const OPENROUTER_RECOMMENDED_PRESET = {
  llm: {
    provider: "openrouter" as const,
    apiBase: "https://openrouter.ai/api/v1",
    model: "deepseek/deepseek-chat",
  },
  image: {
    provider: "openrouter" as const,
    apiBase: "https://openrouter.ai/api/v1",
    model: "x-ai/grok-imagine-image-2.0",
  },
  tts: {
    apiBase: "https://openrouter.ai/api/v1",
    model: "hexgrad/kokoro-82m",
    voiceFemale: "af_heart",
    voiceMale: "am_adam",
    voiceNarrator: "bf_emma",
  },
  syncImageKeyWithLlm: true,
};

// ============================================================
// TTS 模型默认音色预设 (按模型 ID 索引)
//
// 不同 TTS 模型使用完全不同的音色命名体系：
// - Kokoro 82M: af_* (美式女声) / am_* (美式男声) / bf_* (英式女声) / bm_* (英式男声)
// - 阿里云 TTS: zf_* (女声) / zm_* (男声)
// - 其他模型: 各有规范
//
// 用户切换模型时自动加载对应预设，避免音色 ID 不兼容导致调用失败。
// 未收录的模型返回 null，由 UI 提示用户手动配置。
// ============================================================

export interface TtsVoicePreset {
  female: string;
  male: string;
  narrator: string;
}

export const TTS_MODEL_VOICE_PRESETS: Record<string, TtsVoicePreset> = {
  // Kokoro 82M — 开源多音色 TTS，OpenRouter 上最常用
  "hexgrad/kokoro-82m": {
    female: "af_heart", // 温暖自然女声
    male: "am_adam", // 沉稳男声
    narrator: "bf_emma", // 英式女声，适合旁白叙述
  },
  // Kokoro 1.5 完整版（如果 OpenRouter 上线）
  "hexgrad/kokoro-v1.5": {
    female: "af_heart",
    male: "am_adam",
    narrator: "bf_emma",
  },
};

/**
 * 获取指定 TTS 模型的默认音色预设。
 * @param modelId 模型 ID
 * @returns 音色预设；未收录的模型返回 null
 */
export function getTtsVoicePreset(modelId: string): TtsVoicePreset | null {
  return TTS_MODEL_VOICE_PRESETS[modelId] || null;
}

/**
 * 判断当前音色是否为某个模型预设的默认值（用于判断用户是否手动修改过）。
 */
export function isDefaultVoiceForModel(
  modelId: string,
  voices: { female: string; male: string; narrator: string }
): boolean {
  const preset = TTS_MODEL_VOICE_PRESETS[modelId];
  if (!preset) return false;
  return (
    voices.female === preset.female &&
    voices.male === preset.male &&
    voices.narrator === preset.narrator
  );
}
