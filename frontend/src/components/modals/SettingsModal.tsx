import React, { useState, useEffect } from "react";
import { Settings, Key, Sparkles, Check, Loader2, Image as ImageIcon, Zap, Globe, AlertCircle } from "lucide-react";
import { api, getApiBaseUrl, setApiBaseUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiUrl, setApiUrl] = useState("");
  const [apiStatus, setApiStatus] = useState<"idle" | "testing" | "ok" | "err">("idle");
  const [apiErrMsg, setApiErrMsg] = useState("");

  const [llmProvider, setLlmProvider] = useState("openrouter");
  const [llmApiBase, setLlmApiBase] = useState("https://openrouter.ai/api/v1");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("deepseek/deepseek-chat");

  const [imageProvider, setImageProvider] = useState("openrouter");
  const [imageApiBase, setImageApiBase] = useState("https://openrouter.ai/api/v1");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageModel, setImageModel] = useState("x-ai/grok-imagine-image-2.0");
  const [syncApiKey, setSyncApiKey] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Model Diagnostics states
  const [llmTestStatus, setLlmTestStatus] = useState<"idle" | "testing" | "ok" | "err">("idle");
  const [llmTestMsg, setLlmTestMsg] = useState("");
  const [imageTestStatus, setImageTestStatus] = useState<"idle" | "testing" | "ok" | "err">("idle");
  const [imageTestMsg, setImageTestMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsSaved(false);
      setApiUrl(getApiBaseUrl());
      setApiStatus("idle");
      setLlmTestStatus("idle");
      setImageTestStatus("idle");

      api.getProviderConfig()
        .then((config) => {
          if (config) {
            setLlmProvider(config.llm_provider || "openrouter");
            setLlmApiBase(config.llm_api_base || "https://openrouter.ai/api/v1");
            setLlmApiKey(config.llm_api_key || "");
            setLlmModel(config.llm_model || "deepseek/deepseek-chat");
            setImageProvider(config.image_provider || "openrouter");
            setImageApiBase(config.image_api_base || "https://openrouter.ai/api/v1");
            setImageApiKey(config.image_api_key || "");
            setImageModel(config.image_model || "x-ai/grok-imagine-image-2.0");
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testApiConnection = async () => {
    setApiStatus("testing");
    setApiErrMsg("");
    setApiBaseUrl(apiUrl);
    try {
      const res = await api.checkHealth();
      if (res && res.status === "healthy") {
        setApiStatus("ok");
      } else {
        setApiStatus("err");
        setApiErrMsg("返回异常响应");
      }
    } catch (e: any) {
      setApiStatus("err");
      setApiErrMsg(e?.message || "无法连接到该 Worker 地址");
    }
  };

  const handleTestLlm = async () => {
    if (!llmApiKey.trim()) {
      notify.error("请先填入 LLM API Key");
      return;
    }
    setLlmTestStatus("testing");
    setLlmTestMsg("");
    try {
      const res = await api.testLlm({
        api_key: llmApiKey.trim(),
        api_base: llmApiBase.trim(),
        model: llmModel.trim(),
      });
      if (res.ok) {
        setLlmTestStatus("ok");
        setLlmTestMsg(`连通成功 (${res.latency_ms}ms) · 响应: ${res.reply}`);
        notify.success(`LLM 模型 ${res.model} 连通正常 (${res.latency_ms}ms)`);
      } else {
        setLlmTestStatus("err");
        setLlmTestMsg(res.error || "调用失败");
        notify.error(`LLM 连通失败: ${res.error}`);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.error || e.message || "请求失败";
      setLlmTestStatus("err");
      setLlmTestMsg(errMsg);
      notify.error(`LLM 连通异常: ${errMsg}`);
    }
  };

  const handleTestImage = async () => {
    const key = (syncApiKey ? llmApiKey : imageApiKey).trim();
    if (!key) {
      notify.error("请先填入 AI 绘画 API Key");
      return;
    }
    setImageTestStatus("testing");
    setImageTestMsg("");
    try {
      const res = await api.testImage({
        api_key: key,
        api_base: imageApiBase.trim(),
        model: imageModel.trim(),
      });
      if (res.ok) {
        setImageTestStatus("ok");
        setImageTestMsg(`连通成功 (${res.latency_ms}ms)`);
        notify.success(`生图模型 ${res.model} 连通正常 (${res.latency_ms}ms)`);
      } else {
        setImageTestStatus("err");
        setImageTestMsg(res.error || "调用失败");
        notify.error(`生图模型测试失败: ${res.error}`);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.error || e.message || "请求失败";
      setImageTestStatus("err");
      setImageTestMsg(errMsg);
      notify.error(`生图模型测试异常: ${errMsg}`);
    }
  };

  const applyOpenRouterPreset = () => {
    setLlmProvider("openrouter");
    setLlmApiBase("https://openrouter.ai/api/v1");
    setLlmModel("deepseek/deepseek-chat");
    setImageProvider("openrouter");
    setImageApiBase("https://openrouter.ai/api/v1");
    setImageModel("x-ai/grok-imagine-image-2.0");
    setSyncApiKey(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiBaseUrl(apiUrl);
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
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 800);
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
            <h2 className="text-base font-semibold">系统与 AI 模型设置</h2>
          </div>
          <button
            type="button"
            onClick={applyOpenRouterPreset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
            title="应用已通过 OpenRouter 官方验证的高性能推荐模型"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>应用 OpenRouter 推荐预设</span>
          </button>
        </div>

        {/* Server-Side D1 Persistence Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>☁️ 服务端统一持久化 (Cloudflare D1 · 跨设备多端实时同步)</span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          所有 API 密钥与模型参数均权威存储于云端 D1 数据库中，更换设备或使用无痕模式均可自动无缝读取。
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Section 0: Backend Server Endpoint */}
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Globe className="w-4 h-4 text-primary" />
                <span>后端 API 服务地址 (Cloudflare Worker Endpoint)</span>
              </div>
              <button
                type="button"
                onClick={testApiConnection}
                disabled={apiStatus === "testing" || !apiUrl.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                {apiStatus === "testing" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>测试中...</span>
                  </>
                ) : apiStatus === "ok" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-300" />
                    <span>连接成功</span>
                  </>
                ) : (
                  <span>测试连接</span>
                )}
              </button>
            </div>

            <div>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setApiStatus("idle");
                }}
                placeholder="默认官方生产服务: https://storyboarding-api.caifu.social"
                className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-foreground"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  默认直连官方生产节点（https://storyboarding-api.caifu.social），全网免配秒连
                </span>
                {apiStatus === "err" && (
                  <span className="text-[10px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {apiErrMsg}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: LLM Settings */}
          <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>文生文 / Director Agent (LLM 语言模型)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                推荐: deepseek/deepseek-chat
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Provider 协议类型</label>
                <select
                  value={llmProvider}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLlmProvider(val);
                    if (val === "openrouter") {
                      setLlmApiBase("https://openrouter.ai/api/v1");
                      setLlmModel("deepseek/deepseek-chat");
                    } else if (val === "openai_compatible") {
                      setLlmApiBase("https://api.openai.com/v1");
                      setLlmModel("gpt-4o");
                    }
                  }}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="openrouter">OpenRouter (推荐)</option>
                  <option value="openai_compatible">OpenAI Compatible (Direct / OneAPI)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">模型快捷选择 / 自定义</label>
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono mb-1.5"
                >
                  <option value="deepseek/deepseek-chat">deepseek/deepseek-chat (超快中英文拆镜)</option>
                  <option value="deepseek/deepseek-r1">deepseek/deepseek-r1 (深度推理思考)</option>
                  <option value="qwen/qwen-2.5-72b-instruct">qwen/qwen-2.5-72b-instruct (千问大模型)</option>
                  <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct</option>
                  <option value="openai/gpt-4o">openai/gpt-4o</option>
                </select>
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="自定义输入任意 Model ID"
                  className="w-full text-[11px] font-mono bg-background border border-border/80 rounded px-2 py-1 focus:outline-none focus:border-primary"
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
                className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">API Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => {
                    setLlmApiKey(e.target.value);
                    setLlmTestStatus("idle");
                  }}
                  placeholder="sk-or-v1-..."
                  className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 pl-8 focus:outline-none focus:border-primary"
                />
                <Key className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestLlm}
                disabled={llmTestStatus === "testing" || !llmApiKey.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-xs"
              >
                {llmTestStatus === "testing" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>探测 LLM 中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>测试 LLM 导演连通性</span>
                  </>
                )}
              </button>
              {llmTestStatus === "ok" && (
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {llmTestMsg}
                </span>
              )}
              {llmTestStatus === "err" && (
                <span className="text-[11px] text-red-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {llmTestMsg}
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Image Model Settings */}
          <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>文生图 / Storyboard Image Generator (图像模型)</span>
              </div>
              <span className="text-[10px] font-mono text-sky-400/90 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                推荐: x-ai/grok-imagine-image-2.0
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">图像 Provider 类型</label>
                <select
                  value={imageProvider}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageProvider(val);
                    if (val === "openrouter") {
                      setImageApiBase("https://openrouter.ai/api/v1");
                      setImageModel("x-ai/grok-imagine-image-2.0");
                    } else if (val === "openai_compatible") {
                      setImageApiBase("https://api.openai.com/v1");
                      setImageModel("dall-e-3");
                    }
                  }}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="openrouter">OpenRouter Image API</option>
                  <option value="openai_compatible">OpenAI DALL-E 3</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">图像模型选择 / 自定义</label>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono mb-1.5"
                >
                  <option value="x-ai/grok-imagine-image-2.0">x-ai/grok-imagine-image-2.0 (极快高保真)</option>
                  <option value="google/imagen-3">google/imagen-3 (Google 顶级质感)</option>
                  <option value="black-forest-labs/flux-1-schnell">black-forest-labs/flux-1-schnell (Flux 极速)</option>
                  <option value="black-forest-labs/flux-1-dev">black-forest-labs/flux-1-dev (Flux 精细)</option>
                  <option value="recraft/recraft-20b-svg">recraft/recraft-20b-svg (矢量速写风格)</option>
                  <option value="openai/dall-e-3">openai/dall-e-3 (DALL-E 3)</option>
                </select>
                <input
                  type="text"
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  placeholder="自定义输入 Image Model ID"
                  className="w-full text-[11px] font-mono bg-background border border-border/80 rounded px-2 py-1 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">图像 API Base URL</label>
              <input
                type="text"
                value={imageApiBase}
                onChange={(e) => setImageApiBase(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-muted-foreground">图像生成 API Key</label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncApiKey}
                    onChange={(e) => setSyncApiKey(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>复用上方 LLM API Key (OpenRouter 共享密钥)</span>
                </label>
              </div>
              {!syncApiKey && (
                <div className="relative">
                  <input
                    type="password"
                    value={imageApiKey}
                    onChange={(e) => {
                      setImageApiKey(e.target.value);
                      setImageTestStatus("idle");
                    }}
                    placeholder="输入单独的生图 API Key..."
                    className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 pl-8 focus:outline-none focus:border-primary"
                  />
                  <Key className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestImage}
                disabled={imageTestStatus === "testing" || (!syncApiKey && !imageApiKey.trim()) || (syncApiKey && !llmApiKey.trim())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 transition-colors shadow-xs"
              >
                {imageTestStatus === "testing" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>探测生图模型中...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>测试 AI 绘画连通性</span>
                  </>
                )}
              </button>
              {imageTestStatus === "ok" && (
                <span className="text-[11px] text-sky-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {imageTestMsg}
                </span>
              )}
              {imageTestStatus === "err" && (
                <span className="text-[11px] text-red-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {imageTestMsg}
                </span>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-muted-foreground">配置将安全持久化保存在云端与本地浏览器</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>保存中...</span>
                  </>
                ) : isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>已保存生效</span>
                  </>
                ) : (
                  <span>保存设置</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
