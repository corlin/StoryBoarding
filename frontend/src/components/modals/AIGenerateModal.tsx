import React, { useState } from "react";
import { Sparkles, X, Key } from "lucide-react";
import { NarrativeStyleSelector } from "@/components/director/NarrativeStyleSelector";
import { NarrativeMode, NarrativeCenter } from "@/types/narrative";

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (
    story: string,
    options?: {
      narrative_mode?: "hollywood" | "drama_5min" | "commercial";
      structural_archetype?: string;
      narrative_center?: "character" | "creative" | "plot";
    }
  ) => Promise<void>;
}

export const AIGenerateModal: React.FC<AIGenerateModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [storyText, setStoryText] = useState("");
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>("hollywood");
  const [structuralArchetype, setStructuralArchetype] = useState<string>("single_space_standoff");
  const [narrativeCenter, setNarrativeCenter] = useState<NarrativeCenter>("plot");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!storyText.trim()) return;
    try {
      setIsSubmitting(true);
      await onGenerate(storyText.trim(), {
        narrative_mode: narrativeMode,
        structural_archetype: narrativeMode === "drama_5min" ? structuralArchetype : undefined,
        narrative_center: narrativeMode === "drama_5min" ? narrativeCenter : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">AI 导演智能拆镜 (好莱坞工业级规范)</h3>
              <p className="text-xs text-muted-foreground">基于 6 阶段 30 秒叙事弧，规划 12 镜分镜头并锁定角色场景基准</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <NarrativeStyleSelector
            mode={narrativeMode}
            onModeChange={setNarrativeMode}
            archetype={structuralArchetype}
            onArchetypeChange={setStructuralArchetype}
            center={narrativeCenter}
            onCenterChange={setNarrativeCenter}
            compact
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">输入故事梗概或场次文本</label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-muted-foreground/70">快速范例:</span>
                <button
                  type="button"
                  onClick={() => {
                    setStoryText("赛博雨夜，青瓦飞檐的古典茶楼中，黑客武术大师墨客与特工银狐展开近身对决，经历了拔枪、子弹时间下腰闪避、凌空飞踢，最终击退特工，墨客收势伫立在雨中，望向全息广告牌。");
                    setNarrativeMode("hollywood");
                  }}
                  className="px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                >
                  赛博武斗
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoryText("昏暗密室，仅有一盏摇晃吊灯。刑警老周将一份绝密录音磁带拍在审讯桌上，嫌疑人年轻冷笑，直到录音机里传来他妹妹的声音，冷笑瞬间凝固，情绪崩溃坦白真相。");
                    setNarrativeMode("drama_5min");
                    setStructuralArchetype("single_space_standoff");
                    setNarrativeCenter("character");
                  }}
                  className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors cursor-pointer"
                >
                  密室审讯
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoryText("江南竹林月夜，落叶萧萧。白衣剑客独行山道，林中突现黑衣刺客阵法围剿，剑鸣出鞘，落叶化为暗器，数息之间刺客尽退，剑客拂袖收剑，踏月而去。");
                    setNarrativeMode("hollywood");
                  }}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                >
                  古风对决
                </button>
              </div>
            </div>
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="例如：赛博雨夜，青瓦飞檐的古典茶楼中，黑客武术大师墨客与特工银狐展开近身对决，经历了拔枪、子弹时间下腰闪避、凌空飞踢，最终击退特工，墨客收势伫立在雨中..."
              rows={4}
              className="w-full text-xs bg-background border border-border rounded-lg p-3 resize-none focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <Key className="w-3 h-3" />
            <span>专属 API Key 已就绪 · ~3-5s 拆解</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              disabled={isSubmitting || !storyText.trim()}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "正在拆镜中..." : "开始规划分镜"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
