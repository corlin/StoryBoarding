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
} from "lucide-react";
import { normalizeAssetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CinemaTheaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shots: ShotModel[];
  sequences?: SequenceModel[];
  initialShotId?: string | null;
  targetDuration?: number;
  onSelectShot?: (shotId: string) => void;
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
}) => {
  const [isBingeMode, setIsBingeMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-white/10 bg-black/40 text-white z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/20 text-primary border border-primary/30 text-xs font-semibold">
            <Film className="w-4 h-4" />
            <span>影院监看模式 · 动态分镜 (Animatic Previz)</span>
          </div>
          <span className="text-sm font-medium text-white/90 font-mono">
            Shot {String(currentIndex + 1).padStart(2, "0")} / {String(activeShots.length).padStart(2, "0")}
          </span>

          {/* Binge Mode Toggle Button */}
          {sequences.length > 1 && (
            <button
              onClick={() => {
                setIsBingeMode(!isBingeMode);
                setCurrentIndex(0);
                setCurrentTime(0);
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ml-2",
                isBingeMode
                  ? "bg-amber-500 text-black shadow-sm font-bold"
                  : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/15"
              )}
              title={isBingeMode ? "切换为当前单集预演" : "开启全剧多集连续试映连播 (Binge Previz)"}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isBingeMode ? "🎬 全剧连播 (全集)" : "🔍 单集精看"}</span>
            </button>
          )}
        </div>

        {/* Center Hotkeys Hint */}
        <div className="hidden md:flex items-center gap-4 text-xs text-white/50">
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">空格</kbd> 播放/暂停</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">← / →</kbd> 切镜</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">Esc</kbd> 退出即修</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
            title={isFullscreen ? "退出全屏" : "全屏监看"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white transition-colors"
            title="关闭监看 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Cinematic Display Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 min-h-0">
        {/* Left Arrow Navigation */}
        <button
          onClick={handlePrevShot}
          disabled={currentIndex === 0}
          className="absolute left-4 md:left-8 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 backdrop-blur disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* 16:9 Large Master Storyboard Frame */}
        <div
          ref={containerRef}
          className="relative max-h-[75vh] aspect-video w-auto max-w-[92vw] rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-950 flex items-center justify-center group"
        >
          {currentShot?.storyboard_image_url ? (
            <img
              src={normalizeAssetUrl(currentShot.storyboard_image_url)}
              alt={`Shot ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/30 p-8 text-center">
              <Film className="w-16 h-16 mb-3 opacity-40 animate-pulse" />
              <p className="text-sm font-mono tracking-widest uppercase">
                {currentShot?.shot_size || "MEDIUM SHOT"}
              </p>
            </div>
          )}

          {/* Top Left Shot Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 shadow-lg text-white font-mono text-sm">
            {currentSequence && (
              <>
                <span className="font-bold text-amber-400">
                  EP {currentSequence.episode_number || currentSequence.order}
                </span>
                <span className="text-white/40">·</span>
              </>
            )}
            <span className="font-bold text-sky-400">
              #{String(currentIndex + 1).padStart(2, "0")}
            </span>
            <span className="text-white/40">·</span>
            <span className="font-semibold text-white/90">
              {SHOT_SIZE_NAME[currentShot?.shot_size] || currentShot?.shot_size?.toUpperCase()}
            </span>
            <span className="text-white/40">·</span>
            <span className="text-emerald-400 font-bold">{currentShot?.duration || 2.5}s</span>
          </div>

          {/* Top Right Camera Angle / Movement Badge */}
          {currentShot?.camera_movement?.type && currentShot.camera_movement.type !== "static" && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-xs font-mono text-sky-300">
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>运镜: {currentShot.camera_movement.type}</span>
            </div>
          )}

          {/* Bottom Subtitle / Screenplay Action Box */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-6 pt-12 text-center flex flex-col items-center justify-end">
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

        {/* Right Arrow Navigation */}
        <button
          onClick={handleNextShot}
          disabled={currentIndex === activeShots.length - 1}
          className="absolute right-4 md:right-8 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 backdrop-blur disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Transport Control Bar */}
      <div className="h-20 px-6 border-t border-white/10 bg-black/60 backdrop-blur-md flex flex-col justify-center gap-2 z-20">
        {/* Scrubber Progress Bar */}
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

        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
                setCurrentIndex(0);
              }}
              className="p-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
              title="重置到开头"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <span className="font-mono text-white/70">
              {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={cn(
                  "px-2 py-0.5 rounded font-mono text-[11px]",
                  playbackRate === rate ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white"
                )}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
