"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown, Sparkles, Mail, UserPlus, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/components/ui/ToastNotification";

interface UserMenuDropdownProps {
  align?: "left" | "right";
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({ align = "right" }) => {
  const { user, openSettingsModal, openAuthModal, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const isDemo =
    user.email === "demo@caifu.social" ||
    user.username.toLowerCase() === "demo" ||
    user.id === "demo";

  const avatarUrl =
    user.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`;

  const handleSwitchToPersonal = () => {
    setIsOpen(false);
    logout();
    openAuthModal("register");
    notify.info("🎬 已退出公共演示态，请注册或登录您的专属导演账号！");
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button with optional Demo pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-full ${
          isDemo
            ? "bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300"
            : "bg-secondary/70 hover:bg-secondary border border-border/80 text-foreground"
        } transition-all shadow-2xs hover:shadow-xs group cursor-pointer`}
        title={isDemo ? "当前处于官方演示 Demo 状态，点击查看与切换为专属账号" : "用户菜单与设置"}
      >
        <img
          src={avatarUrl}
          alt={user.username}
          className="w-5 h-5 rounded-full bg-primary/20 object-cover"
        />
        <span className="text-xs font-semibold max-w-[90px] truncate">
          {user.username}
        </span>
        {isDemo && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Demo
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${
            isOpen ? "rotate-180 text-foreground" : "group-hover:text-foreground"
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-2 w-72 rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-border/60`}
        >
          {/* User Info Header */}
          <div className="p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground truncate block max-w-[140px]">
                {user.username}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isDemo
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                {isDemo ? "⚡ 公共演示账号" : "PRO 导演"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Mail className="w-3 h-3 text-muted-foreground/70 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>

          {/* Demo VIP Upgrade Banner */}
          {isDemo && (
            <div className="py-2 px-1">
              <div className="p-2.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>准备好开启专属创作了吗？</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  当前处于公共体验通道，创建专属导演账号即可保存私有工程并绑定专属 API Key。
                </p>
                <button
                  type="button"
                  onClick={handleSwitchToPersonal}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>免费转为我的专属账号</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Action Links */}
          <div className="py-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openSettingsModal();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors text-left cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-primary" />
              <div className="flex-1">
                <span className="block font-semibold">AI 模型与 API 设置</span>
                <span className="text-[10px] text-muted-foreground block">
                  配置专属 OpenRouter Key & 模型
                </span>
              </div>
            </button>
          </div>

          {/* Logout Action */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
                notify.info("已安全退出登录");
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
