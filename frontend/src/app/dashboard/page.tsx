"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Film, Clock, Sparkles, Clapperboard, ArrowRight, Settings, AlertCircle, RefreshCw } from "lucide-react";
import { api, ProjectListItem } from "@/lib/api";
import { SettingsModal } from "@/components/modals/SettingsModal";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStory, setNewStory] = useState("");
  const [targetDuration, setTargetDuration] = useState(30);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.createProject({
        title: newTitle,
        story: newStory,
        target_duration: targetDuration,
      });
      router.push(`/workspace/${created.id}`);
    } catch (e) {
      console.error("Failed to create project", e);
      alert("创建项目失败，请点击右上角「设置」检查后端 Worker API 服务连接地址");
    }
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
            onClick={() => setIsCreating(true)}
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

        {/* Create Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">新建导演项目</h2>
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
                    placeholder="输入剧本故事梗概或创意简述，稍后可由 AI 导演自动拆解为 Shot..."
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
                    className="px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    创建并进入工作台
                  </button>
                </div>
              </form>
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
                href="/workspace/demo"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>体验 Demo 样例工作台</span>
              </Link>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建项目</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                href={`/workspace/${proj.id}`}
                className="group p-5 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Film className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {proj.target_duration}s
                    </span>
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
            ))}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => {
        setIsSettingsOpen(false);
        loadProjects();
      }} />
    </div>
  );
}
