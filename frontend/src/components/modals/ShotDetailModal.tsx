import React from "react";
import { ShotModel } from "@/types/shot";
import { Film, Sparkles, Video, Compass, Layers, X, Copy, Check } from "lucide-react";

interface ShotDetailModalProps {
  shot: ShotModel | null;
  index: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ShotDetailModal: React.FC<ShotDetailModalProps> = ({
  shot,
  index,
  isOpen,
  onClose,
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen || !shot) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-border/80 flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                SHOT #{String(index + 1).padStart(2, "0")} · 视听生成参数全景
              </h3>
              <p className="text-[11px] text-muted-foreground">
                景别: {shot.shot_size.toUpperCase()} · 机位: {shot.camera_angle.toUpperCase()} · 时长: {shot.duration}s
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Visual Image Preview */}
          {shot.storyboard_image_url && (
            <div className="aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-background/60 shadow-inner">
              <img
                src={shot.storyboard_image_url}
                alt={`Shot ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Action description */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-background/50 space-y-1.5">
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
              动作调度与戏剧行为 (Action Description)
            </span>
            <p className="text-xs text-foreground leading-relaxed">
              {shot.action || "无详细动作描述"}
            </p>
          </div>

          {/* Image Prompt Spec */}
          <div className="p-4 rounded-xl border border-border/70 bg-background/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>图像生成提示词 (Image Generation Prompt)</span>
              </span>
              <button
                onClick={() => copyToClipboard(shot.image_prompt || "", "image_prompt")}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                {copiedField === "image_prompt" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>复制 Prompt</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs font-mono bg-card/80 p-3 rounded-lg border border-border/50 text-muted-foreground leading-relaxed select-all">
              {shot.image_prompt || "暂未生成独立图像提示词"}
            </p>
          </div>

          {/* Video Motion Prompt Spec */}
          <div className="p-4 rounded-xl border border-border/70 bg-background/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                <Video className="w-3.5 h-3.5" />
                <span>视频生成运动描述 (Video Motion Prompt)</span>
              </span>
              <button
                onClick={() => copyToClipboard(shot.video_prompt || "", "video_prompt")}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                {copiedField === "video_prompt" ? (
                  <>
                    <Check className="w-3 h-3 text-sky-400" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>复制 Prompt</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs font-mono bg-card/80 p-3 rounded-lg border border-border/50 text-muted-foreground leading-relaxed select-all">
              {shot.video_prompt || "暂未生成独立视频运镜提示词"}
            </p>
          </div>

          {/* Composition & Continuity Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border/70 bg-background/50 space-y-1.5">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                <Compass className="w-3.5 h-3.5" />
                <span>构图与焦点 (Composition)</span>
              </span>
              <div className="text-[11px] text-muted-foreground space-y-1 font-mono">
                <div>主体方位: {JSON.stringify(shot.composition?.subject_position || "center")}</div>
                <div>视线朝向: {shot.character_direction || "static"}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 bg-background/50 space-y-1.5">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-400">
                <Layers className="w-3.5 h-3.5" />
                <span>连续性约束 (Continuity Data)</span>
              </span>
              <div className="text-[11px] text-muted-foreground space-y-1 font-mono">
                <div>轴线方向: {shot.continuity_data?.screen_direction || "left_to_right"}</div>
                <div>转场连接: {shot.transition || "cut"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-border/80 flex items-center justify-end bg-card/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            关闭详情
          </button>
        </div>
      </div>
    </div>
  );
};
