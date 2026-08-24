import React, { useState, useEffect } from "react";
import { Settings, Key, Sparkles, Check, Loader2, Image as ImageIcon, Zap } from "lucide-react";
import { api } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [llmProvider, setLlmProvider] = useState("openrouter");
  const [llmApiBase, setLlmApiBase] = useState("https://openrouter.ai/api/v1");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("openai/gpt-5.6-sol");

  const [imageProvider, setImageProvider] = useState("openrouter");
  const [imageApiBase, setImageApiBase] = useState("https://openrouter.ai/api/v1");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageModel, setImageModel] = useState("google/gemini-3.1-flash-image");
  const [syncApiKey, setSyncApiKey] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSaved(false);
      api.getProviderConfig()
        .then((config) => {
          if (config) {
            setLlmProvider(config.llm_provider || "openrouter");
            setLlmApiBase(config.llm_api_base || "https://openrouter.ai/api/v1");
            setLlmApiKey(config.llm_api_key || "");
            setLlmModel(config.llm_model || "openai/gpt-5.6-sol");
            setImageProvider(config.image_provider || "openrouter");
            setImageApiBase(config.image_api_base || "https://openrouter.ai/api/v1");
            setImageApiKey(config.image_api_key || "");
            setImageModel(config.image_model || "google/gemini-3.1-flash-image");
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const applyOpenRouterPreset = () => {
    setLlmProvider("openrouter");
    setLlmApiBase("https://openrouter.ai/api/v1");
    setLlmModel("openai/gpt-5.6-sol");
    setImageProvider("openrouter");
    setImageApiBase("https://openrouter.ai/api/v1");
    setImageModel("google/gemini-3.1-flash-image");
    setSyncApiKey(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const finalImageKey = syncApiKey && llmApiKey ? llmApiKey : imageApiKey;
    try {
      await api.updateProviderConfig({
        llm_provider: llmProvider,
        llm_api_base: llmApiBase,
        llm_api_key: llmApiKey,
        llm_model: llmModel,
        image_provider: imageProvider,
        image_api_base: imageApiBase,
        image_api_key: finalImageKey,
        image_model: imageModel,
      });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">AI 模型与 Provider 设置</h2>
          </div>
          <button
            type="button"
            onClick={applyOpenRouterPreset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
            title="预设 OpenRouter 推荐模型"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>应用 OpenRouter 推荐预设</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          默认已预设 <strong>OpenRouter</strong> 统一网关：文生文使用 <code>openai/gpt-5.6-sol</code>，文生图使用 <code>google/gemini-3.1-flash-image</code>。
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Section 1: LLM Settings */}
          <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>文生文 / Director Agent (LLM 语言模型)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                默认: openai/gpt-5.6-sol
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">接口网关 / 协议</label>
                <select
                  value={llmProvider}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLlmProvider(val);
                    if (val === "openrouter") {
                      setLlmApiBase("https://openrouter.ai/api/v1");
                      setLlmModel("openai/gpt-5.6-sol");
                    } else if (val === "openai_compatible") {
                      setLlmApiBase("https://api.openai.com/v1");
                      setLlmModel("gpt-4o");
                    } else if (val === "anthropic_compatible") {
                      setLlmApiBase("https://api.anthropic.com/v1");
                      setLlmModel("claude-3-5-sonnet-20241022");
                    }
                  }}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="openrouter">OpenRouter (推荐)</option>
                  <option value="openai_compatible">OpenAI Compatible (Direct)</option>
                  <option value="anthropic_compatible">Anthropic (Direct)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">模型名称 (Model ID)</label>
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="openai/gpt-5.6-sol"
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">API Base URL</label>
              <input
                type="text"
                value={llmApiBase}
                onChange={(e) => setLlmApiBase(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                API Key (OpenRouter / Provider 秘钥)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
                />
                <Key className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Image Provider Settings */}
          <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>文生图 / Storyboard 视觉生成模型</span>
              </div>
              <span className="text-[10px] font-mono text-sky-400/90 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                默认: google/gemini-3.1-flash-image
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">图像生成引擎</label>
                <select
                  value={imageProvider}
                  onChange={(e) => setImageProvider(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="openrouter">OpenRouter (推荐)</option>
                  <option value="openai_dalle">OpenAI DALL·E 3</option>
                  <option value="flux">Flux / Replicate</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">模型名称 (Model ID)</label>
                <input
                  type="text"
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  placeholder="google/gemini-3.1-flash-image"
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="syncApiKey"
                checked={syncApiKey}
                onChange={(e) => setSyncApiKey(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <label htmlFor="syncApiKey" className="text-xs text-muted-foreground cursor-pointer select-none">
                共用文生文 OpenRouter API Key (无需重复填写)
              </label>
            </div>

            {!syncApiKey && (
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">独立 Image API Key</label>
                <div className="relative">
                  <input
                    type="password"
                    value={imageApiKey}
                    onChange={(e) => setImageApiKey(e.target.value)}
                    placeholder="可选：单独绘图 API Key"
                    className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
                  />
                  <Key className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在保存...</span>
                </>
              ) : isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>已保存设置</span>
                </>
              ) : (
                <span>保存预设配置</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
