import React, { useState, useEffect } from "react";
import { ShotModel, CharacterModel } from "@/types/shot";
import { Film, RefreshCw, Camera, Loader2, Info, Maximize2, Sparkles, Lock, Unlock, CheckCircle, Compass, Palette, CloudUpload, User, Key, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeAssetUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";

interface StoryboardCellProps {
  shot: ShotModel;
  index: number;
  isSelected: boolean;
  aspectRatio?: "16:9" | "9:16";
  showHudGuide?: boolean;
  characters?: CharacterModel[];
  onSelect: () => void;
  onRegenerateImage?: () => Promise<void> | void;
  onToggleLock?: (shotId: string, locked: boolean) => void;
  onOpenDetail?: () => void;
  onOpenTheater?: () => void;
  onInsertAfter?: () => void;
  onUpdateShot?: (shotId: string, updates: Partial<ShotModel>) => Promise<void> | void;
}

const DURATION_PRESETS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6];
const SIZE_PRESETS = ["extreme_wide_shot", "wide_shot", "full_shot", "medium_wide", "medium_shot", "medium_close_up", "close_up", "extreme_close_up", "two_shot"];

const SHOT_SIZE_ABBR: Record<string, string> = {
  extreme_wide_shot: "EWS",
  extreme_wide: "EWS",
  wide_shot: "WS",
  wide: "WS",
  full_shot: "FS",
  two_shot: "2S",
  medium_wide: "MWS",
  medium_shot: "MS",
  medium: "MS",
  medium_close_up: "MCU",
  medium_close: "MCU",
  close_up: "CU",
  extreme_close_up: "ECU",
};

export const SHOT_SIZE_GLOSSARY: Record<string, string> = {
  extreme_wide_shot: "大远景 (EWS) · 交代宏观地理与空间格局",
  extreme_wide: "大远景 (EWS) · 交代宏观地理与空间格局",
  wide_shot: "全景 (WS) · 呈现人物全身与周围环境关系",
  wide: "全景 (WS) · 呈现人物全身与周围环境关系",
  two_shot: "双人镜头 (2S) · 两人同框",
  full_shot: "全景全身 (FS) · 聚焦人物全身动作与体态",
  medium_wide: "中远景 (MWS) · 膝盖以上，兼顾动作与互动",
  medium_shot: "中景 (MS) · 腰部以上，黄金对话与叙事景别",
  medium: "中景 (MS) · 腰部以上，黄金对话与叙事景别",
  medium_close_up: "中近景 (MCU) · 胸部以上，强化微表情与台词反应",
  medium_close: "中近景 (MCU) · 胸部以上，强化微表情与台词反应",
  close_up: "特写 (CU) · 肩颈面部，聚焦强烈情感冲击",
  extreme_close_up: "大特写 (ECU) · 局部器官（眼睛/嘴角/持物），极度张力",
};

export const CAMERA_MOVEMENT_GLOSSARY: Record<string, string> = {
  static: "固定镜头 · 稳健客观记录，无机位晃动",
  push_in: "缓缓推进 · 聚焦人物内心或紧张感提升",
  pull_out: "缓缓拉出 · 揭示周围环境或孤独疏离感",
  pan_left: "向左摇镜 · 视线水平扫过场景",
  pan_right: "向右摇镜 · 视线水平扫过场景",
  tilt_up: "向上俯仰 · 仰望高大目标或力量对比",
  tilt_down: "向下俯仰 · 俯瞰地面细节或压迫感",
  tracking: "跟随横移 · 伴随人物奔跑或行走",
  crane: "升降机调度 · 升起越过障碍，大片感",
  orbital: "环绕运镜 · 360度环顾人物，高光时刻",
};

function PrevizHudOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-15 select-none overflow-hidden">
      {/* Rule-of-Thirds Grid (Semi-transparent for focal alignment) */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
        <div className="border-r border-b border-white/[0.08]" />
        <div className="border-r border-b border-white/[0.08]" />
        <div className="border-b border-white/[0.08]" />
        <div className="border-r border-b border-white/[0.08]" />
        <div className="border-r border-b border-white/[0.08]" />
        <div className="border-b border-white/[0.08]" />
        <div className="border-r border-white/[0.08]" />
        <div className="border-r border-white/[0.08]" />
        <div />
      </div>
    </div>
  );
}

