import React, { useState, useEffect } from "react";
import { ShotModel, CharacterModel } from "@/types/shot";
import { Film, RefreshCw, Camera, Loader2, Info, Maximize2, Sparkles, Lock, Unlock, CheckCircle, Compass, Palette, CloudUpload, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeAssetUrl } from "@/lib/api";

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
}

const SHOT_SIZE_ABBR: Record<string, string> = {
  extreme_wide_shot: "EWS",
  wide_shot: "WS",
  full_shot: "FS",
  medium_shot: "MS",
  medium_close_up: "MCU",
  close_up: "CU",
  extreme_close_up: "ECU",
};

function PrevizHudOverlay({ shot }: { shot: ShotModel }) {
  const movType =
    typeof shot.camera_movement === "object"
      ? (shot.camera_movement as any)?.type || "static"
      : shot.camera_movement || "static";

  const renderMovementBadge = () => {
    switch (movType) {
      case "push_in":
        return {
          label: "PUSH IN ➔ (推进)",
          color: "text-amber-300 border-amber-400/60 bg-amber-950/70",
        };
      case "pull_out":
        return {
          label: "PULL OUT ⤺ (拉远)",
          color: "text-sky-300 border-sky-400/60 bg-sky-950/70",
        };
      case "tracking_right":
      case "pan_right":
        return {
          label: "TRACK RIGHT ━━━━► (右移)",
          color: "text-emerald-300 border-emerald-400/60 bg-emerald-950/70",
        };
      case "tracking_left":
      case "pan_left":
        return {
          label: "◄━━━━ TRACK LEFT (左移)",
          color: "text-emerald-300 border-emerald-400/60 bg-emerald-950/70",
        };
      case "crane":
      case "tilt_up":
        return {
          label: "▲ CRANE / TILT UP (升机位)",
          color: "text-purple-300 border-purple-400/60 bg-purple-950/70",
        };
      case "tilt_down":
        return {
          label: "▼ TILT DOWN (俯视降机位)",
          color: "text-purple-300 border-purple-400/60 bg-purple-950/70",
        };
      case "arc_rotate":
        return {
          label: "⟳ 360° ARC (环绕旋转)",
          color: "text-rose-300 border-rose-400/60 bg-rose-950/70",
        };
      default:
        return {
          label: "⊡ LOCKED STATIC (固定机位)",
          color: "text-slate-300 border-slate-400/60 bg-slate-950/70",
        };
    }
  };

  const badge = renderMovementBadge();
  const screenDir = shot.character_direction || (shot as any).continuity?.screen_direction || "L➔R";

  return (
    <div className="absolute inset-0 pointer-events-none z-15 select-none overflow-hidden">
      {/* 1. Rule-of-Thirds Grid (Ultra subtle 6% opacity) */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        <div className="border-r border-b border-white/[0.06]" />
        <div className="border-r border-b border-white/[0.06]" />
        <div className="border-b border-white/[0.06]" />
        <div className="border-r border-b border-white/[0.06]" />
        <div className="border-r border-b border-white/[0.06]" />
        <div className="border-b border-white/[0.06]" />
        <div className="border-r border-white/[0.06]" />
        <div className="border-r border-white/[0.06]" />
        <div />
      </div>

      {/* 2. Rule-of-Thirds 4 Golden Power Points (+) */}
      <div className="absolute top-[33.33%] left-[33.33%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-sky-400/40 select-none">
        ┼
      </div>
      <div className="absolute top-[33.33%] left-[66.67%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-sky-400/40 select-none">
        ┼
      </div>
      <div className="absolute top-[66.67%] left-[33.33%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-sky-400/40 select-none">
        ┼
      </div>
      <div className="absolute top-[66.67%] left-[66.67%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-sky-400/40 select-none">
        ┼
      </div>

      {/* 3. 90% Cinema Action Safe Corner Crop Marks */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-sky-400/50" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-sky-400/50" />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-sky-400/50" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-sky-400/50" />

      {/* 4. Bottom Center: Dynamic Camera Movement Trajectory Vector */}
      <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center">
        <div
          className={cn(
            "flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-semibold shadow-md backdrop-blur-md",
            badge.color
          )}
        >
          <span>{badge.label}</span>
        </div>
      </div>

      {/* 5. Bottom Right: 180° Action Axis & Screen Direction */}
      <div className="absolute bottom-2.5 right-2.5 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-[9px] font-mono text-slate-300">
        <span>AXIS 180° · {screenDir}</span>
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
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [imgSrc, setImgSrc] = useState<string>(normalizeAssetUrl(shot.storyboard_image_url));

  const sizeAbbr = SHOT_SIZE_ABBR[shot.shot_size] || "MS";
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

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col rounded-xl overflow-hidden border bg-card/60 transition-all duration-150 cursor-pointer shadow-sm",
        isSelected
          ? "border-primary ring-2 ring-primary/40 shadow-md bg-card/95"
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
          "relative w-full bg-neutral-950 flex items-center justify-center overflow-hidden",
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
            {showHudGuide && <PrevizHudOverlay shot={shot} />}
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

        {/* Top Badges (Shot No, Shot Size, Duration, Lock) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono border border-border/60 shadow-sm z-20">
          <span className="font-bold text-sky-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-foreground">{sizeAbbr}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-emerald-400 font-semibold">{shot.duration}s</span>

          {isLocked && (
            <>
              <span className="text-muted-foreground">·</span>
              <span title="已锁定保护，AI重构时保持不变">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </span>
            </>
          )}

          {/* Dirty Badge: Script modified, prompt auto-recompiled, ready to re-render */}
          {shot.is_dirty && !isActivelyDeveloping && (
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 px-2 py-0.5 rounded text-[10px] font-medium animate-pulse shadow-sm transition-all ml-1"
              title="台本已修改且提示词已重新编译，点击重绘以匹配最新台本"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>⚡ 台本已改·重绘</span>
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
                "p-1.5 rounded-md backdrop-blur-md border transition-all duration-150 shadow-sm",
                isActivelyDeveloping
                  ? "bg-muted/80 text-muted-foreground border-border/40 cursor-not-allowed"
                  : "bg-background/80 border-border/60 text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover:opacity-100"
              )}
              title="重新打样当前分镜画面 (存入 R2)"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isActivelyDeveloping && "animate-spin text-primary")} />
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

        {/* Screen Text Overlay on Canvas Preview (Reelbench Feature) */}
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

        {/* Persisted to R2 Status Indicator (Bottom-right overlay) */}
        {imgSrc && !isRegenerating && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/20 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>R2</span>
          </div>
        )}
      </div>

      {/* Card Body: Action, Dialogue, Screen Text, Audio and Script Description */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-1.5 bg-card/40">
        <div>
          {/* Action Description (Always Visible, 2-line clamp) */}
          <p className="text-xs text-foreground/90 font-medium line-clamp-2 leading-relaxed" title={shot.action}>
            {shot.action || "未填写动作描述"}
          </p>

          {/* Dialogue (Expanded on Hover or if Present) */}
          {shot.dialogue && (
            <p className="text-[11px] text-foreground/80 font-medium italic mt-1.5 line-clamp-1 border-l-2 border-primary/60 pl-1.5 bg-muted/30 py-0.5 rounded-r" title={shot.dialogue}>
              💬 “{shot.dialogue}”
            </p>
          )}

          {/* Progressive Micro-Badge Strip (Collapsed by default, expanded on hover) */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
            {/* Screen Text Badge */}
            {shot.screen_text && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 max-w-[150px] truncate" title={`花字: ${shot.screen_text}`}>
                <span>🔤</span>
                <span className="hidden group-hover:inline truncate">{shot.screen_text}</span>
              </span>
            )}

            {/* Audio Indicator */}
            {(() => {
              const sfx = typeof shot.audio === "object" ? (Array.isArray(shot.audio?.sfx) ? shot.audio.sfx.join("、") : (shot.audio as any)?.sfx) : "";
              const music = typeof shot.audio === "object" ? shot.audio?.music : "";
              if (!sfx && !music) return null;
              return (
                <>
                  {sfx && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 max-w-[120px] truncate" title={`音效: ${sfx}`}>
                      <span>🔊</span>
                      <span className="hidden group-hover:inline truncate">{sfx}</span>
                    </span>
                  )}
                  {music && (
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border max-w-[120px] truncate" title={`配乐: ${music}`}>
                      <span>🎵</span>
                      <span className="hidden group-hover:inline truncate">{music}</span>
                    </span>
                  )}
                </>
              );
            })()}

            {/* Narrative Voltage Pill */}
            {shot.beat_type && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded font-mono font-bold inline-flex items-center gap-1",
                  shot.beat_type === "cliffhanger_hook" || shot.beat_type === "hook" || shot.beat_type === "climax_payoff"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-secondary text-muted-foreground border border-border"
                )}
                title={`节拍卡点: ${shot.beat_type} (${shot.emotional_voltage ?? 50}V)`}
              >
                <span>⚡</span>
                <span className="hidden group-hover:inline">
                  {shot.beat_type === "hook"
                    ? "开篇钩子"
                    : shot.beat_type === "cliffhanger_hook"
                    ? "悬念卡点"
                    : shot.beat_type === "climax_payoff"
                    ? "戏剧高潮"
                    : "情绪蓄压"}
                </span>
                <span className="opacity-80">({shot.emotional_voltage ?? 50}V)</span>
              </span>
            )}
          </div>

          {/* Featured Characters Presence Pills (Hover Progressive) */}
          {featuredChars.length > 0 && (
            <div className="hidden group-hover:flex items-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-border/30">
              {featuredChars.map((ch) => (
                <span
                  key={ch.id}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border shrink-0"
                  title={`出镜角色: ${ch.name} (${ch.role})`}
                >
                  <User className="w-2.5 h-2.5 text-muted-foreground" />
                  <span>{ch.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info: Camera Movement & Detail Drawer Trigger */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate max-w-[170px]" title={`运镜: ${shot.camera_movement?.type || "固定机位"}`}>
            <Camera className="w-3 h-3 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-[10px] text-foreground/80">{shot.camera_movement?.type || "static"}</span>
            {shot.duration && (
              <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-1 rounded">
                {shot.duration}s
              </span>
            )}
          </div>

          {onOpenDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail();
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium ml-auto cursor-pointer"
            >
              <span>生视频参数</span>
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
