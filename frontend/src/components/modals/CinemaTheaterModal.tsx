"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { normalizeAssetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buildH3CutItem } from "@/hooks/useH3Prompt";
import { generateH3Prompt } from "@/lib/h3Prompt";
import { notify } from "@/components/ui/ToastNotification";

interface CinemaTheaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shots: ShotModel[];
  sequences?: SequenceModel[];
  initialShotId?: string | null;
  targetDuration?: number;
  onSelectShot?: (shotId: string) => void;
  onOpenExport?: () => void;
  onOpenDetail?: (shot: ShotModel) => void;
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
  initialShotId,
  targetDuration = 30,
  onSelectShot,
  onOpenExport,
  onOpenDetail,
}) => {
  const [isBingeMode, setIsBingeMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopiedH3, setIsCopiedH3] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // When binge mode is enabled, flatten all sequences' shots
  const activeShots = isBingeMode && sequences.length > 1
    ? sequences.flatMap((seq) => seq.shots || [])
    : shots;

  const totalDuration = activeShots.reduce((acc, s) => acc + (s.duration || 2.5), 0) || targetDuration;

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
  }, [isPlaying, playbackRate, totalDuration]);

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
      className={cn(
        "fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200",
        isFullscreen ? "p-0" : ""
      )}
    >
      <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
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
              onClick={() => {
                setIsBingeMode(!isBingeMode);
                setCurrentIndex(0);
                setCurrentTime(0);
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0",
                isBingeMode
                  ? "bg-amber-500 text-black shadow-sm font-bold"
                  : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/15"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBingeMode ? "🎬 全剧连播" : "🔍 单集精看"}</span>
            </button>
          )}
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
          className="absolute left-4 md:left-8 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 backdrop-blur disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div
          ref={containerRef}
          className="relative w-full max-w-4xl aspect-video max-h-[75vh] rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center group"
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
            <div className="flex flex-col items-center justify-center text-white/40 p-8 text-center select-none">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-amber-400/80 shadow-inner">
                <Film className="w-8 h-8 opacity-70 animate-pulse" />
              </div>
              <p className="text-xs font-mono tracking-widest text-white/50 uppercase mb-1">
                {SHOT_SIZE_NAME[currentShot?.shot_size] || currentShot?.shot_size?.toUpperCase() || "MEDIUM SHOT"} · 待显影画面
              </p>
              <p className="text-[11px] text-muted-foreground/60 max-w-md">
                （支持在分镜画板点击「冲印画面」生成视觉画面，此处实时进行台本时间轴预演）
              </p>
            </div>
          )}

          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 shadow-lg text-white font-mono text-sm">
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

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-6 pt-12 text-center flex flex-col items-center justify-end max-h-[45%] overflow-y-auto">
            <p className="text-base md:text-xl font-medium text-white/95 tracking-wide drop-shadow-md max-w-4xl leading-relaxed">
              {currentShot?.action || "（无动作描述）"}
            </p>
            {currentShot?.dialogue && (
              <p className="text-sm md:text-base font-serif italic text-amber-300/90 mt-2">
                “{currentShot.dialogue}”
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleNextShot}
          disabled={currentIndex === activeShots.length - 1}
          className="absolute right-4 md:right-8 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 backdrop-blur disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="h-22 px-6 border-t border-white/10 bg-black/70 backdrop-blur-md flex flex-col justify-center gap-2 z-20">
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            setCurrentTime(pct * totalDuration);
          }}
          className="h-2 w-full bg-white/10 rounded-full cursor-pointer relative overflow-hidden group"
        >
          <div
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full relative"
          />
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
              {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
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
