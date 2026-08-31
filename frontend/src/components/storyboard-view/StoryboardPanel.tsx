import React, { useState, useEffect, useRef } from "react";
import { ShotModel } from "@/types/shot";
import { StoryboardCell } from "./StoryboardCell";
import { Sparkles, Image as ImageIcon, Maximize2 } from "lucide-react";

interface StoryboardPanelProps {
  shots: ShotModel[];
  selectedShotId: string | null;
  onSelectShot: (shotId: string) => void;
  onRegenerateDirty?: () => void;
  onRegenerateShotImage?: (shotId: string) => Promise<void> | void;
  onOpenTheater?: (shotId: string) => void;
  onOpenDrawer?: (shotId: string) => void;
}

export const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
  shots,
  selectedShotId,
  onSelectShot,
  onRegenerateDirty,
  onRegenerateShotImage,
  onOpenTheater,
  onOpenDrawer,
}) => {
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dirtyCount = shots.filter((s) => s.is_dirty).length;

  // Auto-scroll to selected storyboard cell during playback or selection
  useEffect(() => {
    if (!selectedShotId || !scrollContainerRef.current) return;
    const targetElement = document.getElementById(`storyboard-cell-${selectedShotId}`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedShotId]);

  const gridClass =
    gridCols === 2
      ? "grid-cols-1 md:grid-cols-2 gap-5"
      : gridCols === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3";

  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden bg-background/50">
      {/* Panel Sub-Header */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-card/40 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="font-bold text-xs text-foreground tracking-wider uppercase">
            视觉故事板 (Storyboard View)
          </span>

          {/* Quick Grid Scale Switcher */}
          <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border/80 text-xs font-mono">
            <button
              onClick={() => setGridCols(2)}
              className={`px-2 py-0.5 rounded transition-colors ${
                gridCols === 2 ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="2列大图模式 (清晰细看每一格)"
            >
              2列·大图
            </button>
            <button
              onClick={() => setGridCols(3)}
              className={`px-2 py-0.5 rounded transition-colors ${
                gridCols === 3 ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="3列标准模式"
            >
              3列·标准
            </button>
            <button
              onClick={() => setGridCols(4)}
              className={`px-2 py-0.5 rounded transition-colors ${
                gridCols === 4 ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="4列紧凑全景模式"
            >
              4列·紧凑
            </button>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Quick Full Theater Button */}
          {shots.length > 0 && onOpenTheater && (
            <button
              onClick={() => onOpenTheater(selectedShotId || shots[0]?.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors"
              title="进入全屏/大屏影院动态播放模式"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>影院播放模式</span>
            </button>
          )}

          {/* Batch Regenerate Button for dirty shots */}
          {dirtyCount > 0 && (
            <button
              onClick={onRegenerateDirty}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>刷新 {dirtyCount} 个待重绘格</span>
            </button>
          )}
        </div>
      </div>

      {/* Storyboard Grid layout */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 scroll-smooth">
        {shots.length === 0 ? (
          <div className="h-48 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">等待在左侧创建分镜以生成视觉画面</p>
          </div>
        ) : (
          <div className={`grid ${gridClass}`}>
            {shots.map((shot, idx) => (
              <div key={shot.id} id={`storyboard-cell-${shot.id}`}>
                <StoryboardCell
                  shot={shot}
                  index={idx}
                  isSelected={shot.id === selectedShotId}
                  onSelect={() => onSelectShot(shot.id)}
                  onRegenerateImage={
                    onRegenerateShotImage ? () => onRegenerateShotImage(shot.id) : undefined
                  }
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
