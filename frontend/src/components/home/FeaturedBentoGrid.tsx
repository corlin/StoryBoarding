"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Users,
  Film,
  ArrowRight,
  Sliders,
  CheckCircle2,
  FileText,
  Camera,
  Play,
  Download,
  Workflow,
  Sparkle,
} from "lucide-react";

export function FeaturedBentoGrid() {
  return (
    <section className="w-full space-y-6 pt-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>电影级生产力三大支柱</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          告别单张生图，进入真正的影视工业管线
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          专为导演、编剧与短剧团队打造的双向协同分镜系统，打通从文学剧本到成片画卷的全流程。
        </p>
      </div>

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: Script ⇄ Visual Bidirectional Engine (Col span 1 or 2, let's make it 1) */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-[#161622]/90 to-[#0e0e14]/90 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-primary/50 hover:shadow-xl transition-all">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-sky-400 font-bold uppercase tracking-wider">
                01 · 协同引擎
              </span>
              <h3 className="text-lg font-bold text-foreground">
                分镜头脚本 ⇄ 视觉故事板 双向协同
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                绝非单向流水线。改动左侧剧本台词，右侧画面提示词毫秒级同步；调整右侧景别与构图，左侧制作分镜表自动联动，保持单一真实源（Shot Model）。
              </p>
            </div>
          </div>

          {/* Interactive Visual Cue Box */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5 text-sky-300">
                <FileText className="w-3.5 h-3.5" /> 剧本台词层
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">
                双向实时
              </span>
            </div>
            <p className="text-[11px] text-foreground/80 italic line-clamp-1">
              “仿生特工右眼机械光圈收缩至 F1.2，拔出高频武士刀...”
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
              <span className="px-1.5 py-0.5 rounded bg-secondary">特写 (CU)</span>
              <span className="px-1.5 py-0.5 rounded bg-secondary">仰拍 (Low Angle)</span>
              <span className="px-1.5 py-0.5 rounded bg-secondary">0.1x 慢动作</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Character & Location Bibles */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-[#181524]/90 to-[#0e0e14]/90 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-purple-500/50 hover:shadow-xl transition-all">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                02 · 一致性基座
              </span>
              <h3 className="text-lg font-bold text-foreground">
                角色与场景一致性锁脸档案库
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                彻底终结 AI 影视“每张换张脸、背景乱串场”的痛点。建立项目级与全局 Character Bible，跨镜头硬核锚定面部特征、服饰风格与光影空间。
              </p>
            </div>
          </div>

          {/* Interactive Visual Cue Box */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5 text-purple-300">
                <Users className="w-3.5 h-3.5" /> 角色身份锚定
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                跨镜头锁脸
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-1.5 rounded-lg bg-secondary/70 border border-white/5">
                <div className="text-[10px] text-muted-foreground">正面主光</div>
                <div className="text-[10px] font-bold text-purple-300 mt-0.5">特写 100%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-secondary/70 border border-white/5">
                <div className="text-[10px] text-muted-foreground">侧逆光剪影</div>
                <div className="text-[10px] font-bold text-purple-300 mt-0.5">中景一致</div>
              </div>
              <div className="p-1.5 rounded-lg bg-secondary/70 border border-white/5">
                <div className="text-[10px] text-muted-foreground">战斗破损</div>
                <div className="text-[10px] font-bold text-purple-300 mt-0.5">状态传承</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 3: Industrial Production Delivery */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-[#1c1815]/90 to-[#0e0e14]/90 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-amber-500/50 hover:shadow-xl transition-all">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                03 · 工业级交付
              </span>
              <h3 className="text-lg font-bold text-foreground">
                专业打样单导出与影院级放映厅
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                随时向摄制组与制片人汇报。一键合成带有镜头景别参数、运镜说明和对白的 16:9 / 9:16 打样单（Call Sheet PNG），并在全屏放映厅中进行节奏预演。
              </p>
            </div>
          </div>

          {/* Interactive Visual Cue Box */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Download className="w-3.5 h-3.5" /> 交付物规范
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                即开即印
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-foreground/90 pt-1">
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>全景节奏放映厅</span>
              </span>
              <span className="text-[10px] text-amber-300">支持 16:9 / 9:16</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
