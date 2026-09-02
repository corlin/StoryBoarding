"use client";

import React, { useState, useEffect } from "react";
import { X, User, Key, Sparkles, Image as ImageIcon, Check, Loader2, ShieldCheck, LogOut, Zap, AlertCircle, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";

const LLM_PRESETS = [
  { id: "deepseek/deepseek-chat", name: "DeepSeek-V3", badge: "推荐 · 超高性价比", desc: "好莱坞视听分镜能力极强，调用成本极低" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", badge: "顶尖导演", desc: "文学剧本与光影镜头语言极其丰富" },
  { id: "openai/gpt-4o", name: "GPT-4o", badge: "多模态旗舰", desc: "动作结构与节奏逻辑严密稳定" },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", badge: "国风武侠首选", desc: "中文古典与江湖意境解析能力出色" },
];

const IMAGE_PRESETS = [
  { id: "google/imagen-3", name: "Google Imagen-3", badge: "推荐 · 电影级质感" },
  { id: "black-forest-labs/flux-schnell", name: "Flux.1 Schnell", badge: "极速预演" },
  { id: "openai/dall-e-3", name: "DALL-E 3", badge: "高保真构图" },
];

export const UserProfileModal: React.FC = () => {
  const { user, isProfileModalOpen, closeProfileModal, updateProfile, logout } = useAuthStore();

  const [username, setUsername] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("deepseek/deepseek-chat");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageModel, setImageModel] = useState("google/imagen-3");
  const [isSaving, setIsSaving] = useState(false);

  // Connectivity Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latency_ms?: number; reply?: string; error?: string } | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      const custom = user.custom_settings || {};
      setLlmApiKey(custom.llmApiKey || "");
      setLlmModel(custom.llmModel || "deepseek/deepseek-chat");
      setImageApiKey(custom.imageApiKey || "");
      setImageModel(custom.imageModel || "google/imagen-3");
      setTestResult(null);
    }
  }, [user]);

  if (!isProfileModalOpen || !user) return null;

  const handleTestKey = async () => {
    if (!llmApiKey.trim()) {
      notify.error("请先填入 OpenRouter API Key 后再进行连通性测试");
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await api.testLlm({
        api_key: llmApiKey.trim(),
        api_base: "https://openrouter.ai/api/v1",
        model: llmModel.trim() || "deepseek/deepseek-chat",
      });
      setTestResult(res);
      if (res.ok) {
        notify.success(`⚡ 连通性测试通过！响应耗时: ${res.latency_ms}ms`);
      } else {
        notify.error(`Key 测试失败: ${res.error || "未知异常"}`);
      }
    } catch (err: any) {
      console.error("Test key error:", err);
      setTestResult({ ok: false, error: err?.response?.data?.detail || err?.message || "网络请求超时或配置错误" });
      notify.error("测试请求失败，请检查网络或 Key 有效性");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      await updateProfile({
        username: username.trim(),
        custom_settings: {
          llmApiKey: llmApiKey.trim(),
          llmModel: llmModel.trim(),
          imageApiKey: imageApiKey.trim(),
          imageModel: imageModel.trim(),
        },
      });
      notify.success("🎬 个人设置与专属 API Key 已成功保存并在全端生效！");
      closeProfileModal();
    } catch (err: any) {
      console.error("Save profile error:", err);
      notify.error(err?.response?.data?.detail || "保存个人设置失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={closeProfileModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Profile Header */}
        <div className="flex items-center gap-3.5 border-b border-border pb-4">
          <img
            src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`}
            alt={user.username}
            className="w-12 h-12 rounded-xl bg-secondary border border-border/80 shadow-xs"
          />
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span>{user.username}</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                PRO 导演
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Section 1: Basic Info */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>导演昵称</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-medium"
            />
          </div>

          {/* Section 2: Personal OpenRouter / Model API Key Settings */}
          <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>专属 OpenRouter API Key <span className="text-amber-400">*</span></span>
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
              >
                <span>获取 Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-amber-200/90">
              💡 <strong>无公共兜底 Key 说明</strong>：本工作台不设置共享公共 Key，所有 AI 拆镜与生图均使用您个人的 OpenRouter Key（按实际调用在 OpenRouter 独立结算，无平台抽成）。
            </p>

            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[11px] font-medium text-foreground block mb-1">
                  OpenRouter API 密钥
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => {
                      setLlmApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="sk-or-v1-..."
                    className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTesting || !llmApiKey.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                    title="发送极简请求测试该 Key 是否有效及延迟"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{isTesting ? "测试中..." : "测试连通性"}</span>
                  </button>
                </div>
              </div>

              {/* Test Result Banner */}
              {testResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                    testResult.ok
                      ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-200"
                      : "bg-destructive/15 border-destructive/30 text-destructive-foreground"
                  }`}
                >
                  {testResult.ok ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.ok ? "✅ Key 有效且测试成功！" : "❌ Key 校验未通过"}</p>
                    {testResult.ok ? (
                      <p className="text-[11px] opacity-80 mt-0.5">
                        模型响应耗时: <span className="font-mono font-bold text-emerald-300">{testResult.latency_ms}ms</span> · 试连回复: {testResult.reply || "OK"}
                      </p>
                    ) : (
                      <p className="text-[11px] opacity-90 mt-0.5">{testResult.error || "请检查密钥是否正确或额度是否充足"}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Section: LLM Model Selection & Quick Presets */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>选择 LLM 剧本导演模型</span>
                  <span className="text-[10px] text-muted-foreground">支持点击快捷切换</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LLM_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setLlmModel(p.id)}
                      className={`p-2 rounded-lg border text-left transition-all text-xs ${
                        llmModel === p.id
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "bg-background/60 border-border/70 text-muted-foreground hover:text-foreground hover:bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{p.name}</span>
                        {llmModel === p.id && <Check className="w-3 h-3 text-primary" />}
                      </div>
                      <p className="text-[10px] opacity-75 mt-0.5 truncate">{p.badge}</p>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="自定义输入任意 OpenRouter 模型 ID..."
                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary mt-1"
                />
              </div>

              {/* Section: Image Model Selection & Quick Presets */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>选择 AI 故事板生图模型</span>
                  <span className="text-[10px] text-muted-foreground">支持点击快捷切换</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {IMAGE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setImageModel(p.id)}
                      className={`p-2 rounded-lg border text-left transition-all text-xs ${
                        imageModel === p.id
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "bg-background/60 border-border/70 text-muted-foreground hover:text-foreground hover:bg-background"
                      }`}
                    >
                      <span className="font-bold block truncate">{p.name}</span>
                      <span className="text-[10px] opacity-75 block truncate mt-0.5">{p.badge}</span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  placeholder="自定义生图模型 ID..."
                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary mt-1"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                logout();
                notify.info("已安全退出登录");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出登录</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeProfileModal}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>保存设置</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
