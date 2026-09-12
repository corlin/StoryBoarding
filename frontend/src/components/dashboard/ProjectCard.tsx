"use client";

import React from "react";
import Link from "next/link";
import {
  Clapperboard,
  Film,
  Download,
  Trash2,
  Play,
  ArrowRight,
  Smartphone,
  Monitor,
  Users,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { ProjectListItem, normalizeAssetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectListItem;
  onQuickExport: (e: React.MouseEvent, proj: ProjectListItem) => void;
  onQuickPlay: (e: React.MouseEvent, proj: ProjectListItem) => void;
  onDelete: (e: React.MouseEvent, proj: ProjectListItem) => void;
  isExporting?: boolean;
}

export function ProjectCard({
  project,
  onQuickExport,
  onQuickPlay,
  onDelete,
  isExporting = false,
}: ProjectCardProps) {
  const isVertical = project.aspect_ratio === "9:16";
  const coverImg = normalizeAssetUrl(project.cover_image_url);
  const characterCount = project.characters?.length ?? 0;
  const shotCount = project.shot_count ?? (project.sequences?.flatMap((s) => s.shots || []).length ?? 0);

  return (
    <Link
      href={`/workspace?id=${project.id}`}
      className="group rounded-2xl border border-border/80 bg-[#101015]/90 hover:bg-[#14141c] hover:border-primary/50 transition-all duration-300 flex flex-col overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1 relative"
    >
      {/* Filmstrip Poster Area */}
      <div className="w-full aspect-video bg-neutral-950 relative overflow-hidden border-b border-border/60 shrink-0 flex items-center justify-center">
        {coverImg ? (
          <>
            {/* Blurred background for aesthetic framing (especially for 9:16 in 16:9 card) */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-md opacity-30 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${coverImg})` }}
            />

            {/* Main Poster Image */}
            <img
              src={coverImg}
              alt={project.title}
              className={cn(
                "relative z-10 transition-transform duration-500 group-hover:scale-105 object-cover",
                isVertical
                  ? "h-full w-auto max-w-[56%] aspect-[9/16] rounded-sm shadow-2xl border-x border-white/10"
                  : "w-full h-full object-cover"
              )}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 z-15 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />
          </>
        ) : (
          /* Modern Darkroom Concept Frame */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#14141b] to-[#0c0c10]">
            <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20 mb-2">
              <Clapperboard className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-foreground/90">
              故事板分镜工程
            </span>
            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {isVertical ? "9:16 竖屏微短剧" : "16:9 电影宽银幕"}
            </span>
          </div>
        )}

        {/* Viewfinder Crop Marks (Cinematic HUD) */}
        <div className="absolute top-2 left-2 text-white/50 text-[10px] font-mono pointer-events-none z-20 select-none">
          ⌜
        </div>
        <div className="absolute top-2 right-2 text-white/50 text-[10px] font-mono pointer-events-none z-20 select-none">
          ⌝
        </div>
        <div className="absolute bottom-2 left-2 text-white/50 text-[10px] font-mono pointer-events-none z-20 select-none">
          ⌞
        </div>
        <div className="absolute bottom-2 right-2 text-white/50 text-[10px] font-mono pointer-events-none z-20 select-none">
          ⌟
        </div>

        {/* Top Badges on Poster */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
          {/* Aspect Ratio Badge */}
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
            <span>{isVertical ? "9:16 短剧" : "16:9 电影"}</span>
          </span>

          {/* Target Duration & Shot count */}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              {project.target_duration}s
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/80 text-foreground border border-white/20 backdrop-blur-md">
              {shotCount} 镜
            </span>
          </div>
        </div>

        {/* Quick Hover Enter Overlay */}
        <div className="absolute inset-0 z-25 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center pointer-events-none">
          <span className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold border border-primary/40 shadow-xl flex items-center gap-1.5 scale-95 group-hover:scale-100 transition-transform">
            <span>进入工作台</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Card Body Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {project.title}
            </h3>
            {shotCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                可打样
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
            {project.story || "未填写剧本设定，点击进入工作台进行剧本编辑与 AI 拆镜。"}
          </p>
        </div>

        {/* Health & Asset Indicators */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/90 font-mono">
          {characterCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 text-foreground/80 border border-border/70">
              <Users className="w-3 h-3 text-amber-400" />
              <span>{characterCount} 人设建档</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/50 text-muted-foreground border border-border/50">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span>人设待建</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 text-foreground/80 border border-border/70">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>TC 00:{project.target_duration.toString().padStart(2, "0")}:00</span>
          </span>
        </div>

        {/* Footer Quick Action Dock */}
        <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">
            {project.updated_at ? project.updated_at.split("T")[0] : "刚刚"}
          </span>

          {/* Quick Actions (Always visible on mobile, hover reveal on desktop) */}
          <div className="flex items-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Quick Play in Theater */}
            <button
              type="button"
              onClick={(e) => onQuickPlay(e, project)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
              title="放映厅就地全屏快播"
            >
              <Play className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span className="hidden xs:inline">放映</span>
            </button>

            {/* Quick Export Sheet PNG */}
            <button
              type="button"
              onClick={(e) => onQuickExport(e, project)}
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors disabled:opacity-50 cursor-pointer"
              title="快速导出 16:9 / 9:16 故事板打样单"
            >
              <Download className="w-3 h-3 text-sky-400" />
              <span className="hidden xs:inline">{isExporting ? "导出中" : "打样单"}</span>
            </button>

            {/* Delete Project */}
            <button
              type="button"
              onClick={(e) => onDelete(e, project)}
              className="p-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="删除工程"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
