import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Camera,
  Film,
  Music,
  SunMedium,
  Layers,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ShotModel, CharacterModel, LocationModel, PropModel } from "@/types/shot";
import { normalizeAssetUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";
import { generateH3Prompt } from "@/lib/h3Prompt";
import { buildH3CutItem } from "@/hooks/useH3Prompt";

interface ShotDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shot: ShotModel | null;
  allShots?: ShotModel[];
  onNavigateShot?: (shotId: string) => void;
  characters?: CharacterModel[];
  locations?: LocationModel[];
  propsList?: PropModel[];
  onUpdateShot: (shotId: string, updates: Partial<ShotModel>) => Promise<void> | void;
  onRegenerateImage?: (shotId: string) => Promise<void> | void;
}

const SHOT_SIZE_OPTIONS = [
  { value: "extreme_wide", label: "大远景 (EWS)" },
  { value: "wide", label: "全景 (WS)" },
  { value: "medium_wide", label: "中远景 (MWS)" },
  { value: "medium", label: "中景 (MS)" },
  { value: "medium_close", label: "中近景 (MCU)" },
  { value: "close_up", label: "特写 (CU)" },
  { value: "extreme_close_up", label: "大特写 (ECU)" },
];

const CAMERA_ANGLE_OPTIONS = [
  { value: "eye_level", label: "平视机位 (Eye Level)" },
  { value: "low_angle", label: "仰拍机位 (Low Angle)" },
  { value: "high_angle", label: "俯拍机位 (High Angle)" },
  { value: "dutch_angle", label: "倾斜机位 (Dutch Angle)" },
  { value: "birds_eye", label: "上帝俯视 (Bird's Eye)" },
  { value: "worms_eye", label: "极端地面贴地 (Worm's Eye)" },
];

const CAMERA_MOVEMENT_OPTIONS = [
  { value: "static", label: "固定机位 (Static)" },
  { value: "pan_left", label: "向左摇镜 (Pan Left)" },
  { value: "pan_right", label: "向右摇镜 (Pan Right)" },
  { value: "tilt_up", label: "向上俯仰 (Tilt Up)" },
  { value: "tilt_down", label: "向下俯仰 (Tilt Down)" },
  { value: "push_in", label: "缓缓推进 (Push In)" },
  { value: "pull_out", label: "缓缓拉远 (Pull Out)" },
  { value: "tracking", label: "跟随横移 (Tracking)" },
  { value: "crane", label: "升降机调度 (Crane)" },
  { value: "orbital", label: "环绕运镜 (Orbital 360°)" },
];

