"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ShotModel, SequenceModel } from "@/types/shot";
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  Sparkles,
  Layers,
  Download,
  Copy,
  Sliders,
  Check,
  Loader2,
  RefreshCw,
  MessageSquare,
  MessageSquareOff,
  Key,
  Smartphone,
  Monitor,
} from "lucide-react";
import { normalizeAssetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buildH3CutItem } from "@/hooks/useH3Prompt";
import { generateH3Prompt } from "@/lib/h3Prompt";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";

interface CinemaTheaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shots: ShotModel[];
  sequences?: SequenceModel[];
  aspectRatio?: string;
  initialShotId?: string | null;
  targetDuration?: number;
  onSelectShot?: (shotId: string) => void;
  onOpenExport?: () => void;
  onOpenDetail?: (shot: ShotModel) => void;
  onRegenerateShotImage?: (shotId: string) => Promise<void> | void;
}

const SHOT_SIZE_NAME: Record<string, string> = {
  extreme_wide_shot: "大远景 (EWS)",
  wide_shot: "全景 (WS)",
  full_shot: "全景全身 (FS)",
  medium_shot: "中景 (MS)",
  medium_close_up: "中特写 (MCU)",
  close_up: "特写 (CU)",
  extreme_close_up: "大特写 (ECU)",
};

