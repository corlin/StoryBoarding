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

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur px-3 md:px-4 flex items-center justify-between shrink-0 select-none z-20 gap-2">
      {/* Left: Project title & version */}
      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="返回项目列表"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">看板</span>
        </Link>

        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="font-semibold text-sm truncate max-w-[140px] md:max-w-xs">
            {project?.title || "AI 导演分镜工作台"}
          </h1>

          {onOpenVersions && (
            <button
              onClick={onOpenVersions}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-secondary hover:bg-muted border border-border text-foreground transition-colors shadow-2xs"
              title="点击打开版本时光机"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{activeVersionTag}</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle: Integrated Episode Selector + Duration Badges */}
      <div className="hidden md:flex items-center gap-3 flex-1 justify-center min-w-0 max-w-2xl px-2">
        {onToggleLeftPanel && (
          <button
            onClick={onToggleLeftPanel}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors shrink-0",
              isLeftPanelCollapsed
                ? "bg-secondary text-muted-foreground border-border hover:text-foreground"
                : "bg-secondary text-foreground border-border"
            )}
            title={isLeftPanelCollapsed ? "展开左侧剧本分镜列表" : "折叠左侧面板，全屏预览故事板"}
          >
            {isLeftPanelCollapsed ? <Columns2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Embedded Compact Episode Pill Track */}
        <div className="min-w-0 overflow-hidden flex-1">
          <EpisodePillTrack compact={true} onOpenCharacterHub={() => onOpenBible?.("bible")} />
        </div>

        {/* Shot stats badges */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/50 rounded-lg border border-border font-mono text-[11px]">
            <span className="text-muted-foreground">镜头:</span>
            <span>{shots.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/50 rounded-lg border border-border font-mono text-[11px]">
            <span className="text-muted-foreground">时长:</span>
            <span className={cn(isOverDuration ? "text-amber-400 font-bold" : "text-foreground")}>
              {totalDuration.toFixed(1)}s / {project?.target_duration || 30}s
            </span>
          </div>
        </div>
      </div>

      {/* Right Action Tools: 6 Core Visible Buttons + More Tools Dropdown */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Visible 1: AI 智能拆镜 (Primary Highlight) */}
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

        {/* Visible 2: 工程体检 (Neutral) */}
        {onOpenRadar && (
          <button
            onClick={onOpenRadar}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            title="全链路短剧工程质量门诊断"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            <span>工程体检</span>
          </button>
        )}

        {/* Visible 3: 导出 (Neutral) */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            title="导出分镜包、H3清单及剧本"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>导出</span>
          </button>
        )}

        {/* Visible 4: 设定集 (Neutral) */}
        {onOpenBible && (
          <button
            onClick={() => onOpenBible("bible")}
            className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            title="查看全剧统一视觉与角色设定"
          >
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            <span>设定集</span>
          </button>
        )}

        {/* Visible 5: More Tools Dropdown */}
        <div className="relative hidden md:block" ref={moreToolsRef}>
          <button
            onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            title="更多剧作与工程工具"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden xl:inline">更多工具</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {isMoreToolsOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-card border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
              {onOpenTradeoff && (
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    onOpenTradeoff();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>改编取舍矩阵</span>
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
