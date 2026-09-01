"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Film, Clock, Sparkles, Clapperboard, ArrowRight, Settings, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { api, ProjectListItem } from "@/lib/api";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import { ProjectCreationProgress } from "@/components/modals/ProjectCreationProgress";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newStory, setNewStory] = useState("");
  const [targetDuration, setTargetDuration] = useState(30);

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
  }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmittingProject(true);
    setCreationError(null);
    setCreationComplete(false);
    setCreationProgress(5);
    setCreationStage(0);
    setCreationElapsed(0);

    const startTime = Date.now();

    // Truthful, smooth organic progress interpolation engine
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Number(((Date.now() - startTime) / 1000).toFixed(1));
      setCreationElapsed(elapsed);

      if (elapsed < 0.4) {
        // Stage 0: 实体建库与元数据初始化 (0~0.4s)
        setCreationStage(0);
        setCreationProgress(Math.min(25, Math.round(5 + (elapsed / 0.4) * 20)));
      } else {
        // Stage 1: 好莱坞 AI 导演大模型深度拆镜 (Main thinking phase: 0.4s ~ 10s)
        // Smooth asymptotic curve climbing from 25% to ~78% during LLM breakdown
        setCreationStage(1);
        const thinkingProgress = Math.min(78, Math.round(25 + (1 - Math.exp(-(elapsed - 0.4) / 3.0)) * 53));
        setCreationProgress(thinkingProgress);
      }
    }, 50);

    try {
      const created = await api.createProject({
        title: newTitle,
        story: newStory,
        target_duration: targetDuration,
      });

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      // Fast visual ripple on return: Stage 2 -> Stage 3 -> Complete 100%
      setCreationStage(2);
      setCreationProgress(88);
      await new Promise((r) => setTimeout(r, 100));

      setCreationStage(3);
      setCreationProgress(96);
      await new Promise((r) => setTimeout(r, 100));

      setCreationStage(4);
      setCreationProgress(100);
      setCreationComplete(true);

      // Snappy transition into workspace
      setTimeout(() => {
        setIsCreating(false);
        setIsSubmittingProject(false);
        router.push(`/workspace?id=${created.id}`);
      }, 200);
    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      console.error("Failed to create project", err);
      setCreationError(err?.message || "创建项目失败，请检查网络或点击配置 Worker 服务与 API Key");
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation */}
      <header className="border-b border-border bg-card/50 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Clapperboard className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">AI Director Workspace</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="后端连接与 AI 模型设置"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsSubmittingProject(false);
              setCreationError(null);
              setIsCreating(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>创建新项目</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">我的分镜项目</h1>
            <p className="text-sm text-muted-foreground mt-1">管理你的故事板脚本与双向协同工程</p>
          </div>
        </div>

        {/* Backend Connection Error Banner */}
        {hasError && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-500">无法连接到后端 Cloudflare Worker 服务</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  请点击右上角「<strong>设置 ⚙️</strong>」按钮，填入你在 Cloudflare 控制台中已部署的 Worker 真实域名（例如：<code>https://storyboard-backend.xxxx.workers.dev</code>）。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors shrink-0"
              >
                配置后端地址
              </button>
              <button
                onClick={loadProjects}
                className="p-1.5 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition-colors"
                title="重新连接"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Create Modal / Creation Progress Flow */}
        {isCreating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl transition-all duration-300">
              {isSubmittingProject ? (
                <ProjectCreationProgress
                  title={newTitle}
                  story={newStory}
                  targetDuration={targetDuration}
                  progressPercent={creationProgress}
                  elapsedSeconds={creationElapsed}
                  activeStageIndex={creationStage}
                  isComplete={creationComplete}
                  errorMessage={creationError}
                  onRetry={() => handleCreate()}
                  onCancel={handleCancelCreate}
                  onSkipToWorkspace={() => {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    setIsCreating(false);
                    setIsSubmittingProject(false);
                    router.push("/workspace");
                  }}
                  onOpenSettings={() => {
                    setIsCreating(false);
                    setIsSubmittingProject(false);
                    setIsSettingsOpen(true);
                  }}
                />
              ) : (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span>新建好莱坞导演分镜项目</span>
                  </h2>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">项目名称</label>
                      <input
                        type="text"
                        required
                        placeholder="例如：偷油的老鼠 (Kitchen Mouse)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">故事描述 (可选)</label>
                      <textarea
                        rows={3}
                        placeholder="输入剧本故事梗概或创意简述，稍后将由 AI 导演自动规划 6 阶段镜头节拍..."
                        value={newStory}
                        onChange={(e) => setNewStory(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">目标总时长 (秒)</label>
                      <input
                        type="number"
                        min="5"
                        max="600"
                        value={targetDuration}
                        onChange={(e) => setTargetDuration(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-4 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>创建并进入工作台</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl border border-border/40 bg-card/30 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="h-64 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8">
            <Film className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-medium text-base mb-1">暂无项目</h3>
            <p className="text-xs text-muted-foreground mb-4">开始创建你的第一个分镜头故事板工程</p>
            <div className="flex gap-3">
              <Link
                href="/workspace?id=demo"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>体验 Demo 样例工作台</span>
              </Link>
              <button
                onClick={() => {
                  setIsSubmittingProject(false);
                  setCreationError(null);
                  setIsCreating(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建项目</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const isBuiltIn = proj.id === "demo" || proj.id === "demo-matrix-cyber-master";
              return (
                <Link
                  key={proj.id}
                  href={`/workspace?id=${proj.id}`}
                  className="group p-5 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between relative"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <Film className="w-4 h-4" />
                      </span>
                      <div className="flex items-center gap-2">
                        {isBuiltIn ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                            系统内置
                          </span>
                        ) : (
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
                        )}
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {proj.target_duration}s
                        </span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                      {proj.title}
                    </h3>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{proj.shot_count || 0} 个镜头</span>
                    <span className="group-hover:translate-x-1 transition-transform text-primary flex items-center gap-1">
                      打开工作台 <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

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

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => {
        setIsSettingsOpen(false);
        loadProjects();
      }} />
    </div>
  );
}
