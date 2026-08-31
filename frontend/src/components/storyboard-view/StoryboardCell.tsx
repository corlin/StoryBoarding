import React, { useState, useEffect } from "react";
import { ShotModel } from "@/types/shot";
import { Film, RefreshCw, Camera, Loader2, Info, Maximize2, Sparkles, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryboardCellProps {
  shot: ShotModel;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRegenerateImage?: () => Promise<void> | void;
  onToggleLock?: (shotId: string, locked: boolean) => void;
  onOpenDetail?: () => void;
  onOpenTheater?: () => void;
}

const SHOT_SIZE_ABBR: Record<string, string> = {
  extreme_wide_shot: "EWS",
  wide_shot: "WS",
  full_shot: "FS",
  medium_shot: "MS",
  medium_close_up: "MCU",
  close_up: "CU",
  extreme_close_up: "ECU",
};

export const StoryboardCell: React.FC<StoryboardCellProps> = ({
  shot,
  index,
  isSelected,
  onSelect,
  onRegenerateImage,
  onToggleLock,
  onOpenDetail,
  onOpenTheater,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [imgSrc, setImgSrc] = useState<string>(shot.storyboard_image_url || "");

  const sizeAbbr = SHOT_SIZE_ABBR[shot.shot_size] || "MS";
  const isLocked = Boolean(shot.is_locked);

  useEffect(() => {
    setImgSrc(shot.storyboard_image_url || "");
  }, [shot.storyboard_image_url]);

  // Stopwatch timer for single shot generation (essential for 50s Grok / 15s Imagen models)
  useEffect(() => {
    let timer: any;
    if (isRegenerating) {
      setElapsed(0);
      const start = Date.now();
      timer = setInterval(() => {
        setElapsed(Number(((Date.now() - start) / 1000).toFixed(1)));
      }, 100);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isRegenerating]);

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRegenerateImage || isRegenerating) return;
    try {
      setIsRegenerating(true);
      await onRegenerateImage();
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleLock) {
      onToggleLock(shot.id, !isLocked);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col rounded-xl overflow-hidden border bg-card/60 transition-all duration-150 cursor-pointer shadow-sm",
        isSelected
          ? "border-primary ring-2 ring-primary/40 shadow-md bg-card/95"
          : "border-border/70 hover:border-border hover:bg-card/90"
      )}
    >
      {/* 16:9 Frame Aspect Ratio Container */}
      <div
        onClick={(e) => {
          if (onOpenTheater) {
            e.stopPropagation();
            onOpenTheater();
          }
        }}
        className="relative aspect-video w-full bg-muted/40 flex items-center justify-center overflow-hidden cursor-zoom-in"
        title="点击放大进入影院动态播放模式"
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`Shot ${index + 1}`}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          /* Clean Cinematic Skeleton Frame (No fake generic geometric SVG) */
          <div className="flex flex-col items-center justify-center text-muted-foreground/40 p-4 text-center">
            <Film className="w-8 h-8 mb-1.5 opacity-30 animate-pulse" />
            <span className="text-xs font-mono tracking-wider font-semibold text-muted-foreground/60">
              {shot.shot_size.toUpperCase()} · 待渲染
            </span>
          </div>
        )}

        {/* Darkroom Film Developing Shimmer Overlay (Active during image generation) */}
        {isRegenerating && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center z-20 animate-in fade-in duration-200">
            {/* Shimmer sweeping beam */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />

            <div className="relative p-2.5 rounded-full bg-primary/20 text-primary mb-2 shadow-inner border border-primary/30">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>

            <p className="relative text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <span>正在渲染第 {index + 1} 镜画面</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </p>

            <span className="relative text-[11px] font-mono text-primary font-bold mt-1 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              ⏱️ 耗时: {elapsed.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Top Badges (Shot No, Shot Size, Duration, Lock) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono border border-border/60 shadow-sm z-10">
          <span className="font-bold text-sky-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-foreground">{sizeAbbr}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-emerald-400 font-semibold">{shot.duration}s</span>

          {isLocked && (
            <>
              <span className="text-muted-foreground">·</span>
              <span title="已锁定保护，AI重构时保持不变">
                <Lock className="w-3 h-3 text-amber-400" />
              </span>
            </>
          )}
        </div>

        {/* Top Right Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {/* Shot Lock / Unlock Toggle Button */}
          {onToggleLock && (
            <button
              onClick={handleToggleLock}
              className={cn(
                "p-1.5 rounded-md backdrop-blur border transition-all shadow-sm",
                isLocked
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                  : "bg-background/85 hover:bg-background text-muted-foreground hover:text-amber-400 border-border/40 opacity-0 group-hover:opacity-100"
              )}
              title={isLocked ? "镜头已锁定（点击解锁）" : "锁定镜头（防止 AI 重拆时被覆盖）"}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Zoom / Theater Mode Indicator */}
          {onOpenTheater && !isRegenerating && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenTheater();
              }}
              className="p-1.5 rounded-md bg-background/85 hover:bg-background text-muted-foreground hover:text-sky-400 backdrop-blur border border-border/40 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
              title="大图放大 / 影院动态播放"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Detail Inspect Button */}
          {onOpenDetail && !isRegenerating && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail();
              }}
              className="p-1.5 rounded-md bg-background/85 hover:bg-background text-muted-foreground hover:text-primary backdrop-blur border border-border/40 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
              title="查看参数与提示词"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Regenerate / Re-sample Shot Image Button */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs shadow transition-all disabled:opacity-50 backdrop-blur border",
              !imgSrc
                ? "bg-amber-500 hover:bg-amber-400 text-black border-amber-500/40"
                : "bg-background/85 hover:bg-background text-foreground hover:text-primary border-border/50 opacity-0 group-hover:opacity-100"
            )}
            title="重新打样渲染电影级分镜画面"
          >
            {isRegenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{isRegenerating ? "绘制中" : imgSrc ? "重新打样" : "生成画面"}</span>
          </button>
        </div>

        {/* Camera Movement Arrow Visual Overlay */}
        {shot.camera_movement?.type && shot.camera_movement.type !== "static" && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-background/90 text-xs font-mono text-muted-foreground border border-border/50 backdrop-blur-sm z-10">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>{shot.camera_movement.type}</span>
          </div>
        )}
      </div>

      {/* Caption & Director Notes */}
      <div className="p-3 bg-card/90 border-t border-border/60 text-xs md:text-sm">
        <p className="line-clamp-2 text-foreground/90 leading-snug font-medium">
          {shot.action || <span className="text-muted-foreground italic">无动作描述</span>}
        </p>
      </div>
    </div>
  );
};
