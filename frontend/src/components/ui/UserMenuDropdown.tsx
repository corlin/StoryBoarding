"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, LogOut, ChevronDown, Sparkles, Mail, History } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/components/ui/ToastNotification";

interface UserMenuDropdownProps {
  align?: "left" | "right";
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({ align = "right" }) => {
  const { user, openSettingsModal, logout } = useAuthStore();
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

  const avatarUrl =
    user.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-secondary/70 hover:bg-secondary border border-border/80 transition-all shadow-2xs hover:shadow-xs group"
        title="用户菜单与设置"
      >
        <img
          src={avatarUrl}
          alt={user.username}
          className="w-5 h-5 rounded-full bg-primary/20 object-cover"
        />
        <span className="text-xs font-semibold text-foreground max-w-[100px] truncate">
          {user.username}
        </span>
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
          } mt-2 w-64 rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-border/60`}
        >
          {/* User Info Header */}
          <div className="p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground truncate block max-w-[150px]">
                {user.username}
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                PRO 导演
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Mail className="w-3 h-3 text-muted-foreground/70 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>

          {/* Action Links */}
          <div className="py-1.5 space-y-0.5">
            <Link
              href="/releases"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors text-left"
            >
              <History className="w-3.5 h-3.5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="block font-semibold">版本更新动态</span>
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-primary/15 text-primary font-bold">
                    v1.3.0
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  短剧引擎、手机端优化等新特性
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openSettingsModal();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors text-left"
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
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
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
