"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
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
  Search,
  Download,
  Play,
  User,
  Loader2,
  BookOpen,
  Lightbulb,
  Smartphone,
  Monitor,
  ChevronDown,
  Layers,
  CheckCircle2,
  ChevronUp,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { api, ProjectListItem, normalizeAssetUrl } from "@/lib/api";
import { ShotModel, ProjectModel } from "@/types/shot";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import {
  CreateProjectModal,
  CreateProjectInitialValues,
} from "@/components/modals/CreateProjectModal";
import { SeriesBlueprintModal } from "@/components/modals/SeriesBlueprintModal";
import { PitchIdeaGeneratorModal } from "@/components/modals/PitchIdeaGeneratorModal";
import { GlobalAssetLibraryModal } from "@/components/modals/GlobalAssetLibraryModal";
import { CinemaTheaterModal } from "@/components/modals/CinemaTheaterModal";
import { exportStoryboardSheetToPng } from "@/lib/canvasExporter";
import { notify } from "@/components/ui/ToastNotification";
import { UserMenuDropdown } from "@/components/ui/UserMenuDropdown";
import {
  STARTER_TEMPLATES,
  OFFICIAL_SAMPLE_PROJECTS,
  StarterTemplate,
} from "@/data/dashboardPresets";
import { useAuthStore } from "@/stores/authStore";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, openSettingsModal, login } =
    useAuthStore();

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createInitialValues, setCreateInitialValues] =
    useState<CreateProjectInitialValues>({});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectListItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [aspectFilter, setAspectFilter] = useState<"all" | "16:9" | "9:16">("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "shots">("updated");
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);

  // Quick Theater Modal state
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const [theaterProject, setTheaterProject] = useState<ProjectModel | null>(null);
  const [theaterShots, setTheaterShots] = useState<ShotModel[]>([]);

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [isGlobalAssetModalOpen, setIsGlobalAssetModalOpen] = useState(false);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getProjects();
      if (!data || data.length === 0) {
        // 当未登录或暂无自建工程时展示官方精选样片工程
        setProjects(OFFICIAL_SAMPLE_PROJECTS);
      } else {
        setProjects(data);
      }
    } catch (e) {
      console.warn("Failed to fetch remote projects, falling back to samples:", e);
      setProjects(OFFICIAL_SAMPLE_PROJECTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
  const hasCustomKey = !isDemoUser && !!user?.custom_settings?.llmApiKey;

  const checkAuthAndKey = (actionName: string) =>
    useAuthStore.getState().checkAuthAndKey(actionName);

  const handleOpenCreateModal = () => {
    if (!checkAuthAndKey("新建分镜工程")) return;
    setCreateInitialValues({
      title: "",
      story: "",
      targetDuration: 30,
    });
    setIsCreating(true);
  };

  const handleApplyTemplate = async (tmpl: StarterTemplate) => {
    if (!isAuthenticated) {
      try {
        await login("demo@caifu.social", "demo123");
        notify.success("🎬 已为您载入官方示例分镜工程！");
        router.push("/workspace?id=6f01c422-48ea-4796-afc7-09cc6447f764");
        return;
      } catch {
        openAuthModal("login");
        return;
      }
    }

    if (!hasCustomKey) {
      notify.info("🎬 已为您填入模板故事！若要使用 AI 重新规划新镜头，请在「设置 ⚙️」中配置您的专属 OpenRouter API Key");
    }

    setCreateInitialValues({
      title: tmpl.storyTitle,
      story: tmpl.desc,
      targetDuration: tmpl.duration,
    });
    setIsCreating(true);
  };

  const handleQuickPlay = async (e: React.MouseEvent, proj: ProjectListItem) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      notify.info("🎬 正在加载放映厅分镜资产与台本...");
      const fullProj = await api.getProject(proj.id);
      const shots =
        fullProj.sequences?.flatMap((sequence) => sequence.shots || []) || [];

      if (shots.length === 0) {
        notify.error("该工程暂无分镜头，请进入工作台完成 AI 拆镜。");
        return;
      }

      setTheaterProject(fullProj);
      setTheaterShots(shots);
      setIsTheaterOpen(true);
    } catch (err: any) {
      console.error("Failed to load theater preview:", err);
      notify.error("加载放映厅失败：" + (err?.message || "请重试"));
    }
  };

  const handleQuickExport = async (e: React.MouseEvent, proj: ProjectListItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (exportingProjectId) return;

    try {
      setExportingProjectId(proj.id);
      notify.info("🎨 正在加载分镜数据并合成专业工业打样单...");

      const fullProject = await api.getProject(proj.id);
      const shots =
        fullProject.sequences?.flatMap((sequence) => sequence.shots || []) || [];

      if (shots.length === 0) {
        notify.error("该项目中暂无分镜头，请进入工作台先进行 AI 拆镜。");
        return;
      }

      await exportStoryboardSheetToPng(fullProject, shots, { includeHud: true });
      notify.success("🎉 故事板打样单 (PNG) 已成功下载！");
    } catch (err: any) {
      console.error("Quick export error:", err);
      notify.error(err?.message || "导出故事板打样单失败");
    } finally {
      setExportingProjectId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, proj: ProjectListItem) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(proj);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async (projectId: string) => {
    await api.deleteProject(projectId);
    await loadProjects();
  };

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.story || "").toLowerCase().includes(q)
      );
    }

    // Aspect ratio filter
    if (aspectFilter !== "all") {
      result = result.filter((p) => {
        if (aspectFilter === "9:16") return p.aspect_ratio === "9:16";
        return p.aspect_ratio !== "9:16"; // 16:9 or default
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "shots") {
        return (b.shot_count || 0) - (a.shot_count || 0);
      }
      if (sortBy === "created") {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      }
      // Default: updated_at
      return (
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      );
    });

    return result;
  }, [projects, searchQuery, aspectFilter, sortBy]);

  const activeProject = filteredProjects[0];
  const totalShotsCount = projects.reduce(
    (acc, p) => acc + (p.shot_count || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-foreground flex flex-col selection:bg-primary/30">
      {/* Top Header */}
      <header className="border-b border-border/50 bg-[#0b0b0e]/85 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 group-hover:bg-primary/20 transition-all shadow-inner">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground block">
              AI Director Studio
            </span>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              分镜工程与影视预演工作台
            </p>
          </div>
        </Link>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center relative w-72 lg:w-96">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索分镜工程、主角人设或剧情关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:border-primary focus:bg-[#121218] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/releases"
            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-secondary/60"
          >
            <span>v2.1 更新</span>
          </Link>

          {isAuthenticated && user ? (
            <UserMenuDropdown />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await login("demo@caifu.social", "demo123");
                    notify.success("🎬 已载入官方演示 Demo 账号！");
                  } catch {
                    openAuthModal("login");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>体验 Demo</span>
              </button>
              <button
                onClick={() => openAuthModal("login")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors cursor-pointer"
              >
                登录
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Compact Command Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#121218]/90 border border-border/70 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>新建分镜工程</span>
            </button>

            <div className="h-5 w-px bg-border/60 hidden sm:block" />

            {/* Tool 1: Pitch to Series */}
            <button
              onClick={() => {
                if (!checkAuthAndKey("灵感点子生成剧本")) return;
                setIsPitchModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
              title="输入一句话脑洞或梗概，AI 辅助生成故事设定与文学剧本"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>灵感生成剧本</span>
            </button>

            {/* Tool 2: Novel to Series */}
            <button
              onClick={() => {
                if (!checkAuthAndKey("长篇小说分集策划")) return;
                setIsSeriesModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
              title="导入长篇小说或长剧本，智能拆解分集大纲与角色设定"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>长篇小说分集策划</span>
            </button>

            {/* Tool 3: Global Asset Library */}
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  notify.info("请先登录查看全局资产库");
                  openAuthModal("login");
                  return;
                }
                setIsGlobalAssetModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground/90 border border-border/80 transition-colors cursor-pointer"
              title="用户级全局资产库：跨项目复用核心角色、场景与道具"
            >
              <span>◇ 全局资产库</span>
            </button>
          </div>

          {/* Right: Starter Templates Toggle Drawer */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTemplatesOpen((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                isTemplatesOpen
                  ? "bg-secondary text-foreground border-primary/50 text-primary"
                  : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/70"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>经典起步模板 (4款)</span>
              {isTemplatesOpen ? (
                <ChevronUp className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Starter Templates Panel */}
        {isTemplatesOpen && (
          <div className="rounded-2xl border border-border/80 bg-[#121218]/95 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-foreground">
                  经典分镜模板 · 点击载入创作工作台
                </h3>
              </div>
              <button
                onClick={() => setIsTemplatesOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {STARTER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] bg-gradient-to-br flex flex-col justify-between group cursor-pointer",
                    tmpl.gradient
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-mono tracking-tight">{tmpl.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 border border-current">
                        {tmpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground/90 transition-colors">
                      {tmpl.desc}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/15 text-[10px] font-medium">
                    <span className="opacity-80">点击载入模板</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Active Project Hero Card (焦点活跃工程卡片) */}
        {activeProject && (
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-[#14141d] to-[#101017] p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
            {/* Ambient Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3 z-10 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-primary/20 text-primary border border-primary/30">
                  最近活跃工程
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/60 text-sky-300 border border-sky-500/20">
                  {activeProject.aspect_ratio === "9:16" ? "9:16 竖屏微短剧" : "16:9 电影宽银幕"}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {activeProject.target_duration}s · {activeProject.shot_count || 0} 镜
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  《{activeProject.title}》
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 max-w-3xl leading-relaxed">
                  {activeProject.story || "点击进入工作台继续分镜头剧本编写与视听画面预演。"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <Link
                  href={`/workspace?id=${activeProject.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>继续创作</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={(e) => handleQuickPlay(e, activeProject)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>放映厅全屏快播</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleQuickExport(e, activeProject)}
                  disabled={exportingProjectId === activeProject.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>{exportingProjectId === activeProject.id ? "合成中..." : "导出专业打样单"}</span>
                </button>
              </div>
            </div>

            {/* Poster Thumbnail Box */}
            {activeProject.cover_image_url && (
              <div className="shrink-0 w-full md:w-64 aspect-video rounded-xl overflow-hidden border border-white/10 relative shadow-lg group">
                <img
                  src={normalizeAssetUrl(activeProject.cover_image_url)}
                  alt={activeProject.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/70">
                  {activeProject.updated_at ? activeProject.updated_at.split("T")[0] : "刚刚"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section: Projects Grid with Multidimensional Controls */}
        <div className="space-y-4 pt-2">
          {/* Filter Bar & Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
            {/* Title & Count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold tracking-tight">全部故事板工程</h2>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {filteredProjects.length} 个工程 · {totalShotsCount} 镜
              </span>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Aspect Ratio Filter Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-secondary/60 border border-border/80">
                <button
                  onClick={() => setAspectFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                    aspectFilter === "all"
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  全部画幅
                </button>
                <button
                  onClick={() => setAspectFilter("16:9")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer",
                    aspectFilter === "16:9"
                      ? "bg-background text-sky-300 shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Monitor className="w-3 h-3" />
                  <span>16:9 电影</span>
                </button>
                <button
                  onClick={() => setAspectFilter("9:16")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer",
                    aspectFilter === "9:16"
                      ? "bg-background text-rose-300 shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>9:16 短剧</span>
                </button>
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-secondary/60 border border-border/80 text-muted-foreground hover:text-foreground font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="updated">最近修改</option>
                <option value="created">创建时间</option>
                <option value="shots">镜头数量</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={loadProjects}
                className="p-2 rounded-xl border border-border bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="刷新工程列表"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-primary")} />
              </button>
            </div>
          </div>

          {/* Backend Connection Error */}
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors shrink-0 cursor-pointer"
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
            <div className="h-72 border border-dashed border-border/80 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-[#101015]/60">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-base mb-1">
                {searchQuery ? `未找到与 “${searchQuery}” 相关的分镜工程` : "暂无分镜工程"}
              </h3>
              <p className="text-xs text-muted-foreground mb-5 max-w-sm">
                {searchQuery
                  ? "请尝试更换关键词，或重置筛选条件"
                  : "点击上方「新建分镜工程」开启创作，或选择模板载入官方样片"}
              </p>
              <div className="flex items-center gap-3">
                {searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setAspectFilter("all");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
                  >
                    清空筛选
                  </button>
                ) : (
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>立即新建工程</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  onQuickPlay={handleQuickPlay}
                  onQuickExport={handleQuickExport}
                  onDelete={handleDeleteClick}
                  isExporting={exportingProjectId === proj.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals & Drawers */}
      <CreateProjectModal
        isOpen={isCreating}
        onClose={() => {
          setIsCreating(false);
          loadProjects();
        }}
        initialValues={createInitialValues}
      />

      <DeleteProjectModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setProjectToDelete(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        project={projectToDelete}
      />

      <SeriesBlueprintModal
        isOpen={isSeriesModalOpen}
        onClose={() => setIsSeriesModalOpen(false)}
      />

      <PitchIdeaGeneratorModal
        isOpen={isPitchModalOpen}
        onClose={() => setIsPitchModalOpen(false)}
      />

      <GlobalAssetLibraryModal
        isOpen={isGlobalAssetModalOpen}
        onClose={() => setIsGlobalAssetModalOpen(false)}
      />

      {/* Cinema Theater Fullscreen Modal */}
      {isTheaterOpen && (
        <CinemaTheaterModal
          isOpen={isTheaterOpen}
          onClose={() => {
            setIsTheaterOpen(false);
            setTheaterProject(null);
            setTheaterShots([]);
          }}
          shots={theaterShots}
          aspectRatio={theaterProject?.aspect_ratio || "16:9"}
          targetDuration={theaterProject?.target_duration || 30}
        />
      )}
    </div>
  );
}
