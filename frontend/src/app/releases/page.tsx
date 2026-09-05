"use client";

import React from "react";
import Link from "next/link";
import {
  Clapperboard,
  Sparkles,
  ArrowLeft,
  Calendar,
  Tag,
  CheckCircle2,
  Wrench,
  Zap,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { RELEASE_NOTES } from "@/data/releaseNotes";

export default function ReleasesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-foreground selection:bg-primary/30 relative overflow-x-hidden flex flex-col">
      {/* Background Lighting & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(99,102,241,0.12),rgba(0,0,0,0)_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e1e28_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-border/40 backdrop-blur-md bg-[#0a0a0c]/80 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-1.5 -ml-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
              title="返回看板"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回看板</span>
            </Link>

            <div className="h-4 w-[1px] bg-border/60" />

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-all shadow-inner">
                <Clapperboard className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground">
                AI Director Studio
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
            >
              <span>立即去创作</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 relative z-10">
        {/* Hero Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>产品演进与版本档案</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            版本更新日志
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            在这里查阅 AI Director Studio 的最新进展与功能演进。我们始终致力于提供通俗易懂的创作体验，让好莱坞级专业导演视听语言触手可及。
          </p>
        </div>

        {/* Timeline Stream */}
        <div className="relative border-l-2 border-border/60 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-12 pb-12">
          {RELEASE_NOTES.map((release, idx) => (
            <div key={release.version} className="relative group">
              {/* Timeline Indicator Dot */}
              <div
                className={`absolute -left-[31px] sm:-left-[47px] top-1.5 w-4 h-4 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 ${
                  release.isLatest
                    ? "bg-primary border-background ring-4 ring-primary/30"
                    : "bg-muted-foreground/30 border-background"
                }`}
              />

              {/* Version Card */}
              <div
                className={`rounded-2xl border p-6 sm:p-8 backdrop-blur-md transition-all ${
                  release.isLatest
                    ? "bg-card/70 border-primary/40 shadow-xl shadow-primary/5 ring-1 ring-primary/20"
                    : "bg-card/40 border-border/60 hover:border-border hover:bg-card/60"
                }`}
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/50">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-black text-lg sm:text-xl text-foreground">
                      {release.version}
                    </span>
                    {release.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-xs animate-pulse">
                        {release.badge}
                      </span>
                    )}
                    <span className="text-base sm:text-lg font-bold text-foreground/90">
                      {release.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <time dateTime={release.date}>{release.date}</time>
                  </div>
                </div>

                {/* Summary Intro */}
                <p className="mt-4 text-sm text-foreground/80 leading-relaxed">
                  {release.summary}
                </p>

                {/* Change Groups */}
                <div className="mt-6 space-y-5">
                  {release.changeGroups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-3">
                      <h4 className="text-xs font-bold tracking-wide text-foreground/90 flex items-center gap-1.5">
                        {group.label}
                      </h4>

                      <div className="grid grid-cols-1 gap-2.5 pl-1">
                        {group.items.map((item, iIdx) => (
                          <div
                            key={iIdx}
                            className="p-3 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <div className="space-y-1">
                                <span className="font-semibold text-xs sm:text-sm text-foreground block">
                                  {item.title}
                                </span>
                                <p className="text-xs text-muted-foreground leading-normal">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Call to Action */}
        <div className="mt-8 text-center p-8 rounded-2xl border border-border/50 bg-secondary/20 backdrop-blur-sm space-y-4">
          <h3 className="text-base font-bold text-foreground">
            发现新灵感？立即体验最新功能
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            好莱坞经典电影、爆款短剧与商业广告模式现已全面就绪，开启您的专业分镜预演之旅。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              <Clapperboard className="w-4 h-4" />
              <span>进入导演工作台</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/20 text-center text-xs text-muted-foreground relative z-10 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">AI Director Studio</span>
            <span>· 好莱坞影视级分镜与 AI 视频预演工作台</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              首页
            </Link>
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
