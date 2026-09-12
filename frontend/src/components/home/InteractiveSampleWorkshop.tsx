"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Play,
  Film,
  Smartphone,
  Monitor,
  ChevronRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SamplePreset {
  id: string;
  title: string;
  tag: string;
  author: string;
  desc: string;
  aspectRatio: "16:9" | "9:16";
  duration: number;
  shotCount: number;
  coverImage: string;
  presetStory: string;
  sampleProjectId: string;
  gradient: string;
  borderHover: string;
}

export const SAMPLE_WORKSHOPS: SamplePreset[] = [
  {
    id: "short-drama-romance",
    title: "都市商战短剧 · 《合约恋人》",
    tag: "9:16 爆款短剧",
    author: "官方精品样板",
    desc: "3集 18 镜连贯剧情！女学霸放弃学业救母，神秘资助人室友拿出暗藏条款的偏执合约，反转不断。",
    aspectRatio: "9:16",
    duration: 180,
    shotCount: 18,
    coverImage: "https://storyboarding-api.caifu.social/api/assets/shots/6434ca0b-737e-4a72-96e6-0e64c587958e.jpg",
    presetStory:
      "苏晓为治疗母亲病情放弃学业时，室友宋知远亮出资助人身份并拿出当年暗藏条款的合约。两人从对抗到发现彼此伤痕——宋知远妹妹曾因放弃梦想自杀，而苏晓母亲实则希望女儿继续学业。当医院催款单与录取通知书同时送达，宋知远变卖收藏替她缴费，苏晓终于看懂这份偏执守护。最终她带着两人的期待重返校园。",
    sampleProjectId: "6f01c422-48ea-4796-afc7-09cc6447f764",
    gradient: "from-rose-950/40 via-[#131018] to-[#0d0d12]",
    borderHover: "hover:border-rose-500/50",
  },
  {
    id: "historical-intrigue",
    title: "古装权谋短剧 · 《本草劫》",
    tag: "9:16 悬疑权谋",
    author: "官方精品样板",
    desc: "18 镜完整视听！被献祭药女深山救下盲将军，以百草为引识破投毒大阴谋，将计就计绝地反击。",
    aspectRatio: "9:16",
    duration: 180,
    shotCount: 18,
    coverImage: "https://storyboarding-api.caifu.social/api/assets/shots/23dd000d-4b9d-4349-b005-4305a7bd8a6d.jpg",
    presetStory:
      "为治疗怪病被献祭的阿蘅逃进深山，发现所谓瘟疫竟是权贵投毒。她救下追捕她的盲将军裴回，用百草汁液缓解他的蚀目之痛。当发现刺史要焚烧所有患病女子时，裴回教她兵法布阵，她教他听药辨症。最终阿蘅将计就计喝下毒酒，借脉搏变化传递刺史府地图；裴回则带兵杀入火场，用她调制的药烟让敌军自相残杀。",
    sampleProjectId: "2792deae-5f60-4246-850a-56b93eaf790a",
    gradient: "from-amber-950/40 via-[#141512] to-[#0d0d12]",
    borderHover: "hover:border-amber-500/50",
  },
  {
    id: "cyber-action",
    title: "赛博科幻动作 · 《雨夜矩阵对决》",
    tag: "16:9 动作科幻",
    author: "AI Director 官方",
    desc: "2.39:1 变形宽银幕、霓虹暴雨、机械瞳孔对焦与 0.1x 极限子弹时间雨丝停滞对决。",
    aspectRatio: "16:9",
    duration: 30,
    shotCount: 12,
    coverImage: "/images/storyboard/shot_02_katana_strike.jpg",
    presetStory:
      "暴雨夜新东京，青瓦飞檐古楼悬挂赤红发光灯笼。仿生特工右眼机械光圈收缩至 F1.2 锁定暗影，拔出高频武士刀斩出白色音爆激波。0.1x 极限子弹时间，侧身仰避超音速弹道，万千悬浮水滴与高压电火花在空中完全静止悬停。",
    sampleProjectId: "6f01c422-48ea-4796-afc7-09cc6447f764",
    gradient: "from-purple-950/40 via-[#15101a] to-[#0d0d12]",
    borderHover: "hover:border-purple-500/50",
  },
  {
    id: "suspense-fincher",
    title: "芬奇悬疑暗房 · 《密室拼图》",
    tag: "16:9 悬疑推理",
    author: "AI Director 官方",
    desc: "胶片暗房、暖色台灯、高反差伦勃朗光与极具心理压迫感正反打特写，红线证据墙。",
    aspectRatio: "16:9",
    duration: 30,
    shotCount: 12,
    coverImage: "/images/storyboard/shot_01_teahouse_rain.jpg",
    presetStory:
      "雨夜老旧暗房内，红光微弱暗淡。老刑警手指夹着燃尽的香烟，凝视墙上密密麻麻的照片连线。突然台灯无故闪烁，门轴发出刺耳吱呀声，地上投射出拉长的风衣黑影。",
    sampleProjectId: "2792deae-5f60-4246-850a-56b93eaf790a",
    gradient: "from-sky-950/40 via-[#10131a] to-[#0d0d12]",
    borderHover: "hover:border-sky-500/50",
  },
];

