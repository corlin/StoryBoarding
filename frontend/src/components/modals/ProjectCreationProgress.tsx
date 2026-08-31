"use client";

import React from "react";
import { Sparkles, CheckCircle2, Loader2, Film, Eye, Clapperboard, Database, AlertTriangle, RefreshCw, Settings, Clock } from "lucide-react";

interface ProjectCreationProgressProps {
  title: string;
  story?: string;
  targetDuration: number;
  progressPercent: number;
  elapsedSeconds: number;
  activeStageIndex: number;
  isComplete: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
  onOpenSettings?: () => void;
}

const CREATION_STAGES = [
  {
    title: "1. 实体建库与元数据初始化",
    desc: "建立云端 D1 数据库项目主表与首个叙事场次结构",
    icon: Database,
  },
  {
    title: "2. 好莱坞 AI 导演大模型深度拆镜",
    desc: "解析故事脉络与角色动机，规划 6 阶段视听叙事节拍",
    icon: Film,
  },
  {
    title: "3. 编排 180° 空间轴线与 Previz 提示词",
    desc: "锁定角色视线方向，编排石墨草图与 AI 视频运镜指令",
    icon: Clapperboard,
  },
  {
    title: "4. 批量写入云端并编译矢量草图",
    desc: "持久化存储所有镜头，即时生成 16:9 视觉故事板资产",
    icon: Eye,
  },
];

export const ProjectCreationProgress: React.FC<ProjectCreationProgressProps> = ({
  title,
  story,
  targetDuration,
  progressPercent,
  elapsedSeconds,
  activeStageIndex,
  isComplete,
  errorMessage,
  onRetry,
  onCancel,
  onOpenSettings,
}) => {
  return (
    <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shadow-inner ${
            errorMessage
              ? "bg-destructive/15 text-destructive border-destructive/30"
              : isComplete
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-primary/15 text-primary border-primary/30"
          }`}>
            {errorMessage ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isComplete ? (
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
            ) : (
              <Sparkles className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
              {errorMessage
                ? "项目创建受阻"
                : isComplete
                ? "🎉 分镜工程初始化就绪"
                : "好莱坞 AI 导演工程初始化中"}
              {!errorMessage && !isComplete && (
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
              )}
            </h3>
            <p className="text-xs text-muted-foreground truncate max-w-[280px]">
              项目：<strong className="text-foreground font-medium">{title}</strong> ({targetDuration}s)
            </p>
          </div>
        </div>

        {/* Real-time stopwatch */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/80 text-xs font-mono text-primary font-semibold shadow-xs">
          <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          <span>{elapsedSeconds.toFixed(1)}s</span>
        </div>
      </div>

      {/* Progress Bar & Calculated Precision Display */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">
            {errorMessage
              ? "执行异常"
              : isComplete
              ? "100% 准备完成，即将切入工作台..."
              : `当前执行进度：${progressPercent}%`}
          </span>
          <span className={`font-mono font-bold text-sm ${
            errorMessage ? "text-destructive" : isComplete ? "text-emerald-400" : "text-primary"
          }`}>
            {progressPercent}%
          </span>
        </div>

        {/* Outer track */}
        <div className="h-2.5 w-full bg-background/80 rounded-full overflow-hidden border border-border/80 relative">
          <div
            className={`h-full transition-all duration-300 rounded-full relative overflow-hidden ${
              errorMessage
                ? "bg-destructive"
                : isComplete
                ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)]"
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer light bar */}
            {!errorMessage && !isComplete && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            )}
          </div>
        </div>
      </div>

      {/* Multi-Stage Breakdown List */}
      <div className="space-y-2.5">
        {CREATION_STAGES.map((stage, idx) => {
          const isCompleted = isComplete || idx < activeStageIndex;
          const isCurrent = !isComplete && idx === activeStageIndex;
          const isPending = !isComplete && idx > activeStageIndex;
          const Icon = stage.icon;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                  : isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
                  : "border-border/40 bg-background/40 opacity-40"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[9px] text-muted-foreground font-mono">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-semibold ${
                    isCurrent ? "text-primary font-bold" : isCompleted ? "text-emerald-300" : "text-muted-foreground"
                  }`}>
                    {stage.title}
                  </h4>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      执行中
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Callout & In-place Recovery Buttons */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed font-medium">
              {errorMessage}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-destructive/20">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-background border border-border text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>配置 API Key</span>
              </button>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                返回修改
              </button>
            )}

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重试创建</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
