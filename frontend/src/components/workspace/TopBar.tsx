import React, { useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Download,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Archive,
  Settings,
  BookOpen,
  FileCode2,
} from "lucide-react";
import { ProjectModel } from "@/types/shot";
import { api } from "@/lib/api";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { BibleModal } from "@/components/modals/BibleModal";
import { ImportScriptModal } from "@/components/modals/ImportScriptModal";

interface TopBarProps {
  project: ProjectModel | null;
  totalDuration: number;
  onGenerateFromStory?: (story: string) => Promise<void>;
  onImportScript?: (scriptText: string) => Promise<void>;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  totalDuration,
  onGenerateFromStory,
  onImportScript,
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isOpenExportModal, setIsOpenExportModal] = useState(false);
  const [isOpenSettingsModal, setIsOpenSettingsModal] = useState(false);
  const [isOpenBibleModal, setIsOpenBibleModal] = useState(false);
  const [isOpenScriptModal, setIsOpenScriptModal] = useState(false);
  const [bibleMode, setBibleMode] = useState<"bible" | "style">("bible");

  const [storyText, setStoryText] = useState(project?.story || "");
  const [isGenerating, setIsGenerating] = useState(false);

  const isOverDuration = project && totalDuration > project.target_duration;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim() || !onGenerateFromStory) return;
    try {
      setIsGenerating(true);
      await onGenerateFromStory(storyText);
      setIsOpenModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none">
        {/* Left: Brand & Project Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            title="返回控制台"
          >
            <Clapperboard className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-foreground">
              {project?.title || "未命名项目"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              {totalDuration.toFixed(1)}s / {project?.target_duration || 30}s
            </span>
            {isOverDuration && (
              <span className="flex items-center gap-1 text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded">
                <AlertCircle className="w-3 h-3" />
                超时 {(totalDuration - (project?.target_duration || 30)).toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        {/* Middle: Mode Indicators */}
        <div className="hidden md:flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border/50 text-xs">
          <button className="px-3 py-1 rounded bg-accent text-foreground font-medium shadow-sm">
            双向协同工作台
          </button>
          <button
            onClick={() => {
              setBibleMode("bible");
              setIsOpenBibleModal(true);
            }}
            className="px-3 py-1 rounded text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>设定集 (Bible)</span>
          </button>
          <button
            onClick={() => {
              setBibleMode("style");
              setIsOpenBibleModal(true);
            }}
            className="px-3 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            视觉风格 (Style)
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Start Point B: Import Script */}
          <button
            onClick={() => setIsOpenScriptModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors shadow-sm"
            title="导入已有剧本或分镜脚本"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>导入脚本</span>
          </button>

          {/* Start Point A: AI Director Story Generation */}
          <button
            onClick={() => {
              setStoryText(project?.story || "");
              setIsOpenModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 导演智能拆镜</span>
          </button>

          {/* Export Modal */}
          <button
            onClick={() => setIsOpenExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsOpenSettingsModal(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-border/60 transition-colors"
            title="AI 模型与 API 设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* AI Generate Modal (Start Point A) */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">AI 导演智能拆镜 (起点 A)</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              输入剧本故事，LangGraph 导演智能体将自动分析戏剧节拍、空间设定并规划出全套分镜头与提示词。
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  故事梗概 / 剧本描述
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="例如：一只老鼠夜里偷偷进入厨房偷油，过程中不断发生小意外，最后成功逃走..."
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="w-full bg-background border border-border rounded-md p-3 text-xs leading-relaxed focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setIsOpenModal(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在规划镜头...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>开始智能拆镜与生成</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Deliverables Modal */}
      {isOpenExportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">导出导演项目交付物</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              一套 Shot Model 统一渲染输出三种不同应用场景的交付物：
            </p>

            <div className="space-y-3">
              {/* Deliverable 1: Storyboard Sheet */}
              <a
                href={project ? api.getExportSheetUrl(project.id) : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background/60 hover:bg-accent/40 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold group-hover:text-primary transition-colors">1. Storyboard Page (PNG)</h4>
                    <p className="text-[11px] text-muted-foreground">3x4 格局完整导演故事板预览图</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </a>

              {/* Deliverable 2: Shot Script Markdown */}
              <a
                href={project ? api.getExportScriptUrl(project.id) : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background/60 hover:bg-accent/40 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold group-hover:text-primary transition-colors">2. Shot Script (Markdown)</h4>
                    <p className="text-[11px] text-muted-foreground">专业工业级分镜头剧本文档</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </a>

              {/* Deliverable 3: Generation Package ZIP */}
              <a
                href={project ? api.getExportPackageUrl(project.id) : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background/60 hover:bg-accent/40 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold group-hover:text-primary transition-colors">3. Shot Generation Package (ZIP)</h4>
                    <p className="text-[11px] text-muted-foreground">包含 JSON Spec、提示词包与全套素材</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </a>
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-border">
              <button
                onClick={() => setIsOpenExportModal(false)}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isOpenSettingsModal}
        onClose={() => setIsOpenSettingsModal(false)}
      />

      {/* Bible & Style Modal */}
      <BibleModal
        isOpen={isOpenBibleModal}
        onClose={() => setIsOpenBibleModal(false)}
        project={project}
        mode={bibleMode}
      />

      {/* Import Script Modal (Start Point B) */}
      <ImportScriptModal
        isOpen={isOpenScriptModal}
        onClose={() => setIsOpenScriptModal(false)}
        onImportScript={onImportScript || (async () => {})}
      />
    </>
  );
};
