"use client";

import React, { useState, useEffect } from "react";
import { X, User, Settings as SettingsIcon, LogOut, Check, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/components/ui/ToastNotification";

interface UserProfileModalProps {
  onOpenSettings?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onOpenSettings }) => {
  const { user, isProfileModalOpen, closeProfileModal, updateProfile, logout } = useAuthStore();

  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
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
      });
      notify.success("🎬 导演昵称已成功更新！");
      closeProfileModal();
    } catch (err: any) {
      console.error("Save profile error:", err);
      notify.error(err?.response?.data?.detail || "更新昵称失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
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
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>修改导演昵称</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-medium"
            />
          </div>

          {/* Quick link to SettingsModal */}
          <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground block">AI 模型与 API 密钥设置</span>
              <span className="text-[11px] text-muted-foreground">配置 OpenRouter Key、LLM 导演与生图模型</span>
            </div>
            <button
              type="button"
              onClick={() => {
                closeProfileModal();
                if (onOpenSettings) onOpenSettings();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 border border-border text-foreground flex items-center gap-1.5 transition-colors"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-primary" />
              <span>前往设置</span>
            </button>
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
                <span>保存昵称</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
