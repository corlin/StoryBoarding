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
} from "lucide-react";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import { useAuthStore } from "@/stores/authStore";
import { EpisodePillTrack } from "@/components/workspace/EpisodePillTrack";
import { computeProjectQualityDiagnostics } from "@/components/modals/ProjectQualityRadarModal";
import { COLOR } from "@/lib/colorTokens";
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
}) => {
  const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore();
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const moreToolsRef = useRef<HTMLDivElement>(null);

  // Close more tools dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreToolsRef.current && !moreToolsRef.current.contains(event.target as Node)) {
        setIsMoreToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isOverDuration = totalDuration > (project?.target_duration || 30);
  const allRendered = shots.length > 0 && shots.every((s) => Boolean(s.storyboard_image_url));

  // Compute live quality score for instant health badge display
  const { score: radarScore } = React.useMemo(() => {
    return computeProjectQualityDiagnostics(project, shots);
  }, [project, shots]);

  return (
    <header className="h-12 border-b border-border/80 bg-card/90 backdrop-blur px-3 md:px-4 flex items-center justify-between shrink-0 select-none z-20 gap-3">
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

          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all cursor-pointer"
              title="拉起 3 步极速向导"
            >
              <span>⚡ 向导</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle: Compact Episode Pills + Stats + Health Score Badge */}
      <div className="hidden lg:flex items-center gap-2.5 flex-1 justify-center min-w-0 max-w-xl px-2">
        {onToggleLeftPanel && (
          <button
            onClick={onToggleLeftPanel}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors shrink-0",
              isLeftPanelCollapsed
                ? "bg-secondary text-muted-foreground border-border hover:text-foreground"
                : "bg-secondary text-foreground border-border"
            )}
            title={isLeftPanelCollapsed ? "展开剧本面板" : "折叠剧本，沉浸预览分镜"}
          >
            {isLeftPanelCollapsed ? <Columns2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
          </button>
        )}

        <div className="min-w-0 overflow-hidden flex-1">
          <EpisodePillTrack project={project} compact={true} onOpenCharacterHub={() => onOpenBible?.("bible")} />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-md border border-border/50">
            <span>{shots.length}镜</span>
            <span>·</span>
            <span className={cn(isOverDuration ? "text-amber-400 font-bold" : "text-foreground")}>
              {totalDuration.toFixed(1)}s
            </span>
          </div>

          {/* Quality Health Radar Diagnostic Score Pill Badge */}
          {onOpenRadar && (
            <button
              type="button"
              onClick={onOpenRadar}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105",
                radarScore >= 85
                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25"
                  : radarScore >= 70
                  ? "bg-amber-500/15 border-amber-500/35 text-amber-300 hover:bg-amber-500/25"
                  : "bg-red-500/15 border-red-500/35 text-red-300 hover:bg-red-500/25"
              )}
              title="点击打开 AI 影视短剧工程体检雷达（查看大纲门控、角色DNA、单句≤35字、首帧显影诊断报告）"
            >
              <ShieldCheck className={cn(
                "w-3.5 h-3.5",
                radarScore >= 85 ? "text-emerald-400" : radarScore >= 70 ? "text-amber-400" : "text-red-400"
              )} />
              <span>{radarScore}分</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Action Tools: Golden 3-Key Streamlined Operations */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 1. AI 智能拆镜 (Primary Highlight) */}
        {onOpenAIGenerate && (
          <button
            onClick={() => {
              if (!isAuthenticated) {
                openAuthModal("login");
                return;
              }
              onOpenAIGenerate();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
            title="利用 AI 导演引擎规划镜头结构与运镜"
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

        {/* 4. 收敛的「更多」下拉菜单 (More Tools Dropdown) */}
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
                    onOpenImportScript();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>导入并拆解剧本</span>
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
          onClick={openSettingsModal}
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
    </header>
  );
};
