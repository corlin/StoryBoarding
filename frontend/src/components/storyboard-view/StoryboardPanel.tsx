import React, { useState, useEffect, useRef } from "react";
import { ShotModel, CharacterModel, LocationModel, PropModel, ProjectModel } from "@/types/shot";
import { StoryboardCell } from "./StoryboardCell";
import { RhythmBarcode } from "./RhythmBarcode";
import { CallSheetView } from "./CallSheetView";
import { VoiceAlignmentDrawer } from "@/components/drawers/VoiceAlignmentDrawer";
import { Sparkles, Image as ImageIcon, Maximize2, Loader2, Film, XCircle, Crosshair, Layers, Mic, Download, Video, SlidersHorizontal, Settings2, Check, FileText, Play, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";

interface StoryboardPanelProps {
  project?: ProjectModel | null;
  shots: ShotModel[];
  selectedShotId: string | null;
  aspectRatio?: "16:9" | "9:16";
  characters?: CharacterModel[];
  locations?: LocationModel[];
  propsList?: PropModel[];
  onSelectShot: (shotId: string) => void;
  onRegenerateDirty?: () => void;
  onRegenerateShotImage?: (shotId: string) => Promise<void> | void;
  onToggleLock?: (shotId: string, locked: boolean) => void;
  onOpenTheater?: (shotId: string) => void;
  onOpenDrawer?: (shotId: string) => void;
  onOpenGenerateModal?: () => void;
  onOpenImportScript?: () => void;
  isBatchRendering?: boolean;
  batchProgress?: { current: number; total: number };
  onAbortBatchRendering?: () => void;
}

export const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
  project,
  shots,
  selectedShotId,
  aspectRatio = "16:9",
  characters = [],
  locations = [],
  propsList = [],
  onSelectShot,
  onRegenerateDirty,
  onRegenerateShotImage,
  onToggleLock,
  onOpenTheater,
  onOpenDrawer,
  onOpenGenerateModal,
  onOpenImportScript,
  isBatchRendering = false,
  batchProgress,
  onAbortBatchRendering,
}) => {
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [showHudGuide, setShowHudGuide] = useState(false);
  const [showRhythmBarcode, setShowRhythmBarcode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("storyboard_show_rhythm_barcode");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true; // Default open for professional director feel
  });
  const [viewMode, setViewMode] = useState<"timeline" | "callsheet">("timeline");
  const [isVoiceDrawerOpen, setIsVoiceDrawerOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const displaySettingsRef = useRef<HTMLDivElement>(null);

  // Click outside to close display settings dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (displaySettingsRef.current && !displaySettingsRef.current.contains(e.target as Node)) {
        setIsDisplaySettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleRhythmBarcode = () => {
    setShowRhythmBarcode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("storyboard_show_rhythm_barcode", String(next));
      }
      return next;
    });
  };

  const missingImageCount = shots.filter((s) => !s.storyboard_image_url || s.is_dirty).length;

  // Auto-scroll to selected storyboard cell during playback or selection
  useEffect(() => {
    if (!selectedShotId || !scrollContainerRef.current || viewMode !== "timeline") return;
    const targetElement = document.getElementById(`storyboard-cell-${selectedShotId}`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedShotId, viewMode]);

  const isVertical = aspectRatio === "9:16";
  const gridClass = isVertical
    ? gridCols === 2
      ? "grid-cols-2 md:grid-cols-3 gap-4"
      : gridCols === 3
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3"
    : gridCols === 2
    ? "grid-cols-1 md:grid-cols-2 gap-4"
    : gridCols === 3
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";

  return (
    <section className="flex flex-col h-full bg-background/50 select-none relative">
      {/* Streamlined Clean Header Bar (Single 44px Row) */}
      <div className="h-11 border-b border-border/70 px-4 flex items-center justify-between shrink-0 bg-card/40 relative z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-primary" />
            <h2 className="font-semibold text-xs text-foreground tracking-wide">
              故事板
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">
              ({shots.length} 镜)
            </span>
          </div>

          {/* Clean Segmented Control: Timeline vs Call Sheet */}
          <div className="flex items-center bg-secondary/60 p-0.5 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                viewMode === "timeline"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>时间轴</span>
            </button>
            <button
              onClick={() => setViewMode("callsheet")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                viewMode === "callsheet"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>顺场表</span>
            </button>
          </div>
        </div>

        {/* Right Controls: Grid density switch + Display Settings Dropdown + Theater */}
        <div className="flex items-center gap-2">
          {/* Grid Layout Density Switcher */}
          <div className="flex items-center bg-secondary/50 p-0.5 rounded-lg border border-border/60 text-xs text-muted-foreground">
            <button
              onClick={() => setGridCols(2)}
              className={cn(
                "px-2 py-0.5 rounded transition-colors cursor-pointer",
                gridCols === 2 ? "bg-background text-foreground font-semibold shadow-xs" : "hover:text-foreground"
              )}
              title="2列大图预览"
            >
              2列
            </button>
            <button
              onClick={() => setGridCols(3)}
              className={cn(
                "px-2 py-0.5 rounded transition-colors cursor-pointer",
                gridCols === 3 ? "bg-background text-foreground font-semibold shadow-xs" : "hover:text-foreground"
              )}
              title="3列标准预览"
            >
              3列
            </button>
            <button
              onClick={() => setGridCols(4)}
              className={cn(
                "px-2 py-0.5 rounded transition-colors hidden xl:block cursor-pointer",
                gridCols === 4 ? "bg-background text-foreground font-semibold shadow-xs" : "hover:text-foreground"
              )}
              title="4列高密预览"
            >
              4列
            </button>
          </div>

          {/* Consolidated Display Settings Dropdown (HUD & Rhythm Barcode) */}
          <div className="relative shrink-0" ref={displaySettingsRef}>
            <button
              type="button"
              onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border cursor-pointer",
                (showHudGuide || showRhythmBarcode)
                  ? "bg-secondary/70 border-border text-foreground hover:bg-secondary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
              title="分镜显示与导演辅助设置"
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">显示</span>
              {(showHudGuide || showRhythmBarcode) && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>

            {isDisplaySettingsOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-card border border-border rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                  导演辅助视图设置
                </div>

                {/* Previz HUD Guide Overlay Toggle */}
                <button
                  type="button"
                  onClick={() => setShowHudGuide(!showHudGuide)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer",
                    showHudGuide ? "bg-sky-500/15 text-sky-300 font-semibold" : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                    <span>视听辅助线 (HUD)</span>
                  </div>
                  {showHudGuide && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>

                {/* Rhythm Barcode Strip Toggle */}
                <button
                  type="button"
                  onClick={handleToggleRhythmBarcode}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer",
                    showRhythmBarcode ? "bg-primary/15 text-primary font-semibold" : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📊</span>
                    <span>视听节奏条 (Barcode)</span>
                  </div>
                  {showRhythmBarcode && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                {/* Batch Shot Lock Management */}
                {onToggleLock && shots.length > 0 && (
                  <>
                    <div className="px-2 pt-2 pb-1 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider border-t border-border/60">
                      分镜批量保护 (Lock)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        shots.forEach((s) => {
                          if (!s.is_locked) onToggleLock(s.id, true);
                        });
                        notify.success(`🔒 已锁定全片 ${shots.length} 个镜头（保护画面不被全片重绘覆盖）`);
                        setIsDisplaySettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-amber-400 hover:bg-amber-500/15 transition-colors cursor-pointer"
                      title="一键将本集所有镜头打上锁定保护"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>一键锁定全部镜头</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        shots.forEach((s) => {
                          if (s.is_locked) onToggleLock(s.id, false);
                        });
                        notify.info(`🔓 已解除全片 ${shots.length} 个镜头的锁定保护`);
                        setIsDisplaySettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="一键解除本集所有镜头的锁定保护"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>一键解锁全部镜头</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Theater Mode Button Capsule */}
          {onOpenTheater && (
            <button
              onClick={() => onOpenTheater(selectedShotId || shots[0]?.id)}
              disabled={shots.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
              title="打开影院全屏动态连播试映 (快捷键: 点击大图或按此按钮)"
            >
              <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="hidden sm:inline">影院试映</span>
              <Maximize2 className="w-3 h-3 opacity-60 hidden md:inline" />
            </button>
          )}
        </div>
      </div>

      {/* Batch Rendering Dynamic Floating Progress Banner with Abort Button */}
      {isBatchRendering && batchProgress && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-4 z-20 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium min-w-0">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span className="truncate">
              正在后台顺序渲染画面：第 <strong>{batchProgress.current}</strong> / {batchProgress.total} 镜...
            </span>
          </div>

          {/* Progress bar and Abort Action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 sm:w-36 h-2 rounded-full bg-background/60 overflow-hidden border border-amber-500/20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              {Math.round((batchProgress.current / Math.max(batchProgress.total, 1)) * 100)}%
            </span>

            {onAbortBatchRendering && (
              <button
                type="button"
                onClick={onAbortBatchRendering}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/40 transition-colors shadow-xs"
                title="中止当前冲印队列"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>⏹️ 中止队列</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pacing Rhythm Barcode Strip (Collapsible) */}
      {showRhythmBarcode && (
        <RhythmBarcode
          shots={shots}
          selectedShotId={selectedShotId}
          onSelectShot={onSelectShot}
        />
      )}

      {/* Storyboard Grid Canvas OR Call Sheet View */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 scroll-smooth"
      >
        {viewMode === "callsheet" ? (
          <CallSheetView
            project={project}
            shots={shots}
            locations={locations}
            characters={characters}
            propsList={propsList}
            selectedShotId={selectedShotId}
            aspectRatio={aspectRatio}
            onSelectShot={onSelectShot}
            onRegenerateShotImage={onRegenerateShotImage}
            onToggleLock={onToggleLock}
            onOpenTheater={onOpenTheater}
            onOpenDrawer={onOpenDrawer}
          />
        ) : shots.length === 0 ? (
          <div className="h-64 border border-dashed border-border/80 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-card/20 space-y-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-sm font-semibold text-foreground">故事板画布暂无分镜</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                输入一段剧情梗概，让 AI 导演为您自动规划 12 镜起承转合分镜；或在左侧打字机中撰写剧本。
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              {onOpenGenerateModal && (
                <button
                  type="button"
                  onClick={() => {
                    const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore.getState();
                    if (!isAuthenticated) {
                      notify.info("🎬 请先注册或登录专属导演账号");
                      openAuthModal("login");
                      return;
                    }
                    const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
                    if (isDemoUser) {
                      notify.info("🎬 当前为公共体验账号！如需新建与规划专属剧本，请注册专属导演账号并在设置中填入 Key");
                      openAuthModal("register");
                      return;
                    }
                    const hasKey = !!user?.custom_settings?.llmApiKey;
                    if (!hasKey) {
                      notify.info("🎬 请在「设置」中配置您专属的 OpenRouter API Key，开启 AI 导演服务");
                      openSettingsModal();
                      return;
                    }
                    onOpenGenerateModal();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🎬 开启 AI 导演智能拆镜</span>
                </button>
              )}
              {onOpenImportScript && (
                <button
                  type="button"
                  onClick={() => {
                    const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore.getState();
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>导入场次剧本</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`grid ${gridClass}`}>
            {shots.map((shot, idx) => (
              <div key={shot.id} id={`storyboard-cell-${shot.id}`}>
                <StoryboardCell
                  shot={shot}
                  index={idx}
                  isSelected={shot.id === selectedShotId}
                  aspectRatio={aspectRatio}
                  showHudGuide={showHudGuide}
                  characters={characters}
                  onSelect={() => onSelectShot(shot.id)}
                  onRegenerateImage={() => onRegenerateShotImage && onRegenerateShotImage(shot.id)}
                  onToggleLock={onToggleLock}
                  onOpenDetail={() => onOpenDrawer && onOpenDrawer(shot.id)}
                  onOpenTheater={() => onOpenTheater && onOpenTheater(shot.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Alignment Drawer */}
      <VoiceAlignmentDrawer
        isOpen={isVoiceDrawerOpen}
        onClose={() => setIsVoiceDrawerOpen(false)}
        shots={shots}
        characters={characters}
      />
    </section>
  );
};
