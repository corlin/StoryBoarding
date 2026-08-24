import React, { useEffect, useRef } from "react";
import { ShotModel } from "@/types/shot";
import { ShotScriptCard } from "./ShotScriptCard";
import { Plus } from "lucide-react";

interface ScriptPanelProps {
  shots: ShotModel[];
  sequenceId: string;
  selectedShotId: string | null;
  onSelectShot: (shotId: string) => void;
  onUpdateShot: (shotId: string, updates: Partial<ShotModel>) => void;
  onAddShot: (sequenceId: string) => void;
  onDeleteShot: (shotId: string) => void;
  onOpenDrawer?: (shotId: string) => void;
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
  shots,
  sequenceId,
  selectedShotId,
  onSelectShot,
  onUpdateShot,
  onAddShot,
  onDeleteShot,
  onOpenDrawer,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected shot during playback or selection
  useEffect(() => {
    if (!selectedShotId || !scrollContainerRef.current) return;
    const targetElement = document.getElementById(`script-shot-${selectedShotId}`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedShotId]);

  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden bg-background border-r border-border">
      {/* Panel Sub-Header */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-card/40 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-foreground tracking-wider uppercase">
            分镜头脚本 (Script View)
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono font-semibold">
            {shots.length} SHOTS
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={!sequenceId}
            onClick={() => onAddShot(sequenceId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加镜头</span>
          </button>
        </div>
      </div>

      {/* Shot Cards Scroll List */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
        {shots.length === 0 ? (
          <div className="h-48 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <p className="text-sm mb-3">当前镜头序列为空</p>
            <button
              disabled={!sequenceId}
              onClick={() => onAddShot(sequenceId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>新建第 1 镜</span>
            </button>
          </div>
        ) : (
          shots.map((shot, idx) => (
            <div key={shot.id} id={`script-shot-${shot.id}`}>
              <ShotScriptCard
                shot={shot}
                index={idx}
                isSelected={shot.id === selectedShotId}
                onSelect={() => onSelectShot(shot.id)}
                onUpdate={(updates) => onUpdateShot(shot.id, updates)}
                onDelete={() => onDeleteShot(shot.id)}
                onOpenDrawer={() => onOpenDrawer && onOpenDrawer(shot.id)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
};
