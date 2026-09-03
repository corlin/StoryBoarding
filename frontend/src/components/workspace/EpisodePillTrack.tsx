"use client";

import React from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Film, Users, Zap } from "lucide-react";

interface EpisodePillTrackProps {
  onOpenCharacterHub: () => void;
}

export function EpisodePillTrack({ onOpenCharacterHub }: EpisodePillTrackProps) {
  const { currentProject, activeEpisodeIndex, setActiveEpisodeIndex } = useWorkspaceStore();

  if (!currentProject) return null;

  const sequences = currentProject.sequences || [];
  const characters = currentProject.characters || [];
  const isMultiEpisode = sequences.length > 1;

  return (
    <div className="flex items-center justify-between px-6 py-2.5 bg-[#121316]/90 border-b border-border/40 backdrop-blur-sm">
      {/* Left: Episode Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mr-1 shrink-0">
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span>短剧分集:</span>
        </div>

        {sequences.map((seq, idx) => {
          const isActive = idx === activeEpisodeIndex;
          const epNum = seq.episode_number || idx + 1;
          const shotCount = seq.shots?.length || 0;

          return (
            <button
              key={seq.id}
              onClick={() => setActiveEpisodeIndex(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                isActive
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <span className={`font-mono text-[10px] px-1 py-0.2 rounded ${
                isActive ? "bg-amber-500/20 text-amber-300" : "bg-muted text-muted-foreground"
              }`}>
                EP {epNum}
              </span>
              <span className="max-w-[130px] truncate">{seq.name || `第 ${epNum} 集`}</span>
              <span className="text-[10px] font-mono opacity-70">({shotCount}镜)</span>
              {seq.cliffhanger_summary && (
                <span title={`集尾卡点: ${seq.cliffhanger_summary}`} className="text-rose-400 text-[11px]">
                  🎣
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Character Hub Drawer Trigger */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button
          onClick={onOpenCharacterHub}
          className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium rounded-lg transition"
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>全剧角色库</span>
          <span className="font-mono text-[10px] bg-sky-500/20 px-1.5 py-0.2 rounded text-sky-200">
            {characters.length}
          </span>
        </button>
      </div>
    </div>
  );
}
