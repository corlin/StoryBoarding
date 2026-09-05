"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  NarrativeMode,
  NarrativeCenter,
  NARRATIVE_MODES,
  NARRATIVE_CENTERS,
  STRUCTURAL_ARCHETYPES,
} from "@/types/narrative";

export interface NarrativeStyleSelectorProps {
  mode: NarrativeMode;
  onModeChange: (mode: NarrativeMode) => void;
  archetype: string;
  onArchetypeChange: (archetype: string) => void;
  center: NarrativeCenter;
  onCenterChange: (center: NarrativeCenter) => void;
  compact?: boolean;
}

export const NarrativeStyleSelector: React.FC<NarrativeStyleSelectorProps> = ({
  mode,
  onModeChange,
  archetype,
  onArchetypeChange,
  center,
  onCenterChange,
  compact = false,
}) => {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          导演叙事风格与引擎
        </label>
        <div className="grid grid-cols-3 gap-2">
          {NARRATIVE_MODES.map((item) => {
            const isSelected = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModeChange(item.id)}
                className={cn(
                  "rounded-lg text-left border transition-all flex flex-col",
                  compact ? "py-1.5 px-2" : "py-2 px-2.5",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary shadow-xs"
                    : compact
                    ? "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("font-bold", compact ? "text-[11px]" : "text-xs")}>
                  {item.label}
                </span>
                <span className={cn("opacity-75 line-clamp-1", compact ? "text-[9px]" : "text-[10px]")}>
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {mode === "drama_5min" && (
        <div
          className={cn(
            "bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150",
            compact ? "p-2.5" : "p-3"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("font-semibold text-amber-400", compact ? "text-[11px]" : "text-xs")}>
              ⚡ 5-Min Drama 爆款设定
            </span>
            <span className={cn("font-mono text-amber-300/80", compact ? "text-[9px]" : "text-[10px]")}>
              3/10/30s 黄金律
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={cn("text-muted-foreground block", compact ? "text-[10px] mb-0.5" : "text-[11px] mb-1")}>
                主叙事重心
              </label>
              <select
                value={center}
                onChange={(e) => onCenterChange(e.target.value as NarrativeCenter)}
                className={cn(
                  "w-full bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-amber-500",
                  compact ? "px-2 py-1" : "px-2.5 py-1.5"
                )}
              >
                {NARRATIVE_CENTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={cn("text-muted-foreground block", compact ? "text-[10px] mb-0.5" : "text-[11px] mb-1")}>
                12大高命中结构原型
              </label>
              <select
                value={archetype}
                onChange={(e) => onArchetypeChange(e.target.value)}
                className={cn(
                  "w-full bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-amber-500 truncate",
                  compact ? "px-2 py-1" : "px-2.5 py-1.5"
                )}
              >
                {STRUCTURAL_ARCHETYPES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
