"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Flame,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Zap,
  Check,
} from "lucide-react";
import { ProjectModel, SequenceModel } from "@/types/shot";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";

interface HookDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  sequence: SequenceModel | null;
  currentScreenplay: string;
  onApplyRewrite: (newText: string) => Promise<void>;
}

export const HookDoctorModal: React.FC<HookDoctorModalProps> = ({
  isOpen,
  onClose,
  project,
  sequence,
  currentScreenplay,
  onApplyRewrite,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [diagnosis, setDiagnosis] = useState<any | null>(null);

  // Auto trigger diagnosis when opened if not already loaded
  useEffect(() => {
    if (isOpen && project?.id && sequence?.id && !diagnosis) {
      handleRunDiagnosis();
    }
  }, [isOpen, project?.id, sequence?.id]);

  if (!isOpen) return null;

  const handleRunDiagnosis = async () => {
    if (!project?.id || !sequence?.id) return;
    try {
      setIsLoading(true);
      const res = await api.diagnoseHook(project.id, sequence.id, currentScreenplay);
      if (res.success && res.diagnosis) {
        setDiagnosis(res.diagnosis);
        notify.success("✨ 短剧爆点诊断与重构已生成！");
      }
    } catch (err: any) {
      console.error("Hook Doctor Error:", err);
      notify.error(err?.response?.data?.detail || err?.message || "诊断失败，请检查配置");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySingleSection = async (sectionKey: "opening" | "middle" | "cliffhanger") => {
    if (!diagnosis?.sections?.[sectionKey]?.rewritten) return;
    try {
      setIsApplying(true);
      const rewrittenPart = diagnosis.sections[sectionKey].rewritten;
      let newScreenplay = currentScreenplay;

      if (sectionKey === "opening") {
        newScreenplay = `${rewrittenPart}\n\n${currentScreenplay.split("\n\n").slice(1).join("\n\n")}`;
      } else if (sectionKey === "cliffhanger") {
        const parts = currentScreenplay.split("\n\n");
        newScreenplay = `${parts.slice(0, -1).join("\n\n")}\n\n${rewrittenPart}`;
      } else {
        newScreenplay = diagnosis.rewritten_screenplay;
      }

      await onApplyRewrite(newScreenplay);
      notify.success(`已单独采纳「${sectionKey === "opening" ? "黄金开局" : sectionKey === "cliffhanger" ? "集尾卡点" : "中段加压"}」改写！`);
      onClose();
    } catch (err: any) {
      notify.error("采纳失败: " + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAll = async () => {
    if (!diagnosis?.rewritten_screenplay) return;
    try {
      setIsApplying(true);
      await onApplyRewrite(diagnosis.rewritten_screenplay);
      notify.success("⚡ 已全量采纳短剧重构剧本并同步差量分镜头！");
      onClose();
    } catch (err: any) {
      notify.error("应用失败: " + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const scores = diagnosis?.scores || { hook: 0, escalation: 0, cliffhanger: 0, overall: 0 };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                短剧爆点重构与网感诊断台 (Chief Script Doctor)
                <span className="text-[10px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                  30s 黄金钩子 · 4 幕压强
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                AI 监制前置诊断：撕碎流水账伪矛盾，前置 3 秒危机，制造最高压集尾生死卡点
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-sm font-semibold text-foreground">短剧编剧总监正在逐句推演爆点与卡点...</p>
            <p className="text-xs text-muted-foreground max-w-md">
              正在评估：前 3 秒跳出率压制、中段信息差与权力对调、集尾生死卡点悬念深度
            </p>
          </div>
        ) : diagnosis ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Top Scores Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-secondary/40 border border-border/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-400">⚡ 前 3s 黄金钩子</span>
                  <span className="font-mono text-sm font-bold text-rose-400">{scores.hook}分</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${scores.hook}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{diagnosis.critique?.hook}</p>
              </div>

              <div className="p-3 bg-secondary/40 border border-border/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-400">🔥 中段反转压强</span>
                  <span className="font-mono text-sm font-bold text-amber-400">{scores.escalation}分</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${scores.escalation}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{diagnosis.critique?.escalation}</p>
              </div>

              <div className="p-3 bg-secondary/40 border border-border/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-purple-400">🎣 集尾生死卡点</span>
                  <span className="font-mono text-sm font-bold text-purple-400">{scores.cliffhanger}分</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${scores.cliffhanger}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{diagnosis.critique?.cliffhanger}</p>
              </div>

              <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-primary font-bold">🌟 综合爆款指数</span>
                  <span className="font-mono text-sm font-bold text-primary">{scores.overall}分</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${scores.overall}%` }} />
                </div>
                <p className="text-[10px] text-primary/80">网感极高，可直接反推分镜</p>
              </div>
            </div>

            {/* Sections Comparison (Diff & Recommendations) */}
            <div className="space-y-3">
              {/* 1. Opening Hook */}
              {diagnosis.sections?.opening && (
                <div className="p-3.5 bg-background border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span>① 黄金 3 秒抓人钩子重构 (Opening Hook)</span>
                    </div>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleApplySingleSection("opening")}
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer"
                    >
                      单独采纳开局改写
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/60">
                      <span className="text-[10px] font-semibold text-muted-foreground block mb-1">原剧本开局:</span>
                      <p className="text-muted-foreground leading-relaxed font-mono line-clamp-3">{diagnosis.sections.opening.original}</p>
                    </div>
                    <div className="p-2.5 bg-rose-500/5 rounded-lg border border-rose-500/30">
                      <span className="text-[10px] font-semibold text-rose-300 block mb-1">短剧重构版 (前置危机/尖锐对峙):</span>
                      <p className="text-rose-200 leading-relaxed font-mono font-medium">{diagnosis.sections.opening.rewritten}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">💡 <strong>改动逻辑：</strong>{diagnosis.sections.opening.why}</p>
                </div>
              )}

              {/* 2. Middle Escalation */}
              {diagnosis.sections?.middle && (
                <div className="p-3.5 bg-background border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Flame className="w-3.5 h-3.5" />
                      <span>② 中段对抗加压与反转质变 (Escalation & Payoff)</span>
                    </div>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleApplySingleSection("middle")}
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer"
                    >
                      单独采纳中段改写
                    </button>
                  </div>
                  <div className="p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/30 text-xs">
                    <span className="text-[10px] font-semibold text-amber-300 block mb-1">重构升级要点:</span>
                    <p className="text-amber-200 leading-relaxed font-mono">{diagnosis.sections.middle.rewritten}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">💡 <strong>改动逻辑：</strong>{diagnosis.sections.middle.why}</p>
                </div>
              )}

              {/* 3. Cliffhanger Ending */}
              {diagnosis.sections?.cliffhanger && (
                <div className="p-3.5 bg-background border border-purple-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>③ 集尾生死悬念卡点 (Cliffhanger Hook)</span>
                    </div>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleApplySingleSection("cliffhanger")}
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-all cursor-pointer"
                    >
                      单独采纳卡点改写
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/60">
                      <span className="text-[10px] font-semibold text-muted-foreground block mb-1">原剧本收尾:</span>
                      <p className="text-muted-foreground leading-relaxed font-mono line-clamp-3">{diagnosis.sections.cliffhanger.original}</p>
                    </div>
                    <div className="p-2.5 bg-purple-500/5 rounded-lg border border-purple-500/30">
                      <span className="text-[10px] font-semibold text-purple-300 block mb-1">生死卡点重构版 (卡在最高潮那一瞬):</span>
                      <p className="text-purple-200 leading-relaxed font-mono font-medium">{diagnosis.sections.cliffhanger.rewritten}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">💡 <strong>改动逻辑：</strong>{diagnosis.sections.cliffhanger.why}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">尚未开始诊断</p>
            <button
              type="button"
              onClick={handleRunDiagnosis}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
            >
              开始爆点诊断
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3 shrink-0">
          <button
            type="button"
            disabled={isLoading || isApplying}
            onClick={handleRunDiagnosis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>重新诊断</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isApplying}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!diagnosis || isApplying}
              onClick={handleApplyAll}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在应用并差量反推分镜...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>一键全量采纳并差量反推分镜</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
