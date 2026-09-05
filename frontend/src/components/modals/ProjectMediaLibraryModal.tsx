"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Image as ImageIcon,
  FileText,
  Trash2,
  RotateCcw,
  Sparkles,
  Download,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Check,
  Search,
  HardDrive,
  Copy,
} from "lucide-react";
import { api, normalizeAssetUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";

interface ProjectMediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onRestoreSuccess?: () => void;
}

type TabType = "all_active" | "shots" | "assets" | "prompts" | "orphans";

export const ProjectMediaLibraryModal: React.FC<ProjectMediaLibraryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onRestoreSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("all_active");
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<{
    stats: {
      total_active_images: number;
      total_prompts: number;
      total_replaced_images: number;
      estimated_replaced_mb: string;
    };
    active_images: any[];
    prompts: any[];
    replaced_images: any[];
  } | null>(null);

  const fetchLibrary = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      const res = await api.getProjectMediaLibrary(projectId);
      setData(res);
    } catch (e: any) {
      notify.error("加载素材库失败: " + (e?.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchLibrary();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleRestoreImage = async (shotId: string, imageUrl: string) => {
    if (!projectId) return;
    try {
      setRestoringId(`${shotId}-${imageUrl}`);
      const res = await api.restoreLibraryImage(projectId, shotId, imageUrl);
      notify.success(res.message || "已恢复为当前分镜画面");
      await fetchLibrary();
      if (onRestoreSuccess) onRestoreSuccess();
    } catch (e: any) {
      notify.error("恢复失败: " + (e?.message || e));
    } finally {
      setRestoringId(null);
    }
  };

  const handleCleanOrphans = async () => {
    if (!projectId || !data?.replaced_images?.length) return;
    const confirmClean = window.confirm(
      `确定要清理全部 ${data.stats.total_replaced_images} 张被替换的历史打样素材吗？\n清理后将释放约 ${data.stats.estimated_replaced_mb} MB 存储空间，此操作不可撤销。`
    );
    if (!confirmClean) return;

    try {
      setIsCleaning(true);
      const res = await api.cleanProjectOrphanAssets(projectId);
      notify.success(res.message || "清理成功");
      await fetchLibrary();
      if (onRestoreSuccess) onRestoreSuccess();
    } catch (e: any) {
      notify.error("清理失败: " + (e?.message || e));
    } finally {
      setIsCleaning(false);
    }
  };

  // Filtering
  const activeImages = (data?.active_images || []).filter((img) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      img.title?.toLowerCase().includes(q) ||
      img.subtitle?.toLowerCase().includes(q) ||
      img.prompt?.toLowerCase().includes(q)
    );
  });

  const shotImages = activeImages.filter((img) => img.type === "shot");
  const assetImages = activeImages.filter((img) => img.type !== "shot");

  const prompts = (data?.prompts || []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.target?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q);
  });

  const replacedImages = (data?.replaced_images || []).filter((img) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return img.title?.toLowerCase().includes(q) || img.action?.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold border border-sky-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  全项目多模态素材库 · MEDIA LIBRARY
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Reelbench 工业标准
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                出图内容寻址落盘，重新打样不覆盖旧图，聚合管理当前在用与被替换素材
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Strip (Reelbench Header Stats) */}
        <div className="px-6 py-2.5 bg-secondary/40 border-b border-border/80 flex items-center justify-between gap-4 flex-wrap text-xs select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>在用图片:</span>
              <span className="font-mono font-bold text-emerald-400">
                {data?.stats?.total_active_images ?? 0}
              </span>
            </div>
            <div className="w-px h-3.5 bg-border/80" />
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>提示词素材:</span>
              <span className="font-mono font-bold text-purple-400">
                {data?.stats?.total_prompts ?? 0}
              </span>
            </div>
            <div className="w-px h-3.5 bg-border/80" />
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Trash2 className="w-4 h-4 text-amber-400" />
              <span>被替换掉的:</span>
              <span className="font-mono font-bold text-amber-400">
                {data?.stats?.total_replaced_images ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                (~{data?.stats?.estimated_replaced_mb ?? "0"} MB)
              </span>
            </div>
          </div>

          {data && data.stats.total_replaced_images > 0 && (
            <button
              onClick={handleCleanOrphans}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
              title="彻底删除项目中所有未被引用的历史打样图，释放云端空间"
            >
              {isCleaning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>一键清理废弃素材 ({data.stats.total_replaced_images})</span>
            </button>
          )}
        </div>

        {/* Filter Navigation & Search Bar */}
        <div className="px-6 py-3 border-b border-border/80 flex items-center justify-between gap-4 flex-wrap bg-card/60">
          <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg border border-border/80 text-xs">
            <button
              onClick={() => setActiveTab("all_active")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer",
                activeTab === "all_active"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              全部在用 ({data?.stats?.total_active_images ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("shots")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer",
                activeTab === "shots"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              分镜图 ({shotImages.length})
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer",
                activeTab === "assets"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              人设/场景/道具 ({assetImages.length})
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer",
                activeTab === "prompts"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              提示词 ({data?.stats?.total_prompts ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("orphans")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1",
                activeTab === "orphans"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-xs"
                  : "text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10"
              )}
            >
              <span>回收站·被替换</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                {data?.stats?.total_replaced_images ?? 0}
              </span>
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索素材标题、提示词、动作..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[350px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">正在盘点全项目多模态素材库...</p>
            </div>
          ) : activeTab === "prompts" ? (
            /* Prompts View */
            <div className="space-y-3">
              {prompts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  暂无匹配的提示词素材
                </div>
              ) : (
                prompts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-border/80 bg-background/60 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-foreground">{p.target}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(p.content);
                          notify.success("提示词已复制到剪贴板");
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="复制提示词"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground bg-secondary/50 p-2.5 rounded-lg select-all break-all leading-relaxed">
                      {p.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "orphans" ? (
            /* Orphaned / Replaced Images View */
            <div>
              <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-300">
                    没有任何条目直接指向它们了，但文件依然完整保存在存储中。
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    出图是内容寻址落盘的，重新生成不会覆盖旧图。改坏了想退回上一版，直接点击「恢复为该镜」即可无损复原。
                  </p>
                </div>
              </div>

              {replacedImages.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  暂无被替换掉的废弃素材，项目素材整洁！
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {replacedImages.map((img) => {
                    const isRestoring = restoringId === `${img.shot_id}-${img.image_url}`;
                    return (
                      <div
                        key={img.id}
                        className="group relative rounded-xl border border-border bg-card/60 overflow-hidden flex flex-col hover:border-amber-500/60 transition-all shadow-xs"
                      >
                        <div className="aspect-video w-full bg-muted overflow-hidden relative">
                          <img
                            src={normalizeAssetUrl(img.image_url)}
                            alt={img.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 border border-amber-500/30">
                            已替换
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold text-foreground truncate">
                              {img.title}
                            </h4>
                            {img.action && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {img.action}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                            <a
                              href={normalizeAssetUrl(img.image_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="在新标签页查看高清原图"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={() => handleRestoreImage(img.shot_id, img.image_url)}
                              disabled={isRestoring}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all cursor-pointer disabled:opacity-50"
                              title="将这张历史打样恢复为该镜头的当前主图"
                            >
                              {isRestoring ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>恢复为该镜</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Active Images View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(activeTab === "shots" ? shotImages : activeTab === "assets" ? assetImages : activeImages).map(
                (img) => (
                  <div
                    key={img.id}
                    className="group rounded-xl border border-border bg-card/60 overflow-hidden flex flex-col hover:border-primary/60 transition-all shadow-xs"
                  >
                    <div className="aspect-video w-full bg-muted overflow-hidden relative">
                      <img
                        src={normalizeAssetUrl(img.image_url)}
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-400 border border-emerald-500/30">
                        正在使用
                      </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between gap-1.5">
                      <div>
                        <h4 className="text-xs font-semibold text-foreground truncate">
                          {img.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {img.subtitle}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-mono uppercase text-[10px]">
                          {img.type}
                        </span>
                        <a
                          href={normalizeAssetUrl(img.image_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <span>查看大图</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span>提示：素材库集中盘点全片资产，支持随时回滚历史打样</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-muted font-medium transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