export const StoryboardCell: React.FC<StoryboardCellProps> = ({
  shot,
  index,
  isSelected,
  aspectRatio = "16:9",
  showHudGuide = true,
  characters = [],
  onSelect,
  onRegenerateImage,
  onToggleLock,
  onOpenDetail,
  onOpenTheater,
  onInsertAfter,
  onUpdateShot,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [imgSrc, setImgSrc] = useState<string>(normalizeAssetUrl(shot.storyboard_image_url));

  // Auth & Key state perception
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
  const hasCustomKey = !isDemoUser && !!user?.custom_settings?.llmApiKey;

  const checkAuthAndKey = (actionName: string): boolean => {
    const { user: currUser, isAuthenticated: currAuth, openAuthModal, openSettingsModal } = useAuthStore.getState();
    if (!currAuth) {
      notify.info(`🎬 请先注册或登录专属导演账号`);
      openAuthModal("register");
      return false;
    }
    const currIsDemo = !currUser || currUser.id === "demo" || currUser.email === "demo@caifu.social";
    if (currIsDemo) {
      notify.info(`🎬 当前为公共体验账号，样板画面已就绪！如需自主${actionName}，请注册专属导演账号并绑定专属 Key`);
      openAuthModal("register");
      return false;
    }
    const currHasKey = !!currUser?.custom_settings?.llmApiKey;
    if (!currHasKey) {
      notify.info(`🎬 请在「设置」中配置您专属的 OpenRouter / 生图 API Key，开启 AI ${actionName}服务`);
      openSettingsModal();
      return false;
    }
    return true;
  };

  const sizeAbbr = SHOT_SIZE_ABBR[shot.shot_size] || shot.shot_size || "MS";
  const isLocked = Boolean(shot.is_locked);
  const isActivelyDeveloping = isRegenerating;

  // Extract featured characters in this shot
  const featuredChars = characters.filter((ch) => {
    const q = ch.name.trim().toLowerCase();
    if (!q) return false;
    return (
      (shot.subject && shot.subject.toLowerCase().includes(q)) ||
      (shot.action && shot.action.toLowerCase().includes(q)) ||
      (shot.dialogue && shot.dialogue.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setImgSrc(normalizeAssetUrl(shot.storyboard_image_url));
  }, [shot.storyboard_image_url]);

  // Live Darkroom Developing Stopwatch (Only runs when actively regenerating)
  useEffect(() => {
    let timer: any;
    if (isActivelyDeveloping) {
      const start = Date.now();
      timer = setInterval(() => {
        setElapsed(Number(((Date.now() - start) / 1000).toFixed(1)));
      }, 100);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isActivelyDeveloping]);

  // Determine dynamic 3-stage darkroom status text (Max 45s)
  const getDevelopingStage = (sec: number) => {
    if (sec >= 45.0) {
      return {
        text: "⚠️ 显影等待超时 (点击重试)",
        icon: Sparkles,
        color: "text-red-400",
      };
    }
    if (sec < 2.0) {
      return {
        text: "180° 轴线与构图锁定",
        icon: Compass,
        color: "text-sky-400",
      };
    }
    if (sec < 35.0) {
      return {
        text: "电影级概念画面渲染中 (最长45s)",
        icon: Palette,
        color: "text-amber-400",
      };
    }
    return {
      text: "R2 云端对象存储写入存盘",
      icon: Sparkles,
      color: "text-emerald-400",
    };
  };

  const currentStage = getDevelopingStage(elapsed);
  const StageIcon = currentStage.icon;

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!checkAuthAndKey("冲印镜头视觉画面")) return;
    if (!onRegenerateImage || isRegenerating) return;
    try {
      setIsRegenerating(true);
      await onRegenerateImage();
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleLock) {
      onToggleLock(shot.id, !isLocked);
    }
  };

  const handleCardBodyClick = () => {
    onSelect();
    if (onOpenDetail) {
      onOpenDetail();
    }
  };

  return (
    <div
      onClick={handleCardBodyClick}
      className={cn(
        "group relative isolate flex flex-col rounded-xl border bg-card/60 transition-all duration-200 cursor-pointer shadow-sm",
        isSelected
          ? isLocked
            ? "border-amber-400 ring-2 ring-amber-400/50 shadow-md bg-card/95"
            : "border-primary ring-2 ring-primary/40 shadow-md bg-card/95"
          : isLocked
          ? "border-amber-500/50 hover:border-amber-400/80 bg-amber-500/[0.02] shadow-[0_0_12px_rgba(245,158,11,0.06)]"
          : "border-border/70 hover:border-border hover:bg-card/90"
      )}
    >
      {/* 16:9 / 9:16 Frame Aspect Ratio Container */}
      <div
        onClick={(e) => {
          if (imgSrc && onOpenTheater) {
            e.stopPropagation();
            onOpenTheater();
          }
        }}
        className={cn(
          "relative w-full bg-neutral-950 flex items-center justify-center overflow-hidden rounded-t-xl",
          aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video",
          imgSrc ? "cursor-zoom-in" : "cursor-default"
        )}
        title={imgSrc ? "点击放大进入影院动态播放模式" : isActivelyDeveloping ? "云端暗房显影中..." : "未生成画面"}
      >
        {imgSrc && !isActivelyDeveloping ? (
          <>
            {/* Real Film Storyboard Artwork with Smooth 400ms Exposure Fade-in */}
            <img
              src={imgSrc}
              alt={`Shot ${index + 1}`}
              className="w-full h-full object-cover transition-all duration-500 animate-in fade-in zoom-in-95 group-hover:scale-[1.02]"
            />
            {/* Director Previz HUD Visual Auxiliary Guide Overlay */}
            {showHudGuide && <PrevizHudOverlay />}
          </>
        ) : isActivelyDeveloping ? (
          /* Active Developing Chamber with Stopwatch (Max 45s) */
          <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-3 text-center z-10 select-none overflow-hidden">
            {/* Subtle 35mm film scan light beam */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-500/0 via-sky-400 to-sky-500/0 animate-pulse" />

            {/* Pulsing film reel spinner */}
            <div className="relative p-2.5 rounded-full bg-primary/10 text-primary mb-1.5 shadow-inner border border-primary/20 backdrop-blur-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>

            {/* Dynamic Stage Title & Status */}
            <p className="relative text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <span>第 {String(index + 1).padStart(2, "0")} 镜 · 暗房显影中</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </p>

            {/* Dynamic 3-Stage Progress Feedback */}
            <div className="relative flex items-center gap-1 mt-1 text-[11px] font-medium font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/70 shadow-xs">
              <StageIcon className={cn("w-3 h-3 animate-pulse", currentStage.color)} />
              <span className={currentStage.color}>{currentStage.text}</span>
            </div>

            {/* Stopwatch Timer Badge */}
            <span className="relative text-[10px] font-mono text-muted-foreground/80 mt-1">
              ⏱️ 耗时 {elapsed.toFixed(1)}s / 45s
            </span>
          </div>
        ) : (
          /* Idle Unrendered / Failed State: Big Center Button to Trigger Single-Shot Render */
          <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-3 text-center z-10 select-none">
            <button
              type="button"
              onClick={handleRegenerate}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/80 bg-background/80 hover:bg-primary/15 hover:border-primary/60 text-muted-foreground hover:text-primary transition-all group/btn shadow-sm"
              title="点击单独为该镜头进行 45 秒 AI 电影生图"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover/btn:scale-110 transition-transform">
                <Palette className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground group-hover/btn:text-primary transition-colors">
                  🎨 点击生成分镜画面
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  单镜 45s 电影级渲染
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Top Badges (Shot No, Shot Size In-place Edit, Duration In-place Edit, Lock) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-md text-xs font-mono border border-border/60 shadow-sm z-20">
          <span className="font-bold text-sky-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-muted-foreground">·</span>

          {/* In-place Shot Size Quick Edit */}
          <div className="relative group/size flex items-center" onClick={(e) => e.stopPropagation()}>
            <select
              value={shot.shot_size || "medium_shot"}
              disabled={isLocked}
              onChange={(e) => {
                const newSize = e.target.value;
                onUpdateShot?.(shot.id, { shot_size: newSize as any });
                notify.success(`🎬 镜 ${index + 1} 景别已调整为: ${SHOT_SIZE_ABBR[newSize] || newSize}`);
              }}
              className="appearance-none bg-transparent font-semibold text-foreground hover:text-primary pr-3.5 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:hover:text-foreground text-xs"
              title={SHOT_SIZE_GLOSSARY[shot.shot_size] || `景别: ${sizeAbbr} (点击就地切换)`}
            >
              {!SIZE_PRESETS.includes(shot.shot_size || "medium_shot") && (
                <option value={shot.shot_size} className="bg-popover text-foreground">{SHOT_SIZE_GLOSSARY[shot.shot_size]?.split(" · ")[0] || shot.shot_size}</option>
              )}
              <option value="two_shot" className="bg-popover text-foreground">双人镜头 2S</option>
              <option value="extreme_wide_shot" className="bg-popover text-foreground">大远景 EWS</option>
              <option value="wide_shot" className="bg-popover text-foreground">全景 WS</option>
              <option value="full_shot" className="bg-popover text-foreground">全身景 FS</option>
              <option value="medium_wide" className="bg-popover text-foreground">中远景 MWS</option>
              <option value="medium_shot" className="bg-popover text-foreground">中景 MS</option>
              <option value="medium_close_up" className="bg-popover text-foreground">中近景 MCU</option>
              <option value="close_up" className="bg-popover text-foreground">特写 CU</option>
              <option value="extreme_close_up" className="bg-popover text-foreground">大特写 ECU</option>
            </select>
            <ChevronDown className="w-2.5 h-2.5 text-muted-foreground absolute right-0 pointer-events-none group-hover/size:text-primary transition-colors" />
          </div>

          <span className="text-muted-foreground">·</span>

          {/* In-place Duration Quick Edit */}
          <div className="relative group/dur flex items-center" onClick={(e) => e.stopPropagation()}>
            <select
              value={shot.duration || 2.5}
              disabled={isLocked}
              onChange={(e) => {
                const newDur = parseFloat(e.target.value);
                onUpdateShot?.(shot.id, { duration: newDur });
                notify.success(`⏱️ 镜 ${index + 1} 时长已调整为: ${newDur}s`);
              }}
              className="appearance-none bg-transparent font-semibold text-emerald-400 hover:text-emerald-300 pr-3 focus:outline-none cursor-pointer disabled:cursor-not-allowed text-xs"
              title="镜头时长 (点击就地切换)"
            >
              {Array.from(new Set([...DURATION_PRESETS, shot.duration || 2.5])).sort((a, b) => a - b).map((duration) => (
                <option key={duration} value={duration} className="bg-popover text-foreground">{Number(duration.toFixed(2))}s</option>
              ))}
            </select>
            <ChevronDown className="w-2.5 h-2.5 text-emerald-500/70 absolute right-0 pointer-events-none group-hover/dur:text-emerald-300 transition-colors" />
          </div>

          {isLocked && (
            <>
              <span className="text-muted-foreground">·</span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 rounded shadow-2xs"
                title="🔒 该镜头已定稿锁定：受工业级只读保护，全片批量生图或AI重构时自动跳过"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>定稿</span>
              </span>
            </>
          )}

          {/* Dirty Badge: Script modified, prompt auto-recompiled, ready to re-render */}
          {shot.is_dirty && !isActivelyDeveloping && (
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 px-2 py-0.5 rounded text-[10px] font-medium animate-pulse shadow-sm transition-all ml-1 cursor-pointer"
              title={hasCustomKey ? "台本已修改且提示词已重新编译，点击重绘以匹配最新台本" : "当前为 Demo 体验模式，请注册专属账号并绑定 Key 进行重绘"}
            >
              {hasCustomKey ? (
                <Sparkles className="w-3 h-3 text-amber-400" />
              ) : (
                <Key className="w-3 h-3 text-amber-400" />
              )}
              <span>{hasCustomKey ? "⚡ 台本已改·重绘" : "🔑 注册账号重绘"}</span>
            </button>
          )}
        </div>

        {/* Top Right Quick Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
          {/* Lock / Unlock Toggle Button */}
          {onToggleLock && (
            <button
              onClick={handleToggleLock}
              className={cn(
                "p-1.5 rounded-md backdrop-blur-md border transition-all duration-150 shadow-sm",
                isLocked
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                  : "bg-background/80 border-border/60 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
              )}
              title={isLocked ? "点击解锁分镜（AI 拆镜时将允许重新规划）" : "点击锁定分镜（AI 拆镜时将受保护保持不变）"}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Single Shot Regenerate Button */}
          {onRegenerateImage && (
            <button
              onClick={handleRegenerate}
              disabled={isActivelyDeveloping}
              className={cn(
                "p-1.5 rounded-md backdrop-blur-md border transition-all duration-150 shadow-sm cursor-pointer",
                isActivelyDeveloping
                  ? "bg-muted/80 text-muted-foreground border-border/40 cursor-not-allowed"
                  : hasCustomKey
                  ? "bg-background/80 border-border/60 text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover:opacity-100"
                  : "bg-background/80 border-amber-400/30 text-amber-400/80 hover:text-amber-300 hover:bg-background opacity-0 group-hover:opacity-100"
              )}
              title={
                hasCustomKey
                  ? "重新打样当前分镜画面 (存入 R2)"
                  : "当前为 Demo 体验模式，请注册专属账号并绑定 Key 进行重绘"
              }
            >
              {isActivelyDeveloping ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : hasCustomKey ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <Key className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          )}

          {/* Maximize Theater Button */}
          {imgSrc && onOpenTheater && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenTheater();
              }}
              className="p-1.5 rounded-md bg-background/80 backdrop-blur-md border border-border/60 text-muted-foreground hover:text-foreground transition-all duration-150 opacity-0 group-hover:opacity-100 shadow-sm"
              title="全屏影院预览"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Narrative Function Capsule (Bottom-left overlay) */}
        {shot.narrative_function && (
          <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 border border-white/10 z-10">
            {shot.narrative_function}
          </div>
        )}

        {/* Screen Text Overlay on Canvas Preview (Industry Feature) */}
        {shot.screen_text && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center pointer-events-none">
            {shot.screen_text_style === "warning_banner" ? (
              <div className="w-full bg-red-600/90 text-white font-black text-xs sm:text-sm py-1 px-2.5 text-center tracking-widest uppercase shadow-2xl border-y-2 border-yellow-400 rotate-[-1deg] backdrop-blur-xs">
                🚨 {shot.screen_text} 🚨
              </div>
            ) : shot.screen_text_style === "key_point" ? (
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-amber-500/95 text-neutral-950 font-extrabold text-xs sm:text-sm px-3 py-1 rounded-full shadow-xl border border-yellow-200">
                <span>💡</span>
                <span className="tracking-wide">{shot.screen_text}</span>
              </div>
            ) : shot.screen_text_style === "minimal_lower_third" ? (
              <div className="absolute bottom-2 left-2 max-w-[85%] bg-black/85 text-zinc-100 font-mono text-[10px] sm:text-xs px-2.5 py-0.5 rounded-r border-l-2 border-sky-400 backdrop-blur-xs shadow-md">
                🏷️ {shot.screen_text}
              </div>
            ) : (
              /* Default: bold_impact 醒目冲击短视频大字 */
              <div className="text-center px-2 py-1 max-w-[95%]">
                <span
                  className="font-black text-xs sm:text-sm tracking-wider text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase"
                  style={{
                    textShadow: "0 0 4px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
                  }}
                >
                  {shot.screen_text}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Body: Standardized information area with uniform height and line-clamped text */}
      <div className="p-2.5 flex flex-col justify-between flex-1 gap-2 bg-card/30">
        <div className="space-y-1">
          {/* Action Statement (Strictly clamped to 2 lines for uniform card height) */}
          <p
            className="text-xs text-foreground/90 font-medium line-clamp-2 leading-snug min-h-[2.25rem] cursor-help"
            title={shot.action ? `动作描述: ${shot.action}` : "未填写动作描述"}
          >
            {shot.action || <span className="text-muted-foreground/60 italic">未填写动作描述</span>}
          </p>

          {/* Dialogue (Single line clamp with clean left border quote) */}
          {shot.dialogue ? (
            <p
              className="text-[11px] text-amber-300/90 font-medium italic truncate pl-1.5 border-l-2 border-amber-500/50 cursor-help"
              title={`对白台词: “${shot.dialogue}”`}
            >
              “{shot.dialogue}”
            </p>
          ) : (
            <div className="h-[18px]" aria-hidden="true" />
          )}
        </div>

        {/* Footer Info: Camera Movement & Detail Drawer Trigger */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/30 text-[11px] text-muted-foreground gap-1.5 min-w-0">
          {/* In-place Camera Movement Quick Edit */}
          <div
            className="relative group/mov flex items-center gap-1 min-w-0 flex-1 max-w-[135px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Camera className="w-3 h-3 shrink-0 text-muted-foreground group-hover/mov:text-primary transition-colors" />
            <select
              value={shot.camera_movement?.type || "static"}
              disabled={isLocked}
              onChange={(e) => {
                const newMov = e.target.value;
                onUpdateShot?.(shot.id, {
                  camera_movement: {
                    ...(typeof shot.camera_movement === "object" ? shot.camera_movement : {}),
                    type: newMov,
                  },
                });
                notify.success(`🎥 镜 ${index + 1} 运镜已调整为: ${newMov}`);
              }}
              className="appearance-none bg-transparent font-mono text-[10px] text-foreground/80 hover:text-primary pr-3 focus:outline-none cursor-pointer disabled:cursor-not-allowed truncate w-full"
              title={CAMERA_MOVEMENT_GLOSSARY[shot.camera_movement?.type || "static"] || `运镜: ${shot.camera_movement?.type || "固定镜头"} (点击就地切换)`}
            >
              <option value="static" className="bg-popover text-foreground">固定 static</option>
              <option value="push_in" className="bg-popover text-foreground">推进 push_in</option>
              <option value="pull_out" className="bg-popover text-foreground">拉远 pull_out</option>
              <option value="pan_left" className="bg-popover text-foreground">左摇 pan_left</option>
              <option value="pan_right" className="bg-popover text-foreground">右摇 pan_right</option>
              <option value="tilt_up" className="bg-popover text-foreground">仰角 tilt_up</option>
              <option value="tilt_down" className="bg-popover text-foreground">俯角 tilt_down</option>
              <option value="tracking" className="bg-popover text-foreground">跟随 tracking</option>
              <option value="crane" className="bg-popover text-foreground">升降 crane</option>
              <option value="orbital" className="bg-popover text-foreground">环绕 orbital</option>
            </select>
            <ChevronDown className="w-2.5 h-2.5 text-muted-foreground absolute right-0 pointer-events-none group-hover/mov:text-primary transition-colors" />
          </div>

          {onOpenDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail();
              }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium shrink-0 cursor-pointer px-1 py-0.5 rounded hover:bg-secondary/40"
              title="打开镜头详细参数抽屉"
            >
              <span className="hidden min-[160px]:inline">精修</span>
              <Info className="w-3 h-3 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Hover Quick Insert Button (Pro Feature: insert next shot seamlessly) */}
      {onInsertAfter && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInsertAfter();
              notify.info(`🎬 已在镜 ${index + 1} 后成功插入新分镜！`);
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-md hover:scale-105 active:scale-95 transition-transform border border-primary-foreground/20 cursor-pointer"
            title={`在镜 ${index + 1} 与镜 ${index + 2} 之间快捷插入空白新镜头`}
          >
            <Plus className="w-3 h-3" />
            <span>插镜</span>
          </button>
        </div>
      )}
    </div>
  );
};
