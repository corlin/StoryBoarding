"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Sparkles, ChevronLeft, RefreshCcw } from "lucide-react";

interface WorkspaceLoadingScreenProps {
  message?: string;
  subMessage?: string;
  onRetry?: () => void;
}

const LOADING_PHASES = [
  "正在装载电影剧本节拍与场次结构...",
  "正在解析 16:9 / 9:16 视听分镜画卷...",
  "正在同步人物档案与全局视觉设定集 (Bible)...",
  "好莱坞电影预演画板即刻呈现...",
];

export const WorkspaceLoadingScreen: React.FC<WorkspaceLoadingScreenProps> = ({
  message = "好莱坞 AI 导演工作台",
  subMessage,
  onRetry,
}) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 1600);

    const elapsedTimer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= 10) setIsSlow(true);
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0c] text-foreground select-none overflow-hidden animate-in fade-in duration-300">
      {/* Cinematic Ambient Glow & Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.14),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e1e28_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center space-y-6">
        {/* Animated Film Reel & Aperture Indicator */}
        <div className="relative flex items-center justify-center">
          {/* Subtle breathing ripple rings */}
          <div className="absolute w-24 h-24 rounded-full bg-primary/10 border border-primary/20 animate-ping opacity-30 pointer-events-none" />
          <div className="absolute w-20 h-20 rounded-2xl bg-primary/5 border border-primary/30 animate-pulse pointer-events-none" />

          {/* Center Reel Icon Box */}
          <div className="relative w-16 h-16 rounded-2xl bg-card/90 border border-border/80 shadow-2xl backdrop-blur-xl flex items-center justify-center">
            <Film className="w-8 h-8 text-primary animate-[spin_6s_linear_infinite]" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Title & Metadata Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border/60 text-[10px] font-mono text-muted-foreground tracking-wider uppercase shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>35mm Film Previz Workstation</span>
          </div>

          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {message}
          </h2>

          <p className="text-xs text-muted-foreground h-5 flex items-center justify-center transition-all duration-300 font-mono">
            {subMessage || LOADING_PHASES[phaseIndex]}
          </p>
        </div>

        {/* Sleek Cinematic Progress Shimmer Line */}
        <div className="w-52 h-1 bg-secondary/80 border border-border/50 rounded-full overflow-hidden relative shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent -translate-x-full animate-[shimmer_1.4s_infinite]" />
        </div>

        {/* Slow Network / Timeout Fallback Prompt */}
        {isSlow && (
          <div className="pt-2 animate-in fade-in zoom-in-95 duration-200 space-y-3">
            <p className="text-[11px] text-amber-300/90 font-medium">
              ⚠️ 云端数据库响应较慢，若长时间无响应可尝试重载或返回看板
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onRetry) onRetry();
                  else window.location.reload();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
              >
                <RefreshCcw className="w-3 h-3" />
                <span>重新载入</span>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回看板</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Footer Watermark */}
      <div className="absolute bottom-6 text-[10px] font-mono text-muted-foreground/50 tracking-widest uppercase">
        D1 Cloud Runtime · High-Fidelity Director Engine
      </div>
    </div>
  );
};
