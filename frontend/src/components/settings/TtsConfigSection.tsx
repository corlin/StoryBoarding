import React from "react";
import { Volume2, RefreshCw } from "lucide-react";
import type { TtsConfig } from "@/types/modelConfig";
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

export const TtsConfigSection: React.FC<TtsConfigSectionProps> = ({
  config,
  speechModels,
  speechModelsLoading,
  speechModelsError,
  onChange,
  onRefreshModels,
}) => {
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
          onChange={(e) => onChange({ model: e.target.value })}
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

        {/* 高级：手动指定模型 ID */}
        <details className="mt-2 rounded border border-border/60 px-2 py-1.5">
          <summary className="cursor-pointer text-[10px] text-muted-foreground">
            高级：手动指定 Speech 模型 ID
          </summary>
          <input
            type="text"
            value={config.model}
            onChange={(e) => onChange({ model: e.target.value })}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">默认女声</label>
          <input
            value={config.voiceFemale}
            onChange={(e) => onChange({ voiceFemale: e.target.value })}
            className="w-full text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">默认男声</label>
          <input
            value={config.voiceMale}
            onChange={(e) => onChange({ voiceMale: e.target.value })}
            className="w-full text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">默认旁白</label>
          <input
            value={config.voiceNarrator}
            onChange={(e) => onChange({ voiceNarrator: e.target.value })}
            className="w-full text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5"
          />
        </div>
      </div>

      {/* 底部说明 */}
      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
        配音调用 OpenRouter 的 <code>/audio/speech</code> 接口并返回 MP3。角色声线包含男性特征时使用默认男声，旁白使用旁白音色，其余使用默认女声；生成后自动进入生产看板的音频候选，可试听、采用或退回。费用按模型实际账单结算。
      </p>
    </div>
  );
};
