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
} from "lucide-react";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";
import { AuthModal } from "@/components/modals/AuthModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import { ProjectCreationProgress } from "@/components/modals/ProjectCreationProgress";

interface FeaturedSkill {
  id: string;
  title: string;
  tag: string;
  author: string;
  desc: string;
  uses: string;
  gradient: string;
  borderHover: string;
  coverImage: string;
  presetStory: string;
  targetDuration: number;
}

const FEATURED_SKILLS: FeaturedSkill[] = [
  {
    id: "skill-cyberpunk",
    title: "赛博雨夜 · 矩阵子弹时间",
    tag: "动作科幻",
    author: "AI Director 官方",
    desc: "2.39:1 变形宽银幕、霓虹暴雨、机械瞳孔对焦与 0.1x 极限子弹时间对决",
    uses: "12.8 k",
    gradient: "from-purple-900/40 via-fuchsia-950/30 to-card",
    borderHover: "hover:border-purple-500/50",
    coverImage: "/images/storyboard/shot_02_katana_strike.jpg",
    presetStory:
      "暴雨夜新东京，青瓦飞檐古楼悬挂赤红发光灯笼。仿生特工右眼机械光圈收缩至 F1.2 锁定暗影，拔出高频武士刀斩出白色音爆激波。0.1x 极限子弹时间，侧身仰避超音速弹道，万千悬浮水滴与高压电火花在空中完全静止悬停。",
    targetDuration: 30,
  },
  {
    id: "skill-suspense",
    title: "悬疑暗房 · 芬奇低调冷光",
    tag: "悬疑推理",
    author: "AI Director 官方",
    desc: "胶片密室、暖色台灯、高反差伦勃朗光与极具心理压迫感正反打特写",
    uses: "8.6 k",
    gradient: "from-sky-950/40 via-blue-950/30 to-card",
    borderHover: "hover:border-sky-500/50",
    coverImage: "/images/storyboard/shot_01_teahouse_rain.jpg",
    presetStory:
      "雨夜老旧暗房内，红光微弱暗淡。老刑警手指夹着燃尽的香烟，凝视墙上密密麻麻的照片连线。突然台灯无故闪烁，门轴发出刺耳吱呀声，地上投射出拉长的风衣黑影。",
    targetDuration: 30,
  },
  {
    id: "skill-scifi",
    title: "科幻史诗 · 星际黑洞跃迁",
    tag: "太空史诗",
    author: "AI Director 官方",
    desc: "超大质量黑洞吸积盘、宇航员面罩倒影与空间曲率奇点跃迁",
    uses: "9.4 k",
    gradient: "from-amber-950/40 via-orange-950/30 to-card",
    borderHover: "hover:border-amber-500/50",
    coverImage: "/images/storyboard/shot_03_bullet_time_climax.jpg",
    presetStory:
      "探索舰穿越多维虫洞，舷窗外金黄色黑洞吸积盘撕裂时空。宇航员面罩上倒映着坍缩光晕，曲率引擎爆发刺目蓝白奇点脉冲，星舰瞬间切入多维裂缝完成时空跃迁。",
    targetDuration: 30,
  },
  {
    id: "skill-wuxia",
    title: "东方写意 · 水墨竹林对决",
    tag: "东方武侠",
    author: "AI Director 官方",
    desc: "泼墨写意长镜头、竹林疾风、一击必杀与东方古典留白美学",
    uses: "6.2 k",
    gradient: "from-emerald-950/40 via-teal-950/30 to-card",
    borderHover: "hover:border-emerald-500/50",
    coverImage: "/images/storyboard/shot_01_teahouse_rain.jpg",
    presetStory:
      "烟雨竹海，万竿翠竹随风倒伏。两名绝顶剑客在细密雨丝中相背而立，剑气激荡竹叶回旋。拔剑瞬间水墨晕染天地，一剑封喉，竹叶缓缓飘落于静止剑锋之上。",
    targetDuration: 30,
  },
];

