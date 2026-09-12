"use client";

import React from "react";
import Link from "next/link";
import { Film, Clapperboard, Sparkles, Play, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilmstripFrame {
  id: string;
  shotNumber: string;
  size: string;
  angle: string;
  movement: string;
  imageUrl: string;
  dialogue?: string;
  aspectRatio: "16:9" | "9:16";
}

const FRAMES: FilmstripFrame[] = [
  {
    id: "f1",
    shotNumber: "SHOT 01",
    size: "特写 CU",
    angle: "微仰拍",
    movement: "慢推镜头 Push-in",
    imageUrl: "https://storyboarding-api.caifu.social/api/assets/shots/6434ca0b-737e-4a72-96e6-0e64c587958e.jpg",
    dialogue: "“这份合约你签了，你母亲的手术费我全包。”",
    aspectRatio: "9:16",
  },
  {
    id: "f2",
    shotNumber: "SHOT 02",
    size: "中景 MS",
    angle: "平视",
    movement: "环绕运镜 Orbit",
    imageUrl: "/images/storyboard/shot_02_katana_strike.jpg",
    dialogue: "音爆气浪撕裂雨幕，高频武士刀出鞘破空！",
    aspectRatio: "16:9",
  },
  {
    id: "f3",
    shotNumber: "SHOT 03",
    size: "大远景 EWS",
    angle: "鸟瞰俯拍",
    movement: "高空俯冲 Crane Down",
    imageUrl: "/images/storyboard/shot_01_teahouse_rain.jpg",
    dialogue: "雨夜暗房内，红光微弱暗淡，门轴突然发出刺耳吱呀声...",
    aspectRatio: "16:9",
  },
  {
    id: "f4",
    shotNumber: "SHOT 04",
    size: "大特写 ECU",
    angle: "正打特写",
    movement: "0.1x 子弹时间",
    imageUrl: "https://storyboarding-api.caifu.social/api/assets/shots/23dd000d-4b9d-4349-b005-4305a7bd8a6d.jpg",
    dialogue: "“以脉搏变化传递刺史府布防图，这是唯一的生路。”",
    aspectRatio: "9:16",
  },
  {
    id: "f5",
    shotNumber: "SHOT 05",
    size: "全景 WS",
    angle: "低角度",
    movement: "横摇 Pan Right",
    imageUrl: "/images/storyboard/shot_03_bullet_time_climax.jpg",
    dialogue: "曲率引擎爆发奇点脉冲，星舰切入多维裂缝！",
    aspectRatio: "16:9",
  },
];

export function CinematicFilmstripHero() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 relative select-none">
      {/* Film Reel Frame Container */}
      <div className="rounded-2xl border border-border/80 bg-[#0e0e13]/90 backdrop-blur-xl p-3 shadow-2xl relative overflow-hidden group">
        {/* Top & Bottom Film Sprocket Holes (Cinema HUD Aesthetic) */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5 opacity-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="text-[10px] font-mono text-muted-foreground ml-1">KODAK 5219 VISION3 · DUAL SHOT MODEL</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-amber-400/80">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>实时视听连贯性预演</span>
          </div>
        </div>

        {/* Frames Flow Carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-3 px-1">
          {FRAMES.map((frame, index) => (
            <div
              key={frame.id}
              className={cn(
                "rounded-xl border border-border/70 bg-black/60 relative shrink-0 overflow-hidden flex flex-col justify-between group/frame transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 shadow-md",
                frame.aspectRatio === "9:16" ? "w-44 sm:w-52 h-44 sm:h-52" : "w-64 sm:w-72 h-44 sm:h-52"
              )}
            >
              {/* Background Image */}
              <div className="absolute inset-0 bg-neutral-950 overflow-hidden">
                <img
                  src={frame.imageUrl}
                  alt={frame.shotNumber}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/frame:scale-110 opacity-80 group-hover/frame:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50" />
              </div>

              {/* Top Viewfinder HUD */}
              <div className="relative z-10 p-2.5 flex items-center justify-between text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-black/75 text-white font-bold border border-white/10">
                  {frame.shotNumber}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30">
                  {frame.size}
                </span>
              </div>

              {/* Viewfinder Corner Marks */}
              <div className="absolute top-1.5 left-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none">⌜</div>
              <div className="absolute top-1.5 right-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none">⌝</div>
              <div className="absolute bottom-1.5 left-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none">⌞</div>
              <div className="absolute bottom-1.5 right-1.5 text-white/40 text-[8px] font-mono pointer-events-none select-none">⌟</div>

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
            </div>
          ))}
        </div>

        {/* Bottom Film Perfs */}
        <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5 opacity-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
            <span className="w-2 h-1.5 rounded-xs bg-white/20" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            2.39:1 CINEMA & 9:16 VERTICAL DRAMA ENGINE
          </span>
        </div>
      </div>
    </div>
  );
}
