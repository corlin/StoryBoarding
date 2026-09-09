import React, { useState, useEffect, useCallback } from "react";
import { Settings, Zap, Sparkles, Image as ImageIcon, Film, Globe, Loader2, Check } from "lucide-react";
import { api, getApiBaseUrl, setApiBaseUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";
import {
  type ProviderConfigState,
  type ProviderConfigApiResponse,
  type TestStatus,
  type ModelChannelConfig,
  DEFAULT_LLM_CONFIG,
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_VIDEO_CONFIG,
  DEFAULT_TTS_CONFIG,
  apiResponseToState,
  stateToApiPayload,
} from "@/types/modelConfig";
import {
  LLM_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  LLM_PROVIDERS,
  IMAGE_PROVIDERS,
  VIDEO_PROVIDERS,
  LLM_PROVIDER_PRESETS,
  IMAGE_PROVIDER_PRESETS,
  VIDEO_PROVIDER_PRESETS,
  OPENROUTER_RECOMMENDED_PRESET,
} from "@/data/modelCatalog";
import { ModelProviderCard } from "@/components/settings/ModelProviderCard";
import { TtsConfigSection } from "@/components/settings/TtsConfigSection";
import { AdvancedEndpointSection } from "@/components/settings/AdvancedEndpointSection";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpeechModelOption {
  id: string;
  name: string;
  price_per_character: string | null;
  is_free: boolean;
}

/** 构建初始空状态 */
function createInitialState(): ProviderConfigState {
  return {
    llm: { ...DEFAULT_LLM_CONFIG, apiKey: "", hasKey: false },
    image: { ...DEFAULT_IMAGE_CONFIG, apiKey: "", hasKey: false },
    video: { ...DEFAULT_VIDEO_CONFIG, apiKey: "", hasKey: false },
    tts: { ...DEFAULT_TTS_CONFIG },
    syncImageKeyWithLlm: true,
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  // ===== 网络端点状态 =====
  const [apiUrl, setApiUrl] = useState("");
  const [apiStatus, setApiStatus] = useState<TestStatus>("idle");
  const [apiErrMsg, setApiErrMsg] = useState("");

  // ===== 模型配置统一状态 =====
  const [config, setConfig] = useState<ProviderConfigState>(createInitialState());

  // ===== TTS 模型目录 =====
  const [speechModels, setSpeechModels] = useState<SpeechModelOption[]>([]);
  const [speechModelsLoading, setSpeechModelsLoading] = useState(false);
  const [speechModelsError, setSpeechModelsError] = useState("");

  // ===== 测试状态 =====
  const [llmTestStatus, setLlmTestStatus] = useState<TestStatus>("idle");
  const [llmTestMsg, setLlmTestMsg] = useState("");
  const [imageTestStatus, setImageTestStatus] = useState<TestStatus>("idle");
  const [imageTestMsg, setImageTestMsg] = useState("");

  // ===== 保存状态 =====
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // ===== 加载 Speech 模型目录 =====
  const loadSpeechModels = useCallback(async () => {
    setSpeechModelsLoading(true);
    setSpeechModelsError("");
    try {
      const result = await api.getSpeechModels();
      setSpeechModels(result.models || []);
    } catch (error: any) {
      setSpeechModelsError(error?.response?.data?.detail || error?.message || "无法读取 Speech 模型");
    } finally {
      setSpeechModelsLoading(false);
    }
  }, []);

  // ===== Modal 打开时初始化 =====
  useEffect(() => {
    if (isOpen) {
      setIsSaved(false);
      setApiUrl(getApiBaseUrl());
      setApiStatus("idle");
      setLlmTestStatus("idle");
      setImageTestStatus("idle");
      loadSpeechModels();

      api
        .getProviderConfig()
        .then((res: ProviderConfigApiResponse) => {
          if (res) {
            setConfig(apiResponseToState(res));
          }
        })
        .catch(console.error);
    }
  }, [isOpen, loadSpeechModels]);

  if (!isOpen) return null;

  // ===== 配置更新辅助函数 =====
  const updateChannel = (channel: "llm" | "image" | "video", patch: Partial<ModelChannelConfig>) => {
    setConfig((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], ...patch },
    }));
  };

  // ===== Provider 切换时应用预设 =====
  const handleLlmProviderChange = (provider: string) => {
    const preset = LLM_PROVIDER_PRESETS[provider as keyof typeof LLM_PROVIDER_PRESETS];
    if (preset) {
      updateChannel("llm", { provider, apiBase: preset.apiBase, model: preset.model });
    } else {
      updateChannel("llm", { provider });
    }
  };

  const handleImageProviderChange = (provider: string) => {
    const preset = IMAGE_PROVIDER_PRESETS[provider as keyof typeof IMAGE_PROVIDER_PRESETS];
    if (preset) {
      updateChannel("image", { provider, apiBase: preset.apiBase, model: preset.model });
    } else {
      updateChannel("image", { provider });
    }
  };

  const handleVideoProviderChange = (provider: string) => {
    const preset = VIDEO_PROVIDER_PRESETS[provider as keyof typeof VIDEO_PROVIDER_PRESETS];
    if (preset) {
      updateChannel("video", { provider, apiBase: preset.apiBase, model: preset.model });
    } else {
      updateChannel("video", { provider });
    }
  };

  // ===== 应用 OpenRouter 推荐预设 =====
  const applyOpenRouterPreset = () => {
    setConfig((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        provider: OPENROUTER_RECOMMENDED_PRESET.llm.provider,
        apiBase: OPENROUTER_RECOMMENDED_PRESET.llm.apiBase,
        model: OPENROUTER_RECOMMENDED_PRESET.llm.model,
      },
      image: {
        ...prev.image,
        provider: OPENROUTER_RECOMMENDED_PRESET.image.provider,
        apiBase: OPENROUTER_RECOMMENDED_PRESET.image.apiBase,
        model: OPENROUTER_RECOMMENDED_PRESET.image.model,
      },
      tts: {
        ...prev.tts,
        ...OPENROUTER_RECOMMENDED_PRESET.tts,
      },
      syncImageKeyWithLlm: OPENROUTER_RECOMMENDED_PRESET.syncImageKeyWithLlm,
    }));
  };

  // ===== 测试 API 连接 =====
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

  // ===== 测试 LLM =====
  const handleTestLlm = async () => {
    setLlmTestStatus("testing");
    setLlmTestMsg("");
    try {
      const res = await api.testLlm({
        api_key: config.llm.apiKey.trim(),
        api_base: config.llm.apiBase.trim(),
        model: config.llm.model.trim(),
      });
      if (res.ok) {
        setLlmTestStatus("ok");
        setLlmTestMsg(`服务端连通成功 (${res.latency_ms}ms) · 响应: ${res.reply}`);
        notify.success(`[Worker服务端] LLM 模型 ${res.model} 连通正常 (${res.latency_ms}ms)`);
      } else {
        setLlmTestStatus("err");
        setLlmTestMsg(res.error || "调用失败");
        notify.error(`服务端测试失败: ${res.error}`);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.error || e.message || "请求失败";
      setLlmTestStatus("err");
      setLlmTestMsg(errMsg);
      notify.error(`服务端探测异常: ${errMsg}`);
    }
  };

  // ===== 测试图像 =====
  const handleTestImage = async () => {
    const key = (config.syncImageKeyWithLlm ? config.llm.apiKey : config.image.apiKey).trim();
    setImageTestStatus("testing");
    setImageTestMsg("");
    try {
      const res = await api.testImage({
        api_key: key,
        api_base: config.image.apiBase.trim(),
        model: config.image.model.trim(),
      });
      if (res.ok) {
        setImageTestStatus("ok");
        setImageTestMsg(`服务端连通成功 (${res.latency_ms}ms)`);
        notify.success(`[Worker服务端] 生图模型 ${res.model} 连通正常 (${res.latency_ms}ms)`);
      } else {
        setImageTestStatus("err");
        setImageTestMsg(res.error || "调用失败");
        notify.error(`服务端生图测试失败: ${res.error}`);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.error || e.message || "请求失败";
      setImageTestStatus("err");
      setImageTestMsg(errMsg);
      notify.error(`服务端生图探测异常: ${errMsg}`);
    }
  };

  // ===== 保存配置 =====
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiBaseUrl(apiUrl);

    const payload = stateToApiPayload(config);

    try {
      const res = await api.updateProviderConfig(payload);
      if (res?.has_llm_key !== undefined) {
        updateChannel("llm", { hasKey: res.has_llm_key });
      }
      if (res?.has_image_key !== undefined) {
        updateChannel("image", { hasKey: res.has_image_key });
      }
      if (res?.has_video_key !== undefined) {
        updateChannel("video", { hasKey: res.has_video_key });
      }
      // 保存后清空明文密钥
      setConfig((prev) => ({
        ...prev,
        llm: { ...prev.llm, apiKey: "" },
        image: { ...prev.image, apiKey: "" },
        video: { ...prev.video, apiKey: "" },
      }));
      setIsSaved(true);
      await useAuthStore.getState().initAuth();
      notify.success("AI 模型与密钥设置已成功同步生效！");
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 800);
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      const errMsg = err?.response?.data?.error || err?.message || "网络异常，无法更新配置";
      notify.error(`配置保存失败: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* 标题栏 */}
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

        {/* D1 持久化徽章 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 mb-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>☁️ 专属云端存储 (Cloudflare D1 · 登录后多设备自动漫游)</span>
        </div>

        {/* 自备 Key 提示 */}
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200/90 text-xs leading-relaxed mb-4">
          💡 <strong>自备 API Key 模式（无公共兜底 Key）</strong>：平台不提供共享兜底 Key，所有 AI 智能拆镜与生图均使用您个人的 OpenRouter Key。费用由 OpenRouter 按实际调用独立扣费，无中间商差价与并发限制。
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* LLM 配置 */}
          <ModelProviderCard
            channel="llm"
            icon={<Sparkles className="w-4 h-4" />}
            title="文生文 / Director Agent (LLM 语言模型)"
            badge="推荐: deepseek/deepseek-chat"
            accentColor="emerald"
            config={config.llm}
            providerOptions={LLM_PROVIDERS}
            modelOptions={LLM_MODELS}
            testButtonLabel="服务端实测 LLM 导演"
            testButtonIcon={<Sparkles className="w-3.5 h-3.5" />}
            testStatus={llmTestStatus}
            testMessage={llmTestMsg}
            keyPlaceholder={
              config.llm.hasKey
                ? "● 已加密保存在云端 D1 数据库 (若不修改请留空)"
                : "输入 OpenRouter / OpenAI API Key..."
            }
            onChange={(patch) => {
              if (patch.provider !== undefined) {
                handleLlmProviderChange(patch.provider);
              } else {
                if (patch.apiKey !== undefined) setLlmTestStatus("idle");
                updateChannel("llm", patch);
              }
            }}
            onTest={handleTestLlm}
          />

          {/* 图像配置 */}
          <ModelProviderCard
            channel="image"
            icon={<ImageIcon className="w-4 h-4" />}
            title="文生图 / Storyboard Image Generator (图像模型)"
            badge="默认: seedream-5-0-lite · 推荐: seedream-5-0-pro / seedream-4.5"
            accentColor="sky"
            config={config.image}
            providerOptions={IMAGE_PROVIDERS}
            modelOptions={IMAGE_MODELS}
            testButtonLabel="服务端实测 AI 绘画"
            testButtonIcon={<ImageIcon className="w-3.5 h-3.5" />}
            testStatus={imageTestStatus}
            testMessage={imageTestMsg}
            showSyncKeyCheckbox
            syncKeyWithLlm={config.syncImageKeyWithLlm}
            keyPlaceholder={
              config.image.hasKey
                ? "● 已加密保存在云端 D1 数据库 (若不修改请留空)"
                : "输入单独的生图 API Key..."
            }
            onChange={(patch) => {
              if (patch.provider !== undefined) {
                handleImageProviderChange(patch.provider);
              } else {
                if (patch.apiKey !== undefined) setImageTestStatus("idle");
                updateChannel("image", patch);
              }
            }}
            onTest={handleTestImage}
            onSyncKeyToggle={(checked) =>
              setConfig((prev) => ({ ...prev, syncImageKeyWithLlm: checked }))
            }
          />

          {/* TTS 配置 */}
          <TtsConfigSection
            config={config.tts}
            speechModels={speechModels}
            speechModelsLoading={speechModelsLoading}
            speechModelsError={speechModelsError}
            onChange={(patch) => setConfig((prev) => ({ ...prev, tts: { ...prev.tts, ...patch } }))}
            onRefreshModels={loadSpeechModels}
          />

          {/* 视频配置 */}
          <ModelProviderCard
            channel="video"
            icon={<Film className="w-4 h-4" />}
            title="文生视频 / Video Generator (视频模型)"
            badge="MiniMax H3 · 异步生成"
            accentColor="purple"
            config={config.video}
            providerOptions={VIDEO_PROVIDERS}
            modelOptions={VIDEO_MODELS}
            testButtonLabel="服务端实测视频"
            testButtonIcon={<Film className="w-3.5 h-3.5" />}
            testStatus="idle"
            testMessage=""
            keyPlaceholder={
              config.video.hasKey
                ? "● 已加密保存在云端 D1 数据库 (若不修改请留空)"
                : "输入 MiniMax API Key (eyJhbGci...)"
            }
            footerNote={
              <>
                视频生成采用异步模式：提交任务后返回 job_id，通过轮询获取结果。镜头有分镜图时自动作为首帧走图生视频，并以首帧画幅约束输出；竖屏镜头没有首帧时会在付费提交前提示横屏风险。生成结果自动存入视频候选，可在生产看板中采用或退回。MiniMax API Key 请在{" "}
                <a
                  href="https://platform.minimaxi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  platform.minimaxi.com
                </a>{" "}
                申请。
              </>
            }
            onChange={(patch) => {
              if (patch.provider !== undefined) {
                handleVideoProviderChange(patch.provider);
              } else {
                updateChannel("video", patch);
              }
            }}
            onTest={() => {}}
          />

          {/* 高级端点配置 */}
          <AdvancedEndpointSection
            apiUrl={apiUrl}
            apiStatus={apiStatus}
            apiErrMsg={apiErrMsg}
            onUrlChange={(url) => {
              setApiUrl(url);
              setApiStatus("idle");
            }}
            onTest={testApiConnection}
          />

          {/* 脚注 */}
          <div className="text-[11px] text-muted-foreground/80 bg-muted/30 border border-border/50 rounded-lg p-2.5 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <span>所有连通性实测均由 Cloudflare Worker 后端服务器直接发起，非本地浏览器端直连，不受本地网络及跨域限制。</span>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">配置将安全持久化保存在云端 D1 数据库与本地</span>
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
