import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { ShotModel } from "@/types/shot";

interface ShotDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shot: ShotModel | null;
  onUpdateShot: (shotId: string, updates: Partial<ShotModel>) => Promise<void> | void;
  onRegenerateImage?: (shotId: string) => Promise<void> | void;
}

const SHOT_SIZE_OPTIONS = [
  { value: "extreme_wide_shot", label: "大远景 (Extreme Wide Shot / EWS)" },
  { value: "wide_shot", label: "全景 (Wide Shot / WS)" },
  { value: "full_shot", label: "全景全身 (Full Shot / FS)" },
  { value: "medium_shot", label: "中景 (Medium Shot / MS)" },
  { value: "medium_close_up", label: "中特写 (Medium Close Up / MCU)" },
  { value: "close_up", label: "特写 (Close Up / CU)" },
  { value: "extreme_close_up", label: "大特写 (Extreme Close Up / ECU)" },
];

const CAMERA_ANGLE_OPTIONS = [
  { value: "eye_level", label: "平视机位 (Eye Level)" },
  { value: "low_angle", label: "仰角机位 (Low Angle)" },
  { value: "high_angle", label: "俯角机位 (High Angle)" },
  { value: "dutch_angle", label: "倾斜机位 (Dutch Angle)" },
  { value: "birds_eye", label: "鸟瞰机位 (Bird's Eye)" },
  { value: "worms_eye", label: "贴地视角 (Worm's Eye)" },
];

const CAMERA_MOVEMENT_OPTIONS = [
  { value: "static", label: "固定镜头 (Static)" },
  { value: "push_in", label: "向前推进 (Push In / Dolly In)" },
  { value: "pull_out", label: "向后拉出 (Pull Out / Dolly Out)" },
  { value: "tracking_right", label: "向右横移跟随 (Tracking Right)" },
  { value: "tracking_left", label: "向左横移跟随 (Tracking Left)" },
  { value: "pan_right", label: "向右摇镜 (Pan Right)" },
  { value: "pan_left", label: "向左摇镜 (Pan Left)" },
  { value: "crane_down", label: "升降下落 (Crane Down)" },
  { value: "crane_up", label: "升降上升 (Crane Up)" },
  { value: "handheld", label: "手持呼吸感 (Handheld Shake)" },
];

export const ShotDetailDrawer: React.FC<ShotDetailDrawerProps> = ({
  isOpen,
  onClose,
  shot,
  onUpdateShot,
  onRegenerateImage,
}) => {
  const [formData, setFormData] = useState<Partial<ShotModel>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (shot) {
      setFormData({
        action: shot.action || "",
        dialogue: shot.dialogue || "",
        duration: shot.duration || 2.5,
        shot_size: shot.shot_size || "medium_shot",
        camera_angle: shot.camera_angle || "eye_level",
        camera_movement: shot.camera_movement || { type: "static", speed: "medium" },
        subject: shot.subject || "",
        narrative_function: shot.narrative_function || "叙事推进",
        lighting: shot.lighting || "",
        image_prompt: shot.image_prompt || "",
        video_prompt: shot.video_prompt || "",
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
        className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-250"
      >
        {/* Drawer Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-sm border border-primary/20">
              {String(shot.order).padStart(2, "0")}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                分镜头深度编辑与视听参数
              </h3>
              <p className="text-xs text-muted-foreground">
                Shot #{shot.order} · {shot.shot_size.toUpperCase()} · {shot.duration}s
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body (Scrollable with 14px~16px comfortable fonts) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Section 1: Visual Preview Thumbnail */}
          <div className="p-4 rounded-xl border border-border bg-background/50 flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-56 aspect-video rounded-lg overflow-hidden border border-border bg-muted shrink-0 relative">
              {shot.storyboard_image_url ? (
                <img
                  src={shot.storyboard_image_url}
                  alt={`Shot ${shot.order}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  暂无分镜图
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">当前分镜图状态</span>
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
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
                可随时在下方修改 Midjourney / Grok 英文提示词，点击重绘即可刷新当前分镜画面。
              </p>
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
                    主体对象 / 角色 (Subject)
                  </label>
                  <input
                    type="text"
                    value={formData.subject || ""}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    placeholder="例如：墨客 (Moke)"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Cinematography & Camera Parameters */}
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

          {/* Section 4: AI Generation Prompts */}
          <div className="p-5 rounded-xl border border-border/80 bg-background/50 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>AI 生图与视频 Prompt (可微调)</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Image Prompt (分镜绘图提示词)
                  </label>
                  <button
                    onClick={() => handleCopy(formData.image_prompt || "", "img")}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    {copiedKey === "img" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "img" ? "已复制" : "复制"}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formData.image_prompt || ""}
                  onChange={(e) => handleChange("image_prompt", e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-none text-foreground/90"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Video Motion Prompt (视频运镜提示词)
                  </label>
                  <button
                    onClick={() => handleCopy(formData.video_prompt || "", "vid")}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    {copiedKey === "vid" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "vid" ? "已复制" : "复制"}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.video_prompt || ""}
                  onChange={(e) => handleChange("video_prompt", e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-none text-foreground/90"
                />
              </div>
            </div>
          </div>
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
