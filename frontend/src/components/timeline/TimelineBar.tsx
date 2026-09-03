import React, { useState, useEffect, useRef } from "react";
import { ShotModel } from "@/types/shot";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineBarProps {
  shots: ShotModel[];
  targetDuration: number;
  selectedShotId: string | null;
  onSelectShot: (shotId: string) => void;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  shots,
  targetDuration,
  selectedShotId,
  onSelectShot,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const timelineTrackRef = useRef<HTMLDivElement>(null);

  const totalDuration = shots.reduce((acc, s) => acc + s.duration, 0) || 30;

  // Real-time animation loop when playing
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTime((prev) => {
        const nextTime = prev + delta * playbackRate;
        if (nextTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }

        // Find active shot at nextTime
        let accumulated = 0;
        for (const s of shots) {
          if (nextTime >= accumulated && nextTime < accumulated + s.duration) {
            if (s.id !== selectedShotId) {
              onSelectShot(s.id);
            }
            break;
          }
          accumulated += s.duration;
        }

        return nextTime;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackRate, totalDuration, shots, selectedShotId, onSelectShot]);

  const handleTogglePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (shots.length > 0) {
      onSelectShot(shots[0].id);
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * totalDuration;
    setCurrentTime(targetTime);

    // Find active shot at targetTime
    let accumulated = 0;
    for (const s of shots) {
      if (targetTime >= accumulated && targetTime <= accumulated + s.duration) {
        onSelectShot(s.id);
        break;
      }
      accumulated += s.duration;
    }
  };

  const progressPercentage = (currentTime / (totalDuration || 1)) * 100;

  return (
    <footer className="h-16 border-t border-border bg-card/90 backdrop-blur px-4 flex items-center gap-4 shrink-0 select-none">
      {/* Control Buttons */}
      <div className="flex items-center gap-2.5 pr-4 border-r border-border shrink-0">
        <button
          onClick={handleTogglePlay}
          className={cn(
            "p-2 rounded-full transition-all shadow-sm flex items-center justify-center",
            isPlaying
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          title={isPlaying ? "暂停预演" : "播放分镜预演 (Previz)"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="重置到片头"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Speed Multiplier Button */}
        <button
          onClick={() => setPlaybackRate(playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1)}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          title="切换播放倍速"
        >
          {playbackRate}x
        </button>

        {/* Time Counter */}
        <div className="text-xs font-mono pl-1">
          <span className="text-primary font-bold">{currentTime.toFixed(1)}s</span>
          <span className="text-muted-foreground"> / {totalDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Interactive Timeline Track with Scrubber Playhead */}
      <div
        ref={timelineTrackRef}
        onClick={handleTrackClick}
        className="flex-1 relative flex h-10 bg-background/80 rounded-lg p-1 border border-border/80 gap-1 cursor-pointer overflow-hidden items-center group"
      >
        {/* Playhead Scrubber Line */}
        <div
          style={{ left: `${progressPercentage}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-20 pointer-events-none transition-[left] duration-75 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
        >
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
        </div>

        {/* Shot Segment Bars with Emotional Voltage Waveform */}
        {shots.map((shot, idx) => {
          const isSelected = shot.id === selectedShotId;
          const voltage = shot.emotional_voltage ?? 50;
          const isHook = shot.beat_type === "hook" || shot.beat_type === "cliffhanger_hook";
          const isClimax = shot.beat_type === "climax_payoff";

          const voltageColor =
            voltage >= 88
              ? "bg-rose-500/30 border-t-rose-500"
              : voltage >= 72
              ? "bg-amber-500/25 border-t-amber-500"
              : voltage >= 50
              ? "bg-sky-500/20 border-t-sky-500"
              : "bg-emerald-500/15 border-t-emerald-500";

          return (
            <div
              key={shot.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectShot(shot.id);
                // Set playhead to the beginning of this shot
                let startT = 0;
                for (let i = 0; i < idx; i++) startT += shots[i].duration;
                setCurrentTime(startT);
              }}
              style={{ flex: `${shot.duration} 0 0` }}
              className={cn(
                "h-full rounded flex items-center justify-between px-2 text-[10px] font-mono transition-all duration-150 relative overflow-hidden border",
                isSelected
                  ? "bg-primary/25 border-primary text-primary font-bold shadow-md ring-1 ring-primary/40"
                  : "bg-muted/30 hover:bg-muted/60 border-border/50 text-muted-foreground"
              )}
              title={`Shot ${idx + 1}: ${shot.shot_size} | 情绪势能: ${voltage}V | ${shot.beat_type || "节拍"} - ${shot.information_gap || shot.action}`}
            >
              {/* Emotional Voltage Waveform Background Fill */}
              <div
                style={{ height: `${Math.min(100, Math.max(15, voltage))}%` }}
                className={cn(
                  "absolute inset-x-0 bottom-0 pointer-events-none transition-all duration-300 border-t",
                  voltageColor
                )}
              />

              <div className="relative z-10 flex items-center gap-1 truncate">
                <span className="truncate">#{String(idx + 1).padStart(2, "0")}</span>
                {isHook ? (
                  <span className="text-[9px] text-rose-400 font-bold" title="注意力钩子">
                    {shot.beat_type === "cliffhanger_hook" ? "🎣" : "⚡"}
                  </span>
                ) : isClimax ? (
                  <span className="text-[9px] text-amber-400 font-bold" title="核心高潮">
                    🔥
                  </span>
                ) : null}
              </div>

              <div className="relative z-10 flex items-center gap-1">
                <span className="text-[9px] opacity-75">{shot.duration}s</span>
                <span
                  className={cn(
                    "text-[8px] px-1 rounded font-bold",
                    voltage >= 80 ? "text-rose-400 bg-rose-500/20" : "text-sky-400 bg-sky-500/10"
                  )}
                >
                  {voltage}V
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
};
