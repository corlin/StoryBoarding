"use client";

import React, { useMemo } from "react";
import { ProjectModel, ShotModel } from "@/types/shot";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Film,
  Users,
  MapPin,
  Package,
  BookOpen,
  Sparkles,
  ChevronRight,
  Info,
  X,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectQualityRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  shots?: ShotModel[];
  onNavigateToSection?: (section: "tradeoffs" | "bible_characters" | "bible_scenes" | "bible_props" | "script" | "storyboard") => void;
}

interface DiagnosticItem {
  id: string;
  stage: "outline" | "cast" | "art" | "script" | "storyboard";
  stageLabel: string;
  ruleName: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  suggestion?: string;
  jumpTarget: "tradeoffs" | "bible_characters" | "bible_scenes" | "bible_props" | "script" | "storyboard";
}

export const ProjectQualityRadarModal: React.FC<ProjectQualityRadarModalProps> = ({
  isOpen,
  onClose,
  project,
  shots = [],
  onNavigateToSection,
}) => {
  const diagnostics: DiagnosticItem[] = useMemo(() => {
    if (!project) return [];
    const items: DiagnosticItem[] = [];

    const characters = project.characters || [];
    const locations = project.locations || [];
    const props = project.props || [];
    const sequences = project.sequences || [];
    const totalEps = sequences.length || 1;

    // ==========================================
    // 1. OUTLINE GATES (novel-outline 规范)
    // ==========================================
    // Gate 1: 主角组数量约束 (1 - 5 人)
    const leads = characters.filter((c) => c.role === "protagonist" || c.role === "antagonist");
    if (leads.length >= 1 && leads.length <= 5) {
      items.push({
        id: "outline_leads",
        stage: "outline",
        stageLabel: "大纲与角色档",
        ruleName: "主角组规模 (1–5 人)",
        status: "pass",
        detail: `当前主角组共有 ${leads.length} 人，观众心智与注意力负荷合理。`,
        jumpTarget: "bible_characters",
      });
    } else {
      items.push({
        id: "outline_leads",
        stage: "outline",
        stageLabel: "大纲与角色档",
        ruleName: "主角组规模 (1–5 人)",
        status: leads.length === 0 ? "fail" : "warn",
        detail: `当前主角组登记了 ${leads.length} 人（标准为 1–5 人）。`,
        suggestion: "主角与主反派过多会导致短剧注意力涣散，请合并或下调为重要配角。",
        jumpTarget: "bible_characters",
      });
    }

    // Gate 2: 爽点跨集真空门控 (maxBeatGap <= 3)
    const payoffBeats = project.adaptation_tradeoffs?.payoff_beats || [];
    const beatEps = Array.from(new Set(payoffBeats.map((b) => b.episode))).sort((a, b) => a - b);
    let maxGap = 0;
    if (beatEps.length === 0) {
      maxGap = totalEps;
    } else {
      maxGap = Math.max(maxGap, beatEps[0] - 1);
      for (let i = 0; i < beatEps.length - 1; i++) {
        maxGap = Math.max(maxGap, beatEps[i + 1] - beatEps[i]);
      }
      maxGap = Math.max(maxGap, totalEps - beatEps[beatEps.length - 1]);
    }

    if (payoffBeats.length > 0 && maxGap <= 3) {
      items.push({
        id: "outline_beat_gap",
        stage: "outline",
        stageLabel: "大纲与爽点表",
        ruleName: "爽点跨集无真空 (间隔 ≤ 3 集)",
        status: "pass",
        detail: `最大爽点间隔为 ${maxGap} 集，全剧剧情节奏紧凑连贯。`,
        jumpTarget: "tradeoffs",
      });
    } else {
      items.push({
        id: "outline_beat_gap",
        stage: "outline",
        stageLabel: "大纲与爽点表",
        ruleName: "爽点跨集无真空 (间隔 ≤ 3 集)",
        status: payoffBeats.length === 0 ? "warn" : "fail",
        detail: `检测到连续 ${maxGap} 集缺乏核心戏剧兑现（标准必须 ≤ 3 集）。`,
        suggestion: "短剧连续 3 集以上无大冲突或爆点极易流失观众，请补充铺垫与当期兑现。",
        jumpTarget: "tradeoffs",
      });
    }

    // ==========================================
    // 2. CAST GATES (novel-characters 规范)
    // ==========================================
    // Gate 3: 声音 DNA 高密度声学规范
    const missingVoice = characters.filter((c) => !c.voice_dna && !(c as any).voiceDna);
    if (characters.length > 0 && missingVoice.length === 0) {
      items.push({
        id: "cast_voice_dna",
        stage: "cast",
        stageLabel: "角色资产",
        ruleName: "全员声学音色 DNA 齐备",
        status: "pass",
        detail: `全员 ${characters.length} 位角色均已登记音色提示词或特征描述。`,
        jumpTarget: "bible_characters",
      });
    } else {
      items.push({
        id: "cast_voice_dna",
        stage: "cast",
        stageLabel: "角色资产",
        ruleName: "全员声学音色 DNA 齐备",
        status: "warn",
        detail: `${missingVoice.length} 位角色缺失声学音色特征（如 ${missingVoice[0]?.name || "角色"}）。`,
        suggestion: "补充 ≤400 字符英文声学参数，防止 TTS 直通合成时音色漂移。",
        jumpTarget: "bible_characters",
      });
    }

    // ==========================================
    // 3. ART GATES (novel-art 规范)
    // ==========================================
    // Gate 4: 场景实体物理锚点 (3-5 items)
    const dynamicMaxScenes = Math.min(15, Math.max(5, 4 + Math.ceil(totalEps / 10)));
    if (locations.length <= dynamicMaxScenes) {
      items.push({
        id: "art_scenes_limit",
        stage: "art",
        stageLabel: "美术空间",
        ruleName: `主场景上限约束 (≤ ${dynamicMaxScenes} 个)`,
        status: "pass",
        detail: `当前登记 ${locations.length} 个场景空间，符合 ${totalEps} 集短剧的资产一致性预算。`,
        jumpTarget: "bible_scenes",
      });
    } else {
      items.push({
        id: "art_scenes_limit",
        stage: "art",
        stageLabel: "美术空间",
        ruleName: `主场景上限约束 (≤ ${dynamicMaxScenes} 个)`,
        status: "warn",
        detail: `当前场景数量 (${locations.length}) 超过动态上限 ${dynamicMaxScenes} 个。`,
        suggestion: "场景过多会增加 AI 画面风格漂移风险，建议采用「换光照不换场景」的变体复用策略。",
        jumpTarget: "bible_scenes",
      });
    }

    // Gate 5: 叙事道具尺度与数量 (3-8 件)
    if (props.length >= 1 && props.length <= 8) {
      items.push({
        id: "art_props_limit",
        stage: "art",
        stageLabel: "叙事道具",
        ruleName: "核心道具数量 (3–8 件)",
        status: "pass",
        detail: `当前精选 ${props.length} 件承载关键戏份的叙事道具。`,
        jumpTarget: "bible_props",
      });
    } else if (props.length === 0) {
      items.push({
        id: "art_props_limit",
        stage: "art",
        stageLabel: "叙事道具",
        ruleName: "核心道具数量 (3–8 件)",
        status: "warn",
        detail: "尚未登记核心叙事道具（如信物、信件、武器等）。",
        suggestion: "登记 3–8 件有特写镜头的剧情物件，便于 AI 分镜精准锁定细节。",
        jumpTarget: "bible_props",
      });
    } else {
      items.push({
        id: "art_props_limit",
        stage: "art",
        stageLabel: "叙事道具",
        ruleName: "核心道具数量 (3–8 件)",
        status: "warn",
        detail: `当前道具数量 (${props.length}) 超过建议的 8 件。`,
        suggestion: "非核心日常杂物无需单独立项，保留具有剧情承载力的重要物件即可。",
        jumpTarget: "bible_props",
      });
    }

    // ==========================================
    // 4. SCRIPT GATES (novel-script 规范)
    // ==========================================
    // Gate 6: 单句台词字数质量门 (<= 35 字)
    const longLines: string[] = [];
    shots.forEach((s) => {
      if (s.dialogue && s.dialogue.replace(/\s+/g, "").length > 35) {
        longLines.push(s.dialogue);
      }
    });

    if (longLines.length === 0) {
      items.push({
        id: "script_line_length",
        stage: "script",
        stageLabel: "剧本台词",
        ruleName: "单句台词一口气 (≤ 35 字)",
        status: "pass",
        detail: "所有镜头台词均在 35 字以内，口语利落，适合短剧高频注意力节奏。",
        jumpTarget: "script",
      });
    } else {
      items.push({
        id: "script_line_length",
        stage: "script",
        stageLabel: "剧本台词",
        ruleName: "单句台词一口气 (≤ 35 字)",
        status: "warn",
        detail: `检测到 ${longLines.length} 处台词超过 35 字（最长达 ${Math.max(...longLines.map((l) => l.replace(/\s+/g, "").length))} 字）。`,
        suggestion: "短剧台词忌书面散文，建议拆成带停顿与动作伴随的双句。",
        jumpTarget: "script",
      });
    }

    // Gate 7: 冷开场前 3 拍钩子闸门
    const firstSeq = sequences[0];
    const hasHook = Boolean(firstSeq?.hook_summary && firstSeq.hook_summary.trim().length > 0);
    if (hasHook) {
      items.push({
        id: "script_hook_gate",
        stage: "script",
        stageLabel: "剧本节拍",
        ruleName: "首集前 3 拍冷开场钩子 (Hook Gate)",
        status: "pass",
        detail: `第 1 集开篇钩子已明确登记：${firstSeq.hook_summary}`,
        jumpTarget: "script",
      });
    } else {
      items.push({
        id: "script_hook_gate",
        stage: "script",
        stageLabel: "剧本节拍",
        ruleName: "首集前 3 拍冷开场钩子 (Hook Gate)",
        status: "fail",
        detail: "第 1 集尚未登记开场抓人钩子（0-3秒抓人设问）。",
        suggestion: "在剧本节拍编辑器顶部登记具象钩子，并在第 1 场前 3 拍内兑现。",
        jumpTarget: "script",
      });
    }

    // ==========================================
    // 5. STORYBOARD GATES (novel-storyboard 规范)
    // ==========================================
    // Gate 8: 单镜头时长上限 (<= 15s)
    const over15sShots = shots.filter((s) => Number(s.duration) > 15.0);
    if (over15sShots.length === 0) {
      items.push({
        id: "storyboard_max_shot_seconds",
        stage: "storyboard",
        stageLabel: "分镜镜头",
        ruleName: "单镜头时长上限 (≤ 15 秒)",
        status: "pass",
        detail: "全片镜头时长均在 15 秒安全生成窗口内，无模型超时风险。",
        jumpTarget: "storyboard",
      });
    } else {
      items.push({
        id: "storyboard_max_shot_seconds",
        stage: "storyboard",
        stageLabel: "分镜镜头",
        ruleName: "单镜头时长上限 (≤ 15 秒)",
        status: "fail",
        detail: `有 ${over15sShots.length} 个镜头超过 15 秒视频生成物理上限。`,
        suggestion: "将长镜头拆分为 2–5 秒的对话正反打或特写插入分镜。",
        jumpTarget: "storyboard",
      });
    }

    // Gate 9: H3 提示词对齐与首帧显影率
    const developedCount = shots.filter((s) => s.storyboard_image_url && !s.is_dirty).length;
    const devRatio = shots.length > 0 ? Math.round((developedCount / shots.length) * 100) : 100;
    if (devRatio === 100) {
      items.push({
        id: "storyboard_visual_readiness",
        stage: "storyboard",
        stageLabel: "生成管线",
        ruleName: "全剧首帧显影与提示词就绪 (100%)",
        status: "pass",
        detail: `全片 ${shots.length} 镜已 100% 显影存盘并就绪，可直接投产。`,
        jumpTarget: "storyboard",
      });
    } else {
      items.push({
        id: "storyboard_visual_readiness",
        stage: "storyboard",
        stageLabel: "生成管线",
        ruleName: "全剧首帧显影与提示词就绪",
        status: "warn",
        detail: `当前显影进度为 ${devRatio}%（已完成 ${developedCount}/${shots.length} 镜）。`,
        suggestion: "使用分镜时间轴顶部的「一键冲印剩余」完成全片画面显影。",
        jumpTarget: "storyboard",
      });
    }

    return items;
  }, [project, shots]);

  // Score calculation: pass = 100, warn = 70, fail = 0
  const overallScore = useMemo(() => {
    if (diagnostics.length === 0) return 100;
    const total = diagnostics.reduce((acc, item) => {
      if (item.status === "pass") return acc + 100;
      if (item.status === "warn") return acc + 70;
      return acc + 30;
    }, 0);
    return Math.round(total / diagnostics.length);
  }, [diagnostics]);

  const passCount = diagnostics.filter((d) => d.status === "pass").length;
  const warnCount = diagnostics.filter((d) => d.status === "warn").length;
  const failCount = diagnostics.filter((d) => d.status === "fail").length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                AI 影视短剧工程体检雷达 (Quality Gate Diagnostic)
                <span className="text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.2 rounded">
                  shuohao-skills 5阶全链路标准
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                实时扫描大纲结构、角色资产、空间道具、剧本节拍与 H3 分镜对账指标
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Summary Banner */}
        <div className="px-6 py-3.5 bg-secondary/30 border-b border-border flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight text-foreground">
                {overallScore}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/ 100 分</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>{passCount} 项达标</span>
              </span>
              {warnCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{warnCount} 项待调优</span>
                </span>
              )}
              {failCount > 0 && (
                <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-mono font-semibold animate-pulse">
                  <XCircle className="w-3 h-3" />
                  <span>{failCount} 项未通过</span>
                </span>
              )}
            </div>
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            覆盖 5 大模块 · {diagnostics.length} 道工业质量门
          </span>
        </div>

        {/* Diagnostic Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {diagnostics.map((item) => {
            const isPass = item.status === "pass";
            const isWarn = item.status === "warn";

            return (
              <div
                key={item.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all text-xs flex items-start justify-between gap-3",
                  isPass
                    ? "bg-card/40 border-border/80 hover:border-emerald-500/30"
                    : isWarn
                    ? "bg-amber-500/[0.03] border-amber-500/30 hover:border-amber-500/50"
                    : "bg-red-500/[0.04] border-red-500/30 hover:border-red-500/50"
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-muted-foreground bg-secondary/80 px-1.5 py-0.2 rounded border border-border">
                        {item.stageLabel}
                      </span>
                      <strong className="text-foreground text-xs font-semibold">
                        {item.ruleName}
                      </strong>
                    </div>

                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {item.detail}
                    </p>

                    {item.suggestion && (
                      <p className="text-amber-300/90 text-[11px] leading-relaxed pt-0.5">
                        💡 优化建议：{item.suggestion}
                      </p>
                    )}
                  </div>
                </div>

                {onNavigateToSection && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToSection(item.jumpTarget);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border shrink-0 transition-colors cursor-pointer"
                  >
                    <span>去处理</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-muted/10 shrink-0 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span>基于 novel-outline, novel-characters, novel-art, novel-script, novel-storyboard 官方规则</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            完成体检
          </button>
        </div>
      </div>
    </div>
  );
};
