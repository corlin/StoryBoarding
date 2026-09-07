"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ProjectModel, ShotModel, SequenceModel } from "@/types/shot";
import { normalizeAssetUrl } from "@/lib/api";
import { computeProjectQualityDiagnostics, DiagnosticItem } from "@/components/modals/ProjectQualityRadarModal";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Camera,
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TheaterReviewStudioViewProps {
  project: ProjectModel | null;
  shots?: ShotModel[];
  onOpenDetail?: (shot: ShotModel) => void;
  onRegenerateShotImage?: (shotId: string) => Promise<void> | void;
}

export const TheaterReviewStudioView: React.FC<TheaterReviewStudioViewProps> = ({
  project,
  shots = [],
  onOpenDetail,
  onRegenerateShotImage,
}) => {
  const { setActiveStudioStage } = useWorkspaceStore();
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screeningRoomRef = useRef<HTMLDivElement>(null);

  const activeShot = shots[currentShotIndex] || shots[0];

  // Quality Diagnostics
  const { diagnostics, score: radarScore } = useMemo(() => {
    return computeProjectQualityDiagnostics(project, shots);
  }, [project, shots]);

  const failedItems = diagnostics.filter((d) => d.status === "fail");
  const warnItems = diagnostics.filter((d) => d.status === "warn");
  const passItems = diagnostics.filter((d) => d.status === "pass");

  // Playback Loop Engine
  useEffect(() => {
    if (!isPlaying || shots.length === 0) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }
    const currentDuration = Math.max((activeShot?.duration || 2) * 1000 / playbackSpeed, 1000);
    playTimerRef.current = setTimeout(() => {
      setCurrentShotIndex((prev) => (prev + 1) % shots.length);
    }, currentDuration);

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentShotIndex, shots.length, activeShot, playbackSpeed]);

  const handleTogglePlay = () => setIsPlaying((prev) => !prev);
  const handlePrev = () => setCurrentShotIndex((prev) => (prev > 0 ? prev - 1 : shots.length - 1));
  const handleNext = () => setCurrentShotIndex((prev) => (prev + 1) % shots.length);

  const handleToggleFullscreen = () => {
    if (!screeningRoomRef.current) return;
    if (!document.fullscreenElement) {
      screeningRoomRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Studio Professional Keyboard Shortcuts (Space: Play/Pause, Left/Right: Step, F: Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if typing in text inputs or textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setIsPlaying(false);
        handlePrev();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setIsPlaying(false);
        handleNext();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shots.length]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Studio Header Bar */}
      <div className="h-12 border-b border-border/70 bg-card/60 px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs md:text-sm font-bold text-foreground">
                STAGE 03 · 动态放映与工程质检 (Theater & Review Suite)
              </h2>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border",
                radarScore >= 85
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : radarScore >= 70
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              )}>
                健康度 {radarScore} 分
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              连续动态视听监看，伴随穿透式工程质量雷达自动诊断与错漏定位
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveStudioStage("deliver")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
          >
            <span>前往 Stage 04 交付</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Studio Body: Player + Companion QA Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Screening Room (75%) */}
        <div ref={screeningRoomRef} className="flex-1 lg:w-3/4 flex flex-col bg-black/95 relative overflow-hidden">
          {/* Main Visual Display Area */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            {shots.length === 0 ? (
              <div className="text-center space-y-2 text-muted-foreground">
                <Film className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-xs">暂无镜头数据，请先在 Stage 02 分镜工坊生成分镜</p>
              </div>
            ) : activeShot?.storyboard_image_url ? (
              <div className="relative max-h-full max-w-full flex items-center justify-center shadow-2xl rounded-lg overflow-hidden group">
                <img
                  src={normalizeAssetUrl(activeShot.storyboard_image_url)}
                  alt={`Shot ${currentShotIndex + 1}`}
                  className="max-h-[calc(100vh-280px)] object-contain rounded-lg transition-transform duration-700"
                />

                {/* Director HUD Overlay */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-white/90 border border-white/10 flex items-center gap-2">
                  <span className="font-bold text-amber-400">SHOT #{currentShotIndex + 1}</span>
                  <span className="text-white/40">|</span>
                  <span>{activeShot.shot_size || "中景"}</span>
                  <span className="text-white/40">|</span>
                  <span>{activeShot.camera_movement?.type || "固定镜头"}</span>
                  <span className="text-white/40">|</span>
                  <span>{activeShot.duration || 2.5}s</span>
                </div>

                {/* Subtitle / Dialogue Bar */}
                {activeShot.dialogue && (
                  <div className="absolute bottom-4 inset-x-8 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-center border border-white/10 shadow-xl">
                    <p className="text-xs sm:text-sm font-semibold text-white tracking-wide">
                      {activeShot.dialogue}
                    </p>
                    {activeShot.action && (
                      <p className="text-[11px] text-white/60 mt-0.5">{activeShot.action}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-white/20 bg-white/5 text-center space-y-3 max-w-md">
                <Camera className="w-8 h-8 mx-auto text-amber-400" />
                <h3 className="text-sm font-bold text-white">镜头 #{currentShotIndex + 1} 尚未渲染</h3>
                <p className="text-xs text-white/60">
                  {activeShot?.image_prompt || activeShot?.action || "暂无提示词描述"}
                </p>
                {onRegenerateShotImage && (
                  <button
                    type="button"
                    onClick={() => activeShot && onRegenerateShotImage(activeShot.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>立即显影渲染此镜</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Screening Transport Controls & Timeline Track */}
          <div className="h-20 border-t border-white/10 bg-black/90 px-4 flex flex-col justify-between py-2 shrink-0 select-none">
            {/* Film Strip Thumbnails Track */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {shots.map((s, idx) => {
                const isCur = idx === currentShotIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setCurrentShotIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={cn(
                      "w-14 h-9 rounded bg-white/5 border overflow-hidden shrink-0 transition-all relative group cursor-pointer",
                      isCur
                        ? "border-amber-400 ring-2 ring-amber-400/40 scale-105"
                        : "border-white/10 opacity-60 hover:opacity-100"
                    )}
                  >
                    {s.storyboard_image_url ? (
                      <img
                        src={normalizeAssetUrl(s.storyboard_image_url)}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-white/40">
                        #{idx + 1}
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono font-bold bg-black/80 text-white/80 px-1 rounded">
                      {s.duration || 2}s
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Transport Control Buttons */}
            <div className="flex items-center justify-between text-xs text-white/80 pt-1">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-amber-400 font-bold">
                  {currentShotIndex + 1} / {shots.length || 0}
                </span>
                <span className="text-white/40">·</span>
                <span>
                  {shots.reduce((acc, s) => acc + (s.duration || 2), 0).toFixed(1)}s 全片
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="上一镜 (快捷键: ← 方向键)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-md"
                  title={isPlaying ? "暂停放映 (快捷键: Space 空格)" : "连播放映 (快捷键: Space 空格)"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="下一镜 (快捷键: → 方向键)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Right Transport Status & Shortcuts Badge */}
              <div className="flex items-center gap-2 font-mono text-[11px]">
                {/* Micro Keyboard Hints Badge */}
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10 mr-1">
                  <span>Space 播放</span>
                  <span>·</span>
                  <span>← → 步进</span>
                  <span>·</span>
                  <span>F 全屏</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? "开启音效" : "静音"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1)}
                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] cursor-pointer"
                  title="调整连播倍速"
                >
                  {playbackSpeed}x
                </button>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="p-1 hover:text-white transition-colors cursor-pointer ml-1"
                  title={isFullscreen ? "退出全屏 (F)" : "全屏大屏监看 (F)"}
                >
                  <Maximize2 className={cn("w-4 h-4", isFullscreen && "text-amber-400")} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QA Diagnostic Inspector (25%) */}
        <div className="flex-1 lg:w-1/4 flex flex-col border-t lg:border-t-0 lg:border-l border-border/70 bg-card/40 overflow-hidden">
          <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>工程体检雷达诊断</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {failedItems.length} 阻断 · {warnItems.length} 提示
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {/* Health Overview Summary */}
            <div className="p-3 rounded-xl bg-card border border-border/70 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">全案视听就绪度</span>
                <span className={cn(
                  "font-mono text-sm font-bold",
                  radarScore >= 85 ? "text-emerald-400" : radarScore >= 70 ? "text-amber-400" : "text-rose-400"
                )}>
                  {radarScore} / 100
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    radarScore >= 85 ? "bg-emerald-500" : radarScore >= 70 ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${radarScore}%` }}
                />
              </div>
            </div>

            {/* Diagnostic Issues List */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                诊断清单与穿透定位 ({diagnostics.length})
              </h4>

              {diagnostics.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.stage === "storyboard" || item.jumpTarget === "storyboard") {
                      setActiveStudioStage("storyboard");
                    } else if (item.stage === "outline" || item.stage === "cast" || item.stage === "art") {
                      setActiveStudioStage("prep");
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer group shadow-2xs space-y-1.5",
                    item.status === "fail"
                      ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/60"
                      : item.status === "warn"
                      ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60"
                      : "bg-card border-border/60 hover:border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {item.status === "fail" ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : item.status === "warn" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-foreground truncate">{item.ruleName}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                      {item.stageLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.detail}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-0.5">
                    <span className="text-primary group-hover:underline flex items-center gap-0.5">
                      点击前往修复 <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
