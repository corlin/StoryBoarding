import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Camera,
  Film,
  Sparkles,
} from "lucide-react";
import { ShotModel } from "@/types/shot";

interface CinemaTheaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shots: ShotModel[];
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
  initialShotId,
  targetDuration = 30,
  onSelectShot,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const totalDuration = shots.reduce((acc, s) => acc + (s.duration || 2.5), 0) || targetDuration;

  // Initialize selected shot
  useEffect(() => {
    if (isOpen && initialShotId) {
      const idx = shots.findIndex((s) => s.id === initialShotId);
      if (idx !== -1) {
        setCurrentIndex(idx);
        // Calculate starting time of this shot
        const startSec = shots.slice(0, idx).reduce((acc, s) => acc + (s.duration || 2.5), 0);
        setCurrentTime(startSec);
      }
    }
  }, [isOpen, initialShotId, shots]);

  // Find shot index based on elapsed seconds
  const getShotIndexAtTime = useCallback(
    (timeSec: number) => {
      let accum = 0;
      for (let i = 0; i < shots.length; i++) {
        const shotDur = shots[i].duration || 2.5;
        if (timeSec >= accum && timeSec < accum + shotDur) {
          return i;
        }
        accum += shotDur;
      }
      return Math.max(0, shots.length - 1);
    },
    [shots]
  );

  // Sync index when currentTime changes
  useEffect(() => {
    if (shots.length > 0) {
      const activeIdx = getShotIndexAtTime(currentTime);
      setCurrentIndex(activeIdx);
      if (onSelectShot && shots[activeIdx]) {
        onSelectShot(shots[activeIdx].id);
      }
    }
  }, [currentTime, getShotIndexAtTime, onSelectShot, shots]);

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
            return 0; // Loop or reset to beginning
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
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, shots]);

  if (!isOpen || shots.length === 0) return null;

  const currentShot = shots[currentIndex] || shots[0];

  const handlePrevShot = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      const startSec = shots.slice(0, prevIdx).reduce((acc, s) => acc + (s.duration || 2.5), 0);
      setCurrentTime(startSec);
      setCurrentIndex(prevIdx);
    }
  };

  const handleNextShot = () => {
    if (currentIndex < shots.length - 1) {
      const nextIdx = currentIndex + 1;
      const startSec = shots.slice(0, nextIdx).reduce((acc, s) => acc + (s.duration || 2.5), 0);
      setCurrentTime(startSec);
      setCurrentIndex(nextIdx);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = ratio * totalDuration;
    setCurrentTime(targetSec);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
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
          <span className="text-sm font-medium text-white/90">
            Shot {String(currentIndex + 1).padStart(2, "0")} / {String(shots.length).padStart(2, "0")}
          </span>
        </div>

        {/* Center Hotkeys Hint */}
        <div className="hidden md:flex items-center gap-4 text-xs text-white/50">
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">空格</kbd> 播放/暂停</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">← / →</kbd> 切镜</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">Esc</kbd> 退出</span>
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
            onClick={onClose}
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
              src={currentShot.storyboard_image_url}
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
            <span className="font-bold text-sky-400">
              {String(currentIndex + 1).padStart(2, "0")}
            </span>
            <span className="text-white/40">·</span>
            <span className="font-semibold text-white/90">
              {SHOT_SIZE_NAME[currentShot?.shot_size] || currentShot?.shot_size?.toUpperCase()}
            </span>
            <span className="text-white/40">·</span>
            <span className="text-emerald-400 font-bold">{currentShot?.duration}s</span>
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
              <p className="text-sm md:text-base font-serif text-amber-300/90 mt-1 italic">
                {currentShot.dialogue}
              </p>
            )}
          </div>
        </div>

        {/* Right Arrow Navigation */}
        <button
          onClick={handleNextShot}
          disabled={currentIndex === shots.length - 1}
          className="absolute right-4 md:right-8 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 backdrop-blur disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Timeline Control Panel */}
      <div className="border-t border-white/10 bg-black/80 backdrop-blur-md px-6 py-4 space-y-3 z-20">
        {/* Scrubber Bar with Shot Segments */}
        <div
          onClick={handleSeek}
          className="relative h-4 bg-white/10 rounded-full cursor-pointer overflow-hidden border border-white/15 group"
        >
          {/* Shot Segment Markers */}
          <div className="absolute inset-0 flex">
            {shots.map((shot, idx) => {
              const shotDur = shot.duration || 2.5;
              const widthPct = (shotDur / totalDuration) * 100;
              return (
                <div
                  key={shot.id}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full border-r border-black/40 transition-colors ${
                    idx === currentIndex ? "bg-primary/50" : "hover:bg-white/15"
                  }`}
                  title={`Shot ${idx + 1} (${shotDur}s)`}
                />
              );
            })}
          </div>

          {/* Current Elapsed Progress Fill */}
          <div
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            className="absolute top-0 bottom-0 left-0 bg-primary/80 transition-all duration-75 pointer-events-none"
          />

          {/* Scrubber Playhead Thumb */}
          <div
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
            className="absolute top-0 bottom-0 w-2 -ml-1 bg-white rounded-full shadow-lg pointer-events-none"
          />
        </div>

        {/* Playback Controls & Stats */}
        <div className="flex items-center justify-between text-white">
          {/* Left: Time Elapsed / Total */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tracking-wider text-white">
              {currentTime.toFixed(1)}s{" "}
              <span className="text-white/40 font-normal">/ {totalDuration.toFixed(1)}s</span>
            </span>
          </div>

          {/* Center: Play / Pause / Reset Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
                setCurrentIndex(0);
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
              title="重置到开头"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg font-bold"
              title={isPlaying ? "暂停 (空格)" : "播放 (空格)"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Right: Rate Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-lg border border-white/10 text-xs font-mono">
            {[1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  playbackRate === rate ? "bg-primary text-primary-foreground font-bold" : "text-white/70 hover:text-white"
                }`}
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
