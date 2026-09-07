"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Film,
  Layers,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  targetId: string;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tip?: string;
  preferredPosition?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-script-panel",
    title: "剧本节拍流：创作的源头",
    badge: "第 1 步 · 故事架构",
    icon: Film,
    description:
      "左侧是故事的源动力。AI 会将短剧剧本智能结构化为角色台词、动作节拍与视听时长。双击任意节拍即可原位精修台词，AI 将联动推导后续镜头。",
    tip: "💡 提示：左栏支持左右拖动分界线自由调节宽度，双击中线可瞬间复位 5:5 均等分屏。",
    preferredPosition: "right",
  },
  {
    targetId: "tour-storyboard-panel",
    title: "分镜画板与顺场表：视听可视化",
    badge: "第 2 步 · 视觉具象",
    icon: Layers,
    description:
      "右侧直观呈现每一格分镜的画面与机位参数。不仅支持九宫格网格画板，还可一键无缝切换为现场拍摄专用的「顺场排期表」，支持单镜锁定保护。",
    tip: "💡 提示：点击任意分镜卡片可呼出深度编辑抽屉，微调机位运镜、台词字幕与 H3 提示词。",
    preferredPosition: "left",
  },
  {
    targetId: "tour-timeline-bar",
    title: "视听时间轴：节奏与手感",
    badge: "第 3 步 · 剪辑预演",
    icon: SlidersHorizontal,
    description:
      "底栏是标准视听时间轴。按空格键 Space 随时播放预演，方向键 ← → 微步吸附切镜，直观洞悉全片的情绪电压曲线与时长分布。",
    tip: "💡 提示：底栏左侧可随时收起或展开时间轴，在全屏大画幅与剪辑台之间自如切换。",
    preferredPosition: "top",
  },
  {
    targetId: "tour-topbar-actions",
    title: "放映厅与交付导出：最终成片",
    badge: "第 4 步 · 审片交付",
    icon: Compass,
    description:
      "顶栏汇聚全片审片与交付工具。点击「放映监看」进入全屏无干扰大屏审片；点击「导出」可将分镜图纸与 CSV 排期表一键打包交付剧组！",
    tip: "💡 提示：导览结束后，随时按「?」键可查看快捷键指南，或在更多菜单中重新唤起此向导。",
    preferredPosition: "bottom",
  },
];

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStepIdx];
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === TOUR_STEPS.length - 1;

  const updateRect = useCallback(() => {
    if (!isOpen || !step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;
    updateRect();
    const handleResize = () => updateRect();
    const handleScroll = () => updateRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updateRect]);

  // Keyboard navigation: Escape to skip, ArrowRight/Enter for next, ArrowLeft for prev
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleFinish();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (isLastStep) {
          handleFinish();
        } else {
          setCurrentStepIdx((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentStepIdx((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLastStep]);

  const handleFinish = () => {
    try {
      localStorage.setItem("storyboarding_tour_completed", "true");
    } catch {
      // ignore in iframe or private mode
    }
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIdx((prev) => Math.max(prev - 1, 0));
  };

  if (!isOpen) return null;

  // Compute card position based on target rect and preferred position
  const getCardStyle = (): React.CSSProperties => {
    if (typeof window === "undefined") return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Mobile fallback: bottom sheet pinned
    if (vw < 768) {
      return {
        bottom: "16px",
        left: "16px",
        right: "16px",
        maxWidth: "calc(100vw - 32px)",
      };
    }

    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const cardWidth = 420;
    const cardHeight = 260;
    const margin = 16;

    // Default positioning heuristic
    if (step.preferredPosition === "right") {
      const left = Math.min(targetRect.right + margin, vw - cardWidth - margin);
      const top = Math.max(margin, Math.min(targetRect.top + 40, vh - cardHeight - margin));
      return { top: `${top}px`, left: `${left}px` };
    }

    if (step.preferredPosition === "left") {
      const left = Math.max(margin, targetRect.left - cardWidth - margin);
      const top = Math.max(margin, Math.min(targetRect.top + 40, vh - cardHeight - margin));
      return { top: `${top}px`, left: `${left}px` };
    }

    if (step.preferredPosition === "top") {
      const top = Math.max(margin, targetRect.top - cardHeight - margin);
      const left = Math.max(margin, Math.min(targetRect.left + 40, vw - cardWidth - margin));
      return { top: `${top}px`, left: `${left}px` };
    }

    if (step.preferredPosition === "bottom") {
      const top = Math.min(targetRect.bottom + margin, vh - cardHeight - margin);
      const left = Math.max(margin, Math.min(targetRect.left, vw - cardWidth - margin));
      return { top: `${top}px`, left: `${left}px` };
    }

    // Fallback: center in viewport
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  };

  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none animate-in fade-in duration-200">
      {/* Spotlight cutout mask */}
      {targetRect ? (
        <div
          className="absolute transition-all duration-300 ease-out rounded-xl ring-4 ring-amber-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] pointer-events-none"
          style={{
            top: `${Math.max(0, targetRect.top - 4)}px`,
            left: `${Math.max(0, targetRect.left - 4)}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
          }}
        >
          {/* Subtle pulsating focus glow */}
          <div className="absolute inset-0 rounded-xl bg-amber-400/5 animate-pulse" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" />
      )}

      {/* Floating Guidance Card */}
      <div
        ref={cardRef}
        style={getCardStyle()}
        className="fixed z-50 w-full max-w-[420px] bg-card/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Card Header: Step Tag, Title & Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <StepIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {step.badge}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {currentStepIdx + 1} / {TOUR_STEPS.length}
                </span>
              </div>
              <h3 className="font-bold text-sm text-foreground mt-0.5 truncate">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="跳过导览 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {step.description}
        </p>

        {/* Pro Tip Box */}
        {step.tip && (
          <div className="text-[11px] bg-secondary/50 border border-border/80 rounded-xl p-2.5 text-foreground/90 leading-normal">
            {step.tip}
          </div>
        )}

        {/* Card Footer: Step Dots + Nav Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIdx(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === currentStepIdx
                    ? "w-5 bg-amber-400"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                )}
                title={`跳转到第 ${idx + 1} 步`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一步</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>开启创作</span>
                </>
              ) : (
                <>
                  <span>下一步</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
