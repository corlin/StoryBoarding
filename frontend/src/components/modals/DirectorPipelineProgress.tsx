"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Film,
  Eye,
  Clapperboard,
  Database,
  AlertTriangle,
  RefreshCw,
  Settings,
  Clock,
  ArrowRight,
} from "lucide-react";

export interface DirectorPipelineProgressProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  story?: string;
  targetDuration?: number;
  progressPercent?: number;
  elapsedSeconds?: number;
  activeStageIndex?: number;
  isComplete?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
  onOpenSettings?: () => void;
  onSkipToWorkspace?: () => void;
}

const PIPELINE_STAGES = [
  {
    title: "1. 实体建库与元数据初始化",
    desc: "建立项目主表与首个叙事场次结构",
    icon: Database,
  },
  {
    title: "2. 好莱坞 AI 导演大模型深度拆镜",
    desc: "提炼故事脉络与角色动机，规划视听叙事节拍",
    icon: Film,
  },
  {
    title: "3. 编排 180° 空间轴线与 Previz 提示词",
    desc: "锁定角色视线方向，编排连续性石墨草图指令",
    icon: Clapperboard,
  },
  {
    title: "4. 组装 16:9 视听工程与分镜资产",
    desc: "持久化存储所有镜头，即刻就绪导演工作台",
    icon: Eye,
  },
];

export const DirectorPipelineProgress: React.FC<DirectorPipelineProgressProps> = ({
  isOpen = true,
  onClose,
  title = "AI 导演分镜项目",
  story,
  targetDuration = 30,
  progressPercent: externalProgress,
  elapsedSeconds: externalElapsed,
  activeStageIndex: externalStage,
  isComplete = false,
  errorMessage = null,
  onRetry,
  onCancel,
  onOpenSettings,
  onSkipToWorkspace,
}) => {
  const [internalElapsed, setInternalElapsed] = useState(0);

  // Internal organic timer when external timer is not supplied
  useEffect(() => {
    if (!isOpen || externalElapsed !== undefined) return;
    const start = Date.now();
    const timer = setInterval(() => {
      setInternalElapsed(Number(((Date.now() - start) / 1000).toFixed(1)));
    }, 100);
    return () => clearInterval(timer);
  }, [isOpen, externalElapsed]);

  if (!isOpen) return null;

  const elapsed = externalElapsed !== undefined ? externalElapsed : internalElapsed;
  const activeStageIndex =
    externalStage !== undefined
      ? externalStage
      : elapsed < 1.8
      ? 0
      : elapsed < 4.5
      ? 1
      : elapsed < 7.5
      ? 2
      : 3;

  const progress =
    externalProgress !== undefined
      ? externalProgress
      : isComplete
      ? 100
      : Math.min(96, Math.round(10 + (1 - Math.exp(-elapsed / 3.5)) * 85));

  const content = (
    <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border shadow-inner ${
              errorMessage
                ? "bg-destructive/15 text-destructive border-destructive/30"
                : isComplete
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-primary/15 text-primary border-primary/30"
            }`}
          >
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
                : "好莱坞 AI 导演智能拆镜中"}
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
          <span>{elapsed.toFixed(1)}s</span>
        </div>
      </div>

      {/* Story snippet preview */}
      {story && (
        <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-xs text-muted-foreground line-clamp-2 italic">
          "{story}"
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">
            {errorMessage
              ? "处理中断"
              : isComplete
              ? "全部镜头拆解完成，正在进入工作台..."
              : PIPELINE_STAGES[activeStageIndex]?.title || "AI 导演正在思考中..."}
          </span>
          <span className="font-mono text-primary font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border/40">
          <div
            className={`h-full transition-all duration-300 ${
              errorMessage
                ? "bg-destructive"
                : isComplete
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-primary to-sky-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 4 Pipeline Stages Checklist */}
      <div className="space-y-2 pt-1">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isDone = isComplete || idx < activeStageIndex;
          const isRunning = !isComplete && idx === activeStageIndex && !errorMessage;
          const isPending = !isComplete && idx > activeStageIndex;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-200 ${
                isRunning
                  ? "bg-primary/10 border-primary/40 shadow-xs"
                  : isDone
                  ? "bg-emerald-500/5 border-emerald-500/20 text-muted-foreground"
                  : "bg-secondary/20 border-border/30 opacity-60 text-muted-foreground"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isRunning ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <stage.icon className="w-4 h-4 text-muted-foreground/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      isRunning ? "text-foreground font-bold" : isDone ? "text-emerald-300" : "text-muted-foreground"
                    }`}
                  >
                    {stage.title}
                  </span>
                  {isRunning && (
                    <span className="text-[10px] font-mono text-primary font-medium px-1.5 py-0.2 rounded bg-primary/20 animate-pulse">
                      进行中
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[10px] font-mono text-emerald-400 font-medium">已完成</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-0.5 truncate">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error state and rescue actions */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
          <p className="text-xs text-destructive font-medium leading-relaxed">{errorMessage}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重试创建</span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>检查配置</span>
              </button>
            )}
            {onSkipToWorkspace && (
              <button
                type="button"
                onClick={onSkipToWorkspace}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors ml-auto"
              >
                <span>直接进入</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <span>基于好莱坞 6 阶段戏剧节拍与 Previz 工业规范</span>
        {onCancel && !isComplete && (
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );

  // If used as modal (with backdrop)
  if (isOpen && onClose) {
    return (
      <div className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-primary/40 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
