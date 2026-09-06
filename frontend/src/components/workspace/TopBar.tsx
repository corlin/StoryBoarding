import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ProjectModel, ShotModel } from "@/types/shot";
import {
  Sparkles,
  Download,
  Settings,
  BookOpen,
  ShieldCheck,
  SlidersHorizontal,
  ChevronLeft,
  Columns2,
  LayoutGrid,
  FileCode2,
  Film,
  Archive,
  Clock,
  Box,
  Layers,
  Trash2,
  Scale,
  MoreVertical,
  ChevronDown,
  Keyboard,
  X,
  HelpCircle,
  Palette,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { EpisodePillTrack } from "@/components/workspace/EpisodePillTrack";
import { computeProjectQualityDiagnostics } from "@/components/modals/ProjectQualityRadarModal";
import { COLOR } from "@/lib/colorTokens";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";

interface TopBarProps {
  project: ProjectModel | null;
  shots?: ShotModel[];
  totalDuration: number;
  activeVersionTag?: string;
  isLeftPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
  // Modal Triggers delegated to WorkspaceClient
  onOpenAIGenerate?: () => void;
  onOpenRadar?: () => void;
  onOpenExport?: () => void;
  onOpenBible?: (mode?: "bible" | "style") => void;
  onOpenTradeoff?: () => void;
  onOpenImportScript?: () => void;
  onOpenTheater?: () => void;
  onOpenCreateSnapshot?: () => void;
  onOpenVersions?: () => void;
  onOpenAssetLibrary?: () => void;
  onOpenMediaLibrary?: () => void;
  onOpenDelete?: () => void;
  onOpenWizard?: () => void;
  onBatchRender?: () => void;
  onOpenTour?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  shots = [],
  totalDuration,
  activeVersionTag = "v1.0",
  isLeftPanelCollapsed = false,
  onToggleLeftPanel,
  onOpenAIGenerate,
  onOpenRadar,
  onOpenExport,
  onOpenBible,
  onOpenTradeoff,
  onOpenImportScript,
  onOpenTheater,
  onOpenCreateSnapshot,
  onOpenVersions,
  onOpenAssetLibrary,
  onOpenMediaLibrary,
  onOpenDelete,
  onOpenWizard,
  onBatchRender,
  onOpenTour,
}) => {
  const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore();
  const { activeEpisodeIndex, setActiveEpisodeIndex } = useWorkspaceStore();
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isEpisodeDropdownOpen, setIsEpisodeDropdownOpen] = useState(false);
  const moreToolsRef = useRef<HTMLDivElement>(null);
  const episodeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (moreToolsRef.current && !moreToolsRef.current.contains(target)) {
        setIsMoreToolsOpen(false);
      }
      if (episodeDropdownRef.current && !episodeDropdownRef.current.contains(target)) {
        setIsEpisodeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Press '?' to toggle Shortcuts Guide Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.code === "Slash")) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isOverDuration = totalDuration > (project?.target_duration || 30);
  const unrenderedCount = shots.filter((s) => !s.storyboard_image_url || s.is_dirty).length;
  const allRendered = shots.length > 0 && unrenderedCount === 0;

  const sequences = project?.sequences || [];
  const currentSeq = sequences[activeEpisodeIndex] || sequences[0];

  // Compute live quality score for instant health badge display
  const { score: radarScore } = React.useMemo(() => {
    return computeProjectQualityDiagnostics(project, shots);
  }, [project, shots]);

  return (
    <header className="h-12 border-b border-border/80 bg-card/90 backdrop-blur px-3 md:px-4 flex items-center justify-between shrink-0 select-none relative z-40 gap-3">
      {/* Left: Project title, version & quick toggle */}
      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="返回项目列表"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-xs font-medium hidden sm:inline">看板</span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <h1
            className="text-xs md:text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px]"
            title={project?.title || "未命名工程"}
          >
            {project?.title || "未命名工程"}
          </h1>

          {onOpenVersions && (
            <button
              onClick={onOpenVersions}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
              title="版本历史时光机"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{activeVersionTag}</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle: Compact Episode Dropdown + Integrated Status Group */}
      <div className="hidden lg:flex items-center gap-2.5 flex-1 justify-center min-w-0 max-w-xl px-2">
        {onToggleLeftPanel && (
          <button
            onClick={onToggleLeftPanel}
            className={cn(
              "inline-flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 cursor-pointer",
              isLeftPanelCollapsed
                ? "bg-secondary text-muted-foreground border-border hover:text-foreground"
                : "bg-secondary text-foreground border-border hover:bg-muted"
            )}
            title={isLeftPanelCollapsed ? "展开左侧剧本面板" : "折叠左侧剧本，沉浸全宽预览分镜"}
          >
            {isLeftPanelCollapsed ? <Columns2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* 1. Compact Episode Dropdown (Replaces overflowing PillTrack) */}
        {sequences.length > 0 && (
          <div className="relative shrink-0" ref={episodeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsEpisodeDropdownOpen(!isEpisodeDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/70 hover:bg-secondary border border-border/80 text-foreground transition-all cursor-pointer shadow-2xs group max-w-[220px]"
              title={`当前剧集: EP ${currentSeq?.episode_number || activeEpisodeIndex + 1} · ${currentSeq?.title || currentSeq?.name || `第 ${activeEpisodeIndex + 1} 集`} (共 ${sequences.length} 集)`}
            >
              <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1 py-0.2 rounded border border-amber-500/30 shrink-0">
                EP {currentSeq?.episode_number || activeEpisodeIndex + 1}
              </span>
              <span className="truncate max-w-[120px] text-xs font-semibold">
                {currentSeq?.title || currentSeq?.name || `第 ${activeEpisodeIndex + 1} 集`}
              </span>
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground shrink-0 transition-transform", isEpisodeDropdownOpen && "rotate-180")} />
            </button>

            {isEpisodeDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b border-border/60 pb-1.5">
                  <span>短剧分集目录 ({sequences.length} 集)</span>
                  {onOpenBible && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEpisodeDropdownOpen(false);
                        onOpenBible("bible");
                      }}
                      className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      视觉设定集
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5">
                  {sequences.map((seq, idx) => {
                    const isCur = idx === activeEpisodeIndex;
                    const epN = seq.episode_number || idx + 1;
                    const sCount = seq.shots?.length || 0;
                    return (
                      <button
                        key={seq.id}
                        type="button"
                        onClick={() => {
                          setActiveEpisodeIndex(idx);
                          setIsEpisodeDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer",
                          isCur
                            ? "bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-secondary text-muted-foreground shrink-0">
                            EP {epN}
                          </span>
                          <span className="truncate">{seq.title || seq.name || `第 ${epN} 集`}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                          <span>{sCount} 镜</span>
                          {seq.cliffhanger_summary && <span title={seq.cliffhanger_summary}>🎣</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Integrated Micro Status Capsule Group */}
        <div className="flex items-center rounded-lg bg-secondary/50 border border-border/80 p-0.5 text-[11px] font-mono shadow-2xs shrink-0">
          {/* Duration Pill */}
          <span
            className={cn(
              "px-2 py-0.5 font-semibold",
              isOverDuration ? "text-amber-400 font-bold" : "text-muted-foreground"
            )}
            title={`当前集时长: ${totalDuration.toFixed(1)}s (目标: ${project?.target_duration || 30}s)`}
          >
            {totalDuration.toFixed(1)}s
          </span>

          {/* Quality Health Radar Diagnostic Pill */}
          {onOpenRadar && (
            <>
              <div className="w-[1px] h-3 bg-border/70 shrink-0" />
              <button
                type="button"
                onClick={onOpenRadar}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer font-bold",
                  radarScore >= 85
                    ? "text-emerald-400 hover:bg-emerald-500/10"
                    : radarScore >= 70
                    ? "text-amber-400 hover:bg-amber-500/10"
                    : "text-red-400 hover:bg-red-500/10"
                )}
                title="点击打开 AI 影视工程体检雷达（大纲、角色DNA、单句≤35字诊断）"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{radarScore}分</span>
              </button>
            </>
          )}

          {/* Render Status Pill: Unrendered Count or All-Ready Glow */}
          {shots.length > 0 && (
            <>
              <div className="w-[1px] h-3 bg-border/70 shrink-0" />
              {unrenderedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onBatchRender?.()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer font-semibold"
                  title={`当前尚有 ${unrenderedCount} 镜待冲印，点击启动批量显影`}
                >
                  <Palette className="w-3 h-3 text-amber-400" />
                  <span>待冲印 {unrenderedCount}</span>
                </button>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-emerald-400 font-semibold"
                  title="全片镜头画面已 100% 冲印显影就绪"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>全显影</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Action Tools: Golden 3-Key Streamlined Operations */}
      <div id="tour-topbar-actions" className="flex items-center gap-2 shrink-0">
        {/* 1. AI 智能拆镜 (Primary Highlight) */}
        {onOpenAIGenerate && (
          <button
            onClick={() => {
              if (!isAuthenticated) {
                notify.info("🎬 请先注册或登录专属导演账号");
                openAuthModal("login");
                return;
              }
              const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
              if (isDemoUser) {
                notify.info("🎬 当前为公共体验账号！如需使用 AI 导演重新拆解剧本与镜头，请注册专属导演账号并在设置中填入 Key");
                openAuthModal("register");
                return;
              }
              const hasKey = !!user?.custom_settings?.llmApiKey;
              if (!hasKey) {
                notify.info("🎬 请在「设置」中配置您专属的 OpenRouter API Key，开启 AI 智能拆镜服务");
                openSettingsModal();
                return;
              }
              onOpenAIGenerate();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
            title={
              (!user || user.id === "demo" || user.email === "demo@caifu.social")
                ? "AI 导演智能拆镜（公共体验账号下已展示完整样板分镜，如需重新规划请注册专属账号）"
                : "利用 AI 导演引擎规划镜头结构与运镜"
            }
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 智能拆镜</span>
          </button>
        )}

        {/* 2. 影院监看 (Cinema Theater with Ready Glow Badge) */}
        {onOpenTheater && (
          <button
            onClick={onOpenTheater}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              allRendered
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs"
                : "bg-secondary text-foreground hover:bg-muted border-border"
            )}
            title="全屏进入好莱坞电影预演影院"
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>放映监看</span>
            {allRendered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        )}

        {/* 3. 导出交付包 (Export) */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            title="导出分镜表、海螺H3清单与全套交付包"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>导出</span>
          </button>
        )}

        {/* 5. 收敛的「更多」下拉菜单 (More Tools Dropdown) */}
        <div className="relative" ref={moreToolsRef}>
          <button
            onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
            className="inline-flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors cursor-pointer"
            title="查看设定集、工程体检与更多配置"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {isMoreToolsOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-card border border-border rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
              {onOpenTradeoff && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenTradeoff();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Scale className="w-3.5 h-3.5 text-purple-400" />
                  <span>大纲改编与爽点雷达 (STAGE 01)</span>
                </button>
              )}

              {onOpenBible && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenBible("bible");
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>视觉设定集 (Bible)</span>
                </button>
              )}

              {onOpenRadar && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenRadar();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>工程体检 (质量雷达)</span>
                </button>
              )}

              {onOpenImportScript && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    if (!isAuthenticated) {
                      notify.info("🎬 请先注册或登录专属导演账号");
                      openAuthModal("login");
                      return;
                    }
                    const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
                    if (isDemoUser) {
                      notify.info("🎬 当前为公共体验账号！如需导入私有剧本进行解析，请注册专属导演账号并在设置中填入 Key");
                      openAuthModal("register");
                      return;
                    }
                    const hasKey = !!user?.custom_settings?.llmApiKey;
                    if (!hasKey) {
                      notify.info("🎬 请在「设置」中配置您专属的 OpenRouter API Key，开启剧本解析服务");
                      openSettingsModal();
                      return;
                    }
                    onOpenImportScript();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>导入并拆解剧本</span>
                </button>
              )}

              {onOpenWizard && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    if (!isAuthenticated) {
                      notify.info("🎬 请先注册或登录专属导演账号");
                      openAuthModal("login");
                      return;
                    }
                    const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
                    if (isDemoUser) {
                      notify.info("🎬 当前为公共体验账号！如需使用 AI 起步向导创建新故事，请注册专属导演账号并在设置中填入 Key");
                      openAuthModal("register");
                      return;
                    }
                    const hasKey = !!user?.custom_settings?.llmApiKey;
                    if (!hasKey) {
                      notify.info("🎬 请在「设置」中配置您专属的 OpenRouter API Key，开启 AI 起步向导服务");
                      openSettingsModal();
                      return;
                    }
                    onOpenWizard();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>⚡ 3步AI起步向导 (重置起草)</span>
                </button>
              )}

              {onOpenTheater && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenTheater();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Film className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>全屏动态预演 (Theater)</span>
                </button>
              )}

              {onOpenCreateSnapshot && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenCreateSnapshot();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>生成当前版本快照</span>
                </button>
              )}

              {onOpenVersions && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenVersions();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>版本时光机</span>
                </button>
              )}

              {onOpenAssetLibrary && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenAssetLibrary();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Box className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>跨工程全局资产库</span>
                </button>
              )}

              {onOpenMediaLibrary && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenMediaLibrary();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>多模态工程素材池</span>
                </button>
              )}

              {/* 新手漫游导览 */}
              {onOpenTour && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenTour();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors text-left font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>新手漫游向导</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">导览</span>
                </button>
              )}

              {/* 剪辑台键盘快捷键指南 */}
              <button
                onClick={() => {
                  setIsMoreToolsOpen(false);
                  setIsShortcutsModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>剪辑台快捷键指南</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">?</span>
              </button>

              {onOpenDelete && (
                <>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      onOpenDelete();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除此项目</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Visible 6: 设置 */}
        <button
          onClick={() => {
            const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
            if (isDemoUser) {
              notify.info("🎬 当前为公共体验账号，API Key 配置仅对专属导演账号生效！请先注册专属账号");
              openAuthModal("register");
              return;
            }
            openSettingsModal();
          }}
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="API 与模型设置"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Visible 7: 用户登录或头像 */}
        {isAuthenticated && user ? (
          <UserMenuDropdown />
        ) : (
          <button
            onClick={() => openAuthModal("login")}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-muted border border-border transition"
          >
            <span>登录</span>
          </button>
        )}

        {/* Mobile menu toggle */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Popover Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-14 right-3 w-56 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 md:hidden text-xs">
          {onOpenRadar && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenRadar();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <span>工程体检</span>
            </button>
          )}

          {onOpenExport && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenExport();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              <span>导出分镜包</span>
            </button>
          )}

          {onOpenBible && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenBible();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span>全剧设定集</span>
            </button>
          )}

          {onOpenTheater && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenTheater();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <Film className="w-4 h-4 text-muted-foreground" />
              <span>全屏动态预演</span>
            </button>
          )}

          {onOpenTradeoff && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenTradeoff();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <Scale className="w-4 h-4 text-muted-foreground" />
              <span>改编取舍矩阵</span>
            </button>
          )}

          {onOpenImportScript && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (!isAuthenticated) {
                  notify.info("🎬 请先注册或登录专属导演账号");
                  openAuthModal("login");
                  return;
                }
                const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
                if (isDemoUser) {
                  notify.info("🎬 当前为公共体验账号！如需导入私有剧本进行解析，请注册专属导演账号并在设置中填入 Key");
                  openAuthModal("register");
                  return;
                }
                const hasKey = !!user?.custom_settings?.llmApiKey;
                if (!hasKey) {
                  notify.info("🎬 请在「设置」中配置您专属的 OpenRouter API Key，开启剧本解析服务");
                  openSettingsModal();
                  return;
                }
                onOpenImportScript();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <FileCode2 className="w-4 h-4 text-muted-foreground" />
              <span>导入剧本拆镜</span>
            </button>
          )}

          {onOpenCreateSnapshot && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenCreateSnapshot();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <Archive className="w-4 h-4 text-muted-foreground" />
              <span>生成快照</span>
            </button>
          )}

          {onOpenVersions && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenVersions();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>版本时光机</span>
            </button>
          )}

          {onOpenAssetLibrary && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAssetLibrary();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <Box className="w-4 h-4 text-muted-foreground" />
              <span>全局资产库</span>
            </button>
          )}

          {onOpenMediaLibrary && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenMediaLibrary();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground text-left"
            >
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span>素材池</span>
            </button>
          )}

          <div className="h-px bg-border my-1" />

          {onOpenDelete && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenDelete();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-left"
            >
              <Trash2 className="w-4 h-4" />
              <span>删除工程</span>
            </button>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Guide Modal */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">影视剪辑台键盘快捷键指南</h3>
                  <p className="text-[11px] text-muted-foreground">好莱坞 NLE 标准剪辑手感</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">时间轴与视听预演 (Timeline & Previz)</span>
                <div className="bg-secondary/40 border border-border/70 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">播放 / 暂停试映</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold shadow-2xs">Space</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">上一镜 / 下一镜切换</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold shadow-2xs">←</kbd>
                      <span className="text-muted-foreground">/</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold shadow-2xs">→</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">显示 / 隐藏字幕对白</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold shadow-2xs">C</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">退出影院全屏试映</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold shadow-2xs">Esc</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">工作台全局操控 (Workspace Global)</span>
                <div className="bg-secondary/40 border border-border/70 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">随时打开此快捷键指南</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold shadow-2xs">?</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">双击分栏中线</span>
                    <span className="text-muted-foreground">恢复 50:50 等比分屏</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">双击剧本节拍</span>
                    <span className="text-muted-foreground">原位极速编辑台词/动作</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              {onOpenTour ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsShortcutsModalOpen(false);
                    onOpenTour();
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>💡 重新体验新手向导</span>
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                我知道了 (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
