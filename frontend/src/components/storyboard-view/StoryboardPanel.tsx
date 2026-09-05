import React, { useState, useEffect, useRef } from "react";
import { ShotModel, CharacterModel } from "@/types/shot";
import { StoryboardCell } from "./StoryboardCell";
import { Sparkles, Image as ImageIcon, Maximize2, Loader2, Film, RefreshCw, XCircle, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryboardPanelProps {
  shots: ShotModel[];
  selectedShotId: string | null;
  aspectRatio?: "16:9" | "9:16";
  characters?: CharacterModel[];
  onSelectShot: (shotId: string) => void;
  onRegenerateDirty?: () => void;
  onRegenerateShotImage?: (shotId: string) => Promise<void> | void;
  onToggleLock?: (shotId: string, locked: boolean) => void;
  onOpenTheater?: (shotId: string) => void;
  onOpenDrawer?: (shotId: string) => void;
  isBatchRendering?: boolean;
  batchProgress?: { current: number; total: number };
  onAbortBatchRendering?: () => void;
}

export const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
  shots,
  selectedShotId,
  aspectRatio = "16:9",
  characters = [],
  onSelectShot,
  onRegenerateDirty,
  onRegenerateShotImage,
  onToggleLock,
  onOpenTheater,
  onOpenDrawer,
  isBatchRendering = false,
  batchProgress,
  onAbortBatchRendering,
}) => {
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [showHudGuide, setShowHudGuide] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const missingImageCount = shots.filter((s) => !s.storyboard_image_url || s.is_dirty).length;

  // Auto-scroll to selected storyboard cell during playback or selection
  useEffect(() => {
    if (!selectedShotId || !scrollContainerRef.current) return;
    const targetElement = document.getElementById(`storyboard-cell-${selectedShotId}`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedShotId]);

  const isVertical = aspectRatio === "9:16";
  const gridClass = isVertical
    ? gridCols === 2
      ? "grid-cols-2 md:grid-cols-3 gap-4"
      : gridCols === 3
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3"
    : gridCols === 2
    ? "grid-cols-1 md:grid-cols-2 gap-4"
    : gridCols === 3
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";

  return (
    <section className="flex flex-col h-full bg-background/50 select-none relative">
      {/* Header Bar */}
      <div className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0 bg-card/50">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-xs text-foreground tracking-wide">
            故事板画布 (Storyboard Canvas)
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            [{shots.length} 镜]
          </span>
        </div>

        {/* Actions & Layout Controls */}
        <div className="flex items-center gap-2">
          {/* Unified Batch Render Action & Readiness Status */}
          {!isBatchRendering && (
            missingImageCount > 0 && onRegenerateDirty ? (
              <button
                onClick={onRegenerateDirty}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-sm shadow-amber-500/20 transition-all duration-150 active:scale-95"
                title="一键冲印渲染尚未生成画面的镜头"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>一键冲印剩余 ({missingImageCount})</span>
              </button>
            ) : shots.length > 0 ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>全片 {shots.length} 镜已显影就绪</span>
              </div>
            ) : null
          )}

          {/* Previz HUD Guide Overlay Toggle Button */}
          <button
            onClick={() => setShowHudGuide(!showHudGuide)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border",
              showHudGuide
                ? "bg-sky-500/15 border-sky-500/40 text-sky-300 font-semibold shadow-xs"
                : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
            )}
            title="一键开关专业导演视听执行辅助线（运镜矢量箭头、焦点靶心与九宫格安全框）"
          >
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">视听辅助线 (HUD)</span>
            <span className={cn("w-1.5 h-1.5 rounded-full", showHudGuide ? "bg-sky-400 animate-pulse" : "bg-muted-foreground/40")} />
          </button>

          {/* Grid Layout Switcher */}
          <div className="flex items-center bg-secondary/50 p-0.5 rounded-lg border border-border/60 text-xs text-muted-foreground">
            <button
              onClick={() => setGridCols(2)}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                gridCols === 2 ? "bg-background text-foreground font-semibold shadow-xs" : "hover:text-foreground"
              )}
            >
              2列
            </button>
            <button
              onClick={() => setGridCols(3)}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                gridCols === 3 ? "bg-background text-foreground font-semibold shadow-xs" : "hover:text-foreground"
              )}
            >
              3列
            </button>
            <button
              onClick={() => setGridCols(4)}
              className={cn(
                "px-2 py-0.5 rounded transition-colors hidden xl:block",
                gridCols === 4 ? "bg-background text-foreground font-semibold shadow-xs" : "hover:text-foreground"
              )}
            >
              4列
            </button>
          </div>

          {/* Theater Mode Button */}
          {onOpenTheater && (
            <button
              onClick={() => onOpenTheater(selectedShotId || shots[0]?.id)}
              disabled={shots.length === 0}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="打开影院全屏动态播映模式 (Animatic Theater)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Batch Rendering Dynamic Floating Progress Banner with Abort Button */}
      {isBatchRendering && batchProgress && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-4 z-20 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium min-w-0">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span className="truncate">
              正在后台顺序渲染画面：第 <strong>{batchProgress.current}</strong> / {batchProgress.total} 镜...
            </span>
          </div>

          {/* Progress bar and Abort Action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 sm:w-36 h-2 rounded-full bg-background/60 overflow-hidden border border-amber-500/20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              {Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100)}%
            </span>

            {onAbortBatchRendering && (
              <button
                type="button"
                onClick={onAbortBatchRendering}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/40 transition-colors shadow-xs"
                title="中止当前冲印队列"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>⏹️ 中止队列</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Storyboard Grid Canvas */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 scroll-smooth"
      >
        {shots.length === 0 ? (
          <div className="h-48 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-medium mb-1">故事板画布为空</p>
            <p className="text-xs text-muted-foreground">在左侧脚本中添加镜头，或点击顶部「AI 导演智能拆镜」</p>
          </div>
        ) : (
          <div className={`grid ${gridClass}`}>
            {shots.map((shot, idx) => (
              <div key={shot.id} id={`storyboard-cell-${shot.id}`}>
                <StoryboardCell
                  shot={shot}
                  index={idx}
                  isSelected={shot.id === selectedShotId}
                  aspectRatio={aspectRatio}
                  showHudGuide={showHudGuide}
                  characters={characters}
                  onSelect={() => onSelectShot(shot.id)}
                  onRegenerateImage={() => onRegenerateShotImage && onRegenerateShotImage(shot.id)}
                  onToggleLock={onToggleLock}
                  onOpenDetail={() => onOpenDrawer && onOpenDrawer(shot.id)}
                  onOpenTheater={() => onOpenTheater && onOpenTheater(shot.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
