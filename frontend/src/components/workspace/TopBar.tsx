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
  Camera,
  History,
  Columns2,
  LayoutGrid,
  User,
  LogOut,
  Sliders,
  Loader2,
} from "lucide-react";
import { ExportDeliverablesModal } from "@/components/modals/ExportDeliverablesModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { BibleModal } from "@/components/modals/BibleModal";
import { ImportScriptModal } from "@/components/modals/ImportScriptModal";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";
import { ShotModel } from "@/types/shot";
import { cn } from "@/lib/utils";

interface TopBarProps {
  project: ProjectModel | null;
  shots?: ShotModel[];
  totalDuration: number;
  activeVersionTag?: string;
  isLeftPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
  onGenerateFromStory: (story: string) => Promise<void>;
  onImportScript?: (scriptText: string) => Promise<void>;
  onOpenVersions?: () => void;
  onOpenCreateSnapshot?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  shots = [],
  totalDuration,
  activeVersionTag = "v1.0",
  isLeftPanelCollapsed = false,
  onToggleLeftPanel,
  onGenerateFromStory,
  onImportScript,
  onOpenVersions,
  onOpenCreateSnapshot,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, openProfileModal, openSettingsModal } = useAuthStore();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isOpenBibleModal, setIsOpenBibleModal] = useState(false);
  const [isOpenScriptModal, setIsOpenScriptModal] = useState(false);
  const [isOpenExportModal, setIsOpenExportModal] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [bibleMode, setBibleMode] = useState<"bible" | "style">("bible");
  const [storyText, setStoryText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

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

  const handleConfirmDelete = async (projectId: string) => {
    await api.deleteProject(projectId);
    router.push("/dashboard");
  };

  const handleCloneDemo = async () => {
    if (!project) return;
    if (!isAuthenticated) {
      notify.info("💡 请先登录或注册，即可将官方 Demo 克隆至您的私有工作区");
      openAuthModal("login");
      return;
    }
    try {
      setIsCloning(true);
      notify.info("正在克隆演示工程至您的私有仓库...");
      const cloned = await api.cloneProject(project.id);
      notify.success("🎉 工程克隆成功！已切换至您的私有副本。");
      router.push(`/workspace/${cloned.id}`);
    } catch (e: any) {
      console.error("Clone error:", e);
      notify.error(e?.response?.data?.detail || "克隆工程失败");
    } finally {
      setIsCloning(false);
    }
  };

  const isOverDuration = totalDuration > (project?.target_duration || 30);

  return (
    <>
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none z-20">
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
            <h1 className="font-semibold text-sm truncate max-w-[180px] md:max-w-xs">
              {project?.title || "AI 导演分镜工作台"}
            </h1>

            {onOpenVersions && (
              <button
                onClick={onOpenVersions}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-secondary hover:bg-primary/15 border border-border hover:border-primary/40 text-foreground hover:text-primary transition-colors shadow-2xs"
                title="点击打开版本时光机（查看历史快照与回滚）"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{activeVersionTag}</span>
              </button>
            )}

            {isBuiltIn && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                官方演示
              </span>
            )}
          </div>
        </div>

        {/* Middle Stats Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {onToggleLeftPanel && (
            <button
              onClick={onToggleLeftPanel}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                isLeftPanelCollapsed
                  ? "bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-secondary/80"
                  : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
              )}
              title={isLeftPanelCollapsed ? "展开左侧剧本分镜列表" : "折叠左侧面板，全屏预览故事板"}
            >
              {isLeftPanelCollapsed ? <Columns2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
              <span>{isLeftPanelCollapsed ? "展开双栏" : "沉浸全屏"}</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-lg border border-border">
            <span className="text-muted-foreground">镜头总数:</span>
            <span className="font-mono font-medium">{shots.length} 镜</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-lg border border-border">
            <span className="text-muted-foreground">总时长:</span>
            <span className={cn("font-mono font-medium", isOverDuration ? "text-amber-400" : "text-foreground")}>
              {totalDuration.toFixed(1)}s / {project?.target_duration || 30}s
            </span>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* 1-Click Clone Demo button (if built-in demo) */}
          {isBuiltIn && (
            <button
              onClick={handleCloneDemo}
              disabled={isCloning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors shadow-2xs"
              title="一键克隆该官方演示工程至您的私有工作区"
            >
              {isCloning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              <span>克隆为我的项目</span>
            </button>
          )}

          {/* Style Bible Button */}
          <button
            onClick={() => {
              setBibleMode("bible");
              setIsOpenBibleModal(true);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors shadow-sm"
            title="查看视觉导演设定集 (Character & Scene Bible)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>设定集</span>
          </button>

          {/* Snapshot Button */}
          {onOpenCreateSnapshot && (
            <button
              onClick={onOpenCreateSnapshot}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors shadow-sm"
              title="保存当前分镜版本快照"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">快照</span>
            </button>
          )}

          <button
            onClick={() => {
              if (!isAuthenticated) {
                notify.info("🎬 请先登录或注册导演账号");
                openAuthModal("login");
                return;
              }
              const hasKey = !!user?.custom_settings?.llmApiKey;
              if (!hasKey) {
                notify.info("🎬 请先在「设置」中配置您的专属 OpenRouter API Key，开启剧本解析服务");
                openSettingsModal();
                return;
              }
              setIsOpenScriptModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors shadow-sm"
            title="导入已有剧本或分镜脚本"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>导入脚本</span>
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated) {
                notify.info("🎬 请先登录或注册导演账号");
                openAuthModal("login");
                return;
              }
              const hasKey = !!user?.custom_settings?.llmApiKey;
              if (!hasKey) {
                notify.info("🎬 请先在「设置」中配置您的专属 OpenRouter API Key，开启 AI 智能拆镜服务");
                openSettingsModal();
                return;
              }
              setStoryText(project?.story || "");
              setIsOpenModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 导演智能拆镜</span>
          </button>

          <button
            onClick={() => setIsOpenExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出</span>
          </button>

          <button
            onClick={openSettingsModal}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-border/60 transition-colors"
            title="AI 模型与 API 设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile / Auth Button */}
          {isAuthenticated && user ? (
            <button
              onClick={openProfileModal}
              className="flex items-center gap-1.5 p-1 pl-1.5 pr-2.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/80 transition-colors"
              title="个人设置与专属 API Key"
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`}
                alt={user.username}
                className="w-5 h-5 rounded-full bg-primary/20"
              />
              <span className="text-xs font-medium text-foreground max-w-[80px] truncate">{user.username}</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30 transition-colors shadow-2xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>登录</span>
            </button>
          )}

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
      <ExportDeliverablesModal
        isOpen={isOpenExportModal}
        onClose={() => setIsOpenExportModal(false)}
        project={project}
        shots={shots}
      />

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        project={project}
        onConfirmDelete={handleConfirmDelete}
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
