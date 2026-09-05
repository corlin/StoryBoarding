"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShotModel, CharacterModel, ProjectModel, SequenceModel } from "@/types/shot";
import { ShotScriptCard } from "./ShotScriptCard";
import { ScreenplayEditor } from "./ScreenplayEditor";
import { BeatStreamEditor } from "./BeatStreamEditor";
import { Plus, Film, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptPanelProps {
  shots: ShotModel[];
  sequenceId: string;
  selectedShotId: string | null;
  characters?: CharacterModel[];
  project?: ProjectModel | null;
  sequence?: SequenceModel | null;
  onRefreshProject?: () => Promise<void>;
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
  characters = [],
  project,
  sequence,
  onRefreshProject,
  onSelectShot,
  onUpdateShot,
  onAddShot,
  onDeleteShot,
  onOpenDrawer,
}) => {
  const [viewMode, setViewMode] = useState<"shots" | "beats" | "screenplay">("beats");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected shot during playback or selection
  useEffect(() => {
    if (!selectedShotId || !scrollContainerRef.current || viewMode !== "shots") return;
    const targetElement = document.getElementById(`script-shot-${selectedShotId}`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedShotId, viewMode]);

  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden bg-background">
      {/* Panel Sub-Header with Tri-Mode Toggle */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-card/40 shrink-0 select-none">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border/70">
          <button
            type="button"
            onClick={() => setViewMode("beats")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
              viewMode === "beats"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>⚡ 剧本节拍流</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("shots")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
              viewMode === "shots"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Film className="w-3.5 h-3.5" />
            <span>🎬 导演分镜 ({shots.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("screenplay")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
              viewMode === "screenplay"
                ? "bg-amber-500 text-black shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📄 文学母本</span>
          </button>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-1.5">
          {viewMode === "shots" && (
            <button
              disabled={!sequenceId}
              onClick={() => onAddShot(sequenceId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加镜头</span>
            </button>
          )}
        </div>
      </div>

      {/* Body: BeatStreamEditor vs Screenplay vs Shot Cards */}
      {viewMode === "beats" ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <BeatStreamEditor
            project={project || null}
            sequence={sequence || null}
            onRefreshProject={onRefreshProject}
            onSwitchToStoryboard={() => setViewMode("shots")}
          />
        </div>
      ) : viewMode === "screenplay" ? (
        <div className="flex-1 min-h-0 p-3 overflow-hidden">
          <ScreenplayEditor
            project={project || null}
            sequence={sequence || null}
            onRefreshProject={onRefreshProject}
          />
        </div>
      ) : (
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
                  characters={characters}
                  locations={project?.locations || []}
                  onSelect={() => onSelectShot(shot.id)}
                  onUpdate={(updates) => onUpdateShot(shot.id, updates)}
                  onDelete={() => onDeleteShot(shot.id)}
                  onOpenDrawer={() => onOpenDrawer && onOpenDrawer(shot.id)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};
