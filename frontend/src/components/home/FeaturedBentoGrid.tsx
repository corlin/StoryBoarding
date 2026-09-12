"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Workflow,
  Users,
  Film,
  FileText,
  Camera,
  Play,
  Download,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export function FeaturedBentoGrid() {
  return (
    <section className="w-full space-y-6 pt-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
        {/* Pillar 1: Script ⇄ Visual Bidirectional Sync Panel */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-[#141422]/90 to-[#0c0c12]/90 p-5 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:border-sky-500/50 hover:shadow-xl transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
                <Workflow className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                双向毫秒同步
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-sky-400 font-bold uppercase tracking-wider">
                01 · 协同引擎
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                分镜头脚本 ⇄ 视觉故事板
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                改动左侧剧本台词，右侧画面提示词自动同步；调整右侧镜头景别与构图，左侧制作分镜表秒级联动。
              </p>
            </div>
          </div>

          {/* Interactive Visual Cue Box: Mock Bidirectional Sync UI */}
          <div className="rounded-xl bg-black/60 border border-white/10 p-3 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-white/10 pb-1.5">
              <span>SCRIPT VIEW</span>
              <span className="text-sky-400 font-bold flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-400" />
                <span>实时联动</span>
              </span>
              <span>STORYBOARD VIEW</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 items-center">
              {/* Left: Script Block */}
              <div className="col-span-2 p-2 rounded-lg bg-[#14141d] border border-white/5 space-y-1">
                <div className="text-[9px] font-mono text-sky-300 font-bold">TC 00:00:12:00</div>
                <div className="text-[10px] text-foreground/90 font-serif leading-tight line-clamp-2">
                  “把枪放下，门后的人不是我。”
                </div>
                <div className="text-[9px] text-muted-foreground font-mono">特写 · 伦勃朗光</div>
              </div>

              {/* Middle: Flow Arrow */}
              <div className="col-span-1 flex flex-col items-center justify-center text-sky-400">
                <span className="text-xs font-bold font-mono">⇄</span>
              </div>

              {/* Right: Visual Shot Preview */}
              <div className="col-span-2 aspect-video rounded-lg overflow-hidden relative border border-sky-500/30 group-hover:border-sky-400">
                <img
                  src="/images/storyboard/shot_01_teahouse_rain.jpg"
                  alt="镜头视效"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-white/90">
                  CU · 50mm
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 2: Character & Location Bible (Face Lock) */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-[#181224]/90 to-[#0c0c12]/90 p-5 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:border-purple-500/50 hover:shadow-xl transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>不崩脸 · 不串场</span>
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                02 · 一致性基座
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                角色与场景一致性锁脸档案
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                建立项目级与全局 Character & Location Bible，跨镜头硬核锚定主角骨骼面相、服饰特征与场景空间关系。
              </p>
            </div>
          </div>

          {/* Interactive Visual Cue Box: 3-Frame Face Consistency Reel */}
          <div className="rounded-xl bg-black/60 border border-white/10 p-3 space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-white/10 pb-1.5">
              <span>CHARACTER BIBLE · 跨镜连续性</span>
              <span className="text-purple-300 font-bold">100% 锁定</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="aspect-square rounded-lg overflow-hidden relative border border-white/10 group-hover:border-purple-500/50">
                <img
                  src="https://storyboarding-api.caifu.social/api/assets/shots/6434ca0b-737e-4a72-96e6-0e64c587958e.jpg"
                  alt="镜头01"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-1 text-[8px] font-mono text-white/90">
                  镜01 · 正面特写
                </div>
              </div>

              <div className="aspect-square rounded-lg overflow-hidden relative border border-white/10 group-hover:border-purple-500/50">
                <img
                  src="/images/storyboard/shot_02_katana_strike.jpg"
                  alt="镜头06"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-1 text-[8px] font-mono text-white/90">
                  镜06 · 侧逆光
                </div>
              </div>

              <div className="aspect-square rounded-lg overflow-hidden relative border border-white/10 group-hover:border-purple-500/50">
                <img
                  src="https://storyboarding-api.caifu.social/api/assets/shots/23dd000d-4b9d-4349-b005-4305a7bd8a6d.jpg"
                  alt="镜头12"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-1 text-[8px] font-mono text-white/90">
                  镜12 · 雨夜对决
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 3: Industrial Delivery & Cinema Theater */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-[#1a1410]/90 to-[#0c0c12]/90 p-5 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:border-amber-500/50 hover:shadow-xl transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                <Film className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                即开即印 · 即播
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                03 · 工业级交付
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                专业打样单导出与全景放映厅
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                一键合成带有镜头景别参数、运镜说明和视听对白的 16:9 / 9:16 打样单（Call Sheet PNG），在全景放映厅中进行节奏预演。
              </p>
            </div>
          </div>

          {/* Interactive Visual Cue Box: Miniature Call Sheet & Theater */}
          <div className="rounded-xl bg-black/60 border border-white/10 p-3 space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-white/10 pb-1.5">
              <span>CALL SHEET SPEC · 工业级规范</span>
              <span className="text-amber-400 font-bold">16:9 & 9:16</span>
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#181410] border border-amber-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-foreground">导演故事板打样单 (PNG)</div>
                  <div className="text-[8px] font-mono text-muted-foreground">含 HUD 取景参数与时码</div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                <Play className="w-2.5 h-2.5 fill-amber-300" />
                <span>放映厅</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
