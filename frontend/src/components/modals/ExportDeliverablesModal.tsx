import React, { useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Archive,
  Images,
  FileText,
  Terminal,
  Check,
  Copy,
  Loader2,
  X,
  Layers,
  BookOpen,
  Sparkles,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ProjectModel, ShotModel } from "@/types/shot";
import { api } from "@/lib/api";
import { exportStoryboardSheetToPng } from "@/lib/canvasExporter";
import { exportCallSheetToCsv } from "@/lib/callSheetExporter";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";
import { generateH3Prompt } from "@/lib/h3Prompt";
import { buildH3CutItem } from "@/hooks/useH3Prompt";

interface ExportDeliverablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  shots?: ShotModel[];
}

export const ExportDeliverablesModal: React.FC<ExportDeliverablesModalProps> = ({
  isOpen,
  onClose,
  project,
  shots = [],
}) => {
  const [exportScope, setExportScope] = useState<"current" | "all">("current");
  const [exportWithHud, setExportWithHud] = useState(true);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen || !project) return null;

  const isVertical = project.aspect_ratio === "9:16";
  const allShots = (project.sequences || []).flatMap((seq) => seq.shots || []);
  const currentShots =
    exportScope === "all" && allShots.length > 0
      ? allShots
      : shots.length > 0
      ? shots
      : project.sequences?.[0]?.shots || [];

  const handleExportH3Json = () => {
    if (currentShots.length === 0) {
      notify.error("暂无可导出的分镜数据");
      return;
    }
    const data = {
      project_title: project.title,
      timestamp: new Date().toISOString(),
      shots_count: currentShots.length,
      shots: currentShots.map((s, idx) => ({
        order: idx + 1,
        seconds: Number(s.duration) || 2.5,
        shot_size: s.shot_size,
        camera: typeof s.camera_movement === "object" ? (s.camera_movement as any)?.type : s.camera_movement,
        action: s.action,
        dialogue: s.dialogue,
        dialogue_emotion: s.dialogue_emotion,
        subject: s.subject,
        h3_prompt: s.h3_prompt || generateH3Prompt([buildH3CutItem(s, idx + 1)], { lang: "en" }),
        image_prompt: s.image_prompt,
        storyboard_image_url: s.storyboard_image_url,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, "_")}_h3_manifest_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success("已导出 MiniMax H3 工业分镜投产 JSON 清单！");
  };

  const handleExportStoryboardSheetPNG = async () => {
    if (!project || isExportingPng) return;
    if (currentShots.length === 0) {
      notify.error("项目中暂无镜头数据，无法导出故事板打样单");
      return;
    }
    try {
      setIsExportingPng(true);
      notify.info(`🎨 正在使用 Canvas 极速合成 ${isVertical ? "9:16 竖屏" : "16:9"} 故事板打样单，稍候...`);
      await exportStoryboardSheetToPng(project, currentShots, { includeHud: exportWithHud });
      notify.success("🎉 完整故事板打样单 (PNG) 已成功生成并下载！");
    } catch (e: any) {
      console.error("Export PNG error:", e);
      notify.error(e?.message || "导出故事板打样单失败");
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopyGlobalPrompt = async () => {
    if (!project) return;
    try {
      setIsCopyingPrompt(true);
      const promptText = await api.fetchDirectorGlobalPrompt(project.id);
      await navigator.clipboard.writeText(promptText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      notify.success("📋 导演全局总控提示词已复制到剪贴板");
    } catch (e) {
      console.error("Failed to copy global prompt:", e);
      notify.error("复制全局提示词失败");
    } finally {
      setIsCopyingPrompt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">导演工业级交付物全套导出</h3>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold border",
                  isVertical ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                )}>
                  {isVertical ? "9:16 竖屏短剧" : "16:9 电影画幅"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                《{project.title}》· {project.sequences && project.sequences.length > 1 ? `${project.sequences.length} 集 · ` : ""}当前导出: {currentShots.length} 个分镜
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 pt-1">
          {/* Multi-Episode Delivery Scope Switcher */}
          {project.sequences && project.sequences.length > 1 && (
            <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-xl border border-border/70">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>交付导出范围:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportScope("current")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                    exportScope === "current"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                      : "bg-background/60 text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  当前单集 ({shots.length} 镜)
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                    exportScope === "all"
                      ? "bg-amber-500 text-black font-bold shadow-xs border-amber-500"
                      : "bg-background/60 text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  全剧打包 ({allShots.length} 镜)
                </button>
              </div>
            </div>
          )}

          {/* Previz HUD Option */}
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/40 rounded-xl border border-border/60">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exportWithHud}
                onChange={(e) => setExportWithHud(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>包含导演视听执行辅助图层 (Previz HUD: 运镜动势标与 90% 动作安全标)</span>
            </label>
            <span className="text-[11px] font-mono text-sky-400">
              {exportWithHud ? "🎯 HUD 已启用" : "纯净无辅助线"}
            </span>
          </div>

          {/* Tier 1: 👑 工业交付全套总包 (Master Archive Package) - 1-Click All-in-One */}
          <a
            href={api.getExportPackageUrl(project.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-4 rounded-xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-amber-500 text-black shadow-md shrink-0 font-bold">
                <Archive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground group-hover:text-amber-300 transition-colors">
                    📦 工业级全套交付总包 (Package ZIP)
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    一键打包
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  内含：全镜头高清大图 + 顺场表 + 剧本台本 + 设定集 + H3投产JSON
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs shadow hover:bg-amber-400 shrink-0 ml-3 transition-colors">
              <Download className="w-3.5 h-3.5" />
              <span>立即下载</span>
            </div>
          </a>

          {/* Tier 2: ⚡ 常用高频速取单卡 (Quick Action Cards: PNG & CSV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Storyboard Sheet PNG */}
            <button
              type="button"
              onClick={handleExportStoryboardSheetPNG}
              disabled={isExportingPng || currentShots.length === 0}
              className="flex flex-col justify-between p-3.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 transition-all text-left disabled:opacity-50 cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                    {isExportingPng ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  </div>
                  <Download className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="text-xs font-bold text-sky-300">
                  🖼️ 高清故事板长图 (PNG)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {isVertical ? "9:16 竖屏" : "16:9"} 故事板打样单，带水印与分镜参数
                </p>
              </div>
              <div className="mt-3 text-xs font-mono text-sky-400 font-semibold">
                {isExportingPng ? "正在合成画卷..." : "下载合成长图 →"}
              </div>
            </button>

            {/* Call Sheet CSV */}
            <button
              type="button"
              onClick={() => {
                try {
                  exportCallSheetToCsv(
                    project,
                    currentShots,
                    project.locations || [],
                    project.characters || []
                  );
                  notify.success("📊 剧组制片顺场表 (CSV / Excel) 已成功导出并下载！");
                } catch (e: any) {
                  notify.error(e?.message || "导出顺场表失败");
                }
              }}
              disabled={currentShots.length === 0}
              className="flex flex-col justify-between p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left cursor-pointer disabled:opacity-50 group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="text-xs font-bold text-emerald-300">
                  📊 剧组制片顺场表 (CSV)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  同场场景与光影分组对账，Excel 直接打开无乱码
                </p>
              </div>
              <div className="mt-3 text-xs font-mono text-emerald-400 font-semibold">
                导出表格文件 →
              </div>
            </button>
          </div>

          {/* Tier 3: 🛠️ 更多工程单项与脚本 (Collapsible Advanced Manifests) */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span>🛠️ 更多工业工程单项 (H3投产、设定集、台本、独立图包)</span>
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* MiniMax H3 Production Manifest JSON */}
                  <button
                    type="button"
                    onClick={handleExportH3Json}
                    disabled={currentShots.length === 0}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary transition-all text-left cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-secondary text-foreground shrink-0">
                        <Terminal className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-foreground truncate">MiniMax H3 投产清单 (JSON)</h5>
                        <p className="text-[10px] text-muted-foreground truncate">时间轴对齐指令与台词原子块</p>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-2" />
                  </button>

                  {/* Storyboard Images Pack (ZIP) */}
                  <a
                    href={api.getExportImagesZipUrl(project.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-secondary text-foreground shrink-0">
                        <Images className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-foreground truncate">独立分镜图包 (ZIP)</h5>
                        <p className="text-[10px] text-muted-foreground truncate">每镜独立高清原图归档</p>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-2" />
                  </a>

                  {/* Character & Location Bible Markdown */}
                  <a
                    href={api.getExportBibleUrl(project.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 shrink-0">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-foreground truncate">设定集 (Bible MD)</h5>
                        <p className="text-[10px] text-muted-foreground truncate">角色DNA档案与场景空间定妆</p>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-2" />
                  </a>

                  {/* Shot Script Markdown */}
                  <a
                    href={api.getExportScriptUrl(project.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-secondary text-foreground shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-foreground truncate">分镜头脚本文档 (Script MD)</h5>
                        <p className="text-[10px] text-muted-foreground truncate">标准分镜对白与机位动作台本</p>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-2" />
                  </a>
                </div>

                {/* Global Prompt Footer Strip */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-semibold text-sky-300 truncate">导演全局总控提示词 (Global Prompt)</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={handleCopyGlobalPrompt}
                      disabled={isCopyingPrompt}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-medium border border-sky-500/40 transition-colors cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? "已复制" : "复制"}</span>
                    </button>
                    <a
                      href={api.getExportDirectorGlobalPromptUrl(project.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-muted-foreground hover:text-sky-300"
                      title="下载 MD"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
