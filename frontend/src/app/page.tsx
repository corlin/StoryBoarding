"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  Sparkles,
  Film,
  ArrowRight,
  ArrowUp,
  Clock,
  Palette,
  FileText,
  Flame,
  Zap,
  Check,
  X,
  User,
  Sliders,
  ChevronRight,
  Loader2,
  BookOpen,
  Key,
  CheckCircle2,
  Workflow,
  Play,
  Smartphone,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ProjectListItem } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import { DirectorPipelineProgress } from "@/components/modals/DirectorPipelineProgress";
import { SeriesBlueprintModal } from "@/components/modals/SeriesBlueprintModal";
import { CinematicFilmstripHero } from "@/components/home/CinematicFilmstripHero";
import { FeaturedBentoGrid } from "@/components/home/FeaturedBentoGrid";
import {
  InteractiveSampleWorkshop,
  SamplePreset,
} from "@/components/home/InteractiveSampleWorkshop";
import { DramaticBeatPreviewModal } from "@/components/modals/DramaticBeatPreviewModal";

export default function HomePage() {
  const router = useRouter();
  const {
    isAuthenticated,
    user,
    openAuthModal,
    login,
    openSettingsModal,
  } = useAuthStore();

  const [promptText, setPromptText] = useState("");
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [selectedStyle, setSelectedStyle] = useState<string>("电影级写实");
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);

  // Recent active project for returning users
  const [recentProject, setRecentProject] = useState<ProjectListItem | null>(null);

  // Creation loading progress states
  const [isCreating, setIsCreating] = useState(false);
  const [creationElapsed, setCreationElapsed] = useState(0);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationStage, setCreationStage] = useState(0);
  const [creationComplete, setCreationComplete] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
  const hasCustomKey = !isDemoUser && Boolean(
    user?.custom_settings?.has_llm_key ||
    user?.custom_settings?.llmApiKey ||
    user?.custom_settings?.llm_api_key
  );

  // Load recent project for authenticated users
  useEffect(() => {
    if (isAuthenticated && !isDemoUser) {
      api.getProjects()
        .then((data) => {
          if (data && data.length > 0) {
            setRecentProject(data[0]);
          }
        })
        .catch(() => {});
    } else {
      setRecentProject(null);
    }
  }, [isAuthenticated, isDemoUser]);

  // Check and resume stashed creation upon login
  useEffect(() => {
    if (isAuthenticated) {
      const stashed = sessionStorage.getItem("stashed_story_creation");
      if (stashed) {
        try {
          const parsed = JSON.parse(stashed);
          sessionStorage.removeItem("stashed_story_creation");
          if (parsed.story) {
            setPromptText(parsed.story);
            if (parsed.duration) setTargetDuration(parsed.duration);
            notify.info("🎬 检测到未完成的剧本创意，已为您自动恢复！");
          }
        } catch (_) {}
      }
    }
  }, [isAuthenticated]);

  const handleApplyPreset = (preset: SamplePreset) => {
    setPromptText(preset.presetStory);
    setTargetDuration(preset.duration);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    notify.success(`✨ 已填入「${preset.title}」故事预设，点击 ↑ 即可直接生成！`);
  };

  const handleExploreSample = async (preset: SamplePreset) => {
    const targetId = preset.sampleProjectId || "6f01c422-48ea-4796-afc7-09cc6447f764";
    if (!isAuthenticated) {
      try {
        await login("demo@caifu.social", "demo123");
        notify.success(`🎬 已免密载入「${preset.title}」现成 18 镜工作台（0消耗 Token）！`);
        router.push(`/workspace?id=${targetId}`);
        return;
      } catch {
        router.push(`/workspace?id=${targetId}`);
        return;
      }
    }
    router.push(`/workspace?id=${targetId}`);
  };

  const handleStartCreation = async () => {
    const trimmedStory = promptText.trim();
    if (!trimmedStory) {
      notify.error("请输入你想创作的电影故事、影视镜头或脑洞灵感");
      if (textareaRef.current) textareaRef.current.focus();
      return;
    }

    // Zero-friction preview flow: show 3-beat dramatic preview before auth wall
    if (!isAuthenticated || isDemoUser) {
      setIsBeatModalOpen(true);
      return;
    }

    if (!hasCustomKey) {
      notify.info("🔑 请先在「设置」中配置您的专属 OpenRouter API Key，即可开启 AI 故事板创作");
      openSettingsModal();
      return;
    }

    // Start project creation flow
    setIsCreating(true);
    setCreationElapsed(0);
    setCreationProgress(5);
    setCreationStage(0);
    setCreationComplete(false);
    setCreationError(null);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      setCreationElapsed(elapsedSec);

      setCreationProgress((prev) => {
        if (prev < 25) return prev + 2;
        if (prev < 50) {
          setCreationStage(1);
          return prev + 1.2;
        }
        if (prev < 80) {
          setCreationStage(2);
          return prev + 0.8;
        }
        if (prev < 95) {
          setCreationStage(3);
          return prev + 0.3;
        }
        return prev;
      });
    }, 400);

    try {
      const autoTitle = trimmedStory.slice(0, 18).trim() + " · 电影预演";
      const created = await api.createProject({
        title: autoTitle,
        story: trimmedStory,
        target_duration: targetDuration,
      });

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setCreationProgress(100);
      setCreationStage(4);
      setCreationComplete(true);

      setTimeout(() => {
        setIsCreating(false);
        router.push(`/workspace?id=${created.id}`);
      }, 800);
    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      console.error("Failed to create project from hero prompt:", err);
      setCreationError(err?.response?.data?.detail || err?.message || "创建工程失败，请重试");
    }
  };

  const handleConfirmAuthFromBeat = () => {
    setIsBeatModalOpen(false);
    sessionStorage.setItem(
      "stashed_story_creation",
      JSON.stringify({ story: promptText.trim(), duration: targetDuration })
    );
    notify.info("🎬 请注册或登录专属导演账号，登录后将自动为您保留并生成！");
    openAuthModal("register");
  };

  const handleExploreDemoFromBeat = async () => {
    setIsBeatModalOpen(false);
    try {
      await login("demo@caifu.social", "demo123");
      notify.success("🎬 已免密载入官方精品样片《合约恋人》！");
      router.push("/workspace?id=6f01c422-48ea-4796-afc7-09cc6447f764");
    } catch {
      router.push("/workspace?id=6f01c422-48ea-4796-afc7-09cc6447f764");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStartCreation();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0b0e] text-foreground selection:bg-primary/30 relative overflow-x-hidden">
      {/* Background Cinematic Radial Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(99,102,241,0.14),rgba(0,0,0,0)_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1c1c28_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-amber-500/20 border-b border-primary/20 text-xs py-2 px-4 text-center flex items-center justify-center gap-3 relative z-50 backdrop-blur-md">
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider">
            导演级 2.0
          </span>
          <span className="text-foreground/90 font-medium">
            🎬 分镜头脚本与视觉故事板双向协同引擎现已就绪 · 支持 16:9 宽银幕与 9:16 竖屏微短剧
          </span>
          <Link
            href="/dashboard"
            className="underline text-primary hover:text-primary/80 font-bold ml-1"
          >
            探索工程看板 →
          </Link>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-4 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            title="关闭通知"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Navigation */}
      <header className="border-b border-border/50 backdrop-blur-md bg-[#0b0b0e]/85 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 group-hover:bg-primary/20 transition-all shadow-inner">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-foreground">
                AI Director Studio
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                PRO
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs font-medium">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary/60"
            >
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span>工程驾驶舱</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>分镜看板</span>
                </Link>
                <UserMenuDropdown />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await login("demo@caifu.social", "demo123");
                      notify.success("🎬 已一键免密登入官方演示 Demo 账号！");
                      router.push("/dashboard");
                    } catch {
                      openAuthModal("login");
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all shadow-xs shrink-0 cursor-pointer"
                  title="免注册免输密码，一键以官方演示账号身份体验全套功能"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>0秒漫游 Demo</span>
                </button>
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-3.5 py-2 rounded-xl text-foreground/90 bg-secondary/80 hover:bg-secondary border border-border transition-colors font-semibold text-xs shadow-xs shrink-0 cursor-pointer"
                >
                  登录 / 注册
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-10 pb-24 max-w-6xl mx-auto w-full space-y-12 relative z-10">
        {/* Returning User Quick Resume Banner (if authenticated and has recent project) */}
        {recentProject && (
          <div className="w-full max-w-3xl flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/15 via-sky-500/10 to-transparent border border-primary/30 text-xs text-foreground/90 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎬</span>
              <div>
                <span className="font-semibold text-foreground">
                  欢迎回来，导演！
                </span>
                <span className="text-muted-foreground ml-1.5 hidden sm:inline">
                  继续上次创作：
                </span>
                <strong className="text-primary font-bold ml-1">
                  《{recentProject.title}》
                </strong>
                <span className="text-muted-foreground font-mono ml-1 text-[11px]">
                  ({recentProject.shot_count || 0} 镜)
                </span>
              </div>
            </div>

            <Link
              href={`/workspace?id=${recentProject.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all text-xs shadow-sm shrink-0"
            >
              <span>继续创作</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Hero Title & Subtitle */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border/80 text-muted-foreground text-xs font-mono font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Director Studio 2.0 · 双向协同故事板</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
            让每一个文字剧本，秒变院线级分镜画卷
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            输入一句话脑洞或粘贴长篇文学剧本，AI 导演即刻为你生成全套 16:9 / 9:16 分镜视听台本与角色一致性画卷
          </p>
        </div>

        {/* Dynamic Filmstrip Ribbon Preview */}
        <CinematicFilmstripHero />

        {/* Central Updream-Style Prompt Box */}
        <div className="w-full max-w-3xl rounded-2xl border border-border/80 bg-[#121218]/80 backdrop-blur-xl p-4 shadow-2xl focus-within:border-primary/70 focus-within:ring-4 focus-within:ring-primary/10 transition-all space-y-3 relative group">
          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={4}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你想创作的短剧剧情、电影镜头或脑洞灵感... (例如：暴雨夜新东京，青瓦飞檐，仿生特工右眼机械光圈锁定暗影，拔刀斩出白色音爆激波，0.1x 极限子弹时间避开超音速弹道)"
            className="w-full bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground/60 text-sm sm:text-base focus:outline-hidden leading-relaxed px-1"
          />

          {/* Bottom Action Ribbon */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-border/50">
            {/* Left Quick Config Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {/* Duration Chip */}
              <button
                type="button"
                onClick={() => setTargetDuration(targetDuration === 30 ? 60 : 30)}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-secondary/70 hover:bg-secondary border border-border/80 text-foreground/90 font-mono text-xs transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                title="点击切换目标片长 (30s 12镜 / 60s 24镜)"
              >
                <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{targetDuration}s · {targetDuration === 30 ? "12镜" : "24镜"}</span>
              </button>

              {/* Style Chip */}
              <div className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-secondary/70 border border-border/80 text-foreground/90 text-xs transition-colors shadow-2xs whitespace-nowrap shrink-0">
                <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{selectedStyle}</span>
              </div>

              {/* Novel / Long-form Series Button */}
              <button
                type="button"
                onClick={() => setIsSeriesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                title="导入万字长篇小说，一键切分 3~5 集短剧与全局角色库"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>小说成剧</span>
              </button>
            </div>

            {/* Right Submit Button & Key Status */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              {/* Real-time Key Status Pill */}
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated || isDemoUser) openAuthModal("register");
                  else if (!hasCustomKey) openSettingsModal();
                }}
                className={cn(
                  "hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-xl text-xs font-mono select-none transition-all border shadow-2xs whitespace-nowrap shrink-0 cursor-pointer",
                  !isAuthenticated || isDemoUser
                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : !hasCustomKey
                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 pointer-events-none"
                )}
                title={
                  !isAuthenticated
                    ? "未登录：点击注册专属账号"
                    : isDemoUser
                    ? "当前为体验账号：点击注册专属账号并配置 Key"
                    : !hasCustomKey
                    ? "未配置 Key：点击进入设置页面配置 OpenRouter Key"
                    : "专属 OpenRouter Key 已就绪"
                }
              >
                {!isAuthenticated ? (
                  <>
                    <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>免密初拆</span>
                  </>
                ) : isDemoUser ? (
                  <>
                    <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>体验账号</span>
                  </>
                ) : !hasCustomKey ? (
                  <>
                    <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>未配 Key</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Key 已就绪</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-muted-foreground hidden lg:inline font-mono whitespace-nowrap select-none px-0.5">
                Enter ↵
              </span>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleStartCreation}
                disabled={isCreating}
                className={cn(
                  "h-9 px-4 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0",
                  !isAuthenticated || isDemoUser || !hasCustomKey
                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 font-bold"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                )}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>规划中...</span>
                  </>
                ) : !isAuthenticated || isDemoUser ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                    <span>初拆预览</span>
                  </>
                ) : !hasCustomKey ? (
                  <>
                    <Key className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                    <span>配置 Key</span>
                  </>
                ) : (
                  <>
                    <span>生成分镜</span>
                    <ArrowUp className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Sample Project Jump Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>新手 0 等待样板房：</span>
          </span>
          <button
            type="button"
            onClick={() => handleExploreSample({
              id: "contract-lover",
              title: "合约恋人",
              tag: "9:16 短剧",
              author: "官方",
              desc: "",
              aspectRatio: "9:16",
              duration: 180,
              shotCount: 18,
              coverImage: "",
              presetStory: "",
              sampleProjectId: "6f01c422-48ea-4796-afc7-09cc6447f764",
              gradient: "",
              borderHover: "",
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 hover:border-primary/50 transition-all font-medium shadow-2xs group cursor-pointer"
          >
            <span>🎬 体验都市短剧《合约恋人》（3集·18镜全套分镜台本）</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
          <button
            type="button"
            onClick={() => handleExploreSample({
              id: "bencao-jie",
              title: "本草劫",
              tag: "9:16 短剧",
              author: "官方",
              desc: "",
              aspectRatio: "9:16",
              duration: 180,
              shotCount: 18,
              coverImage: "",
              presetStory: "",
              sampleProjectId: "2792deae-5f60-4246-850a-56b93eaf790a",
              gradient: "",
              borderHover: "",
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 hover:border-primary/50 transition-all font-medium shadow-2xs group cursor-pointer"
          >
            <span>📜 体验古装短剧《本草劫》（18镜视听完整工程）</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Section: 经典短剧与电影题材工坊 (Interactive Sample Workshop) */}
        <InteractiveSampleWorkshop
          onApplyPrompt={handleApplyPreset}
          onExploreSample={handleExploreSample}
        />

        {/* Section: 电影级生产力三大支柱 (FeaturedBentoGrid) */}
        <FeaturedBentoGrid />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-xs text-muted-foreground bg-[#0a0a0d]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">AI Director Studio</span>
            <span>· 故事板分镜与 AI 影视视听预演系统</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              工程看板
            </Link>
            <Link href="/releases" className="hover:text-foreground transition-colors">
              更新日志
            </Link>
            <button
              onClick={() => openSettingsModal()}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              API Key 设置
            </button>
          </div>
        </div>
      </footer>

      {/* Novel to Series Blueprint Modal */}
      <SeriesBlueprintModal
        isOpen={isSeriesModalOpen}
        onClose={() => setIsSeriesModalOpen(false)}
      />

      {/* 3-Beat Dramatic Outline Preview Modal */}
      <DramaticBeatPreviewModal
        isOpen={isBeatModalOpen}
        onClose={() => setIsBeatModalOpen(false)}
        storyText={promptText}
        targetDuration={targetDuration}
        onConfirmAuth={handleConfirmAuthFromBeat}
        onExploreDemo={handleExploreDemoFromBeat}
      />

      {/* Director Pipeline Progress Modal during creation */}
      <DirectorPipelineProgress
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        progressPercent={creationProgress}
        elapsedSeconds={creationElapsed}
        activeStageIndex={creationStage}
        isComplete={creationComplete}
        errorMessage={creationError}
      />
    </div>
  );
}
