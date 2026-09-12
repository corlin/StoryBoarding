"use client";

import React from "react";
import Link from "next/link";
import { Film, Clapperboard, Sparkles, Play, ArrowRight, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilmstripFrame {
  id: string;
  shotNumber: string;
  projectTitle: string;
  size: string;
  angle: string;
  movement: string;
  imageUrl: string;
  dialogue?: string;
  aspectRatio: "16:9" | "9:16";
  projectId: string;
  fullStory: string;
}

const FRAMES: FilmstripFrame[] = [
  {
    id: "f1",
    shotNumber: "SHOT 01",
    projectTitle: "《合约恋人》",
    size: "特写 CU",
    angle: "微仰拍",
    movement: "慢推镜头 Push-in",
    imageUrl: "https://storyboarding-api.caifu.social/api/assets/shots/6434ca0b-737e-4a72-96e6-0e64c587958e.jpg",
    dialogue: "“这份合约你签了，你母亲的手术费我全包。”",
    aspectRatio: "9:16",
    projectId: "6f01c422-48ea-4796-afc7-09cc6447f764",
    fullStory: "苏晓为治疗母亲病情放弃学业时，室友宋知远亮出资助人身份并拿出当年暗藏条款的合约。两人从对抗到发现彼此伤痕——宋知远妹妹曾因放弃梦想自杀，而苏晓母亲实则希望女儿继续学业。当医院催款单与录取通知书同时送达，宋知远变卖收藏替她缴费，苏晓终于看懂这份偏执守护。最终她带着两人的期待重返校园。",
  },
  {
    id: "f2",
    shotNumber: "SHOT 02",
    projectTitle: "《雨夜矩阵》",
    size: "中景 MS",
    angle: "平视",
    movement: "环绕运镜 Orbit",
    imageUrl: "/images/storyboard/shot_02_katana_strike.jpg",
    dialogue: "音爆气浪撕裂雨幕，高频武士刀出鞘破空！",
    aspectRatio: "16:9",
    projectId: "6f01c422-48ea-4796-afc7-09cc6447f764",
    fullStory: "暴雨夜新东京，青瓦飞檐古楼悬挂赤红发光灯笼。仿生特工右眼机械光圈收缩至 F1.2 锁定暗影，拔出高频武士刀斩出白色音爆激波。0.1x 极限子弹时间，侧身仰避超音速弹道，万千悬浮水滴与高压电火花在空中完全静止悬停。",
  },
  {
    id: "f3",
    shotNumber: "SHOT 03",
    projectTitle: "《密室暗房》",
    size: "大远景 EWS",
    angle: "鸟瞰俯拍",
    movement: "高空俯冲 Crane Down",
    imageUrl: "/images/storyboard/shot_01_teahouse_rain.jpg",
    dialogue: "雨夜老旧暗房内，红光微弱暗淡，门轴突然发出刺耳吱呀声...",
    aspectRatio: "16:9",
    projectId: "2792deae-5f60-4246-850a-56b93eaf790a",
    fullStory: "雨夜老旧暗房内，红光微弱暗淡。老刑警手指夹着燃尽的香烟，凝视墙上密密麻麻的照片连线。突然台灯无故闪烁，门轴发出刺耳吱呀声，地上投射出拉长的风衣黑影。",
  },
  {
    id: "f4",
    shotNumber: "SHOT 04",
    projectTitle: "《本草劫》",
    size: "大特写 ECU",
    angle: "正打特写",
    movement: "0.1x 子弹时间",
    imageUrl: "https://storyboarding-api.caifu.social/api/assets/shots/23dd000d-4b9d-4349-b005-4305a7bd8a6d.jpg",
    dialogue: "“以脉搏变化传递刺史府布防图，这是唯一的生路。”",
    aspectRatio: "9:16",
    projectId: "2792deae-5f60-4246-850a-56b93eaf790a",
    fullStory: "为治疗怪病被献祭的阿蘅逃进深山，发现所谓瘟疫竟是权贵投毒。她救下追捕她的盲将军裴回，用百草汁液缓解他的蚀目之痛。当发现刺史要焚烧所有患病女子时，裴回教她兵法布阵，她教他听药辨症。最终阿蘅将计就计喝下毒酒，借脉搏变化传递刺史府地图；裴回则带兵杀入火场，用她调制的药烟让敌军自相残杀。",
  },
  {
    id: "f5",
    shotNumber: "SHOT 05",
    projectTitle: "《星际跃迁》",
    size: "全景 WS",
    angle: "低角度",
    movement: "横摇 Pan Right",
    imageUrl: "/images/storyboard/shot_03_bullet_time_climax.jpg",
    dialogue: "曲率引擎爆发奇点脉冲，星舰切入多维裂缝！",
    aspectRatio: "16:9",
    projectId: "6f01c422-48ea-4796-afc7-09cc6447f764",
    fullStory: "探索舰穿越多维虫洞，舷窗外金黄色黑洞吸积盘撕裂时空。宇航员面罩上倒映着坍缩光晕，曲率引擎爆发刺目蓝白奇点脉冲，星舰瞬间切入多维裂缝完成时空跃迁。",
  },
];

interface CinematicFilmstripHeroProps {
  onRoamSample: (projectId: string, title: string) => void;
  onApplyStory: (story: string) => void;
}

export function CinematicFilmstripHero({
  onRoamSample,
  onApplyStory,
}: CinematicFilmstripHeroProps) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-2 relative select-none">
      {/* Film Reel Frame Container */}
      <div className="rounded-2xl border border-white/15 bg-[#151922]/95 backdrop-blur-xl p-3 shadow-[0_24px_80px_rgba(0,0,0,0.34)] relative overflow-hidden group">
        {/* Top Film Sprocket Holes */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10 opacity-80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="text-[10px] font-mono text-muted-foreground ml-1">
              KODAK VISION3 500T · 16:9 & 9:16 DUAL SHOT STREAM
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-400">
            <Sparkles className="w-3 h-3" />
            <span>鼠标悬停任意镜头 · 0秒漫游实装工程</span>
          </div>
        </div>

        {/* Frames Flow Horizontal Carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-3 px-1">
          {FRAMES.map((frame) => (
            <div
              key={frame.id}
              className={cn(
                "rounded-xl border border-white/15 bg-black/50 relative shrink-0 overflow-hidden flex flex-col justify-between group/frame transition-all duration-300 hover:scale-[1.02] hover:border-sky-400/60 shadow-lg",
                frame.aspectRatio === "9:16" ? "w-44 sm:w-52 h-48 sm:h-56" : "w-64 sm:w-72 h-48 sm:h-56"
              )}
            >
              {/* Background Poster Image */}
              <div className="absolute inset-0 bg-neutral-950 overflow-hidden">
                <img
                  src={frame.imageUrl}
                  alt={frame.shotNumber}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/frame:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/15" />
              </div>

              {/* Viewfinder Corner Marks */}
              <div className="absolute top-1.5 left-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none z-10">⌜</div>
              <div className="absolute top-1.5 right-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none z-10">⌝</div>
              <div className="absolute bottom-1.5 left-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none z-10">⌞</div>
              <div className="absolute bottom-1.5 right-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none z-10">⌟</div>

              {/* Top Viewfinder HUD */}
              <div className="relative z-10 p-2.5 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-black/80 text-white font-bold border border-white/10">
                    {frame.shotNumber}
                  </span>
                  <span className="text-white/65 text-[10px]">
                    {frame.projectTitle}
                  </span>
                </div>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded font-mono font-semibold border",
                    frame.aspectRatio === "9:16"
                      ? "bg-rose-950/80 text-rose-300 border-rose-500/30"
                      : "bg-sky-950/80 text-sky-300 border-sky-500/30"
                  )}
                >
                  {frame.size}
                </span>
              </div>

              {/* Bottom Shot Parameters & Dialogue */}
              <div className="relative z-10 p-2.5 space-y-1 bg-gradient-to-t from-black/95 to-transparent">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300/90">
                  <span>{frame.movement}</span>
                  <span>·</span>
                  <span>{frame.angle}</span>
                </div>
                {frame.dialogue && (
                  <p className="text-[11px] text-foreground/90 line-clamp-1 italic font-serif leading-tight">
                    {frame.dialogue}
                  </p>
                )}
              </div>

              {/* Hover Quick Action Overlay (悬浮超级入口) */}
              <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-[2px] opacity-0 group-hover/frame:opacity-100 transition-all duration-200 flex flex-col items-center justify-between p-3">
                {/* Top Quick Apply Button */}
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyStory(frame.fullStory);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-foreground text-[10px] font-medium border border-white/10 transition-colors cursor-pointer"
                    title="将此镜头的剧情填入上方输入框"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>套用故事</span>
                  </button>
                </div>

                {/* Center Big Roam Button */}
                <button
                  type="button"
                  onClick={() => onRoamSample(frame.projectId, frame.projectTitle)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black text-black" />
                  <span>0秒漫游此工程</span>
                </button>

                <span className="text-[9px] font-mono text-muted-foreground">
                  免注册 · 零Token消耗
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Film Perfs */}
        <div className="flex items-center justify-between px-2 pt-2 border-t border-white/10 opacity-70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            2.39:1 WIDESCREEN & 9:16 VERTICAL SHORT-DRAMA ENGINE
          </span>
        </div>
      </div>
    </div>
  );
}