export const CinemaTheaterModal: React.FC<CinemaTheaterModalProps> = ({
  isOpen,
  onClose,
  shots,
  sequences = [],
  aspectRatio = "9:16",
  initialShotId,
  targetDuration = 30,
  onSelectShot,
  onOpenExport,
  onOpenDetail,
  onRegenerateShotImage,
}) => {
  const [activeAspectRatio, setActiveAspectRatio] = useState<"9:16" | "16:9">(
    (aspectRatio === "16:9" ? "16:9" : "9:16")
  );

  useEffect(() => {
    if (aspectRatio === "16:9" || aspectRatio === "9:16") {
      setActiveAspectRatio(aspectRatio);
    }
  }, [aspectRatio]);

  const [isBingeMode, setIsBingeMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopiedH3, setIsCopiedH3] = useState(false);
  const [isGeneratingCurrentShot, setIsGeneratingCurrentShot] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const hideControlsTimerRef = useRef<any>(null);

  // When binge mode is enabled, flatten all sequences' shots
  const activeShots = isBingeMode && sequences.length > 1
    ? sequences.flatMap((seq) => seq.shots || [])
    : shots;

  const totalDuration = activeShots.reduce((acc, s) => acc + (s.duration || 2.5), 0) || targetDuration;

  // Precompute precise start and end times for each shot to power the segmented scrubber
  const shotTimings = useMemo(() => {
    let accum = 0;
    return activeShots.map((s, idx) => {
      const dur = s.duration || 2.5;
      const start = accum;
      const end = accum + dur;
      accum = end;
      return {
        shotId: s.id,
        order: idx + 1,
        shotSize: s.shot_size,
        start,
        end,
        duration: dur,
        weightPct: totalDuration > 0 ? (dur / totalDuration) * 100 : 0,
      };
    });
  }, [activeShots, totalDuration]);

  // Auth & Key state perception
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
  const hasCustomKey = !isDemoUser && !!user?.custom_settings?.llmApiKey;

  const checkAuthAndKey = (actionName: string) => useAuthStore.getState().checkAuthAndKey(actionName);

  // Auto-hide controls when playing and idle for 2.5 seconds
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    } else {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying]);

  // Initialize selected shot
  useEffect(() => {
    if (isOpen && initialShotId) {
      const idx = activeShots.findIndex((s) => s.id === initialShotId);
      if (idx !== -1) {
        setCurrentIndex(idx);
        const startSec = activeShots.slice(0, idx).reduce((acc, s) => acc + (s.duration || 2.5), 0);
        setCurrentTime(startSec);
      }
    }
  }, [isOpen, initialShotId, activeShots]);

  // Find shot index based on elapsed seconds
  const getShotIndexAtTime = useCallback(
    (timeSec: number) => {
      let accum = 0;
      for (let i = 0; i < activeShots.length; i++) {
        const shotDur = activeShots[i].duration || 2.5;
        if (timeSec >= accum && timeSec < accum + shotDur) {
          return i;
        }
        accum += shotDur;
      }
      return Math.max(0, activeShots.length - 1);
    },
    [activeShots]
  );

  // Sync index when currentTime changes
  useEffect(() => {
    if (activeShots.length > 0) {
      const activeIdx = getShotIndexAtTime(currentTime);
      setCurrentIndex(activeIdx);
      if (onSelectShot && activeShots[activeIdx]) {
        onSelectShot(activeShots[activeIdx].id);
      }
    }
  }, [currentTime, getShotIndexAtTime, onSelectShot, activeShots]);

  // Playback Loop via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimestampRef.current = null;
      return;
    }

    const animate = (now: number) => {
      if (lastTimestampRef.current !== null) {
        const deltaSeconds = ((now - lastTimestampRef.current) / 1000) * playbackRate;
        setCurrentTime((prevTime) => {
          const nextTime = prevTime + deltaSeconds;
          if (nextTime >= totalDuration) {
            setIsPlaying(false);
            setCurrentIndex(Math.max(0, activeShots.length - 1));
            return totalDuration;
          }
          return nextTime;
        });
      }
      lastTimestampRef.current = now;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackRate, totalDuration, activeShots.length]);

  const handleClose = () => {
    if (activeShots[currentIndex] && onSelectShot) {
      onSelectShot(activeShots[currentIndex].id);
    }
    onClose();
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === "KeyC") {
        e.preventDefault();
        setShowSubtitles((prev) => !prev);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevShot();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextShot();
      } else if (e.code === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, activeShots]);

  if (!isOpen || activeShots.length === 0) return null;

  const currentShot = activeShots[currentIndex] || activeShots[0];
  const currentSequence = sequences.find((seq) => seq.shots?.some((s) => s.id === currentShot?.id));

  const handlePrevShot = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      const startSec = activeShots.slice(0, prevIdx).reduce((acc, s) => acc + (s.duration || 2.5), 0);
      setCurrentTime(startSec);
      setCurrentIndex(prevIdx);
    }
  };

  const handleNextShot = () => {
    if (currentIndex < activeShots.length - 1) {
      const nextIdx = currentIndex + 1;
      const startSec = activeShots.slice(0, nextIdx).reduce((acc, s) => acc + (s.duration || 2.5), 0);
      setCurrentTime(startSec);
      setCurrentIndex(nextIdx);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const handleCopyCurrentH3 = () => {
    if (!currentShot) return;
    try {
      const cutItem = buildH3CutItem(currentShot, currentIndex + 1);
      const promptText = generateH3Prompt([cutItem], { lang: "zh" });
      navigator.clipboard.writeText(promptText);
      setIsCopiedH3(true);
      notify.success(`已复制 #${currentIndex + 1} 镜标准 H3 视频生成提示词`);
      setTimeout(() => setIsCopiedH3(false), 2000);
    } catch (e) {
      notify.error("复制提示词失败");
    }
  };

  const getKenBurnsClass = (movType?: string, playing?: boolean) => {
    if (!playing) return "scale-100 translate-x-0 translate-y-0";
    switch (movType) {
      case "push_in":
      case "zoom_in":
        return "scale-110 transition-transform duration-[4500ms] ease-out";
      case "pull_out":
      case "zoom_out":
        return "scale-95 transition-transform duration-[4500ms] ease-out";
      case "pan_left":
        return "scale-105 -translate-x-3 transition-transform duration-[4500ms] ease-out";
      case "pan_right":
        return "scale-105 translate-x-3 transition-transform duration-[4500ms] ease-out";
      case "tilt_up":
        return "scale-105 -translate-y-2.5 transition-transform duration-[4500ms] ease-out";
      case "tilt_down":
        return "scale-105 translate-y-2.5 transition-transform duration-[4500ms] ease-out";
      default:
        return "scale-[1.03] transition-transform duration-[4500ms] ease-out";
    }
  };

  const camType = typeof currentShot?.camera_movement === "object"
    ? (currentShot?.camera_movement as any)?.type
    : currentShot?.camera_movement;

  return (
    <div
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className={cn(
        "fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200 overflow-hidden",
        isFullscreen ? "p-0" : "",
        !showControls && isPlaying && "cursor-none"
      )}
    >
      {/* Top Header Bar */}
      <div
        className={cn(
          "h-16 px-6 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md z-20 transition-all duration-300",
          !showControls && isPlaying ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-sm tracking-wider uppercase font-bold">
            <Film className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">PREVIZ CINEMA THEATER</span>
            <span className="sm:hidden font-mono">PREVIZ</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-white/90 font-mono shrink-0">
            {String(currentIndex + 1).padStart(2, "0")} / {String(activeShots.length).padStart(2, "0")}
          </span>

          {sequences.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const nextBinge = !isBingeMode;
                setIsBingeMode(nextBinge);
                setCurrentIndex(0);
                setCurrentTime(0);
                notify.info(nextBinge ? `🎬 已开启全剧连播模式（共 ${sequences.flatMap(s => s.shots || []).length} 镜）` : `🔍 已切换为当前单场精看模式（共 ${shots.length} 镜）`);
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm",
                isBingeMode
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold ring-2 ring-amber-400/40"
                  : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/15"
              )}
              title={isBingeMode ? "点击切换为仅播放当前单场" : "点击开启全剧跨场次连续试映"}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isBingeMode ? `🎬 全剧连续试映 (${activeShots.length}镜)` : `🔍 当前单场试映 (${activeShots.length}镜)`}</span>
            </button>
          )}

          {/* Dynamic 9:16 Vertical / 16:9 Landscape Aspect Ratio Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const next = activeAspectRatio === "9:16" ? "16:9" : "9:16";
              setActiveAspectRatio(next);
              notify.info(next === "9:16" ? "📱 已切换至 9:16 竖屏微短剧沉浸放映画幅" : "🖥️ 已切换至 16:9 宽银幕横屏放映画幅");
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border shadow-sm",
              activeAspectRatio === "9:16"
                ? "bg-sky-500/20 text-sky-300 border-sky-400/40 hover:bg-sky-500/30"
                : "bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30"
            )}
            title="点击在 9:16 竖屏短剧 与 16:9 宽屏放映 之间切换"
          >
            {activeAspectRatio === "9:16" ? <Smartphone className="w-3.5 h-3.5 text-sky-400" /> : <Monitor className="w-3.5 h-3.5 text-amber-400" />}
            <span className="font-mono font-bold">{activeAspectRatio}</span>
            <span className="hidden md:inline text-[10px] text-white/70">{activeAspectRatio === "9:16" ? "竖屏短剧" : "横屏宽幕"}</span>
          </button>
        </div>

        {/* Keyboard shortcut hints in center */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 select-none">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[10px] border border-white/10">Space</kbd>
            <span>播放/暂停</span>
          </span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[10px] border border-white/10">← / →</kbd>
            <span>切换镜头</span>
          </span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[10px] border border-white/10">C</kbd>
            <span>字幕</span>
          </span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[10px] border border-white/10">Esc</kbd>
            <span>退出</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 min-h-0 overflow-hidden">
        <button
          onClick={handlePrevShot}
          disabled={currentIndex === 0}
          className={cn(
            "absolute left-4 md:left-8 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 backdrop-blur disabled:opacity-20 disabled:pointer-events-none transition-all duration-300 shadow-xl",
            !showControls && isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div
          ref={containerRef}
          className={cn(
            "relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 border bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center group",
            activeAspectRatio === "9:16"
              ? "aspect-[9/16] h-[76vh] max-h-[76vh] w-auto max-w-[440px] mx-auto border-white/25 ring-1 ring-white/10 shadow-sky-500/10"
              : "w-full max-w-4xl aspect-video max-h-[75vh] border-white/15"
          )}
        >
          {currentShot?.storyboard_image_url ? (
            <img
              key={currentShot.id + (isPlaying ? "_playing" : "_static")}
              src={normalizeAssetUrl(currentShot.storyboard_image_url)}
              alt={`Shot ${currentIndex + 1}`}
              className={cn(
                "w-full h-full object-cover will-change-transform",
                getKenBurnsClass(camType, isPlaying)
              )}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/40 p-8 text-center select-none z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-amber-400/80 shadow-inner">
                {isGeneratingCurrentShot ? (
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                ) : (
                  <Film className="w-8 h-8 opacity-70 animate-pulse" />
                )}
              </div>
              <p className="text-xs font-mono tracking-widest text-white/50 uppercase mb-1">
                {SHOT_SIZE_NAME[currentShot?.shot_size] || currentShot?.shot_size?.toUpperCase() || "MEDIUM SHOT"} · 待显影画面
              </p>
              <p className="text-[11px] text-muted-foreground/60 max-w-md mb-4">
                当前镜头尚未冲印画面，可原位一键触发显影，实时无缝呈现
              </p>

              {onRegenerateShotImage && currentShot && (
                <button
                  type="button"
                  disabled={isGeneratingCurrentShot}
                  onClick={async () => {
                    if (!checkAuthAndKey("冲印镜头视觉画面")) return;
                    try {
                      setIsGeneratingCurrentShot(true);
                      notify.info(`🎨 正在原位冲印 #${currentIndex + 1} 镜画面，稍候...`);
                      await onRegenerateShotImage(currentShot.id);
                      notify.success(`✨ #${currentIndex + 1} 镜画面已显影入库！`);
                    } catch (err: any) {
                      notify.error(err?.message || "冲印画面失败");
                    } finally {
                      setIsGeneratingCurrentShot(false);
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50 hover:scale-105",
                    hasCustomKey
                      ? "bg-amber-500 hover:bg-amber-400 text-black"
                      : "bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30"
                  )}
                  title={hasCustomKey ? "原位冲印当前镜头的画面" : "当前为体验模式，点击注册专属账号并绑定 Key 开启显影"}
                >
                  {isGeneratingCurrentShot ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在显影中...</span>
                    </>
                  ) : hasCustomKey ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>🎨 即时显影此镜</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>🔑 注册专属账号显影此镜</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 shadow-lg text-white font-mono text-sm">
            {isBingeMode && (
              <>
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  全剧连播
                </span>
                <span className="text-white/40">·</span>
              </>
            )}
            {currentSequence && (
              <>
                <span className="font-bold text-amber-400">EP {currentSequence.episode_number || currentSequence.order}</span>
                <span className="text-white/40">·</span>
              </>
            )}
            <span className="font-bold text-sky-400">#{String(currentIndex + 1).padStart(2, "0")}</span>
            <span className="text-white/40">·</span>
            <span className="font-semibold text-white/90">{SHOT_SIZE_NAME[currentShot?.shot_size] || currentShot?.shot_size?.toUpperCase()}</span>
            <span className="text-white/40">·</span>
            <span className="text-emerald-400 font-bold">{currentShot?.duration || 2.5}s</span>
          </div>

          {camType && camType !== "static" && (
            <div className="hidden sm:flex absolute top-4 right-4 items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-xs font-mono text-sky-300">
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>运镜动势: {camType}</span>
            </div>
          )}

          {showSubtitles && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-6 pt-12 text-center flex flex-col items-center justify-end max-h-[45%] overflow-y-auto animate-fade-in">
              <p className="text-base md:text-xl font-medium text-white/95 tracking-wide drop-shadow-md max-w-4xl leading-relaxed">
                {currentShot?.action || "（无动作描述）"}
              </p>
              {currentShot?.dialogue && (
                <p className="text-sm md:text-base font-serif italic text-amber-300/90 mt-2">
                  “{currentShot.dialogue}”
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleNextShot}
          disabled={currentIndex === activeShots.length - 1}
          className={cn(
            "absolute right-4 md:right-8 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 backdrop-blur disabled:opacity-20 disabled:pointer-events-none transition-all duration-300 shadow-xl",
            !showControls && isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Playback & Scrubbing Controller Bar */}
      <div
        className={cn(
          "h-22 px-6 border-t border-white/10 bg-black/75 backdrop-blur-md flex flex-col justify-center gap-2 z-20 transition-all duration-300",
          !showControls && isPlaying ? "opacity-0 translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        {/* Segmented Shot Track with Micro-gaps */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            setCurrentTime(pct * totalDuration);
          }}
          className="h-3 w-full bg-white/5 rounded-md cursor-pointer relative flex items-center gap-1 group py-0.5 select-none"
          title="点击节拍轨跳转播放定位"
        >
          {shotTimings.map((st) => {
            const isCompleted = currentTime >= st.end;
            const isCurrent = currentTime >= st.start && currentTime < st.end;
            const fillPct = isCompleted
              ? 100
              : isCurrent
              ? Math.min(100, Math.max(0, ((currentTime - st.start) / Math.max(st.duration, 0.01)) * 100))
              : 0;

            return (
              <div
                key={st.shotId}
                style={{ width: `${st.weightPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTime(st.start);
                  setCurrentIndex(st.order - 1);
                }}
                className={cn(
                  "h-2 rounded-sm relative overflow-hidden transition-all duration-150 group/seg hover:h-2.5",
                  isCurrent ? "bg-white/20 ring-1 ring-amber-400/50" : "bg-white/10 hover:bg-white/15"
                )}
                title={`#${st.order} 镜 (${st.duration.toFixed(1)}s) - ${st.shotSize || "标准"}`}
              >
                <div
                  style={{ width: `${fillPct}%` }}
                  className={cn(
                    "h-full rounded-sm transition-[width] duration-75",
                    isCurrent
                      ? "bg-gradient-to-r from-amber-400 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : "bg-primary/90"
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-white text-xs gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
                setCurrentIndex(0);
              }}
              className="p-1.5 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
              title="重置到开头"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <span className="font-mono text-white/70">
              {Math.min(currentTime, totalDuration).toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>

            <div className="flex items-center gap-1 ml-1 hidden sm:flex">
              {[1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={cn(
                    "px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer",
                    playbackRate === rate ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white"
                  )}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* In-situ Render Current Shot Button in Toolbar */}
            {onRegenerateShotImage && currentShot && !currentShot.storyboard_image_url && (
              <button
                type="button"
                disabled={isGeneratingCurrentShot}
                onClick={async () => {
                  if (!checkAuthAndKey("冲印镜头视觉画面")) return;
                  try {
                    setIsGeneratingCurrentShot(true);
                    notify.info(`🎨 正在原位冲印 #${currentIndex + 1} 镜画面，稍候...`);
                    await onRegenerateShotImage(currentShot.id);
                    notify.success(`✨ #${currentIndex + 1} 镜画面已显影入库！`);
                  } catch (err: any) {
                    notify.error(err?.message || "冲印画面失败");
                  } finally {
                    setIsGeneratingCurrentShot(false);
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50",
                  hasCustomKey
                    ? "bg-amber-500 hover:bg-amber-400 text-black"
                    : "bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30"
                )}
                title={hasCustomKey ? "原位冲印当前镜头的画面" : "当前为体验模式，点击注册专属账号并绑定 Key 开启显影"}
              >
                {isGeneratingCurrentShot ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>显影中...</span>
                  </>
                ) : hasCustomKey ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>显影此镜</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>填Key显影</span>
                  </>
                )}
              </button>
            )}

            {/* Subtitles Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSubtitles((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                showSubtitles ? "bg-white/15 text-white border-white/30" : "bg-white/5 text-white/40 border-white/10 hover:text-white/70"
              )}
              title="显示/隐藏对白与动作描述字幕 (快捷键: C)"
            >
              {showSubtitles ? <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> : <MessageSquareOff className="w-3.5 h-3.5" />}
              <span>字幕 {showSubtitles ? "开" : "关"}</span>
            </button>

            <button
              onClick={handleCopyCurrentH3}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sky-300 hover:text-sky-200 border border-sky-400/20 text-xs font-medium transition-all cursor-pointer"
              title="复制当前分镜的海螺标准多模态生视频词 (H3 Prompt)"
            >
              {isCopiedH3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopiedH3 ? "已复制H3词" : "复制此镜H3"}</span>
            </button>

            {onOpenDetail && currentShot && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDetail(currentShot);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
                title="关闭影院，打开此镜头的深度参数精修面板"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>精修此镜</span>
              </button>
            )}

            {onOpenExport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenExport();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="导出全套工业分镜交付包 (PDF/ZIP/H3)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出交付包</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
