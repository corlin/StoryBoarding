import React, { useState } from "react";
import { ShotModel } from "@/types/shot";
import { Film, RefreshCw, Camera, Loader2, Info, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryboardCellProps {
  shot: ShotModel;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRegenerateImage?: () => Promise<void> | void;
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
  onOpenDetail,
  onOpenTheater,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const sizeAbbr = SHOT_SIZE_ABBR[shot.shot_size] || "MS";

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
        {shot.storyboard_image_url ? (
          <img
            src={shot.storyboard_image_url}
            alt={`Shot ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          /* Placeholder Canvas */
          <div className="flex flex-col items-center justify-center text-muted-foreground/50 p-4 text-center">
            <Film className="w-8 h-8 mb-1.5 opacity-40" />
            <span className="text-xs font-mono tracking-wider">
              {shot.shot_size.toUpperCase()}
            </span>
          </div>
        )}

        {/* Top Badges (Shot No, Shot Size, Duration) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono border border-border/60 shadow-sm">
          <span className="font-bold text-sky-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-foreground">{sizeAbbr}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-emerald-400 font-semibold">{shot.duration}s</span>
        </div>

        {/* Top Right Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {/* Zoom / Theater Mode Indicator */}
          {onOpenTheater && (
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
          {onOpenDetail && (
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

          {/* Dirty State Indicator / Quick Regenerate Button */}
          {(shot.is_dirty || !shot.storyboard_image_url) && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/90 hover:bg-amber-400 text-black font-semibold text-xs shadow transition-colors disabled:opacity-50"
              title="点击单独重绘该格"
            >
              {isRegenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{isRegenerating ? "绘制中" : "重绘"}</span>
            </button>
          )}
        </div>

        {/* Camera Movement Arrow Visual Overlay */}
        {shot.camera_movement?.type && shot.camera_movement.type !== "static" && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-background/90 text-xs font-mono text-muted-foreground border border-border/50 backdrop-blur-sm">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>{shot.camera_movement.type}</span>
          </div>
        )}
      </div>

      {/* Caption & Director Notes (Enlarged to 13px comfortable reading font) */}
      <div className="p-3 bg-card/90 border-t border-border/60 text-xs md:text-sm">
        <p className="line-clamp-2 text-foreground/90 leading-snug font-medium">
          {shot.action || <span className="text-muted-foreground italic">无动作描述</span>}
        </p>
      </div>
    </div>
  );
};
