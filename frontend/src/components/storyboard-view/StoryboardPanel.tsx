import React, { useState, useEffect, useRef } from "react";
import { ShotModel } from "@/types/shot";
import { StoryboardCell } from "./StoryboardCell";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { ShotDetailModal } from "@/components/modals/ShotDetailModal";

interface StoryboardPanelProps {
  shots: ShotModel[];
  selectedShotId: string | null;
  onSelectShot: (shotId: string) => void;
  onRegenerateDirty?: () => void;
  onRegenerateShotImage?: (shotId: string) => Promise<void> | void;
}

export const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
  shots,
  selectedShotId,
  onSelectShot,
  onRegenerateDirty,
  onRegenerateShotImage,
}) => {
  const [inspectingShot, setInspectingShot] = useState<{ shot: ShotModel; index: number } | null>(
    null
  );
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

  return (
    <>
      <section className="flex flex-col h-full min-h-0 overflow-hidden bg-background/50">
        {/* Panel Sub-Header */}
        <div className="h-11 px-4 border-b border-border/80 flex items-center justify-between bg-card/30 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-foreground tracking-wider uppercase">
              视觉故事板 (Storyboard View)
            </span>
            <span className="text-[11px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono font-medium">
              3x4 格局
            </span>
          </div>

          {/* Batch Regenerate Button for dirty shots */}
          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <button
                onClick={onRegenerateDirty}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>批量刷新 {dirtyCount} 个待重绘格</span>
              </button>
            )}
          </div>
        </div>

        {/* Storyboard Grid 3x4 layout */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 scroll-smooth">
          {shots.length === 0 ? (
            <div className="h-48 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
              <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">等待在左侧创建分镜以生成视觉画面</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    onOpenDetail={() => setInspectingShot({ shot, index: idx })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Shot Detail Inspector Modal */}
      <ShotDetailModal
        isOpen={!!inspectingShot}
        shot={inspectingShot?.shot || null}
        index={inspectingShot?.index || 0}
        onClose={() => setInspectingShot(null)}
      />
    </>
  );
};
