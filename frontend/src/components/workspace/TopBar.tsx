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
  Play,
  Clock,
  MoreVertical,
} from "lucide-react";
import { ExportDeliverablesModal } from "@/components/modals/ExportDeliverablesModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { BibleModal } from "@/components/modals/BibleModal";
import { ImportScriptModal } from "@/components/modals/ImportScriptModal";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import { useAuthStore } from "@/stores/authStore";
import { NarrativeStyleSelector } from "@/components/director/NarrativeStyleSelector";
import { NarrativeMode, NarrativeCenter } from "@/types/narrative";
import { ShotModel } from "@/types/shot";
import { cn } from "@/lib/utils";

interface TopBarProps {
  project: ProjectModel | null;
  shots?: ShotModel[];
  totalDuration: number;
  activeVersionTag?: string;
  isLeftPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
  onGenerateFromStory: (
    story: string,
    options?: {
      narrative_mode?: "hollywood" | "drama_5min" | "commercial";
      structural_archetype?: string;
      narrative_center?: "character" | "creative" | "plot";
    }
  ) => Promise<void>;
  onImportScript?: (scriptText: string) => Promise<void>;
  onOpenVersions?: () => void;
  onOpenCreateSnapshot?: () => void;
  onOpenTheater?: () => void;
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
  onOpenTheater,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isOpenBibleModal, setIsOpenBibleModal] = useState(false);
  const [isOpenScriptModal, setIsOpenScriptModal] = useState(false);
  const [isOpenExportModal, setIsOpenExportModal] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [bibleMode, setBibleMode] = useState<"bible" | "style">("bible");
  const [storyText, setStoryText] = useState("");
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>("hollywood");
  const [structuralArchetype, setStructuralArchetype] = useState<string>("single_space_standoff");
  const [narrativeCenter, setNarrativeCenter] = useState<NarrativeCenter>("plot");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const handleGenerate = async () => {
    if (!storyText.trim()) return;
    try {
      setIsSubmitting(true);
      await onGenerateFromStory(storyText, {
        narrative_mode: narrativeMode,
        structural_archetype: narrativeMode === "drama_5min" ? structuralArchetype : undefined,
        narrative_center: narrativeMode === "drama_5min" ? narrativeCenter : undefined,
      });
      setIsOpenModal(false);
    } finally {
      setIsSubmitting(false);
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

        {/* Right Action Tools: 3-Group Semantic Dock */}
        <div className="flex items-center gap-2.5">
          {/* Group 1: Core Creation & Screening (Prominent) */}
          <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg border border-border/80 shadow-2xs">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              title="基于灵感故事梗概，AI 导演智能拆解为好莱坞镜头"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 智能拆镜</span>
            </button>
          </div>

          {/* Desktop Only: Group 1 secondary items (Preview/Script), Group 2 (Snapshots & Export), Group 3 (Settings & Delete) */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Group 1 Extra: Theater & Script */}
            <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg border border-border/80 shadow-2xs">
              {onImportScript && (
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
                  className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors"
                  title="导入已有剧本或分镜脚本逆向拆解"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>导入脚本</span>
                </button>
              )}

              {onOpenTheater && (
                <button
                  onClick={onOpenTheater}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all shadow-xs"
                  title="进入 16:9 全屏影院动态预演播放（支持键盘切镜与空格播放）"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>动态预演</span>
                </button>
              )}
            </div>

            {/* Group 2: Production, Snapshots & Export */}
            <div className="flex items-center bg-secondary/50 rounded-lg p-1 border border-border/80 shadow-2xs">
              {onOpenCreateSnapshot && (
                <button
                  onClick={onOpenCreateSnapshot}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                  title="保存当前分镜版本快照"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">快照</span>
                </button>
              )}

              {onOpenVersions && (
                <button
                  onClick={onOpenVersions}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                  title="查看历史版本快照与时光穿越"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">版本</span>
                </button>
              )}

              <button
                onClick={() => setIsOpenExportModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                title="导出 PNG 分镜表单、Markdown 台本、提示词包与原图 ZIP"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>导出</span>
              </button>
            </div>

            {/* Group 3: System & User Profile */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={openSettingsModal}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors"
                title="AI 模型与 API 设置"
              >
                <Settings className="w-4 h-4" />
              </button>

              {isAuthenticated && user ? (
                <UserMenuDropdown />
              ) : (
                <button
                  onClick={() => openAuthModal("login")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30 transition-colors shadow-2xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>登录</span>
                </button>
              )}

              <button
                onClick={() => setIsDeleteOpen(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/60 transition-colors"
                title="删除此项目"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Right Controls (< md): User Avatar & More Options Popup */}
          <div className="flex md:hidden items-center gap-1.5">
            {isAuthenticated && user ? (
              <UserMenuDropdown />
            ) : (
              <button
                onClick={() => openAuthModal("login")}
                className="p-1.5 rounded-md text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground bg-secondary/60 border border-border transition-colors"
                title="更多操作"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-xs">
                    {onOpenTheater && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenTheater();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-500/15 text-emerald-300 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>动态预演 (Theater)</span>
                      </button>
                    )}

                    {onOpenCreateSnapshot && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenCreateSnapshot();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>生成当前快照</span>
                      </button>
                    )}

                    {onOpenVersions && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenVersions();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>版本时光机</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsOpenExportModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>导出打样 (Export)</span>
                    </button>

                    <div className="my-1 border-t border-border/60" />

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openSettingsModal();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>API 与模型设置</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsDeleteOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-destructive/15 text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除工程</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
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

            <div className="space-y-3">
              <NarrativeStyleSelector
                mode={narrativeMode}
                onModeChange={setNarrativeMode}
                archetype={structuralArchetype}
                onArchetypeChange={setStructuralArchetype}
                center={narrativeCenter}
                onCenterChange={setNarrativeCenter}
                compact
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">输入故事梗概或场次文本</label>
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="例如：赛博雨夜，青瓦飞檐的古典茶楼中，黑客武术大师墨客与特工银狐展开近身对决，经历了拔枪、子弹时间下腰闪避、凌空飞踢，最终击退特工，墨客收势伫立在雨中..."
                  rows={4}
                  className="w-full text-xs bg-background border border-border rounded-lg p-3 resize-none focus:outline-none focus:border-primary"
                />
              </div>
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