export const ShotDetailDrawer: React.FC<ShotDetailDrawerProps> = ({
  isOpen,
  onClose,
  shot,
  allShots = [],
  onNavigateShot,
  characters = [],
  locations = [],
  propsList = [],
  onUpdateShot,
  onRegenerateImage,
}) => {
  const [formData, setFormData] = useState<Partial<ShotModel>>({});
  const [promptLang, setPromptLang] = useState<"en" | "zh">("en");
  const [activeTab, setActiveTab] = useState<"script" | "camera" | "ai">("script");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentIdx = allShots.findIndex((s) => s.id === shot?.id);
  const totalCount = allShots.length;
  const prevShot = currentIdx > 0 ? allShots[currentIdx - 1] : null;
  const nextShot = currentIdx >= 0 && currentIdx < totalCount - 1 ? allShots[currentIdx + 1] : null;

  const handleGoPrev = useCallback(() => {
    if (prevShot && onNavigateShot) {
      onNavigateShot(prevShot.id);
    }
  }, [prevShot, onNavigateShot]);

  const handleGoNext = useCallback(() => {
    if (nextShot && onNavigateShot) {
      onNavigateShot(nextShot.id);
    }
  }, [nextShot, onNavigateShot]);

  // Keyboard navigation: [ for prev, ] for next, or Left/Right arrows when not typing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isTyping = activeTag === "input" || activeTag === "textarea" || (document.activeElement as any)?.isContentEditable;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "[" || (e.key === "ArrowLeft" && !isTyping)) {
        if (prevShot && onNavigateShot) {
          e.preventDefault();
          onNavigateShot(prevShot.id);
        }
      } else if (e.key === "]" || (e.key === "ArrowRight" && !isTyping)) {
        if (nextShot && onNavigateShot) {
          e.preventDefault();
          onNavigateShot(nextShot.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, prevShot, nextShot, onNavigateShot, onClose]);

  useEffect(() => {
    if (shot) {
      setFormData({
        ...shot,
        camera_movement: shot.camera_movement || { type: "static" },
        character_ids: shot.character_ids || [],
        prop_ids: shot.prop_ids || [],
      });
    }
  }, [shot]);

  if (!isOpen || !shot) return null;

  const handleChange = (field: keyof ShotModel, value: any) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    onUpdateShot(shot.id, { [field]: value });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleRegenerate = async () => {
    if (!onRegenerateImage || isRegenerating) return;
    setIsRegenerating(true);
    try {
      // First save current prompt
      await onUpdateShot(shot.id, { image_prompt: formData.image_prompt });
      await onRegenerateImage(shot.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  const movType = (formData.camera_movement as any)?.type || "static";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-xl md:max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-250"
      >
        {/* Drawer Header with Continuous Step Controls */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-sm border border-primary/20 shrink-0">
              {String(shot.order).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate">
                分镜头深度编辑与视听参数
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Shot #{shot.order} {totalCount > 0 && `(${currentIdx + 1}/${totalCount})`} · {shot.shot_size.toUpperCase()} · {shot.duration}s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Prev/Next Shot Continuous Steppers */}
            {totalCount > 1 && onNavigateShot && (
              <div className="flex items-center rounded-lg border border-border/70 bg-background/80 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handleGoPrev}
                  disabled={!prevShot}
                  title="上一镜快捷切换 (快捷键: [ 或 ←)"
                  className={cn(
                    "p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors",
                    prevShot
                      ? "hover:bg-secondary text-foreground cursor-pointer"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">上一镜</span>
                </button>
                <div className="w-[1px] h-3.5 bg-border/60 mx-0.5" />
                <button
                  type="button"
                  onClick={handleGoNext}
                  disabled={!nextShot}
                  title="下一镜快捷切换 (快捷键: ] 或 →)"
                  className={cn(
                    "p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors",
                    nextShot
                      ? "hover:bg-secondary text-foreground cursor-pointer"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <span className="hidden sm:inline text-[11px]">下一镜</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="关闭抽屉 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-muted/10 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("script")}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "script"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Film className="w-3.5 h-3.5" />
            <span>台本设定</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "camera"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>摄影机位</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "ai"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 提示词 (H3)</span>
          </button>
        </div>

        {/* Drawer Body (Scrollable with comfortable fonts) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {activeTab === "script" && (
            <>
              {/* Section 1: Visual Preview Thumbnail */}
              <div className="p-4 rounded-xl border border-border bg-background/50 flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-56 aspect-video rounded-lg overflow-hidden border border-border bg-muted shrink-0 relative">
              {shot.storyboard_image_url ? (
                <img
                  src={normalizeAssetUrl(shot.storyboard_image_url)}
                  alt={`Shot ${shot.order}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  暂无分镜图
                </div>
              )}

              {/* Live Overlay Preview of Screen Text on Drawer Thumbnail */}
              {formData.screen_text && (
                <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none">
                  {formData.screen_text_style === "warning_banner" ? (
                    <div className="w-full bg-red-600/90 text-white font-black text-[9px] py-0.5 px-1 text-center tracking-wider border-y border-yellow-400">
                      🚨 {formData.screen_text}
                    </div>
                  ) : formData.screen_text_style === "key_point" ? (
                    <div className="bg-amber-400 text-neutral-950 font-bold text-[9px] px-2 py-0.5 rounded-full shadow">
                      💡 {formData.screen_text}
                    </div>
                  ) : formData.screen_text_style === "minimal_lower_third" ? (
                    <div className="absolute bottom-1 left-1 bg-black/80 text-zinc-100 font-mono text-[8px] px-1 py-0.2 rounded border-l border-sky-400">
                      🏷️ {formData.screen_text}
                    </div>
                  ) : (
                    <div className="text-center font-black text-[10px] text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] tracking-wider">
                      {formData.screen_text}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">当前分镜图状态</span>
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在调用模型重绘...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>以此 Prompt 重绘此格</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                可随时在下方修改 Midjourney / Grok 英文提示词，点击重绘将自动将新生成画面存入历史图库，杜绝旧图丢失。
              </p>

              {/* Reelbench History Asset Pool (改坏了随时找回) */}
              {shot.image_history && shot.image_history.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <span>🎞️ 历史生成底片池 ({shot.image_history.length})</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">点击任意历史版即可直接复原设为当前</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {shot.image_history.map((histUrl, hIdx) => {
                      const isActive = shot.storyboard_image_url === histUrl;
                      return (
                        <div
                          key={histUrl + hIdx}
                          onClick={() => {
                            if (!isActive) {
                              onUpdateShot(shot.id, { storyboard_image_url: histUrl });
                              notify.success(`已复原激活第 ${hIdx + 1} 版历史分镜底片`);
                            }
                          }}
                          className={cn(
                            "w-16 h-10 rounded border overflow-hidden shrink-0 cursor-pointer relative transition-all group",
                            isActive
                              ? "border-primary ring-2 ring-primary/40 shadow-xs"
                              : "border-border/80 hover:border-primary/60 opacity-70 hover:opacity-100"
                          )}
                          title={`点击复原为第 ${hIdx + 1} 版画面`}
                        >
                          <img src={normalizeAssetUrl(histUrl)} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 right-0 bg-black/70 text-[8px] font-mono px-1 text-white">
                            #{hIdx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Core Screenplay Action & Dialogue */}
          <div className="p-5 rounded-xl border border-border/80 bg-background/50 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Film className="w-4 h-4 text-primary" />
              <span>画面动作调度与台词</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  镜头核心动作描述 (Action)
                </label>
                <textarea
                  rows={3}
                  value={formData.action || ""}
                  onChange={(e) => handleChange("action", e.target.value)}
                  placeholder="详细描述该分镜头内发生的人物动作、空间调度与物理互动..."
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:border-primary resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    台词 / 旁白 (Dialogue)
                  </label>
                  <input
                    type="text"
                    value={formData.dialogue || ""}
                    onChange={(e) => handleChange("dialogue", e.target.value)}
                    placeholder="可选，角色台词或画外音..."
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    台词语气 / 情感 (Emotion for TTS)
                  </label>
                  <input
                    type="text"
                    value={formData.dialogue_emotion || ""}
                    onChange={(e) => handleChange("dialogue_emotion", e.target.value)}
                    placeholder="例如: 冷嘲讽刺 / 绝望悲鸣 / 压低声音"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Reelbench Screen Text & Motion Overlays (花字/屏幕题眼) */}
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <span>🔤</span>
                    <span>屏幕文字 / 核心花字 (Screen Text Overlay)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">独立于对白的视觉卡点与题眼层</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">花字文案内容</label>
                    <input
                      type="text"
                      value={formData.screen_text || ""}
                      onChange={(e) => handleChange("screen_text", e.target.value)}
                      placeholder="例如: 🚨 高能反转 / ⚡️ 核心真相揭晓 / 关键定理..."
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">花字排版风格</label>
                    <select
                      value={formData.screen_text_style || "bold_impact"}
                      onChange={(e) => handleChange("screen_text_style", e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary"
                    >
                      <option value="bold_impact">💥 醒目冲击 (黄黑重字)</option>
                      <option value="warning_banner">🚨 警示红条 (危机Banner)</option>
                      <option value="key_point">💡 核心提要 (金色光晕)</option>
                      <option value="minimal_lower_third">🏷️ 电影角标 (极简白条)</option>
                    </select>
                  </div>
                </div>

                {formData.screen_text && (
                  <div className="p-2.5 rounded-lg bg-black/50 border border-border/60 flex items-center justify-center min-h-[48px]">
                    {formData.screen_text_style === "warning_banner" ? (
                      <div className="w-full bg-red-600 text-white font-black text-xs py-1 px-3 text-center tracking-widest uppercase border-y-2 border-yellow-400">
                        🚨 {formData.screen_text} 🚨
                      </div>
                    ) : formData.screen_text_style === "key_point" ? (
                      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 font-extrabold text-xs px-3 py-0.5 rounded-full shadow">
                        <span>💡</span>
                        <span>{formData.screen_text}</span>
                      </div>
                    ) : formData.screen_text_style === "minimal_lower_third" ? (
                      <div className="w-full bg-black/80 text-zinc-100 font-mono text-xs px-2.5 py-1 rounded border-l-2 border-sky-400">
                        🏷️ {formData.screen_text}
                      </div>
                    ) : (
                      <div className="text-center font-black text-sm text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wider">
                        {formData.screen_text}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Location and Props Selection (Reelbench Standard) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    绑定场景空间 (Location)
                  </label>
                  <select
                    value={formData.location_id || ""}
                    onChange={(e) => handleChange("location_id", e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary"
                  >
                    <option value="">未指定 (根据动作自动推导)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.environment_type === "interior" ? "室内" : "室外"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    关联关键叙事道具 (Props)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-1.5 bg-background border border-border rounded-lg min-h-[38px] items-center">
                    {propsList.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground px-1.5">暂无道具（请在全剧设定中登记）</span>
                    ) : (
                      propsList.map((p) => {
                        const isSelected = (formData.prop_ids || []).includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const currentProps = formData.prop_ids || [];
                              const next = isSelected
                                ? currentProps.filter((id) => id !== p.id)
                                : [...currentProps, p.id];
                              handleChange("prop_ids", next);
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-secondary text-muted-foreground hover:text-foreground border border-border/60"
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Section 3: Cinematography & Camera Parameters */}
      {activeTab === "camera" && (
        <div className="p-5 rounded-xl border border-border/80 bg-background/50 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Camera className="w-4 h-4 text-sky-400" />
            <span>摄影机位与运镜设计</span>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">景别 (Shot Size)</label>
                <select
                  value={formData.shot_size}
                  onChange={(e) => handleChange("shot_size", e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary"
                >
                  {SHOT_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">机位视角 (Angle)</label>
                <select
                  value={formData.camera_angle}
                  onChange={(e) => handleChange("camera_angle", e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary"
                >
                  {CAMERA_ANGLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">运镜方式 (Movement)</label>
                <select
                  value={movType}
                  onChange={(e) =>
                    handleChange("camera_movement", {
                      ...(formData.camera_movement as any),
                      type: e.target.value,
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary"
                >
                  {CAMERA_MOVEMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  预估时长（秒）
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="60"
                  value={formData.duration || 2.5}
                  onChange={(e) => handleChange("duration", parseFloat(e.target.value) || 2.5)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  叙事功能 (Narrative Role)
                </label>
                <input
                  type="text"
                  value={formData.narrative_function || ""}
                  onChange={(e) => handleChange("narrative_function", e.target.value)}
                  placeholder="例如：环境建立 / 冲突爆发 / 反应特写"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

      {/* Section 4: Layered Visual Inspector & AI Generation Prompts */}
      {activeTab === "ai" && (
        <div className="p-5 rounded-xl border border-border/80 bg-background/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>分层视听检查器 (Layered Visual Inspector)</span>
            </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                5维工业级解构
              </span>
            </div>

            {/* 5 Layered Visual Modules */}
            <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/60">
              {/* Module 1: Hero & DNA */}
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-amber-500/10 text-amber-400 text-xs font-mono shrink-0 mt-0.5">
                  🧬 基因
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">主角实体与视觉基因 (Hero DNA)</span>
                    <span className="text-[10px] text-muted-foreground">全片连续性基石</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {formData.subject || "默认主角实体 (由项目全局视觉基石锁定)"}
                  </p>
                </div>
              </div>

              <div className="h-[1px] bg-border/40" />

              {/* Module 2: Worldview & Environment */}
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-sky-500/10 text-sky-400 text-xs font-mono shrink-0 mt-0.5">
                  🏰 场景
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-foreground">世界观与环境空间 (Environment)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {shot.lighting || "电影级通透环境光影，三层景深视差构图"}
                  </p>
                </div>
              </div>

              <div className="h-[1px] bg-border/40" />

              {/* Module 3: Framing & Vantage */}
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-purple-500/10 text-purple-400 text-xs font-mono shrink-0 mt-0.5">
                  📐 构图
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-foreground">景别构图与摄影机视角</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-background border border-border text-xs font-mono text-sky-400 font-semibold">
                      {formData.shot_size?.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-background border border-border text-xs font-mono text-purple-400">
                      {formData.camera_angle}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-background border border-border text-xs font-mono text-emerald-400">
                      {movType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-border/40" />

              {/* Module 4: Visual Action */}
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono shrink-0 mt-0.5">
                  ⚡ 动作
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-foreground">具象动态台本 (Visual Action)</span>
                  <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed font-medium">
                    {formData.action || "主角展开具体动态调度..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Pure Image Prompt Textarea */}
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-foreground">
                      纯净英文生图提示词 (Pure Visual Prompt)
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      去字样/防穿帮
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(formData.image_prompt || "", "img")}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {copiedKey === "img" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "img" ? "已复制" : "复制"}</span>
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all shadow-xs"
                    >
                      {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      <span>重绘此镜</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={formData.image_prompt || ""}
                  onChange={(e) => handleChange("image_prompt", e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-none text-foreground/90"
                />
              </div>

              {/* MiniMax Hailuo H3 Multi-Modal Video Generation Block */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>MiniMax 海螺 H3 官方多模态提示词 (I2VA)</span>
                      <span className="text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded">
                        时间轴逐字对账
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Prompt Language Switcher (en / zh) */}
                    <div className="flex items-center bg-secondary/80 p-0.5 rounded-md border border-border text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setPromptLang("en")}
                        className={cn(
                          "px-2 py-0.5 rounded transition-all",
                          promptLang === "en" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="官方口径：正文英文禁人名，台词保留[Chinese]原文"
                      >
                        EN (推荐)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromptLang("zh")}
                        className={cn(
                          "px-2 py-0.5 rounded transition-all",
                          promptLang === "zh" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="中文模式：正文中文放行人名，台词保留[Chinese]原文"
                      >
                        中文
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const mergedShot = {
                          ...shot,
                          ...formData,
                          order: formData.order || shot.order || 1,
                          duration: formData.duration || shot.duration || 2.5,
                          shot_size: formData.shot_size || shot.shot_size,
                          camera_movement: formData.camera_movement || shot.camera_movement,
                          action: formData.action || shot.action || "",
                          dialogue: formData.dialogue || shot.dialogue || "",
                          dialogue_emotion: formData.dialogue_emotion || shot.dialogue_emotion,
                          subject: formData.subject || shot.subject,
                        };
                        const cut = buildH3CutItem(mergedShot as ShotModel, 1);
                        const h3 = generateH3Prompt([cut], { lang: promptLang });
                        handleChange("h3_prompt", h3);
                        notify.success("已基于当前分镜参数重新编译 H3 视频生成提示词");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer transition-colors"
                      title="根据当前动作、机位与台词自动重新推导"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>编译H3</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const mergedShot = {
                          ...shot,
                          ...formData,
                          order: formData.order || shot.order || 1,
                          duration: formData.duration || shot.duration || 2.5,
                          shot_size: formData.shot_size || shot.shot_size,
                          camera_movement: formData.camera_movement || shot.camera_movement,
                          action: formData.action || shot.action || "",
                          dialogue: formData.dialogue || shot.dialogue || "",
                          dialogue_emotion: formData.dialogue_emotion || shot.dialogue_emotion,
                          subject: formData.subject || shot.subject,
                        };
                        const content = formData.h3_prompt || generateH3Prompt([buildH3CutItem(mergedShot as ShotModel, 1)], { lang: promptLang });
                        handleCopy(content, "h3");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer transition-colors"
                    >
                      {copiedKey === "h3" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span>{copiedKey === "h3" ? "已复制H3" : "一键复制H3"}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={formData.h3_prompt || ""}
                  onChange={(e) => handleChange("h3_prompt", e.target.value)}
                  placeholder="点击上方「编译H3」生成符合工业标准的 MiniMax H3 视频生成提示词..."
                  className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-[11px] font-mono leading-relaxed focus:outline-none focus:border-primary resize-none text-foreground/90"
                />
                <p className="text-[10px] text-muted-foreground">
                  ⏱️ 包含首行对齐指令、切点时刻推进与 &lt;d&gt;[Chinese] 台词原子块。
                </p>
              </div>

              {/* Video Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-foreground">
                      AI 视频运镜与动势提示词 (I2V / Runway · 可灵 · Minimax 专用)
                    </label>
                    <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded">
                      4段式标准动态语法
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(formData.video_prompt || "", "vid")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 transition-colors shadow-2xs"
                  >
                    {copiedKey === "vid" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "vid" ? "已复制视频词" : "一键复制生动词"}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formData.video_prompt || ""}
                  onChange={(e) => handleChange("video_prompt", e.target.value)}
                  placeholder="[Camera]: ... [Action]: ... [Dynamics]: ... [Quality]: ..."
                  className="w-full bg-background border border-border/80 rounded-lg p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-sky-500 resize-none text-foreground/90"
                />
                <p className="text-[11px] text-muted-foreground/80">
                  💡 搭配上方首帧图片作为第一帧垫图，直接粘贴至可灵/Runway/海螺即可生成连贯电影级镜头。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Drawer Footer */}
        <div className="h-16 px-6 border-t border-border flex items-center justify-end bg-muted/20 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-colors"
          >
            完成并收起
          </button>
        </div>
      </div>
    </div>
  );
};
