"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, BookOpen, RefreshCw, Film, ShieldCheck, Download, X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface DirectorMissionBarProps {
  shotCount: number;
  completedCount: number;
  onOpenWizard: () => void;
  onOpenBible: () => void;
  onBatchRender?: () => void;
  onOpenTheater: () => void;
  onOpenExport: () => void;
  onOpenRadar: () => void;
}

export const DirectorMissionBar: React.FC<DirectorMissionBarProps> = ({
  shotCount,
  completedCount,
  onOpenWizard,
  onOpenBible,
  onBatchRender,
  onOpenTheater,
  onOpenExport,
  onOpenRadar,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return (
      <div className="bg-card/40 border-b border-border/40 px-4 py-0.5 flex justify-end shrink-0">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer"
          title="展开智能导演主线向导提示"
        >
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>显示导演主线建议</span>
        </button>
      </div>
    );
  }

  // Determine Current Mission State
  let missionContent: React.ReactNode = null;

  if (shotCount === 0) {
    missionContent = (
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-bold">👉 第 1 步</span>
        <span>当前工程暂无分镜：建议先使用极速向导一键输入故事剧情</span>
        <button
          onClick={onOpenWizard}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors ml-1 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>立即启动极速向导</span>
        </button>
      </div>
    );
  } else if (completedCount === 0) {
    missionContent = (
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-bold">👉 关键基准</span>
        <span>已规划 {shotCount} 镜：建议先在「设定集」核准主角定妆照（杜绝后续镜头跑脸）</span>
        <button
          onClick={onOpenBible}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-foreground hover:bg-muted border border-border text-[11px] font-medium transition-colors ml-1 cursor-pointer"
        >
          <BookOpen className="w-3 h-3 text-muted-foreground" />
          <span>前往设定集定妆</span>
        </button>
        {onBatchRender && (
          <button
            onClick={onBatchRender}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] transition-colors cursor-pointer"
          >
            <span>直接一键批量冲印</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  } else if (completedCount < shotCount) {
    missionContent = (
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 font-bold">🚀 制作推进中</span>
        <span>
          已显影 {completedCount}/{shotCount} 镜：建议冲印剩余画面，或直接进行全屏提前预演
        </span>
        {onBatchRender && (
          <button
            onClick={onBatchRender}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-medium transition-colors ml-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>冲印剩余 ({shotCount - completedCount})</span>
          </button>
        )}
        <button
          onClick={onOpenTheater}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-muted text-foreground border border-border text-[11px] font-medium transition-colors cursor-pointer"
        >
          <Film className="w-3 h-3 text-muted-foreground" />
          <span>全屏影院提前看</span>
        </button>
      </div>
    );
  } else {
    missionContent = (
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 font-bold">🎉 全剧显影就绪</span>
        <span>所有镜头画面均已生成完毕！可立即开启好莱坞动态预演或导出投产文件</span>
        <button
          onClick={onOpenTheater}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold transition-colors ml-1 cursor-pointer"
        >
          <Film className="w-3 h-3" />
          <span>开启全屏动态放映</span>
        </button>
        <button
          onClick={onOpenExport}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-muted text-foreground border border-border text-[11px] font-medium transition-colors cursor-pointer"
        >
          <Download className="w-3 h-3 text-muted-foreground" />
          <span>导出 MiniMax H3 清单</span>
        </button>
        <button
          onClick={onOpenRadar}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3 h-3" />
          <span>全链路工程诊断</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-8 bg-secondary/40 border-b border-border/60 px-4 flex items-center justify-between text-xs text-foreground/90 select-none z-10 shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        {missionContent}
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-2 cursor-pointer"
        title="收起主线向导提示"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
