import React, { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Loader2, Clapperboard, Film, Eye, Cpu, Clock } from "lucide-react";

interface DirectorPipelineModalProps {
  isOpen: boolean;
  storyPreview?: string;
  targetDuration?: number;
  modelName?: string;
}

const PIPELINE_STAGES = [
  {
    title: "1. 深度解析叙事弧与动机",
    desc: "提炼核心人物动机、空间几何与情节冲突节拍",
    icon: Film,
  },
  {
    title: "2. 规划 6 阶段好莱坞镜头视听节拍",
    desc: "严守 180° 运动轴线，编排景别交替与运镜调度",
    icon: Eye,
  },
  {
    title: "3. 注入工业级 Previz 视觉提示词",
    desc: "生成电影石墨草图与 AI 视频运镜控制提示词包",
    icon: Clapperboard,
  },
  {
    title: "4. 同步写入云端故事板数据库",
    desc: "持久化存储镜头数据并即时渲染 Previz 视觉草图",
    icon: Cpu,
  },
];

export const DirectorPipelineModal: React.FC<DirectorPipelineModalProps> = ({
  isOpen,
  storyPreview,
  targetDuration = 30,
  modelName = "deepseek/deepseek-chat",
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Number(((Date.now() - start) / 1000).toFixed(1)));
    }, 100);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine active stage based on elapsed seconds
  const activeStageIndex = elapsed < 1.8 ? 0 : elapsed < 4.2 ? 1 : elapsed < 7.5 ? 2 : 3;

  return (
    <div className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-primary/40 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Top ambient glow gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
                AI 导演智能拆镜中
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </h3>
              <p className="text-xs text-muted-foreground">基于好莱坞 6 阶段工业级分镜规范</p>
            </div>
          </div>

          {/* Stopwatch badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/80 text-xs font-mono text-primary font-semibold shadow-xs">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            <span>{elapsed.toFixed(1)}s</span>
          </div>
        </div>

        {/* Story Snippet Preview */}
        {storyPreview && (
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 mb-6 text-xs text-muted-foreground line-clamp-2 italic">
            "{storyPreview}"
          </div>
        )}

        {/* Multi-Stage Pipeline Progress */}
        <div className="space-y-3 mb-6 relative">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isCompleted = idx < activeStageIndex;
            const isCurrent = idx === activeStageIndex;
            const isPending = idx > activeStageIndex;
            const Icon = stage.icon;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                    : isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
                    : "border-border/40 bg-background/40 opacity-40"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-semibold ${
                        isCurrent ? "text-primary font-bold" : isCompleted ? "text-emerald-300" : "text-muted-foreground"
                      }`}
                    >
                      {stage.title}
                    </h4>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        处理中
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60 text-[11px] text-muted-foreground">
          <span>模型: <code className="text-primary font-mono">{modelName}</code></span>
          <span>目标时长: <strong className="font-mono text-foreground">{targetDuration}s</strong></span>
        </div>
      </div>
    </div>
  );
};
