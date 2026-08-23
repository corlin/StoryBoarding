import React, { useState } from "react";
import { ShotModel } from "@/types/shot";
import { Film, RefreshCw, Camera, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryboardCellProps {
  shot: ShotModel;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRegenerateImage?: () => Promise<void> | void;
  onOpenDetail?: () => void;
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
        "group relative flex flex-col rounded-xl overflow-hidden border bg-card/60 transition-all duration-150 cursor-pointer",
        isSelected
          ? "border-primary ring-2 ring-primary/40 shadow-lg"
          : "border-border/60 hover:border-border hover:bg-card/90"
      )}
    >
      {/* 16:9 Frame Aspect Ratio Container */}
      <div className="relative aspect-video w-full bg-muted/40 flex items-center justify-center overflow-hidden">
        {shot.storyboard_image_url ? (
          <img
            src={shot.storyboard_image_url}
            alt={`Shot ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Placeholder Canvas */
          <div className="flex flex-col items-center justify-center text-muted-foreground/50 p-4 text-center">
            <Film className="w-8 h-8 mb-1.5 opacity-40" />
            <span className="text-[11px] font-mono tracking-wider">
              {shot.shot_size.toUpperCase()}
            </span>
          </div>
        )}

        {/* Top Badges (Shot No, Shot Size, Duration) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/85 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono border border-border/40 shadow-sm">
          <span className="font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-muted-foreground">·</span>
          <span>{sizeAbbr}</span>
          <span className="text-muted-foreground">·</span>
          <span>{shot.duration}s</span>
        </div>

        {/* Top Right Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* Detail Inspect Button */}
          {onOpenDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail();
              }}
              className="p-1 rounded bg-background/80 hover:bg-background text-muted-foreground hover:text-primary backdrop-blur transition-colors opacity-0 group-hover:opacity-100"
              title="查看提示词与视听参数"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dirty State Indicator / Quick Regenerate Button */}
          {(shot.is_dirty || !shot.storyboard_image_url) && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/90 hover:bg-amber-400 text-black font-semibold text-[10px] shadow transition-colors disabled:opacity-50"
              title="点击单独重绘该格"
            >
              {isRegenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              <span>{isRegenerating ? "绘制中..." : "重绘"}</span>
            </button>
          )}
        </div>

        {/* Camera Movement Arrow Visual Overlay */}
        {shot.camera_movement?.type && shot.camera_movement.type !== "static" && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/85 text-[10px] font-mono text-muted-foreground border border-border/40">
            <Camera className="w-3 h-3 text-primary/80" />
            <span>{shot.camera_movement.type}</span>
          </div>
        )}
      </div>

      {/* Caption & Director Notes */}
      <div className="p-2.5 bg-card/90 border-t border-border/50 text-xs">
        <p className="line-clamp-2 text-foreground/90 leading-snug">
          {shot.action || <span className="text-muted-foreground italic">无动作描述</span>}
        </p>
      </div>
    </div>
  );
};
