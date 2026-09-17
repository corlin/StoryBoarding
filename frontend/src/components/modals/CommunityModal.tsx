"use client";

import React, { useEffect } from "react";
import { X, MessageCircle, Sparkles, CheckCircle2, Users } from "lucide-react";

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#121620] border border-white/15 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative text-foreground animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer z-10"
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase">
              Author & Community
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground">
            联系作者 · 交流与进群
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            欢迎与作者探讨 AI 影视创作、定制工作流或提出功能建议，入群与更多创作者共同交流。
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#0d1016]">
          {/* Card with high-contrast white background for reliable QR scanning */}
          <div className="bg-white p-3 rounded-2xl shadow-xl border border-white/20 flex flex-col items-center">
            <img
              src="/assets/wechat-author-qrcode.png"
              alt="作者微信二维码 · 永林"
              className="w-56 h-auto max-h-72 object-contain rounded-lg select-none"
            />
          </div>

          {/* Author Badge */}
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>微信扫一扫添加作者（永林）</span>
          </div>
        </div>

        {/* Guidance and Remarks */}
        <div className="p-6 pt-3 space-y-3 bg-[#121620] border-t border-white/5 text-xs">
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>进群说明：</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              添加微信好友时请备注「<strong className="text-primary font-semibold">StoryBoarding</strong>」或「<strong className="text-primary font-semibold">短剧</strong>」，作者将即刻拉您进入官方创作者与技术交流群。
            </p>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              短剧分镜设计、视听语言预演与成片工作流讨论
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              MiniMax / BytePlus 等模型生产实践与问题反馈
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-all border border-white/10 cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
