"use client";

import React from "react";
import {
  Film,
  Sparkles,
  X,
  CheckCircle2,
  ArrowRight,
  Clock,
  Layers,
  Key,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DramaticBeatPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyText: string;
  targetDuration: number;
  onConfirmAuth: () => void;
  onExploreDemo: () => void;
}

export function DramaticBeatPreviewModal({
  isOpen,
  onClose,
  storyText,
  targetDuration,
  onConfirmAuth,
  onExploreDemo,
}: DramaticBeatPreviewModalProps) {
  if (!isOpen) return null;

  // Auto-generate 3 dynamic dramatic beats from story text
  const cleanStory = storyText.trim();
  const titleSuggestion = cleanStory.slice(0, 16) || "新电影企划";

  const beat1 = cleanStory.length > 30
    ? cleanStory.slice(0, Math.floor(cleanStory.length * 0.33))
    : cleanStory || "主角置身于突发危机或特殊情境，核心动机显露。";

  const beat2 = cleanStory.length > 30
    ? cleanStory.slice(Math.floor(cleanStory.length * 0.33), Math.floor(cleanStory.length * 0.66))
    : "对手施加极限反制，矛盾全面激化，主角面临命运抉择。";

  const beat3 = cleanStory.length > 30
    ? cleanStory.slice(Math.floor(cleanStory.length * 0.66))
    : "核心秘密与伏笔揭晓，爆发出人意料的反转与高潮终局。";

  const shotCount = targetDuration === 30 ? 12 : 24;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101016] border border-border/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  AI 导演剧本骨架初拆就绪！
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  三幕节拍
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                已为您自动完成起承转合戏剧冲突解构，准备生成 {shotCount} 组镜头与对白台本
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Dramatic Beats Preview */}
        <div className="space-y-3">
          {/* Beat 1 */}
          <div className="p-3 rounded-xl bg-card/60 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sky-400 font-mono">01. 起 · 钩子与危机入画</span>
              <span className="text-[10px] text-muted-foreground font-mono">第 1~{Math.floor(shotCount * 0.3)} 镜</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-serif">
              {beat1}
            </p>
          </div>

          {/* Beat 2 */}
          <div className="p-3 rounded-xl bg-card/60 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-400 font-mono">02. 承 · 对抗逼迫与施压</span>
              <span className="text-[10px] text-muted-foreground font-mono">第 {Math.floor(shotCount * 0.3) + 1}~{Math.floor(shotCount * 0.7)} 镜</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-serif">
              {beat2}
            </p>
          </div>

          {/* Beat 3 */}
          <div className="p-3 rounded-xl bg-card/60 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400 font-mono">03. 转合 · 核心反转与高潮兑现</span>
              <span className="text-[10px] text-muted-foreground font-mono">第 {Math.floor(shotCount * 0.7) + 1}~{shotCount} 镜</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-serif">
              {beat3}
            </p>
          </div>
        </div>

        {/* Action Prompt */}
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>注册或登录专属导演空间，本剧本骨架与设定将自动保存并生成。</span>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onExploreDemo}
            className="px-4 py-2.5 rounded-xl border border-border bg-secondary/80 hover:bg-secondary text-foreground text-xs font-semibold transition-colors text-center cursor-pointer"
          >
            ⚡ 先看现成 18 镜样片工作台
          </button>

          <button
            type="button"
            onClick={onConfirmAuth}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>注册并开始生成分镜</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
