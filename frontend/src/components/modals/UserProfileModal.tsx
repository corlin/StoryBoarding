"use client";

import React, { useState, useEffect } from "react";
import { X, User, Key, Sparkles, Image as ImageIcon, Check, Loader2, ShieldCheck, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/components/ui/ToastNotification";

export const UserProfileModal: React.FC = () => {
  const { user, isProfileModalOpen, closeProfileModal, updateProfile, logout } = useAuthStore();

  const [username, setUsername] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("deepseek/deepseek-chat");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageModel, setImageModel] = useState("google/imagen-3");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      const custom = user.custom_settings || {};
      setLlmApiKey(custom.llmApiKey || "");
      setLlmModel(custom.llmModel || "deepseek/deepseek-chat");
      setImageApiKey(custom.imageApiKey || "");
      setImageModel(custom.imageModel || "google/imagen-3");
    }
  }, [user]);

  if (!isProfileModalOpen || !user) return null;

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
      notify.success("🎬 个人设置与专属 API Key 已保存生效！");
      closeProfileModal();
    } catch (err: any) {
      console.error("Save profile error:", err);
      notify.error(err?.response?.data?.detail || "保存个人设置失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>导演昵称</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Section 2: Personal OpenRouter / Model API Key Settings */}
          <div className="p-4 rounded-xl border border-border/70 bg-secondary/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>专属 OpenRouter API Key (可选)</span>
              </div>
              <span className="text-[10px] text-muted-foreground">用户自定义优先</span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              填入您的专属 OpenRouter Key 即可享受独立模型配额与并发。未填写时自动使用系统默认 Key。
            </p>

            <div className="space-y-2.5 pt-1">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  OpenRouter API 密钥
                </label>
                <input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    指定 LLM 导演模型
                  </label>
                  <input
                    type="text"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    placeholder="deepseek/deepseek-chat"
                    className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    指定 AI 生图模型
                  </label>
                  <input
                    type="text"
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    placeholder="google/imagen-3"
                    className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
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
