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
} from "lucide-react";
import { ProjectModel, ShotModel } from "@/types/shot";
import { api } from "@/lib/api";
import { exportStoryboardSheetToPng } from "@/lib/canvasExporter";
import { notify } from "@/components/ui/ToastNotification";

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
  const [exportWithHud, setExportWithHud] = useState(true);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !project) return null;

  const currentShots = shots.length > 0 ? shots : project.sequences?.[0]?.shots || [];

  const handleExportStoryboardSheetPNG = async () => {
    if (!project || isExportingPng) return;
    if (currentShots.length === 0) {
      notify.error("项目中暂无镜头数据，无法导出故事板打样单");
      return;
    }
    try {
      setIsExportingPng(true);
      notify.info("🎨 正在使用 Canvas 极速合成 16:9 故事板打样单，稍候...");
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
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">好莱坞 5 大工业级交付物导出</h3>
              <p className="text-xs text-muted-foreground">《{project.title}》· 共 {currentShots.length} 个分镜</p>
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

          {/* 1. 16:9 Storyboard Sheet PNG */}
          <button
            type="button"
            onClick={handleExportStoryboardSheetPNG}
            disabled={isExportingPng || currentShots.length === 0}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 transition-all group text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                {isExportingPng ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-sky-300">1. 🖼️ 导演故事板工作草图打样单 (PNG Draft)</h4>
                <p className="text-[11px] text-muted-foreground">
                  纯客户端 Canvas 极速合成轻量打样单（1K 级标准尺寸，小体积秒下载，零等待）
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
              {isExportingPng ? (
                <span className="text-sky-300 text-[11px]">合成中...</span>
              ) : (
                <Download className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              )}
            </div>
          </button>

          {/* 2. Generation Package ZIP */}
          <a
            href={api.getExportPackageUrl(project.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Archive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-primary">2. 📦 全套工业交付包 (Generation Package ZIP)</h4>
                <p className="text-[11px] text-muted-foreground">
                  包含 Shot Spec JSON、AI 视频批量生成 Manifest、Markdown 剧本与高清资产清单
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </a>

          {/* 3. Storyboard Images Pack (ZIP) */}
          <a
            href={api.getExportImagesZipUrl(project.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Images className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-400">3. 🖼️ 高清分镜图包 (Storyboard Images ZIP)</h4>
                <p className="text-[11px] text-muted-foreground">
                  每个镜头的 1080P/16:9 高清原图（按 SHOT_01_WS_... 严格规范命名打包）
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </a>

          {/* 4. Shot Script Markdown */}
          <a
            href={api.getExportScriptUrl(project.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background/60 hover:bg-accent/40 hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold group-hover:text-primary transition-colors">
                  4. 🎬 导演分镜头脚本文档 (Shot Script Markdown)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  标准好莱坞分镜头台本（包含视听语言、机位运动与对白列表）
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </a>

          {/* 5. Director Global Prompt */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-sky-300">5. 🌐 导演全局总控提示词 (Global Prompt)</h4>
                <p className="text-[11px] text-muted-foreground">好莱坞多格总控 Prompt（支持 Midjourney 单图整版）</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyGlobalPrompt}
                disabled={isCopyingPrompt}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-medium border border-sky-500/40 transition-colors"
                title="一键复制完整 Prompt 到剪贴板"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? "已复制" : "复制"}</span>
              </button>
              <a
                href={api.getExportDirectorGlobalPromptUrl(project.id)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-muted-foreground hover:text-primary"
                title="下载 Markdown 文件"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
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
