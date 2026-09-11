"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ProjectModel, ShotModel } from "@/types/shot";
import {
  type LucideIcon,
  Sparkles,
  Download,
  Settings,
  BookOpen,
  ShieldCheck,
  ChevronLeft,
  Columns2,
  LayoutGrid,
  Film,
  Archive,
  Clock,
  ChevronDown,
  Keyboard,
  HelpCircle,
  Workflow,
  Check,
  MoreVertical,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import { useAuthStore } from "@/stores/authStore";
import { type StudioStage, useWorkspaceStore } from "@/stores/workspaceStore";
import { computeProjectQualityDiagnostics } from "@/lib/diagnostics";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";

const STUDIO_STAGES: ReadonlyArray<{
  id: StudioStage;
  hotkey: string;
  desktopLabel: string;
  mobileLabel: string;
  title: string;
  notification: string;
  icon: LucideIcon;
}> = [
  {
    id: "prep",
    hotkey: "1",
    desktopLabel: "01 设定与剧本",
    mobileLabel: "01 设定",
    title: "STAGE 01 · 剧本大纲、爽点雷达与视觉设定集 (快捷键 1)",
    notification: "🎬 已切换至 Stage 01 · 设定与剧本工坊",
    icon: BookOpen,
  },
  {
    id: "storyboard",
    hotkey: "2",
    desktopLabel: "02 分镜工坊",
    mobileLabel: "02 分镜",
    title: "STAGE 02 · 核心镜头卡片流、AI 拆镜与渲染 (快捷键 2)",
    notification: "🎬 已切换至 Stage 02 · 分镜工坊",
    icon: LayoutGrid,
  },
  {
    id: "review",
    hotkey: "3",
    desktopLabel: "03 放映与质检",
    mobileLabel: "03 质检",
    title: "STAGE 03 · 全屏影院动态预演与工程体检诊断 (快捷键 3)",
    notification: "🎬 已切换至 Stage 03 · 动态放映与质检",
    icon: Film,
  },
  {
    id: "deliver",
    hotkey: "4",
    desktopLabel: "04 交付导出",
    mobileLabel: "04 交付",
    title: "STAGE 04 · 分镜长图、场记单与无损母盘交付 (快捷键 4)",
    notification: "🎬 已切换至 Stage 04 · 工业交付看板",
    icon: Download,
  },
];

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
  onOpenDelete?: () => void;
  onOpenWizard?: () => void;
  onBatchRender?: () => void;
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
  onOpenDelete,
  onOpenWizard,
  onBatchRender,
}) => {
  const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore();
  const {
    activeEpisodeIndex,
    setActiveEpisodeIndex,
    activeStudioStage,
    setActiveStudioStage,
  } = useWorkspaceStore();

  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [isEpisodeDropdownOpen, setIsEpisodeDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const helpMenuRef = useRef<HTMLDivElement>(null);
  const versionMenuRef = useRef<HTMLDivElement>(null);
  const episodeDropdownRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setIsHelpMenuOpen(false);
      }
      if (versionMenuRef.current && !versionMenuRef.current.contains(e.target as Node)) {
        setIsVersionMenuOpen(false);
      }
      if (episodeDropdownRef.current && !episodeDropdownRef.current.contains(e.target as Node)) {
        setIsEpisodeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard Shortcuts (1/2/3/4 for DaVinci Stages, ? for Help)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isInputFocused =
        activeTag === "input" ||
        activeTag === "textarea" ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      if (isInputFocused) return;

      const stage = STUDIO_STAGES.find(({ hotkey }) => hotkey === e.key);
      if (stage) {
        e.preventDefault();
        setActiveStudioStage(stage.id);
        notify.info(stage.notification);
      } else if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setIsHelpMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveStudioStage]);

  const sequences = project?.sequences || [];
  const currentSeq = sequences[activeEpisodeIndex] || sequences[0];

  // Compute live quality score for instant health badge display
  const { score: radarScore } = React.useMemo(() => {
    return computeProjectQualityDiagnostics(project, shots);
  }, [project, shots]);

  return (
    <header className="min-h-12 h-auto md:h-12 border-b border-border/80 bg-card/90 backdrop-blur px-3 py-1 md:px-4 md:py-0 flex flex-wrap md:flex-nowrap items-center justify-between shrink-0 select-none relative z-40 gap-x-3 gap-y-1">
      {/* 1. Left Wing: Project Identity, Versioning & Safe Return */}
      <div className="order-1 flex items-center gap-2.5 shrink-0 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="返回项目列表控制台"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-xs font-medium hidden sm:inline">控制台</span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <h1
            className="text-xs md:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px] md:max-w-[200px]"
            title={project?.title || "未命名工程"}
          >
            {project?.title || "未命名工程"}
          </h1>

          {/* Episode Selector (If series) */}
          {sequences.length > 1 && (
            <div className="relative shrink-0" ref={episodeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsEpisodeDropdownOpen(!isEpisodeDropdownOpen)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-secondary/70 hover:bg-secondary border border-border/80 text-foreground transition-all cursor-pointer shadow-2xs"
                title="切换分集"
              >
                <span className="font-mono text-[10px] text-amber-400">EP {activeEpisodeIndex + 1}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>

              {isEpisodeDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-48 bg-card border border-border rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">
                    全剧目录 ({sequences.length} 集)
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5">
                    {sequences.map((seq, idx) => (
                      <button
                        key={seq.id}
                        type="button"
                        onClick={() => {
                          setActiveEpisodeIndex(idx);
                          setIsEpisodeDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer",
                          idx === activeEpisodeIndex
                            ? "bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="truncate">EP {idx + 1} · {seq.title || `第 ${idx + 1} 集`}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{seq.shots?.length || 0} 镜</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Version Snapshot History Dropdown (Figma-style) */}
          <div className="relative shrink-0" ref={versionMenuRef}>
            <button
              type="button"
              onClick={() => setIsVersionMenuOpen(!isVersionMenuOpen)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="版本时光机与快照历史"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{activeVersionTag}</span>
              <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
            </button>

            {isVersionMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-52 bg-card border border-border rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground uppercase border-b border-border/60 pb-1">
                  版本控制与数据安全
                </div>
                {onOpenCreateSnapshot && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsVersionMenuOpen(false);
                      onOpenCreateSnapshot();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>生成当前版本快照</span>
                  </button>
                )}
                {onOpenVersions && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsVersionMenuOpen(false);
                      onOpenVersions();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>查看完整版本时光机</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle: DaVinci Resolve 4-Stage Pipeline Switcher */}
      <nav className="hidden md:flex items-center p-1 rounded-xl bg-secondary/60 border border-border/80 shadow-2xs">
        {STUDIO_STAGES.map(({ id, desktopLabel, title, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveStudioStage(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeStudioStage === id
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            )}
            title={title}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{desktopLabel}</span>
            {id === "review" && radarScore < 85 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </nav>

      <nav className="order-3 grid w-full grid-cols-4 gap-1 md:hidden" aria-label="制作阶段">
        {STUDIO_STAGES.map(({ id, mobileLabel }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveStudioStage(id)}
            aria-current={activeStudioStage === id ? "step" : undefined}
            className={cn(
              "min-w-0 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors",
              activeStudioStage === id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {mobileLabel}
          </button>
        ))}
      </nav>

      {/* 3. Right Wing: Global Assets, Consolidated Help & Settings Guardrail */}
      <div className="order-2 flex items-center gap-2 shrink-0 md:order-none">
        {/* Global Asset Library */}
        {onOpenAssetLibrary && (
          <button
            type="button"
            onClick={onOpenAssetLibrary}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="跨工程全局资产库：跨项目复用角色、场景与道具"
          >
            <span>◇ 资产库</span>
          </button>
        )}

        {/* Consolidated Help & Guidance Dropdown */}
        <div className="relative shrink-0" ref={helpMenuRef}>
          <button
            type="button"
            onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="帮助、系统全景导图与快捷键指南"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {isHelpMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-1 py-0.5 text-[10px] font-mono text-muted-foreground uppercase border-b border-border/60 pb-1 flex items-center justify-between">
                <span>工序与剪辑台快捷键</span>
                <span className="text-[9px] text-muted-foreground/80">按键直达</span>
              </div>

              <div className="space-y-1.5 px-1 py-1">
                <div className="flex items-center justify-between text-muted-foreground hover:text-foreground">
                  <span>切换至 01 设定与剧本</span>
                  <kbd className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">1</kbd>
                </div>
                <div className="flex items-center justify-between text-muted-foreground hover:text-foreground">
                  <span>切换至 02 分镜工坊</span>
                  <kbd className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">2</kbd>
                </div>
                <div className="flex items-center justify-between text-muted-foreground hover:text-foreground">
                  <span>切换至 03 放映与质检</span>
                  <kbd className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">3</kbd>
                </div>
                <div className="flex items-center justify-between text-muted-foreground hover:text-foreground">
                  <span>切换至 04 交付工坊</span>
                  <kbd className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">4</kbd>
                </div>
                <div className="flex items-center justify-between text-muted-foreground hover:text-foreground">
                  <span>打开此快捷键列表</span>
                  <kbd className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">?</kbd>
                </div>
              </div>

              {onOpenDelete && (
                <>
                  <div className="h-px bg-border/60 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsHelpMenuOpen(false);
                      onOpenDelete();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除此工程项目</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* System Settings Guardrail */}
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
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          title="API 与模型设置"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Auth or Menu Guardrail */}
        {isAuthenticated && user ? (
          <UserMenuDropdown />
        ) : (
          <button
            onClick={() => openAuthModal("login")}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-muted border border-border transition cursor-pointer"
          >
            <span>登录</span>
          </button>
        )}
      </div>
    </header>
  );
};