interface InteractiveSampleWorkshopProps {
  onApplyPrompt: (preset: SamplePreset) => void;
  onExploreSample: (preset: SamplePreset) => void;
}

export function InteractiveSampleWorkshop({
  onApplyPrompt,
  onExploreSample,
}: InteractiveSampleWorkshopProps) {
  return (
    <section className="w-full space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-amber-400" />
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            经典短剧与电影题材工坊 (Sample Storyboard Workshop)
          </h2>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors font-medium"
        >
          <span>进入工程看板</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SAMPLE_WORKSHOPS.map((sample) => {
          const isVertical = sample.aspectRatio === "9:16";

          return (
            <div
              key={sample.id}
              className={cn(
                "rounded-2xl border border-border/80 bg-gradient-to-b transition-all duration-300 flex flex-col justify-between overflow-hidden hover:shadow-2xl hover:-translate-y-1 group relative",
                sample.gradient,
                sample.borderHover
              )}
            >
              {/* Poster Frame Area */}
              <div className="w-full aspect-video bg-neutral-950 relative overflow-hidden border-b border-border/60 shrink-0 flex items-center justify-center">
                {/* Background ambient blur */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-md opacity-30 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${sample.coverImage})` }}
                />

                {/* Main Poster Image */}
                <img
                  src={sample.coverImage}
                  alt={sample.title}
                  className={cn(
                    "relative z-10 transition-transform duration-500 group-hover:scale-105 object-cover",
                    isVertical
                      ? "h-full w-auto max-w-[56%] aspect-[9/16] rounded-xs shadow-2xl border-x border-white/10"
                      : "w-full h-full object-cover"
                  )}
                />

                {/* Gradient Overlays */}
                <div className="absolute inset-0 z-15 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

                {/* Viewfinder Crop Marks */}
                <div className="absolute top-2 left-2 text-white/50 text-[9px] font-mono pointer-events-none z-20 select-none">⌜</div>
                <div className="absolute top-2 right-2 text-white/50 text-[9px] font-mono pointer-events-none z-20 select-none">⌝</div>
                <div className="absolute bottom-2 left-2 text-white/50 text-[9px] font-mono pointer-events-none z-20 select-none">⌞</div>
                <div className="absolute bottom-2 right-2 text-white/50 text-[9px] font-mono pointer-events-none z-20 select-none">⌟</div>

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border backdrop-blur-md flex items-center gap-1 shadow-sm",
                      isVertical
                        ? "bg-rose-950/80 text-rose-300 border-rose-500/30"
                        : "bg-sky-950/80 text-sky-300 border-sky-500/30"
                    )}
                  >
                    {isVertical ? (
                      <Smartphone className="w-2.5 h-2.5 text-rose-400" />
                    ) : (
                      <Monitor className="w-2.5 h-2.5 text-sky-400" />
                    )}
                    <span>{sample.tag}</span>
                  </span>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                    {sample.shotCount} 镜 · {sample.duration}s
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {sample.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {sample.desc}
                  </p>
                </div>

                {/* Bottom Actions Ribbon */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => onApplyPrompt(sample)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[11px] border border-border transition-colors cursor-pointer"
                    title="将此经典故事填入上方输入框"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>套用灵感</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onExploreSample(sample)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                    title="免注册零消耗直接漫游体验现成 18 镜工作台"
                  >
                    <Play className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>0秒漫游</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
