"use client";

import React, { useMemo } from "react";
import { ShotModel, LocationModel, CharacterModel, PropModel, ProjectModel } from "@/types/shot";
import { Layers, MapPin, Sun, Clock, CheckCircle2, Video, Check, Film, Lock, FileSpreadsheet, Download, RefreshCw, Loader2, Sparkles, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildBatchH3, buildH3CutItem } from "@/hooks/useH3Prompt";
import { generateH3Prompt } from "@/lib/h3Prompt";
import { normalizeAssetUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { exportCallSheetToCsv } from "@/lib/callSheetExporter";

interface CallSheetViewProps {
  project?: ProjectModel | null;
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
  project,
  shots,
  locations,
  characters,
  selectedShotId,
  onSelectShot,
  onOpenDrawer,
  onRegenerateShotImage,
}) => {
  const [renderingGroupId, setRenderingGroupId] = React.useState<string | null>(null);
  const [renderingShotId, setRenderingShotId] = React.useState<string | null>(null);
  const [copiedShotId, setCopiedShotId] = React.useState<string | null>(null);
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
    <div className="p-4 space-y-5 overflow-y-auto h-full text-xs">
      {/* Introduction Banner with Export Action */}
      <div className="p-3.5 bg-secondary/50 border border-border rounded-xl flex items-center justify-between gap-3 text-xs text-foreground">
        <div className="flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold flex items-center gap-2">
              影视工业顺场表 / 拍摄批次清单 (Call Sheet Table)
              <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.2 rounded border border-border text-muted-foreground">
                同场光影高密度对账
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              全片镜头已根据<strong>「空间场景 + 光照状态」</strong>归纳为 {groups.length} 个生产批次。点击表格行可直接打开视听参数抽屉。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            try {
              exportCallSheetToCsv(project || null, shots, locations, characters);
              notify.success("📊 剧组制片顺场表 (CSV) 已成功导出并下载！");
            } catch (e: any) {
              notify.error(e?.message || "导出顺场表失败");
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
          title="一键导出标准 Excel / CSV 制片顺场排期表"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>导出 CSV 顺场表</span>
          <Download className="w-3 h-3 text-emerald-400" />
        </button>
      </div>

      {/* Batch Groups Table List */}
      <div className="space-y-4">
        {groups.map((group, gIdx) => {
          const completedCount = group.shots.filter((s) => s.storyboard_image_url && !s.is_dirty).length;
          const isComplete = completedCount === group.shots.length;

          return (
            <div
              key={group.groupKey}
              className="bg-card/70 border border-border rounded-xl shadow-xs overflow-hidden"
            >
              {/* Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/20 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-secondary text-foreground flex items-center justify-center font-mono font-bold text-xs border border-border">
                    B{gIdx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {group.locationName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground flex items-center gap-1">
                        <Sun className="w-3 h-3 text-muted-foreground" />
                        {group.lightingState}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {group.shots.length} 镜 · {group.totalDuration.toFixed(1)}s · 显影 {completedCount}/{group.shots.length}
                  </span>

                  {group.location?.reference_image_url && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary border border-border text-[10px] text-muted-foreground">
                      <img src={group.location.reference_image_url} alt="基准" className="w-4 h-4 rounded object-cover" />
                      <span>已定场景基准</span>
                    </div>
                  )}

                  {/* Copy Batch MiniMax H3 Prompt (Unified) */}
                  <button
                    type="button"
                    onClick={() => {
                      const prompt = buildBatchH3(group.shots, { lang: "en" });
                      navigator.clipboard.writeText(prompt);
                      notify.success(`已复制批次 B${gIdx + 1} 的 MiniMax H3 视频生成提示词！`);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                    title="生成并复制本批次所有镜头的连贯 H3 提示词"
                  >
                    <Video className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>复制 H3 批次词</span>
                  </button>

                  {/* 一键冲印本批次 (Batch Render within Call Sheet) */}
                  {!isComplete && onRegenerateShotImage && (
                    <button
                      type="button"
                      disabled={renderingGroupId === group.groupKey}
                      onClick={async () => {
                        const unrendered = group.shots.filter((s) => !s.storyboard_image_url || s.is_dirty);
                        if (unrendered.length === 0) return;
                        try {
                          setRenderingGroupId(group.groupKey);
                          notify.info(`🎨 正在冲印批次 B${gIdx + 1} (${group.locationName}) 的 ${unrendered.length} 个镜头画面...`);
                          for (const s of unrendered) {
                            await onRegenerateShotImage(s.id);
                          }
                          notify.success(`✨ 批次 B${gIdx + 1} 全部镜头画面冲印显影完毕！`);
                        } catch (err: any) {
                          notify.error(err?.message || "冲印批次镜头失败");
                        } finally {
                          setRenderingGroupId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="一键并发或顺序冲印本批次下所有待显影镜头画面"
                    >
                      {renderingGroupId === group.groupKey ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>冲印中...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>冲印本批次 ({group.shots.length - completedCount})</span>
                        </>
                      )}
                    </button>
                  )}

                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      全显影
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      待冲印 {group.shots.length - completedCount} 镜
                    </span>
                  )}
                </div>
              </div>

              {/* High-Density Compact Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/10 text-muted-foreground font-mono text-[11px]">
                      <th className="py-2 px-3 w-12 text-center">#</th>
                      <th className="py-2 px-3 w-16 text-center">画面</th>
                      <th className="py-2 px-3 w-20">景别</th>
                      <th className="py-2 px-3 w-28">运镜</th>
                      <th className="py-2 px-3">动作描述</th>
                      <th className="py-2 px-3">对白台词</th>
                      <th className="py-2 px-3 w-16 text-right">时长</th>
                      <th className="py-2 px-3 w-16 text-center">状态</th>
                      <th className="py-2 px-3 w-24 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {group.shots.map((shot, sIdx) => {
                      const isSelected = shot.id === selectedShotId;
                      const hasImage = Boolean(shot.storyboard_image_url);
                      const isDirty = Boolean(shot.is_dirty);
                      const isRenderingThisShot = renderingShotId === shot.id;
                      const isCopiedThisShot = copiedShotId === shot.id;
                      const movType = typeof shot.camera_movement === "object"
                        ? (shot.camera_movement as any)?.type
                        : shot.camera_movement || "static";

                      const handleCopySingleH3 = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        const cut = buildH3CutItem(shot, 1);
                        const prompt = generateH3Prompt([cut], { lang: "en" });
                        navigator.clipboard.writeText(prompt);
                        setCopiedShotId(shot.id);
                        notify.success(`已复制 #${sIdx + 1} 镜 MiniMax H3 视频生成提示词！`);
                        setTimeout(() => setCopiedShotId(null), 1500);
                      };

                      const handleRenderSingle = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!onRegenerateShotImage || isRenderingThisShot) return;
                        try {
                          setRenderingShotId(shot.id);
                          notify.info(`🎨 正在冲印 #${sIdx + 1} 镜画面，稍候...`);
                          await onRegenerateShotImage(shot.id);
                          notify.success(`✨ #${sIdx + 1} 镜画面已显影入库！`);
                        } catch (err: any) {
                          notify.error(err?.message || "冲印镜头画面失败");
                        } finally {
                          setRenderingShotId(null);
                        }
                      };

                      return (
                        <tr
                          key={shot.id}
                          onClick={() => {
                            onSelectShot(shot.id);
                            onOpenDrawer?.(shot.id);
                          }}
                          className={cn(
                            "hover:bg-muted/40 cursor-pointer transition-colors group/row",
                            isSelected && "bg-primary/5 font-medium"
                          )}
                        >
                          {/* Order */}
                          <td className="py-2 px-3 text-center font-mono text-muted-foreground group-hover/row:text-foreground">
                            {String(sIdx + 1).padStart(2, "0")}
                          </td>

                          {/* 48px Miniature Thumbnail */}
                          <td className="py-2 px-3 text-center">
                            <div className="w-12 h-7 rounded overflow-hidden bg-muted border border-border/60 mx-auto flex items-center justify-center">
                              {hasImage ? (
                                <img
                                  src={normalizeAssetUrl(shot.storyboard_image_url)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Film className="w-3 h-3 text-muted-foreground/50" />
                              )}
                            </div>
                          </td>

                          {/* Shot Size */}
                          <td className="py-2 px-3 font-mono text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-secondary border border-border text-foreground">
                              {shot.shot_size?.toUpperCase() || "MS"}
                            </span>
                          </td>

                          {/* Camera Movement */}
                          <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground truncate max-w-[110px]">
                            {movType}
                          </td>

                          {/* Action */}
                          <td className="py-2 px-3 text-foreground/90 max-w-xs truncate" title={shot.action}>
                            {shot.action || "（无动作描述）"}
                          </td>

                          {/* Dialogue */}
                          <td className="py-2 px-3 text-muted-foreground italic max-w-xs truncate" title={shot.dialogue}>
                            {shot.dialogue ? `“${shot.dialogue}”` : "-"}
                          </td>

                          {/* Duration */}
                          <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                            {shot.duration || 2.5}s
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3 text-center">
                            {hasImage && !isDirty ? (
                              <span className="inline-flex items-center text-emerald-400 font-bold" title="已显影就绪">
                                ✓
                              </span>
                            ) : isDirty ? (
                              <span className="text-amber-400 font-mono text-[10px]" title="台本已改待重绘">
                                ⚡改
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60" title="未冲印">
                                ○
                              </span>
                            )}
                          </td>

                          {/* Action Column: In-situ Render & H3 Copy */}
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Copy Single H3 Button */}
                              <button
                                type="button"
                                onClick={handleCopySingleH3}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="复制此分镜的 MiniMax H3 视频生成提示词"
                              >
                                {isCopiedThisShot ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Single Shot Render Button */}
                              {onRegenerateShotImage && (!hasImage || isDirty) && (
                                <button
                                  type="button"
                                  disabled={isRenderingThisShot}
                                  onClick={handleRenderSingle}
                                  className="p-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                                  title={isDirty ? "台本已改，点击重新冲印该镜" : "原位冲印显影此镜画面"}
                                >
                                  {isRenderingThisShot ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