export default function HomePage() {
  const router = useRouter();
  const {
    isAuthenticated,
    user,
    openAuthModal,
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
  } = useAuthStore();

  const [promptText, setPromptText] = useState("");
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [selectedStyle, setSelectedStyle] = useState<string>("电影级写实");
  const [showBanner, setShowBanner] = useState<boolean>(true);

  // Creation loading progress states
  const [isCreating, setIsCreating] = useState(false);
  const [creationElapsed, setCreationElapsed] = useState(0);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationStage, setCreationStage] = useState(0);
  const [creationComplete, setCreationComplete] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleApplySkill = (skill: FeaturedSkill) => {
    setPromptText(skill.presetStory);
    setTargetDuration(skill.targetDuration);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    notify.success(`✨ 已填入「${skill.title}」剧本预设，点击 ↑ 即可直接生成！`);
  };

  const handleStartCreation = async () => {
    const trimmedStory = promptText.trim();
    if (!trimmedStory) {
      notify.error("请输入你想创作的电影故事、镜头画面或脑洞灵感");
      if (textareaRef.current) textareaRef.current.focus();
      return;
    }

    if (!isAuthenticated) {
      // Stash story & ask for login
      sessionStorage.setItem(
        "stashed_story_creation",
        JSON.stringify({ story: trimmedStory, duration: targetDuration })
      );
      notify.info("🎬 请先登录或注册导演账号，登录后将自动开工！");
      openAuthModal("login");
      return;
    }

    // Pre-flight check: ensure user has configured an OpenRouter Key
    const hasKey = Boolean(
      user?.custom_settings?.has_llm_key ||
      user?.custom_settings?.llmApiKey ||
      user?.custom_settings?.llm_api_key
    );

    if (!hasKey) {
      notify.info("🔑 请先配置您的专属 OpenRouter API Key，即可开启好莱坞 AI 故事板创作");
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStartCreation();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0c] text-foreground selection:bg-primary/30 relative overflow-x-hidden">
      {/* Background Dot Matrix Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(99,102,241,0.12),rgba(0,0,0,0)_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e1e28_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border-b border-primary/20 text-xs py-2 px-4 text-center flex items-center justify-center gap-3 relative z-50 backdrop-blur-md">
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[10px]">
            官方上线
          </span>
          <span className="text-foreground/90 font-medium">
            🎬 好莱坞 AI 导演 2.0 正式就绪：一键剧本智能拆镜，直通 16:9 宽银幕预演画卷
          </span>
          <Link
            href="/dashboard"
            className="underline text-primary hover:text-primary/80 font-bold ml-1"
          >
            探索模板 →
          </Link>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-4 text-muted-foreground hover:text-foreground p-1"
            title="关闭通知"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Navigation */}
      <header className="border-b border-border/40 backdrop-blur-md bg-[#0a0a0c]/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>4 大工业起步模板</span>
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
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-4 py-2 rounded-xl text-foreground/90 bg-secondary/80 hover:bg-secondary border border-border transition-colors font-semibold shadow-xs"
                >
                  登录 / 注册
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-sm"
                >
                  <span>立即开工</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Prompt-First Center Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-16 pb-24 max-w-5xl mx-auto w-full space-y-12 relative z-10">
        {/* Center Inspiration Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
            灵感从这里开始！
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            描述你想创作的电影故事或输入文本剧本，好莱坞 AI 导演即刻为你生成全套分镜画卷与视听台本
          </p>
        </div>

        {/* Central Updream-Style Prompt Box */}
        <div className="w-full max-w-3xl rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl p-4 shadow-2xl focus-within:border-primary/70 focus-within:ring-4 focus-within:ring-primary/10 transition-all space-y-3 relative group">
          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={4}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你想创作的电影故事、影视镜头或脑洞灵感... (例如：暴雨夜新东京，仿生特工拔出高频武士刀斩出音爆激波，0.1x 极限子弹时间避开超音速弹道)"
            className="w-full bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground/60 text-sm sm:text-base focus:outline-hidden leading-relaxed px-1"
          />

          {/* Bottom Action Ribbon */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
            {/* Left Quick Config Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Duration Chip */}
              <button
                type="button"
                onClick={() => setTargetDuration(targetDuration === 30 ? 60 : 30)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground/90 font-mono transition-colors shadow-2xs"
                title="点击切换目标片长"
              >
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{targetDuration}s ({targetDuration === 30 ? "12 镜" : "24 镜"})</span>
              </button>

              {/* Style Chip */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/80 text-foreground/90 transition-colors shadow-2xs">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>画风: {selectedStyle}</span>
              </div>

              {/* Mode Chip */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/80 text-muted-foreground hidden sm:inline-flex shadow-2xs">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>6 阶段戏剧拆镜</span>
              </div>
            </div>

            {/* Right Submit Circle Button */}
            <div className="flex items-center justify-end gap-2">
              <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
                Enter ↵ 发送
              </span>
              <button
                type="button"
                onClick={handleStartCreation}
                disabled={isCreating}
                className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all shadow-md hover:scale-105 active:scale-95 disabled:opacity-50"
                title="立即开始智能创作"
              >
                {isCreating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: 官方精选技能 (Featured Skills Deck) */}
        <section className="w-full space-y-5 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">官方精选技能</h2>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors font-medium"
            >
              <span>查看全部</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_SKILLS.map((skill) => (
              <div
                key={skill.id}
                onClick={() => handleApplySkill(skill)}
                className={`p-4 rounded-2xl border border-border/70 bg-gradient-to-b ${skill.gradient} ${skill.borderHover} transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden`}
              >
                <div className="space-y-3">
                  {/* Top Pill & Author */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold border border-primary/30">
                      {skill.tag}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{skill.author}</span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{skill.title}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {skill.desc}
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Thumbnail + Usage count */}
                <div className="flex items-end justify-between gap-3 pt-2 border-t border-border/40">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>使用次数 {skill.uses}</span>
                  </div>

                  <div className="w-16 h-10 rounded-lg overflow-hidden border border-border/80 bg-neutral-900 shrink-0 shadow-xs">
                    <img
                      src={skill.coverImage}
                      alt={skill.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/20 text-center text-xs text-muted-foreground relative z-10">
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

      {/* Global Modals for Auth, Settings, and Creation Progress */}
      <AuthModal />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />
      <ProjectCreationProgress
        isOpen={isCreating}
        title={promptText.slice(0, 18).trim() || "新电影分镜预演"}
        story={promptText}
        targetDuration={targetDuration}
        progressPercent={creationProgress}
        activeStageIndex={creationStage}
        elapsedSeconds={creationElapsed}
        isComplete={creationComplete}
        errorMessage={creationError}
        onRetry={handleStartCreation}
        onCancel={() => setIsCreating(false)}
        onOpenSettings={() => {
          setIsCreating(false);
          openSettingsModal();
        }}
        onClose={() => setIsCreating(false)}
      />
    </div>
  );
}
