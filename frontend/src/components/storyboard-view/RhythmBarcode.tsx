"use client";

import React, { useState } from "react";
import { ShotModel } from "@/types/shot";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Eye } from "lucide-react";

interface RhythmBarcodeProps {
  shots: ShotModel[];
  selectedShotId: string | null;
  onSelectShot: (shotId: string) => void;
}

// Reelbench shot size color coding
const SHOT_SIZE_CONFIG: Record<string, { label: string; color: string; group: "wide" | "medium" | "close" }> = {
  extreme_wide_shot: { label: "大远景 EWS", color: "bg-emerald-500", group: "wide" },
  wide_shot: { label: "全景 WS", color: "bg-teal-500", group: "wide" },
  full_shot: { label: "全身 FS", color: "bg-cyan-500", group: "wide" },
  medium_shot: { label: "中景 MS", color: "bg-blue-500", group: "medium" },
  medium_close_up: { label: "中特 MCU", color: "bg-indigo-500", group: "medium" },
  close_up: { label: "特写 CU", color: "bg-amber-500", group: "close" },
  extreme_close_up: { label: "大特写 ECU", color: "bg-rose-500", group: "close" },
};

export const RhythmBarcode: React.FC<RhythmBarcodeProps> = ({
  shots,
  selectedShotId,
  onSelectShot,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!shots || shots.length === 0) return null;

  const totalDuration = shots.reduce((acc, s) => acc + (Number(s.duration) || 2.5), 0);
  const avgDuration = (totalDuration / shots.length).toFixed(1);

  // Quality gate: analyze rhythm health
  let consecutiveCloseups = 0;
  let maxConsecutiveCloseups = 0;
  let closeUpCount = 0;
  let wideCount = 0;

  shots.forEach((s) => {
    const config = SHOT_SIZE_CONFIG[s.shot_size] || { group: "medium" };
    if (config.group === "close") {
      closeUpCount++;
      consecutiveCloseups++;
      if (consecutiveCloseups > maxConsecutiveCloseups) {
        maxConsecutiveCloseups = consecutiveCloseups;
      }
    } else {
      consecutiveCloseups = 0;
      if (config.group === "wide") wideCount++;
    }
  });

  const closeUpRatio = Math.round((closeUpCount / shots.length) * 100);
  const hasFatigueWarning = maxConsecutiveCloseups >= 4;
  const lacksWideWarning = wideCount === 0 && shots.length >= 6;

  return (
    <div className="bg-card/90 border-b border-border px-4 py-2 select-none">
      {/* Rhythm Barcode Ribbon */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground tracking-wider uppercase">
            分镜视觉节奏条 (Rhythm Barcode)
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {shots.length} 镜 · {totalDuration.toFixed(1)}s (均 {avgDuration}s/镜)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {hasFatigueWarning ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" />
              连续 {maxConsecutiveCloseups} 镜特写可能视觉疲劳
            </span>
          ) : lacksWideWarning ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" />
              缺乏环境全景交代
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              节奏健康度优
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
          >
            <span>图例</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Barcode Strip */}
      <div className="w-full h-3.5 bg-secondary/80 rounded-md overflow-hidden flex gap-[1px] p-[1px] border border-border/60 shadow-inner">
        {shots.map((shot) => {
          const cfg = SHOT_SIZE_CONFIG[shot.shot_size] || { label: shot.shot_size, color: "bg-blue-500", group: "medium" };
          const widthPercent = totalDuration > 0 ? ((Number(shot.duration) || 2.5) / totalDuration) * 100 : 100 / shots.length;
          const isSelected = shot.id === selectedShotId;

          return (
            <button
              key={shot.id}
              onClick={() => onSelectShot(shot.id)}
              style={{ width: `${Math.max(widthPercent, 1.5)}%` }}
              title={`#${shot.order} [${cfg.label}] - ${shot.duration}s: ${shot.action?.slice(0, 30)}...${shot.screen_text ? `\n[花字]: ${shot.screen_text}` : ""}`}
              className={cn(
                "h-full transition-all relative group cursor-pointer flex items-center justify-center",
                cfg.color,
                isSelected ? "ring-2 ring-white z-10 brightness-125" : "hover:brightness-110 opacity-85 hover:opacity-100"
              )}
            >
              {shot.screen_text && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 ring-1 ring-black/80 shadow-xs pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded Legend */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground">景别色标：</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>远景 EWS/WS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span>中景 MS/MCU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>特写 CU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span>大特写 ECU</span>
            </div>
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-border/60">
              <span className="w-2 h-2 rounded-full bg-yellow-300 ring-1 ring-black/80" />
              <span>🔤 屏幕花字</span>
            </div>
          </div>
          <div className="font-mono">
            特写占比: <span className="text-foreground font-bold">{closeUpRatio}%</span> · 全景数: <span className="text-foreground font-bold">{wideCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};
