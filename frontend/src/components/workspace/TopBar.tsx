import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectModel } from "@/types/shot";
import {
  Sparkles,
  Download,
  Settings,
  BookOpen,
  FileCode2,
  AlertCircle,
  FileText,
  Archive,
  Image as ImageIcon,
  Check,
  Copy,
  Terminal,
  Images,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { BibleModal } from "@/components/modals/BibleModal";
import { ImportScriptModal } from "@/components/modals/ImportScriptModal";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import { api } from "@/lib/api";

interface TopBarProps {
  project: ProjectModel | null;
  totalDuration: number;
  onGenerateFromStory: (story: string) => Promise<void>;
  onImportScript?: (scriptText: string) => Promise<void>;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  totalDuration,
  onGenerateFromStory,
  onImportScript,
}) => {
  const router = useRouter();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isOpenSettingsModal, setIsOpenSettingsModal] = useState(false);
  const [isOpenBibleModal, setIsOpenBibleModal] = useState(false);
  const [isOpenScriptModal, setIsOpenScriptModal] = useState(false);
  const [isOpenExportModal, setIsOpenExportModal] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [bibleMode, setBibleMode] = useState<"bible" | "style">("bible");
  const [storyText, setStoryText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isBuiltIn = !project || project.id === "demo" || project.id === "demo-matrix-cyber-master";

  const handleGenerate = async () => {
    if (!storyText.trim()) return;
    try {
      setIsSubmitting(true);
      await onGenerateFromStory(storyText);
      setIsOpenModal(false);
    } finally {
      setIsSubmitting(false);
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
    } catch (e) {
      console.error("Failed to copy global prompt:", e);
    } finally {
      setIsCopyingPrompt(false);
    }
  };

  const handleConfirmDelete = async (projectId: string) => {
    await api.deleteProject(projectId);
    router.push("/dashboard");
  };

  const isOverDuration = totalDuration > (project?.target_duration || 30);

  return (
    <>
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none z-20">
        {/* Left: Project Title & Stats */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="返回项目列表"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">看板</span>
          </Link>

          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="font-semibold text-sm truncate max-w-[200px] md:max-w-md">
              {project?.title || "AI 导演分镜工作台"}
            </h1>
            <span className="text-xs text-muted-foreground font-mono">
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

          {/* Delete Project (Non-demo) */}
          {!isBuiltIn && (
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/60 transition-colors"
              title="删除此项目"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* AI Generate Modal (Start Point A) */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">AI 导演智能拆镜 (好莱坞工业级规范)</h3>
                <p className="text-xs text-muted-foreground">基于 6 阶段 30 秒叙事弧，规划 12 镜分镜头并锁定角色场景基准</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">输入故事梗概或场次文本</label>
              <textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder="例如：赛博雨夜，青瓦飞檐的古典茶楼中，黑客武术大师墨客与特工银狐展开近身对决，经历了拔枪、子弹时间下腰闪避、凌空飞踢，最终击退特工，墨客收势伫立在雨中..."
                rows={5}
                className="w-full text-xs bg-background border border-border rounded-lg p-3 resize-none focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>预计耗时: ~3-5 秒 (调用当前配置模型)</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpenModal(false)}
                  className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !storyText.trim()}
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "正在拆镜中..." : "开始规划分镜"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Deliverables Modal */}
      {isOpenExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">工业级分镜全套交付物导出</h3>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Deliverable 1: Storyboard Sheet (1:1 Multi-Panel Grid) */}
              <a
                href={project ? api.getExportSheetUrl(project.id) : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/60 hover:bg-accent/40 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold group-hover:text-primary transition-colors">1. Storyboard Page (PNG)</h4>
                    <p className="text-[11px] text-muted-foreground">1:1 像素级对齐完整故事板打样单（包含景别角标与动作描述）</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </a>

              {/* Deliverable 5: Storyboard Images Pack (ZIP) */}
              <a
                href={project ? api.getExportImagesZipUrl(project.id) : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-emerald-500/20 text-emerald-400">
                    <Images className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400">5. Storyboard Images Pack (ZIP)</h4>
                    <p className="text-[11px] text-muted-foreground">每个镜头的 1080P 高清原图（按 SHOT_01_WS_... 严格规则命名打包）</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </a>

              {/* Deliverable 2: Shot Script Markdown */}
              <a
                href={project ? api.getExportScriptUrl(project.id) : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/60 hover:bg-accent/40 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold group-hover:text-primary transition-colors">2. Shot Script (Markdown)</h4>
                    <p className="text-[11px] text-muted-foreground">标准好莱坞分镜头台本（包含视听语言、机位运动与对白列表）</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </a>

              {/* Deliverable 4: Professional Director's Storyboard Global Prompt */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-sky-500/20 text-sky-400">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-sky-300">4. Professional Director's Global Prompt</h4>
                    <p className="text-[11px] text-muted-foreground">好莱坞 12 格总控 Prompt（支持 Midjourney 单图整版）</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyGlobalPrompt}
                    disabled={isCopyingPrompt}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-medium border border-sky-500/40 transition-colors"
                    title="一键复制完整 12 格 Prompt 到剪贴板"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "已复制" : "复制"}</span>
                  </button>
                  <a
                    href={project ? api.getExportDirectorGlobalPromptUrl(project.id) : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-primary"
                    title="下载 Markdown 文件"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Deliverable 3: Generation Package ZIP */}
              <a
                href={project ? api.getExportPackageUrl(project.id) : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/60 hover:bg-accent/40 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold group-hover:text-primary transition-colors">3. Shot Generation Package (ZIP)</h4>
                    <p className="text-[11px] text-muted-foreground">包含 JSON Spec、提示词包、打样图与全部 1080P 单图</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </a>
            </div>

            <div className="flex justify-end pt-4 mt-2 border-t border-border">
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

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        project={project}
        onConfirmDelete={handleConfirmDelete}
      />

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
