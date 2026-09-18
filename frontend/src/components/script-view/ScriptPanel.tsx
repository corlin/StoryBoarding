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
  onAddShot: (sequenceId: string, initialOverrides?: Partial<ShotModel>) => void;
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
      {/* Panel Header (Clean 44px Row) */}
      <div className="h-11 px-4 border-b border-border/70 flex items-center justify-between bg-card/40 shrink-0 select-none">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center bg-secondary/60 p-0.5 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={() => setViewMode("beats")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer",
              viewMode === "beats"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>节拍流</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("shots")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer",
              viewMode === "shots"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>分镜列表 ({shots.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("screenplay")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer",
              viewMode === "screenplay"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>文学母本</span>
          </button>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-1.5">
          {viewMode === "shots" && (
            <div className="flex items-center gap-1">
              <button
                disabled={!sequenceId}
                onClick={() => onAddShot(sequenceId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                title="添加常规空白分镜"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>加镜头</span>
              </button>
              <button
                disabled={!sequenceId}
                onClick={() =>
                  onAddShot(sequenceId, {
                    beat_type: "pillow_shot",
                    shot_size: "close_up",
                    camera_angle: "eye_level",
                    camera_movement: { type: "static" },
                    subject: "静物/景物空镜头（小津枕词）",
                    action: "静物特写或静谧景物光影变迁，承接上一镜情绪余韵，空气静默留白",
                    dialogue: "无",
                    narrative_function: "小津枕词·情绪留白与空间余韵",
                    audio_strategy: "silent_broll",
                    lip_sync_status: "not_applicable",
                    compute_tier: "economy",
                    emotional_voltage: 35,
                    duration: 2.5,
                  })
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 disabled:opacity-50 transition-colors cursor-pointer"
                title="添加小津安二郎枕词式空镜头（静物留白，economy算力）"
              >
                <span>🏮 枕词</span>
              </button>
              <button
                disabled={!sequenceId}
                onClick={() =>
                  onAddShot(sequenceId, {
                    beat_type: "dramatic_pause",
                    shot_size: "close_up",
                    camera_angle: "eye_level",
                    camera_movement: { type: "push_in", speed: "slow" },
                    subject: "角色呼吸停顿",
                    action: "对白戛然而止，呼吸停顿，极度克制的微动作（眼神沉落、指关节紧扣、喉结微动），空气骤然凝固",
                    dialogue: "[长久的沉默。]",
                    narrative_function: "契诃夫呼吸·沉默对峙与心理微动作",
                    compute_tier: "standard",
                    emotional_voltage: 85,
                    duration: 2.5,
                  })
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 disabled:opacity-50 transition-colors cursor-pointer"
                title="添加契诃夫戏剧呼吸停顿拍（对话截断，微表情生理反应）"
              >
                <span>⏸️ 停顿</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body: BeatStreamEditor vs Screenplay vs Shot Cards */}
      {viewMode === "beats" ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <BeatStreamEditor
            project={project || null}
            sequence={sequence || null}
            selectedShotId={selectedShotId}
            onRefreshProject={onRefreshProject}
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
