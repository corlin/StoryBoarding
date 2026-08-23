import React, { useState, useEffect } from "react";
import { Settings, Key, Sparkles, Check, Loader2, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [llmProvider, setLlmProvider] = useState("openai_compatible");
  const [llmApiBase, setLlmApiBase] = useState("https://api.openai.com/v1");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("gpt-4o");

  const [imageProvider, setImageProvider] = useState("openai_dalle");
  const [imageApiBase, setImageApiBase] = useState("");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageModel, setImageModel] = useState("dall-e-3");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSaved(false);
      api.getProviderConfig()
        .then((config) => {
          if (config) {
            setLlmProvider(config.llm_provider || "openai_compatible");
            setLlmApiBase(config.llm_api_base || "https://api.openai.com/v1");
            setLlmApiKey(config.llm_api_key || "");
            setLlmModel(config.llm_model || "gpt-4o");
            setImageProvider(config.image_provider || "openai_dalle");
            setImageApiBase(config.image_api_base || "");
            setImageApiKey(config.image_api_key || "");
            setImageModel(config.image_model || "dall-e-3");
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.updateProviderConfig({
        llm_provider: llmProvider,
        llm_api_base: llmApiBase,
        llm_api_key: llmApiKey,
        llm_model: llmModel,
        image_provider: imageProvider,
        image_api_base: imageApiBase,
        image_api_key: imageApiKey,
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
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">AI 模型与 Provider 设置</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          配置自定义的大语言模型（LLM）与图像生成 API 秘钥。支持兼容 OpenAI、Anthropic、DeepSeek、Flux 等服务。
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Section 1: LLM Settings */}
          <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Director Agent (LLM 语言模型)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">接口协议</label>
                <select
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="openai_compatible">OpenAI Compatible (GPT/DeepSeek/vLLM)</option>
                  <option value="anthropic_compatible">Anthropic (Claude)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">模型名称 (Model)</label>
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="gpt-4o / claude-3-5-sonnet / deepseek-chat"
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
                placeholder="https://api.openai.com/v1"
                className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">API Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
                />
                <Key className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Image Provider Settings */}
          <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span>Storyboard 图像生成模型</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">图像生成引擎</label>
                <select
                  value={imageProvider}
                  onChange={(e) => setImageProvider(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="openai_dalle">OpenAI DALL·E 3 / Compatible</option>
                  <option value="flux">Flux / Replicate / Stable Diffusion</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">模型名称</label>
                <input
                  type="text"
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  placeholder="dall-e-3 / flux-schnell"
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Image API Key (留空使用内置电影草图引擎)</label>
              <div className="relative">
                <input
                  type="password"
                  value={imageApiKey}
                  onChange={(e) => setImageApiKey(e.target.value)}
                  placeholder="可选：自定义绘图 API Key"
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono"
                />
                <Key className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
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
                <span>保存设置</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
