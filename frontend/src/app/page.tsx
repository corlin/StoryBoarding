"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Sparkles,
  Film,
  ArrowRight,
  Zap,
  Layers,
  ShieldCheck,
  Compass,
  Download,
  FileCode2,
  Video,
  Table,
  PlayCircle,
  Eye,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Crosshair,
  Camera,
  Flame,
} from "lucide-react";

interface HeroShot {
  id: string;
  order: string;
  phase: string;
  size: string;
  camera: string;
  duration: string;
  script: string;
  dialogue?: string;
  sfx: string;
  lighting: string;
  lens: string;
  shutter: string;
  hudVector: string;
  imageUrl: string;
}

const HERO_SHOWCASE_SHOTS: HeroShot[] = [
  {
    id: "shot-01",
    order: "#01",
    phase: "ACT I · 空间建立",
    size: "EXTREME WIDE 大远景",
    camera: "CRANE DOWN 俯冲",
    duration: "2.5s",
    script: "2.39:1 变形宽银幕。雨夜新东京，青瓦飞檐古楼悬挂赤红发光灯笼，全息金龙与暴雨雷光撕裂雨夜。",
    dialogue: "旁白：“在矩阵最深处的古旧节点，数据洪流正悄然汇聚。”",
    sfx: "暴雨雷鸣、全息龙吟低频嗡鸣",
    lighting: "伦勃朗侧逆光 · 霓虹青红冷暖反差",
    lens: "24mm T1.8 广角畸变校正",
    shutter: "180.0° · ISO 800",
    hudVector: "[ ▲ CRANE DOWN 俯冲 2.5s ]",
    imageUrl: "/images/storyboard/shot_01_teahouse_rain.jpg",
  },
  {
    id: "shot-02",
    order: "#02",
    phase: "ACT II · 极限交锋",
    size: "CLOSE-UP 特写",
    camera: "TRACKING PUSH-IN 跟推",
    duration: "2.0s",
    script: "低角极速推轨。仿生特工右眼机械光圈收缩至 F1.2 锁定暗影，拔刀瞬间激荡起白色音爆冲击波与破空裂鸣。",
    dialogue: "特工：“目标锁定，执行彻底抹杀。”",
    sfx: "机械关节暴响、超音速破空啸叫",
    lighting: "强反差轮廓光 · 刀光冷白反射",
    lens: "85mm T1.2 浅景深眼部对焦",
    shutter: "180.0° · 24.000 FPS",
    hudVector: "[ TRACKING IN 跟推 ━━━━► ]",
    imageUrl: "/images/storyboard/shot_02_katana_strike.jpg",
  },
  {
    id: "shot-03",
    order: "#03",
    phase: "ACT III · 子弹时间高潮",
    size: "MEDIUM SHOT 中景",
    camera: "360° ARC ROTATE 环绕",
    duration: "3.5s",
    script: "0.1x 极限升格子弹时间。墨客侧身避开撕裂空气的弹道，刀锋切断超音速轨迹，飞溅水滴与电火花在空中完全静止悬停。",
    dialogue: "墨客：“天下武功，唯快不破。”",
    sfx: "水滴悬停共振谐波、超慢动作音爆",
    lighting: "频闪白光 · 悬浮水滴丁达尔光斑",
    lens: "50mm T1.4 环绕防抖矩阵",
    shutter: "90.0° · 240 FPS (0.1x 升格)",
    hudVector: "[ 360° ARC ROTATE 环绕 ↺ ]",
    imageUrl: "/images/storyboard/shot_03_bullet_time_climax.jpg",
  },
];

