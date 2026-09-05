"use client";

import React, { useMemo } from "react";
import { ShotModel, LocationModel, CharacterModel, PropModel } from "@/types/shot";
import { StoryboardCell } from "./StoryboardCell";
import { Layers, MapPin, Sparkles, Film, Sun, Clock, CheckCircle2, Copy, Check, Download, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateH3Prompt } from "@/lib/h3Prompt";
import { notify } from "@/components/ui/ToastNotification";

interface CallSheetViewProps {
  shots: ShotModel[];
  locations: LocationModel[];
  characters: CharacterModel[];
  propsList?: PropModel[];
  selectedShotId: string | null;
  aspectRatio?: "16:9" | "9:16";
  onSelectShot: (shotId: string) => void;
  onRegenerateShotImage?: (shotId: string) => Promise<void> | void;
  onToggleLock?: (shotId: string, locked: boolean) => void;
  onOpenTheater?: (shotId: string) => void;
  onOpenDrawer?: (shotId: string) => void;
}

interface CallSheetGroup {
  groupKey: string;
  locationName: string;
  lightingState: string;
  location: LocationModel | undefined;
  shots: ShotModel[];
  totalDuration: number;
}

export const CallSheetView: React.FC<CallSheetViewProps> = ({
  shots,
  locations,
  characters,
  propsList = [],
  selectedShotId,
  aspectRatio = "16:9",
  onSelectShot,
  onRegenerateShotImage,
  onToggleLock,
  onOpenTheater,
  onOpenDrawer,
}) => {
  // Group shots by (Location + Lighting State) to avoid visual drift
  const groups: CallSheetGroup[] = useMemo(() => {
    const map = new Map<string, CallSheetGroup>();

    shots.forEach((shot) => {
      const loc = locations.find((l) => l.id === shot.location_id);
      const locName = loc ? loc.name : shot.subject?.split(/[,，\s]/)[0] || "通用主场景";
      const lighting = shot.lighting || (loc?.lighting_style) || "自然光";
      const groupKey = `${locName}__${lighting}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          locationName: locName,
          lightingState: lighting,
          location: loc,
          shots: [],
          totalDuration: 0,
        });
      }

      const g = map.get(groupKey)!;
      g.shots.push(shot);
      g.totalDuration += Number(shot.duration) || 2.5;
    });

    return Array.from(map.values());
  }, [shots, locations]);

  if (shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-xs gap-2">
        <Layers className="w-8 h-8 opacity-40" />
        <span>暂无分镜镜头数据</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {/* Introduction Banner */}
      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-start justify-between gap-3 text-xs text-foreground">
        <div className="flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-primary flex items-center gap-2">
              AI 工业化顺场表 / 生产批次单 (Production Call Sheet)
              <span className="text-[10px] font-mono bg-primary/20 px-1.5 py-0.2 rounded border border-primary/30">
                防场景光影漂移
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              全片镜头已根据<strong>「空间场景 + 光照状态」</strong>自动聚合为 {groups.length} 个拍摄批次。
              同批次镜头共享环境基准底图与光影种子，批量生成可彻底消除多镜头之间的环境突变与光感不连贯。
            </p>
          </div>
        </div>
      </div>

      {/* Batch Groups List */}
      <div className="space-y-6">
        {groups.map((group, gIdx) => {
          const completedCount = group.shots.filter((s) => s.storyboard_image_url && !s.is_dirty).length;
          const isComplete = completedCount === group.shots.length;

          return (
            <div
              key={group.groupKey}
              className="bg-card/70 border border-border/80 rounded-2xl p-4 shadow-sm space-y-3 relative group"
            >
              {/* Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center font-mono font-bold text-xs border border-amber-500/30">
                    B{gIdx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        {group.locationName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground flex items-center gap-1">
                        <Sun className="w-3 h-3 text-amber-400" />
                        {group.lightingState}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      共 {group.shots.length} 个分镜 · 累计时长 {group.totalDuration.toFixed(1)}s · 进度 {completedCount}/{group.shots.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {group.location?.reference_image_url && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/80 border border-border text-[10px] text-muted-foreground">
                      <img src={group.location.reference_image_url} alt="基准" className="w-4 h-4 rounded object-cover" />
                      <span>已锚定场景底图</span>
                    </div>
                  )}

                  {/* Copy Batch MiniMax H3 Prompt */}
                  <button
                    type="button"
                    onClick={() => {
                      const h3Cuts = group.shots.map((s, idx) => ({
                        id: s.id,
                        order: idx + 1,
                        seconds: Number(s.duration) || 2.5,
                        shotSize: s.shot_size,
                        cameraMovement: typeof s.camera_movement === "object" ? (s.camera_movement as any)?.type : s.camera_movement,
                        action: s.action || "",
                        dialogue: s.dialogue || "",
                        dialogueEmotion: s.dialogue_emotion,
                        speakerName: s.subject,
                      }));
                      const prompt = generateH3Prompt(h3Cuts, { lang: "en" });
                      navigator.clipboard.writeText(prompt);
                      notify.success(`已复制批次 B${gIdx + 1} 的 MiniMax H3 视频生成提示词！`);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-colors cursor-pointer"
                    title="生成并复制本批次（同场景光影）所有镜头的连贯 H3 提示词"
                  >
                    <Video className="w-3.5 h-3.5 text-purple-400" />
                    <span>复制 H3 批次词</span>
                  </button>

                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      本批次全部显影
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      待冲印 {group.shots.length - completedCount} 镜
                    </span>
                  )}
                </div>
              </div>

              {/* Group Shots Grid */}
              <div
                className={cn(
                  "grid gap-3",
                  aspectRatio === "9:16"
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                )}
              >
                {group.shots.map((shot, sIdx) => (
                  <StoryboardCell
                    key={shot.id}
                    shot={shot}
                    index={sIdx}
                    isSelected={shot.id === selectedShotId}
                    aspectRatio={aspectRatio}
                    characters={characters}
                    onSelect={() => onSelectShot(shot.id)}
                    onRegenerateImage={() => onRegenerateShotImage && onRegenerateShotImage(shot.id)}
                    onToggleLock={onToggleLock}
                    onOpenTheater={() => onOpenTheater && onOpenTheater(shot.id)}
                    onOpenDetail={() => onOpenDrawer && onOpenDrawer(shot.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
