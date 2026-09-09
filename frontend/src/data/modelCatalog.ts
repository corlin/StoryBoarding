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
// 所有音色 ID 均来自 OpenRouter 官方 API 的 supported_voices 字段，
// 确保与对应模型 100% 兼容。
//
// 数据来源: GET https://openrouter.ai/api/v1/models?output_modalities=speech
// 探查时间: 2026-09-09
//
// 用户切换模型时自动加载对应预设，避免音色 ID 不兼容导致调用失败。
// 未收录的模型返回 null，由 UI 提示用户手动配置。
// ============================================================

export interface TtsVoicePreset {
  female: string;
  male: string;
  narrator: string;
}

/** Fish Audio 官方公开测试音色 (所有 Fish Audio 模型共用，用户需替换为自己克隆的音色) */
const FISH_AUDIO_TEST_VOICE = "00a1b221-6137-4b73-ad62-b0cbce134167";

export const TTS_MODEL_VOICE_PRESETS: Record<string, TtsVoicePreset> = {
  // ===== Deepgram Flux TTS (36 voices, flux-{name}-en) =====
  "deepgram/flux-tts:free": {
    female: "flux-haley-en",
    male: "flux-bruce-en",
    narrator: "flux-heather-en",
  },

  // ===== Fish Audio (supported_voices=null, 接受任意音色ID/声音克隆) =====
  // 注意: Fish Audio 音色由用户在 fish.audio 自行创建/克隆，无固定男女声。
  // 以下使用官方公开测试音色，用户应替换为自己的音色 ID。
  "fish-audio/s1": {
    female: FISH_AUDIO_TEST_VOICE,
    male: FISH_AUDIO_TEST_VOICE,
    narrator: FISH_AUDIO_TEST_VOICE,
  },
  "fish-audio/s2-pro": {
    female: FISH_AUDIO_TEST_VOICE,
    male: FISH_AUDIO_TEST_VOICE,
    narrator: FISH_AUDIO_TEST_VOICE,
  },
  "fish-audio/s2.1-pro-free:free": {
    female: FISH_AUDIO_TEST_VOICE,
    male: FISH_AUDIO_TEST_VOICE,
    narrator: FISH_AUDIO_TEST_VOICE,
  },
  "fish-audio/s2.1-pro": {
    female: FISH_AUDIO_TEST_VOICE,
    male: FISH_AUDIO_TEST_VOICE,
    narrator: FISH_AUDIO_TEST_VOICE,
  },

  // ===== Microsoft MAI-Voice-2 (4 voices, Azure locale format) =====
  "microsoft/mai-voice-2-flash": {
    female: "en-US-Harper:MAI-Voice-2",
    male: "de-DE-Klaus:MAI-Voice-2",
    narrator: "en-US-Harper:MAI-Voice-2",
  },
  "microsoft/mai-voice-2": {
    female: "en-US-Harper:MAI-Voice-2",
    male: "de-DE-Klaus:MAI-Voice-2",
    narrator: "en-US-Harper:MAI-Voice-2",
  },

  // ===== Qwen Audio 3.0 TTS (2 voices each) =====
  "qwen/qwen-audio-3.0-tts-flash": {
    female: "longanhuan_v3.6",
    male: "loongjohn",
    narrator: "longanhuan_v3.6",
  },
  "qwen/qwen-audio-3.0-tts-plus": {
    female: "longanlingxin",
    male: "longanlufeng",
    narrator: "longanlingxin",
  },

  // ===== Deepgram Aura-2 (90 voices, aura-2-{name}-{lang}) =====
  "deepgram/aura-2": {
    female: "aura-2-thalia-en",
    male: "aura-2-arcas-en",
    narrator: "aura-2-asteria-en",
  },

  // ===== MiniMax Speech 2.8 (45 voices each, English_* 格式) =====
  "minimax/speech-2.8-hd": {
    female: "English_radiant_girl",
    male: "English_magnetic_voiced_man",
    narrator: "English_expressive_narrator",
  },
  "minimax/speech-2.8-turbo": {
    female: "English_radiant_girl",
    male: "English_magnetic_voiced_man",
    narrator: "English_expressive_narrator",
  },

  // ===== xAI Grok Voice TTS 1.0 (5 voices: eve, ara, rex, sal, leo) =====
  "x-ai/grok-voice-tts-1.0": {
    female: "eve",
    male: "rex",
    narrator: "ara",
  },

  // ===== Google Gemini 3.1 Flash TTS Preview (30 voices, 天文命名) =====
  "google/gemini-3.1-flash-tts-preview": {
    female: "Aoede",
    male: "Charon",
    narrator: "Sadaltager",
  },

  // ===== Canopy Labs Orpheus 3B (7 voices: tara, leah, jess, leo, dan, mia, zac) =====
  "canopylabs/orpheus-3b-0.1-ft": {
    female: "tara",
    male: "leo",
    narrator: "mia",
  },

  // ===== Sesame CSM 1B (7 voices: conversational_*, read_speech_*, none) =====
  "sesame/csm-1b": {
    female: "conversational_a",
    male: "conversational_b",
    narrator: "read_speech_a",
  },

  // ===== Hexgrad Kokoro 82M (54 voices, af_/am_/bf_/bm_/zf_/zm_ 等) =====
  "hexgrad/kokoro-82m": {
    female: "af_heart",
    male: "am_adam",
    narrator: "bf_emma",
  },

  // ===== Mistral Voxtral Mini TTS (30 voices, {lang}_{name}_{emotion}) =====
  "mistralai/voxtral-mini-tts-2603": {
    female: "gb_jane_neutral",
    male: "en_paul_neutral",
    narrator: "gb_jane_neutral",
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
