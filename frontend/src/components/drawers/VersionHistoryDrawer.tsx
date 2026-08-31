"use client";

import React, { useState } from "react";
import { ProjectVersion } from "@/types/shot";
import { History, X, Clock, Film, Eye, RotateCcw, GitBranch, Camera, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ProjectVersion[];
  previewVersionId?: string | null;
  onPreviewVersion: (version: ProjectVersion) => void;
  onRollbackVersion: (version: ProjectVersion) => Promise<void>;
  onForkVersion: (version: ProjectVersion) => Promise<void>;
  onOpenCreateSnapshot: () => void;
  isLoading?: boolean;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  versions,
  previewVersionId,
  onPreviewVersion,
  onRollbackVersion,
  onForkVersion,
  onOpenCreateSnapshot,
  isLoading = false,
}) => {
  const [actingVersionId, setActingVersionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRollback = async (v: ProjectVersion) => {
    const ok = window.confirm(`确定要将当前项目回滚至「${v.version_tag} · ${v.version_name}」吗？\n系统将在回滚前自动备份当前的工作状态。`);
    if (!ok) return;

    setActingVersionId(v.id);
    try {
      await onRollbackVersion(v);
    } finally {
      setActingVersionId(null);
    }
  };

  const handleFork = async (v: ProjectVersion) => {
    setActingVersionId(v.id);
    try {
      await onForkVersion(v);
    } finally {
      setActingVersionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">版本时光机 (Version Time Machine)</h3>
                <p className="text-xs text-muted-foreground">追溯全量快照与无损回滚</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="p-4 border-b border-border/80 bg-background/50 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-muted-foreground">
              共记录 <strong>{versions.length}</strong> 个历史版本
            </span>
            <button
              onClick={onOpenCreateSnapshot}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>保存当前快照</span>
            </button>
          </div>

          {/* Timeline List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="h-64 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <History className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium mb-1">暂无历史快照版本</p>
                <p className="text-[11px] text-muted-foreground/80">
                  点击上方「保存当前快照」或在调用 AI 拆镜时系统将自动生成备份
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {versions.map((v, idx) => {
                  const isPreviewing = previewVersionId === v.id;
                  const isLatest = idx === 0;
                  const isAuto = v.trigger_type === "auto_pre_ai";
                  const isRollbackBackup = v.trigger_type === "rollback_backup";
                  const isActing = actingVersionId === v.id;

                  return (
                    <div key={v.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div
                        className={cn(
                          "absolute -left-6 top-1.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all bg-card",
                          isPreviewing
                            ? "border-amber-400 text-amber-400 ring-4 ring-amber-400/20"
                            : isLatest
                            ? "border-primary text-primary ring-2 ring-primary/20"
                            : "border-border text-muted-foreground group-hover:border-primary/60"
                        )}
                      >
                        {isAuto ? (
                          <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                        ) : isRollbackBackup ? (
                          <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                        ) : (
                          <Camera className="w-2.5 h-2.5 text-emerald-400" />
                        )}
                      </div>

                      {/* Card Content */}
                      <div
                        className={cn(
                          "p-4 rounded-xl border transition-all duration-200 bg-background/60 shadow-xs",
                          isPreviewing
                            ? "border-amber-400/80 bg-amber-500/5 ring-1 ring-amber-400/30"
                            : "border-border hover:border-primary/40 hover:bg-card/90"
                        )}
                      >
                        {/* Title & Tag */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-secondary text-foreground border border-border">
                                {v.version_tag}
                              </span>
                              {isAuto && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                  AI 备份
                                </span>
                              )}
                              {isRollbackBackup && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  回滚备份
                                </span>
                              )}
                              {isLatest && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  最新
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm text-foreground mt-1.5 leading-snug">
                              {v.version_name}
                            </h4>
                          </div>

                          <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Meta stats */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 font-mono">
                          <span className="flex items-center gap-1">
                            <Film className="w-3.5 h-3.5" />
                            {v.shot_count} 镜
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {v.total_duration}s
                          </span>
                          <span>{new Date(v.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Interactive Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                          {/* Preview / Time travel */}
                          <button
                            onClick={() => onPreviewVersion(v)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                              isPreviewing
                                ? "bg-amber-500 text-black font-semibold shadow-xs"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            )}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isPreviewing ? "正在预览中" : "穿越预览"}</span>
                          </button>

                          {/* Fork to branch */}
                          <button
                            onClick={() => handleFork(v)}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                            title="从该版本另存为一个新的分支项目"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>另存分支</span>
                          </button>

                          {/* Rollback */}
                          <button
                            onClick={() => handleRollback(v)}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                            title="将项目无损恢复至此版本"
                          >
                            {isActing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>回滚</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