export default function HomePage() {
  const [activeShotIndex, setActiveShotIndex] = useState<number>(0);
  const currentActiveShot = HERO_SHOWCASE_SHOTS[activeShotIndex];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Top Sticky Navigation */}
      <header className="border-b border-border/60 backdrop-blur-md bg-background/80 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 group-hover:bg-primary/20 transition-all shadow-inner">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-foreground">
                AI Director Studio
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                PRO
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>4 大工业起步模板</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>进入工作台</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-16 pb-24 max-w-6xl mx-auto space-y-12">
        {/* Subtitle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>好莱坞影视级 6 阶段 AI 电影导演预演与故事板打样</span>
        </div>

        {/* Hero Main Heading */}
        <div className="space-y-4 max-w-4xl">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground/90 to-muted-foreground">
            一句话灵感，直通好莱坞大片分镜画卷
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            打通文字剧本与 16:9 宽银幕视觉画卷的边界。AI 导演自动规划 6 阶段戏剧节拍、机位动势与空间轴线，毫秒级双向台本重编译。
          </p>
        </div>

        {/* Dual CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
          >
            <Film className="w-4 h-4" />
            <span>立即免费开始创作</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-all shadow-xs"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>探索 4 大工业起步模板</span>
          </Link>
        </div>

        {/* Hero Interactive Studio Showcase Mockup (Hollywood Director Monitor) */}
        <div className="w-full rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl p-3 sm:p-5 shadow-2xl overflow-hidden text-left relative group">
          {/* Top Window & ARRI ALEXA LF Monitor Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-border/70 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-[11px] ml-2 text-foreground font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span>AI Director Studio · 好莱坞监视器双向工作台 (Previz 2.39:1)</span>
              </span>
            </div>

            {/* ARRI Professional Viewfinder Badges */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>REC 24.000 FPS</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                TC 00:01:24:08
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden md:inline">
                LUT: ARRI LOG-C TO KODAK 2383
              </span>
              <span className="px-2 py-0.5 rounded bg-secondary text-foreground/80 border border-border hidden sm:inline">
                AUDIO CH1 -18dB
              </span>
            </div>
          </div>

          {/* Split Pane Demo Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left: Hollywood Director Script Panel */}
            <div className="lg:col-span-4 rounded-xl border border-border/80 bg-neutral-950/90 p-3.5 space-y-3 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between text-muted-foreground pb-2 border-b border-border/50">
                <span className="text-[11px] text-sky-400 font-bold flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>分镜头脚本 (Director Script)</span>
                </span>
                <span className="text-[10px] text-emerald-400">● 实时双向编译</span>
              </div>

              {/* Interactive Script Cards */}
              <div className="space-y-2.5">
                {HERO_SHOWCASE_SHOTS.map((shot, idx) => {
                  const isSelected = activeShotIndex === idx;
                  return (
                    <div
                      key={shot.id}
                      onClick={() => setActiveShotIndex(idx)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer space-y-1.5 relative ${
                        isSelected
                          ? "bg-primary/15 border-primary shadow-sm shadow-primary/20"
                          : "bg-card/40 border-border/40 hover:bg-card/70 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-bold flex items-center gap-1.5 ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          <span>
                            {shot.order} {shot.phase}
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {shot.duration}
                        </span>
                      </div>

                      <p className="text-foreground/90 text-[11px] leading-relaxed line-clamp-2">
                        {shot.script}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1 border-t border-border/30">
                        <span className="text-sky-300 font-mono truncate max-w-[150px]">
                          {shot.camera}
                        </span>
                        <span className="text-[9px] font-mono text-amber-400/90">
                          {shot.lens}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Triple-Shot Storyboard Filmstrip Canvas */}
            <div className="lg:col-span-8 flex flex-col space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {HERO_SHOWCASE_SHOTS.map((shot, idx) => {
                  const isSelected = activeShotIndex === idx;
                  return (
                    <div
                      key={shot.id}
                      onClick={() => setActiveShotIndex(idx)}
                      className={`rounded-xl border overflow-hidden bg-neutral-950 flex flex-col justify-between transition-all duration-300 cursor-pointer group/card relative ${
                        isSelected
                          ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                          : "border-border/70 hover:border-border hover:scale-[1.01]"
                      }`}
                    >
                      {/* 16:9 Frame with Viewfinder Overlay */}
                      <div className="aspect-video bg-neutral-900 relative flex items-center justify-center overflow-hidden">
                        <img
                          src={shot.imageUrl}
                          alt={shot.phase}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                        />

                        {/* ARRI Crosshair / Viewfinder Safe Action Grid Overlay */}
                        <div className="absolute inset-2 border border-sky-400/20 pointer-events-none" />
                        <div className="absolute top-1.5 right-2 text-[8px] font-mono text-emerald-400/80 bg-black/70 px-1 rounded pointer-events-none">
                          2.39:1
                        </div>

                        {/* Motion Vector Pill */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border backdrop-blur-md ${
                              isSelected
                                ? "bg-primary/90 text-primary-foreground border-primary font-bold shadow-xs"
                                : "bg-black/80 text-sky-300 border-sky-400/30"
                            }`}
                          >
                            {shot.hudVector}
                          </span>
                        </div>
                      </div>

                      {/* Card Bottom Meta */}
                      <div
                        className={`p-2.5 border-t flex items-center justify-between text-[10px] font-mono transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary/40 text-primary font-bold"
                            : "bg-card/70 border-border/50 text-foreground"
                        }`}
                      >
                        <span className="truncate max-w-[110px]">
                          {shot.order} {shot.phase.split("·")[1]?.trim() || shot.phase}
                        </span>
                        <span className="text-muted-foreground text-[9px]">
                          {shot.duration}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Shot Deep-Director Inspector Metadata Box */}
              <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-xs">
                      {currentActiveShot.order} 导演运镜核心解析:
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {currentActiveShot.camera}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {currentActiveShot.script}
                  </p>
                </div>

                <div className="shrink-0 space-y-0.5 text-right sm:border-l sm:border-border/60 sm:pl-3">
                  <div className="text-[10px] text-sky-300">{currentActiveShot.lens}</div>
                  <div className="text-[10px] text-amber-300/90">{currentActiveShot.lighting}</div>
                  <div className="text-[9px] text-muted-foreground">{currentActiveShot.sfx}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 4 Core Hollywood Moat Capabilities */}
        <section className="pt-12 w-full space-y-8 text-left">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              4 大影视工业级核心能力
            </h2>
            <p className="text-sm text-muted-foreground">
              为严肃影视创作者、动画团队与 AI 视频导演量身定制的专业护城河
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: 6-Stage Beat Breakdown */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-lg">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 w-fit">
                  <Film className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  🎬 6 阶段戏剧节拍拆镜
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  遵循好莱坞编剧规范，从空间建立、人物出场、动作交锋到高潮定格，全自动规划精准景别、角度与时长。
                </p>
              </div>
              <div className="text-[11px] font-mono text-sky-400 font-medium">
                Beat-by-Beat Staging →
              </div>
            </div>

            {/* Card 2: Bi-directional Recompiler */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-lg">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  ⚡ 毫秒级双向台本重编译
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  在剧本端改动动作文字，后台即时重编译生图与视频 Prompt；在分镜端调整构图机位，文字台本毫秒同步。
                </p>
              </div>
              <div className="text-[11px] font-mono text-purple-400 font-medium">
                Two-Way Sync Recompiler →
              </div>
            </div>

            {/* Card 3: Hero DNA Lock & Anti-Human Isolation */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-lg">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  🧬 主角生物 DNA 强锁
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  全片强制锁定角色生物基因与场景特征，排他性隔离人类角色侵入，彻底根除跨镜头五官漂移与动物突变。
                </p>
              </div>
              <div className="text-[11px] font-mono text-emerald-400 font-medium">
                Hero Consistency Lock →
              </div>
            </div>

            {/* Card 4: Previz Clean HUD & Flow Vector */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-lg">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  📐 纯净视听动势引导
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  90% 动作安全标 ➕ 运镜动势流向胶囊（Push In / Track / Crane），画面 0 遮挡，为下游 AI 视频生成提供专业运镜标准。
                </p>
              </div>
              <div className="text-[11px] font-mono text-amber-400 font-medium">
                Action Safe & Camera Vector →
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Hollywood 5 Deliverables Matrix */}
        <section className="pt-12 w-full space-y-8 text-left border-t border-border/60">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              5 大好莱坞工业级交付物
            </h2>
            <p className="text-sm text-muted-foreground">
              无需繁琐二次整理，全套高规格资产包一键直达拍摄现场与下游 AI 视频工作流
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Deliverable 1 */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/40 hover:bg-card transition-all space-y-3">
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 w-fit">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">1. 16:9 故事板打样单 (PNG)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                4K/2K 高清晰度九宫格排版打样单，附带专业机位编码、时长和动作描述，纯客户端 Canvas 零 404 毫秒级导出。
              </p>
            </div>

            {/* Deliverable 2 */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/40 hover:bg-card transition-all space-y-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                <Video className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">2. AI 视频 Prompt 资产包 (JSON/TXT)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                为 Sora、Runway Gen-3、Kling 与 Luma 定制的多镜头连续性运镜提示词包，精准保持机位动量。
              </p>
            </div>

            {/* Deliverable 3 */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/40 hover:bg-card transition-all space-y-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                <FileCode2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">3. 导演执行级分镜头脚本 (Script)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                符合工业标准的规范格式场次剧本，清晰标注镜头序号、景别、机位角度、动作描述与光影要求。
              </p>
            </div>

            {/* Deliverable 4 */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/40 hover:bg-card transition-all space-y-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                <Table className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">4. 制作团队全量数据表 (CSV)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                包含时长、对白、音效、情绪氛围与空间轴向（Screen Direction）的结构化表格，便于统筹制片管理。
              </p>
            </div>

            {/* Deliverable 5 */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card/40 hover:bg-card transition-all space-y-3 md:col-span-2">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit">
                <PlayCircle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">5. 全片动态预演时间线 (Animatic Player)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                支持在网页端无缝按真实时长连续播放全部画面，直观评估剪辑节奏、视线交汇与戏剧高潮分布。
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Final Call to Action */}
        <section className="pt-16 pb-8 w-full">
          <div className="p-8 sm:p-12 rounded-3xl border border-primary/40 bg-gradient-to-b from-primary/15 via-card/80 to-card text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                让灵感在好莱坞分镜中即刻显影
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                无需任何繁杂配置，零门槛开启你的第一个好莱坞 AI 故事板工程
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 hover:scale-105"
              >
                <Film className="w-4 h-4" />
                <span>立即进入分镜看板</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 bg-card/30 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">AI Director Studio</span>
            <span>· 好莱坞影视级分镜与 AI 视频预演工作台</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              分镜看板
            </Link>
            <a
              href="https://github.com/corlin/StoryBoarding"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
