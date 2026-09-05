"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Film,
  Clock,
  Sparkles,
  Clapperboard,
  ArrowRight,
  Settings,
  AlertCircle,
  RefreshCw,
  Trash2,
  Search,
  Download,
  User,
  Loader2,
  BookOpen,
  Lightbulb,
  Smartphone,
} from "lucide-react";
import { api, ProjectListItem, normalizeAssetUrl } from "@/lib/api";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import { DirectorPipelineProgress } from "@/components/modals/DirectorPipelineProgress";
import { SeriesBlueprintModal } from "@/components/modals/SeriesBlueprintModal";
import { PitchIdeaGeneratorModal } from "@/components/modals/PitchIdeaGeneratorModal";
import { GlobalAssetLibraryModal } from "@/components/modals/GlobalAssetLibraryModal";
import { exportStoryboardSheetToPng } from "@/lib/canvasExporter";
import { notify } from "@/components/ui/ToastNotification";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import { NarrativeStyleSelector } from "@/components/director/NarrativeStyleSelector";
import { NarrativeMode, NarrativeCenter } from "@/types/narrative";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const STARTER_TEMPLATES = [
  {
    id: "fantasy_creature",
    title: "⚡ 8s 奇幻生物探索",
    badge: "3 镜 · 尺度反差",
    duration: 8,
    storyTitle: "特立独行的小飞猪",
    desc: "一只特立独行飞行的粉色小猪，戴着红色小围巾在晚霞中的哥特魔法古堡群尖顶间翱翔探索。",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent border-sky-500/30 text-sky-300",
  },
  {
    id: "cyber_glider",
    title: "🎥 20s 未来机械预告",
    badge: "6 镜 · 起承转合",
    duration: 20,
    storyTitle: "赛博滑翔鼠",
    desc: "一只机灵活泼的小松鼠驾驶着复古机械滑翔翼，在未来赛博都市摩天大楼与发光全息广告牌间穿梭避障。",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/30 text-purple-300",
  },
  {
    id: "matrix_combat",
    title: "🥋 30s 终极动作大片",
    badge: "12 镜 · 子弹时间",
    duration: 30,
    storyTitle: "黑客帝国：雨夜茶馆决战",
    desc: "雨夜赛博朋克茶馆前，黑客墨客遭遇矩阵特工银狐，展开一场咏春拳与360度子弹时间的终极对决。",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-300",
  },
  {
    id: "classical_garden",
    title: "🏮 15s 东方古典国风",
    badge: "6 镜 · 诗意水墨",
    duration: 15,
    storyTitle: "大观园雪景寻梅",
    desc: "冬日大观园雪景，古典亭台楼阁与荷塘残雪，身穿朱红云锦斗篷的人物缓步踏过石桥，回眸凝望落雪。",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/30 text-amber-300",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, openSettingsModal, login } = useAuthStore();

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newStory, setNewStory] = useState("");
  const [targetDuration, setTargetDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>("hollywood");
  const [structuralArchetype, setStructuralArchetype] = useState<string>("single_space_standoff");
  const [narrativeCenter, setNarrativeCenter] = useState<NarrativeCenter>("plot");
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [isGlobalAssetModalOpen, setIsGlobalAssetModalOpen] = useState(false);

  // Creation progress states
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [creationElapsed, setCreationElapsed] = useState(0);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationStage, setCreationStage] = useState(0);
  const [creationComplete, setCreationComplete] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const progressIntervalRef = useRef<any>(null);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getProjects();
      setProjects(data);
    } catch (e) {
      console.error(e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      notify.info("🎬 请先登录或注册导演账号，即可创建并永久保存您的私有故事板工程");
      openAuthModal("login");
      return;
    }
    const hasKey = !!user?.custom_settings?.llmApiKey;
    if (!hasKey) {
      notify.info("🎬 请先在「设置」中填入您的专属 OpenRouter API Key，开启 AI 智能拆镜服务");
      openSettingsModal();
      return;
    }
    setNewTitle("");
    setNewStory("");
    setTargetDuration(30);
    setIsSubmittingProject(false);
    setCreationError(null);
    setIsCreating(true);
  };

  const handleApplyTemplate = (tmpl: typeof STARTER_TEMPLATES[0]) => {
    if (!isAuthenticated) {
      notify.info("🎬 请先登录或注册导演账号，即可一键套用模板创建私有工程");
      openAuthModal("login");
      return;
    }
    const hasKey = !!user?.custom_settings?.llmApiKey;
    if (!hasKey) {
      notify.info("🎬 请先在「设置」中填入您的专属 OpenRouter API Key，开启 AI 智能拆镜服务");
      openSettingsModal();
      return;
    }
    setNewTitle(tmpl.storyTitle);
    setNewStory(tmpl.desc);
    setTargetDuration(tmpl.duration);
    setIsSubmittingProject(false);
    setCreationError(null);
    setIsCreating(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (!isAuthenticated) {
      notify.info("🎬 请先登录或注册导演账号后再创建工程");
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

    setIsSubmittingProject(true);
    setCreationElapsed(0);
    setCreationProgress(5);
    setCreationStage(0);
    setCreationComplete(false);
    setCreationError(null);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      setCreationElapsed(elapsedSec);

      if (elapsedSec < 3) {
        setCreationStage(0);
        setCreationProgress(Math.min(25, elapsedSec * 8 + 5));
      } else if (elapsedSec < 8) {
        setCreationStage(1);
        setCreationProgress(Math.min(60, 25 + (elapsedSec - 3) * 7));
      } else if (elapsedSec < 14) {
        setCreationStage(2);
        setCreationProgress(Math.min(90, 60 + (elapsedSec - 8) * 5));
      } else {
        setCreationStage(3);
        setCreationProgress(95);
      }
    }, 500);

    try {
      const created = await api.createProject({
        title: newTitle.trim(),
        story: newStory.trim() || undefined,
        target_duration: targetDuration,
        aspect_ratio: aspectRatio,
        narrative_mode: narrativeMode,
        structural_archetype: narrativeMode === "drama_5min" ? structuralArchetype : undefined,
        narrative_center: narrativeMode === "drama_5min" ? narrativeCenter : undefined,
      });

      clearInterval(progressIntervalRef.current);
      setCreationProgress(100);
      setCreationStage(3);
      setCreationComplete(true);

      setTimeout(() => {
        setIsCreating(false);
        setIsSubmittingProject(false);
        router.push(`/workspace?id=${created.id}`);
      }, 800);
    } catch (err: any) {
      clearInterval(progressIntervalRef.current);
      console.error("Failed to create project:", err);
      setCreationError(err?.response?.data?.detail || err?.message || "创建工程失败，请重试");
    }
  };

  const handleQuickExport = async (e: React.MouseEvent, proj: ProjectListItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (exportingProjectId) return;

    try {
      setExportingProjectId(proj.id);
      notify.info("🎨 正在加载全量分镜数据并合成 16:9 打样单...");

      const fullProject = await api.getProject(proj.id);
      const shots = fullProject.sequences?.[0]?.shots || [];

      if (shots.length === 0) {
        notify.error("该项目中暂无分镜头，请进入工作台先进行 AI 拆镜。");
        return;
      }

      await exportStoryboardSheetToPng(fullProject, shots, { includeHud: true });
      notify.success("🎉 故事板草图打样单 (PNG) 已成功下载！");
    } catch (err: any) {
      console.error("Quick export error:", err);
      notify.error(err?.message || "导出故事板打样单失败");
    } finally {
      setExportingProjectId(null);
    }
  };

  const handleConfirmDelete = async (projectId: string) => {
    await api.deleteProject(projectId);
    await loadProjects();
  };

  const handleCancelCreate = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsSubmittingProject(false);
    setCreationError(null);
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || (p.story || "").toLowerCase().includes(q);
  });

  const totalShotsCount = projects.reduce((acc, p) => acc + (p.shot_count || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      {/* Top Header */}
      <header className="border-b border-border bg-card/70 backdrop-blur-md px-6 h-16 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 group-hover:bg-primary/20 transition-all shadow-inner">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
              <span>AI Director Studio</span>
              <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                PRO
              </span>
            </span>
            <p className="text-[11px] text-muted-foreground hidden sm:block">好莱坞影视级分镜与 AI 视频预演工作台</p>
          </div>
        </Link>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center relative w-72 lg:w-96">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索分镜项目、主角或故事设定..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:border-primary focus:bg-background transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                notify.info("请先登录查看全局资产库");
                openAuthModal("login");
                return;
              }
              setIsGlobalAssetModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-all cursor-pointer shadow-2xs"
            title="用户级全局资产库：跨项目沉淀复用角色、场景与道具"
          >
            <span>◇ 全局资产库</span>
          </button>

          <button
            onClick={openSettingsModal}
            className="p-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="后端连接与 AI 大模型设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile / Auth Button */}
          {isAuthenticated && user ? (
            <UserMenuDropdown />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await login("demo@caifu.social", "demo123");
                    notify.success("🎬 已一键登入官方演示 Demo 账号！");
                  } catch (err) {
                    openAuthModal("login");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all shadow-2xs"
                title="免注册免输密码，一键以官方演示 Demo 账号体验"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>体验 Demo 账号</span>
              </button>
              <button
                onClick={() => openAuthModal("login")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30 transition-colors shadow-2xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>登录 / 注册</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsPitchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 transition-all shadow-xs"
            title="只需一句话灵感，AI 自动衍生 3 款短剧提案"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>💡 一句话点子成剧</span>
          </button>

          <button
            onClick={() => setIsSeriesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-muted text-foreground border border-border transition-all"
            title="输入长篇小说或多集剧本，一键提炼角色与切分多集"
          >
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>长篇小说成剧</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>新建分镜工程</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Hero Pitch Banner: One-Line Pitch to Series */}
        <div className="relative rounded-2xl p-6 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-sky-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden shadow-sm">
          <div className="space-y-1.5 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>新功能 · 一句话点子孵化短剧</span>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              不知道怎么编完整梗概？输入一句话，AI 为你生成 3 款短剧与文学剧本
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl">
              支持女频/男频赛道偏好，严格锁定已有角色（绝不胡乱新增上司/配角），硬性锚定核心情节，彻底告别白纸焦虑。
            </p>
          </div>
          <button
            onClick={() => setIsPitchModalOpen(true)}
            className="shrink-0 z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-black shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>立即体验点子孵化</span>
          </button>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Section 1: Director Starter Presets */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                导演灵感与经典起步模板 (Director Starters)
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">点击快速填入精炼剧本</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {STARTER_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md bg-gradient-to-br flex flex-col justify-between group relative overflow-hidden",
                  tmpl.gradient
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono tracking-tight">{tmpl.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background/80 border border-current">
                      {tmpl.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground/90 transition-colors">
                    {tmpl.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-current/15 text-[11px] font-medium">
                  <span className="opacity-80">一键套用剧本</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: User Projects List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Film className="w-5 h-5 text-sky-400" />
                <span>我的分镜工程</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {filteredProjects.length} 个工程
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                累计已构建 {totalShotsCount} 个好莱坞预演镜头 · 支持多租户数据隔离与 16:9 打样导出
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={loadProjects}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="刷新项目列表"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-primary")} />
                <span>刷新</span>
              </button>
            </div>
          </div>

          {/* Backend Connection Error Banner */}
          {hasError && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-500">无法连接到后端 Cloudflare Worker 服务</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    请点击右上角「<strong>设置 ⚙️</strong>」配置 Worker 服务地址与 API Key。
                  </p>
                </div>
              </div>
              <button
                onClick={openSettingsModal}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors shrink-0"
              >
                配置后端
              </button>
            </div>
          )}

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl border border-border/40 bg-card/30 animate-pulse" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="h-72 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-card/20">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-base mb-1">
                {searchQuery ? `未找到与 “${searchQuery}” 相关的工程` : "暂无分镜项目"}
              </h3>
              <p className="text-xs text-muted-foreground mb-5 max-w-sm">
                {searchQuery ? "请尝试更换关键词，或清空搜索查看所有分镜工程" : "选择上方经典起步模板，或点击下方按钮开启你的第一个故事板"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors"
                  >
                    清空搜索
                  </button>
                ) : (
                  <>
                    {!isAuthenticated && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await login("demo@caifu.social", "demo123");
                            notify.success("🎬 已一键登入官方演示 Demo 账号！");
                          } catch (err) {
                            openAuthModal("login");
                          }
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-md active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>一键进入 Demo 体验账号</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenCreateModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>立即新建分镜工程</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => {
                const coverImg = normalizeAssetUrl(proj.cover_image_url);

                return (
                  <Link
                    key={proj.id}
                    href={`/workspace?id=${proj.id}`}
                    className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card hover:border-primary/50 transition-all duration-300 flex flex-col overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 relative"
                  >
                    {/* 16:9 Widescreen Filmstrip Poster Header */}
                    <div className="w-full aspect-video bg-neutral-950 relative overflow-hidden border-b border-border/60 shrink-0">
                      {coverImg ? (
                        <>
                          <img
                            src={coverImg}
                            alt={proj.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                        </>
                      ) : (
                        /* Modern Darkroom Concept Frame */
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-neutral-900 to-neutral-950">
                          <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20 mb-2">
                            <Clapperboard className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            好莱坞导演分镜工程
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                            16:9 宽银幕电影级
                          </span>
                        </div>
                      )}

                      {/* Top Badges on Poster */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-black/80 text-sky-400 border border-sky-400/30 backdrop-blur-md">
                            {proj.target_duration}s
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-black/80 text-foreground border border-white/20 backdrop-blur-md">
                          {proj.shot_count || 0} 个分镜
                        </span>
                      </div>

                      {/* Quick Hover Overlay CTA */}
                      <div className="absolute inset-0 bg-primary/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-3.5 py-1.5 rounded-full bg-background/90 text-primary text-xs font-semibold border border-primary/40 shadow-lg backdrop-blur-md flex items-center gap-1.5">
                          <span>进入工作台</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Card Content Info */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {proj.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                          {proj.story || "未填写故事设定，点击进入工作台进行剧本编辑与 AI 拆镜。"}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Quick Export PNG Button */}
                          <button
                            type="button"
                            onClick={(e) => handleQuickExport(e, proj)}
                            disabled={exportingProjectId === proj.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                            title="快速导出 16:9 故事板草图打样单"
                          >
                            <Download className="w-3 h-3 text-sky-400" />
                            <span>{exportingProjectId === proj.id ? "合成中..." : "导出单"}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProjectToDelete(proj);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="删除项目"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>打开工程</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-auto bg-card/20 text-center text-xs text-muted-foreground relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">AI Director Studio</span>
            <span>· 好莱坞影视级分镜与 AI 视频预演工作台</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/releases"
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <span>版本更新日志</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                v1.3.0
              </span>
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

      {/* Create Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {isSubmittingProject ? (
              <DirectorPipelineProgress
                title={newTitle}
                story={newStory}
                targetDuration={targetDuration}
                progressPercent={creationProgress}
                activeStageIndex={creationStage}
                elapsedSeconds={creationElapsed}
                isComplete={creationComplete}
                errorMessage={creationError}
                onRetry={() => {
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleCreateProject(fakeEvent);
                }}
                onOpenSettings={() => {
                  setIsSubmittingProject(false);
                  setIsCreating(false);
                  openSettingsModal();
                }}
                onCancel={handleCancelCreate}
                onClose={handleCancelCreate}
              />
            ) : (
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">新建好莱坞分镜工程</h3>
                    <p className="text-xs text-muted-foreground">输入灵感梗概，AI 导演将自动完成剧情拆镜与视觉预演</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground/90 block mb-1">
                      工程标题 <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例如：《黑客帝国：雨夜茶馆决战》"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-foreground/90">
                        故事剧本 / 场景设定 (可选)
                      </label>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {newStory.length}/500 字
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="描述主角身份、核心冲突、环境氛围与关键动作... (留空将基于标题自动构思)"
                      value={newStory}
                      onChange={(e) => setNewStory(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-primary resize-none font-medium"
                    />
                  </div>

                  <NarrativeStyleSelector
                    mode={narrativeMode}
                    onModeChange={setNarrativeMode}
                    archetype={structuralArchetype}
                    onArchetypeChange={setStructuralArchetype}
                    center={narrativeCenter}
                    onCenterChange={setNarrativeCenter}
                  />

                  <div>
                    <label className="text-xs font-medium text-foreground/90 block mb-1">
                      画幅视听规格
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAspectRatio("9:16")}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                          aspectRatio === "9:16"
                            ? "bg-primary/20 text-primary border-primary font-bold shadow-xs"
                            : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>9:16 竖屏微短剧 (推荐)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAspectRatio("16:9")}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                          aspectRatio === "16:9"
                            ? "bg-primary/20 text-primary border-primary font-bold shadow-xs"
                            : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>16:9 横屏电影级</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground/90 block mb-1">
                      目标成片时长 (秒)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[8, 15, 20, 30].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setTargetDuration(dur)}
                          className={cn(
                            "py-2 rounded-lg text-xs font-mono font-medium border transition-all",
                            targetDuration === dur
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {dur}s ({dur <= 8 ? "3 镜" : dur <= 20 ? "6 镜" : "12 镜"})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>立即开始 AI 智能拆镜</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setProjectToDelete(null);
        }}
        project={projectToDelete}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Multi-Episode Series Blueprint Modal */}
      <SeriesBlueprintModal
        isOpen={isSeriesModalOpen}
        onClose={() => {
          setIsSeriesModalOpen(false);
          loadProjects();
        }}
        onOpenSettings={openSettingsModal}
      />

      {/* One-Line Pitch Idea Generator Modal */}
      <PitchIdeaGeneratorModal
        isOpen={isPitchModalOpen}
        onClose={() => {
          setIsPitchModalOpen(false);
          loadProjects();
        }}
      />

      {/* User-Level Global Cross-Project Asset Library Modal (Reelbench Standard) */}
      <GlobalAssetLibraryModal
        isOpen={isGlobalAssetModalOpen}
        onClose={() => setIsGlobalAssetModalOpen(false)}
      />
    </div>
  );
}
