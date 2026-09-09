import React, { useState, useRef } from "react";
import { Volume2, RefreshCw, Check, AlertTriangle, Info, Play, Loader2 } from "lucide-react";
import type { TtsConfig } from "@/types/modelConfig";
import { getTtsVoicePreset } from "@/data/modelCatalog";
import { cn } from "@/lib/utils";

interface SpeechModelOption {
  id: string;
  name: string;
  price_per_character: string | null;
  is_free: boolean;
}

interface TtsConfigSectionProps {
  config: TtsConfig;
  speechModels: SpeechModelOption[];
  speechModelsLoading: boolean;
  speechModelsError: string;
  onChange: (patch: Partial<TtsConfig>) => void;
  onRefreshModels: () => void;
}

type PresetNotice =
  | { type: "applied"; modelId: string }
  | { type: "no_preset"; modelId: string }
  | { type: "fish_audio"; modelId: string }
  | null;

export const TtsConfigSection: React.FC<TtsConfigSectionProps> = ({
  config,
  speechModels,
  speechModelsLoading,
  speechModelsError,
  onChange,
  onRefreshModels,
}) => {
  const [presetNotice, setPresetNotice] = useState<PresetNotice>(null);
  const [testingVoice, setTestingVoice] = useState<string | null>(null);
  const [testError, setTestError] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * 音色测试：调用后端 /api/tts/test，用当前模型+指定音色合成"你好，世界"并播放。
   * @param voiceKey 音色类型: "female" | "male" | "narrator"
   */
  const handleTestVoice = async (voiceKey: "female" | "male" | "narrator") => {
    const voiceId = voiceKey === "female" ? config.voiceFemale : voiceKey === "male" ? config.voiceMale : config.voiceNarrator;
    if (!voiceId.trim()) {
      setTestError("音色 ID 为空，请先填写音色");
      return;
    }

    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setTestingVoice(voiceKey);
    setTestError("");

    try {
      const token = localStorage.getItem("storyboard_token") || "";
      const response = await fetch("/api/generate/tts/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          voice: voiceId,
          text: "你好，世界",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };
      await audio.play();
    } catch (error: any) {
      setTestError(`测试失败：${error?.message || error}`);
    } finally {
      setTestingVoice(null);
    }
  };

  /**
   * 切换模型时的核心逻辑：
   * 1. 更新模型 ID
   * 2. 如果新模型有预设音色，自动填充女声/男声/旁白
   * 3. 如果没有预设，显示警告提示用户手动确认
   */
  const handleModelChange = (newModelId: string) => {
    const preset = getTtsVoicePreset(newModelId);
    if (preset) {
      onChange({
        model: newModelId,
        voiceFemale: preset.female,
        voiceMale: preset.male,
        voiceNarrator: preset.narrator,
      });
      // Fish Audio 模型使用官方测试音色，需要特殊提示
      if (newModelId.startsWith("fish-audio/")) {
        setPresetNotice({ type: "fish_audio", modelId: newModelId });
      } else {
        setPresetNotice({ type: "applied", modelId: newModelId });
      }
    } else {
      onChange({ model: newModelId });
      setPresetNotice({ type: "no_preset", modelId: newModelId });
    }
  };

  /** 用户手动修改音色后，清除预设提示 */
  const handleVoiceManualChange = (patch: Partial<TtsConfig>) => {
    onChange(patch);
    setPresetNotice(null);
  };

  return (
    <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>文字配音 / OpenRouter TTS</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          复用 OpenRouter Key · R2 回收
        </span>
      </div>

      {/* Speech 模型选择 */}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-[11px] text-muted-foreground">Speech 模型</label>
          <button
            type="button"
            onClick={onRefreshModels}
            disabled={speechModelsLoading}
            className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", speechModelsLoading && "animate-spin")} />
            {speechModelsLoading ? "读取中" : "刷新 OpenRouter 模型"}
          </button>
        </div>
        <select
          value={config.model}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={speechModelsLoading && speechModels.length === 0}
          className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
        >
          {!speechModels.some((m) => m.id === config.model) && (
            <option value={config.model}>{config.model}（当前或自定义）</option>
          )}
          {speechModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} · {model.id} · {model.is_free ? "免费" : `$${model.price_per_character || "未标价"}/字符`}
            </option>
          ))}
        </select>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span>
            {speechModels.length > 0
              ? `OpenRouter 当前返回 ${speechModels.length} 个 speech 模型`
              : "支持直接填写模型 ID"}
          </span>
          {config.model === "hexgrad/kokoro-82m" && (
            <span className="text-emerald-400">中文低成本已实测</span>
          )}
        </div>
        {speechModelsError && (
          <p className="mt-1 text-[10px] text-amber-400">{speechModelsError}；仍可使用当前模型。</p>
        )}

        {/* 音色预设应用状态提示 */}
        {presetNotice?.type === "applied" && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
            <Check className="w-3 h-3 shrink-0" />
            <span>
              已自动应用 <code className="font-mono">{presetNotice.modelId}</code> 的默认音色预设，可在下方手动调整
            </span>
          </div>
        )}
        {presetNotice?.type === "no_preset" && (
          <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>
              模型 <code className="font-mono">{presetNotice.modelId}</code> 暂无内置音色预设，请在下方手动确认音色 ID 是否对应该模型有效，否则配音可能失败
            </span>
          </div>
        )}
        {presetNotice?.type === "fish_audio" && (
          <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>
              Fish Audio 模型无固定男女声音色，当前已填入官方公开测试音色。
              请在 <a href="https://fish.audio" target="_blank" rel="noopener noreferrer" className="underline">fish.audio</a> 创建/克隆自己的音色后，将下方三个音色 ID 替换为你自己的音色 ID
            </span>
          </div>
        )}

        {/* 高级：手动指定模型 ID */}
        <details className="mt-2 rounded border border-border/60 px-2 py-1.5">
          <summary className="cursor-pointer text-[10px] text-muted-foreground">
            高级：手动指定 Speech 模型 ID
          </summary>
          <input
            type="text"
            value={config.model}
            onChange={(e) => handleModelChange(e.target.value)}
            placeholder="例如 mistralai/voxtral-mini-tts-2603"
            className="mt-2 w-full text-[11px] font-mono bg-background border border-border/80 rounded px-2 py-1 focus:outline-none focus:border-primary"
          />
        </details>
      </div>

      {/* TTS API Base URL */}
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">TTS API Base URL</label>
        <input
          type="text"
          value={config.apiBase}
          onChange={(e) => onChange({ apiBase: e.target.value })}
          placeholder="https://openrouter.ai/api/v1"
          className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
        />
      </div>

      {/* 三个默认音色 */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="w-3 h-3 text-muted-foreground/70" />
          <span className="text-[10px] text-muted-foreground/70">
            音色 ID 必须与当前 TTS 模型匹配。切换模型时已自动填充对应预设，手动修改后请确认有效性
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">默认女声</label>
            <div className="flex gap-1">
              <input
                value={config.voiceFemale}
                onChange={(e) => handleVoiceManualChange({ voiceFemale: e.target.value })}
                className="flex-1 min-w-0 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5"
              />
              <button
                type="button"
                onClick={() => handleTestVoice("female")}
                disabled={testingVoice !== null}
                title="用当前女声播放「你好，世界」"
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingVoice === "female" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">默认男声</label>
            <div className="flex gap-1">
              <input
                value={config.voiceMale}
                onChange={(e) => handleVoiceManualChange({ voiceMale: e.target.value })}
                className="flex-1 min-w-0 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5"
              />
              <button
                type="button"
                onClick={() => handleTestVoice("male")}
                disabled={testingVoice !== null}
                title="用当前男声播放「你好，世界」"
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingVoice === "male" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">默认旁白</label>
            <div className="flex gap-1">
              <input
                value={config.voiceNarrator}
                onChange={(e) => handleVoiceManualChange({ voiceNarrator: e.target.value })}
                className="flex-1 min-w-0 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5"
              />
              <button
                type="button"
                onClick={() => handleTestVoice("narrator")}
                disabled={testingVoice !== null}
                title="用当前旁白播放「你好，世界」"
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingVoice === "narrator" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
        {testError && (
          <p className="mt-1.5 text-[10px] text-red-400">{testError}</p>
        )}
      </div>

      {/* 底部说明 */}
      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
        配音调用 OpenRouter 的 <code>/audio/speech</code> 接口并返回 MP3。角色声线包含男性特征时使用默认男声，旁白使用旁白音色，其余使用默认女声；生成后自动进入生产看板的音频候选，可试听、采用或退回。费用按模型实际账单结算。
      </p>
    </div>
  );
};
