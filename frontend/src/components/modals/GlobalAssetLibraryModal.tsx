"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Users,
  MapPin,
  Package,
  Layers,
  Trash2,
  Download,
  Loader2,
  Search,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Mic,
  Calendar,
  Tag,
} from "lucide-react";
import { api, normalizeAssetUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { ProjectModel } from "@/types/shot";
import { cn } from "@/lib/utils";

interface GlobalAssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
  onImportSuccess?: () => void;
}

export const GlobalAssetLibraryModal: React.FC<GlobalAssetLibraryModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "character" | "location" | "prop">("all");
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [hasCopiedDna, setHasCopiedDna] = useState(false);

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const res = await api.getGlobalAssets(activeTab === "all" ? undefined : activeTab);
      setAssets(res.assets || []);
    } catch (e: any) {
      console.error(e);
      notify.error(e?.message || "获取全局资产库失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAssets();
    } else {
      setSelectedAsset(null);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleImport = async (asset: any) => {
    if (!currentProjectId) {
      notify.info("请在具体项目工作台内打开以执行导入");
      return;
    }
    try {
      setImportingId(asset.id);
      await api.importGlobalAssetToProject(asset.id, currentProjectId);
      notify.success(`✨ 已成功将「${asset.name}」导入到当前工程！`);
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (e: any) {
      console.error(e);
      notify.error(e?.message || "导入失败");
    } finally {
      setImportingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteGlobalAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      if (selectedAsset?.id === id) {
        setSelectedAsset(null);
      }
      notify.success(`已从全局库移除「${name}」`);
    } catch (e: any) {
      notify.error("删除失败");
    }
  };

  const handleCopyDna = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setHasCopiedDna(true);
    notify.success("📋 角色外貌特征提示词已复制至剪贴板！");
    setTimeout(() => setHasCopiedDna(false), 2000);
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.visual_anchor || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4 shrink-0">
          <div className="flex items-center gap-3">
            {selectedAsset ? (
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回资产列表</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Layers className="w-5 h-5" />
              </div>
            )}

            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                {selectedAsset ? (
                  <>
                    <span>{selectedAsset.name}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded font-mono font-bold",
                        selectedAsset.asset_type === "character"
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          : selectedAsset.asset_type === "location"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      )}
                    >
                      {selectedAsset.asset_type === "character"
                        ? "角色定妆档案"
                        : selectedAsset.asset_type === "location"
                        ? "场景空间锚点"
                        : "核心道具档案"}
                    </span>
                  </>
                ) : (
                  <>
                    <span>用户级 · 跨项目全局资产库</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 font-mono">
                      GLOBAL ASSET LIBRARY
                    </span>
                  </>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedAsset
                  ? "查看该资产的定妆基准、外貌特征提示词、配音音色与跨工程复用配置"
                  : "独立于单一项目保存。沉淀您的主角班底、经典场景与传世道具，随时一键跨项目导入复用。"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="关闭 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= CONDITIONAL CONTENT: DETAIL VIEW vs GRID LIST ================= */}
        {selectedAsset ? (
          /* ================= IN-MODAL DETAIL INSPECTOR ================= */
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: High-Res Reference Image & Actions */}
              <div className="lg:col-span-6 space-y-3">
                <div className="aspect-video w-full rounded-xl bg-black/60 border border-border overflow-hidden relative shadow-lg group">
                  {selectedAsset.reference_image_url ? (
                    <img
                      src={normalizeAssetUrl(selectedAsset.reference_image_url)}
                      alt={selectedAsset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Layers className="w-8 h-8 opacity-30" />
                      <span className="text-xs">暂无基准定妆图</span>
                    </div>
                  )}

                  {selectedAsset.reference_image_url && (
                    <a
                      href={normalizeAssetUrl(selectedAsset.reference_image_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-[11px] font-medium border border-white/20 flex items-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer opacity-80 hover:opacity-100"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>查看原图</span>
                    </a>
                  )}

                  <span
                    className={cn(
                      "absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold shadow-md",
                      selectedAsset.asset_type === "character"
                        ? "bg-purple-600 text-white"
                        : selectedAsset.asset_type === "location"
                        ? "bg-amber-500 text-black"
                        : "bg-emerald-600 text-white"
                    )}
                  >
                    {selectedAsset.asset_type === "character"
                      ? "16:9 角色三区定妆"
                      : selectedAsset.asset_type === "location"
                      ? "场景空间光影"
                      : "道具特写"}
                  </span>
                </div>

                {/* Primary Action Buttons Bar */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedAsset.id, selectedAsset.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>从全局库移除</span>
                  </button>

                  {currentProjectId ? (
                    <button
                      type="button"
                      disabled={importingId === selectedAsset.id}
                      onClick={() => handleImport(selectedAsset)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {importingId === selectedAsset.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>导入至当前项目</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      💡 在工程工作台内打开可直接导入此资产
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Visual Anchor DNA & Deep Metadata */}
              <div className="lg:col-span-6 space-y-4">
                {/* Visual Anchor / Prompt Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>角色外貌特征提示词</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyDna(selectedAsset.visual_anchor || "")}
                      disabled={!selectedAsset.visual_anchor}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-purple-300 hover:text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {hasCopiedDna ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>复制提示词</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-xl bg-zinc-950/80 border border-border/80 p-3.5 text-xs font-mono text-zinc-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                    {selectedAsset.visual_anchor || (
                      <span className="text-muted-foreground italic font-sans">暂无提示词特征描述</span>
                    )}
                  </div>
                </div>

                {/* Structured Metadata Inspector */}
                <div className="rounded-xl bg-secondary/30 border border-border/70 p-3.5 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>人物与场景设定档案 (Specifications)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Role / Category */}
                    {selectedAsset.metadata?.role && (
                      <div className="p-2.5 rounded-lg bg-card/60 border border-border/60">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">身份角色 (Role)</span>
                        <span className="font-semibold text-foreground">{selectedAsset.metadata.role}</span>
                      </div>
                    )}

                    {/* Personality */}
                    {selectedAsset.metadata?.personality && (
                      <div className="p-2.5 rounded-lg bg-card/60 border border-border/60">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">性格特征 (Personality)</span>
                        <span className="font-semibold text-foreground">{selectedAsset.metadata.personality}</span>
                      </div>
                    )}

                    {/* Location Lighting Style */}
                    {selectedAsset.metadata?.lighting_style && (
                      <div className="p-2.5 rounded-lg bg-card/60 border border-border/60">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">空间采光氛围 (Lighting)</span>
                        <span className="font-semibold text-foreground">{selectedAsset.metadata.lighting_style}</span>
                      </div>
                    )}

                    {/* Prop Category */}
                    {selectedAsset.metadata?.category && (
                      <div className="p-2.5 rounded-lg bg-card/60 border border-border/60">
                        <span className="text-[11px] text-muted-foreground block mb-0.5">道具尺度类别 (Scale)</span>
                        <span className="font-semibold text-foreground">{selectedAsset.metadata.category}</span>
                      </div>
                    )}

                    {/* Saved Date */}
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/60">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">入库时间 (Saved At)</span>
                      <span className="font-mono text-zinc-300">
                        {selectedAsset.created_at
                          ? new Date(selectedAsset.created_at).toLocaleString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "历史归档"}
                      </span>
                    </div>

                    {/* Asset ID */}
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/60">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">全局资产唯一指纹 (Asset ID)</span>
                      <span className="font-mono text-[10px] text-zinc-400 truncate block">
                        {selectedAsset.id}
                      </span>
                    </div>
                  </div>

                  {/* Voice Acoustic DNA (TTS) */}
                  {selectedAsset.metadata?.voice_dna && (
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs">
                        <Mic className="w-3.5 h-3.5" />
                        <span>角色音色与英文配音提示词</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-mono leading-relaxed bg-zinc-950/60 p-2 rounded border border-border/40">
                        {selectedAsset.metadata.voice_dna}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= ASSETS GRID LIST VIEW ================= */
          <>
            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60 mb-4 shrink-0">
              <div className="flex items-center gap-1.5 bg-secondary/60 p-1 rounded-lg border border-border">
                {[
                  { key: "all", label: "全部资产", icon: Layers },
                  { key: "character", label: "角色", icon: Users },
                  { key: "location", label: "场景", icon: MapPin },
                  { key: "prop", label: "道具", icon: Package },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key as any)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        activeTab === t.key
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="搜索全局资产名称/特征..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Assets Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">加载全局资产库中...</span>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl text-muted-foreground p-6 text-center space-y-2">
                  <Layers className="w-8 h-8 opacity-40 text-muted-foreground" />
                  <p className="text-xs font-medium">全局资产库暂无此类资产</p>
                  <p className="text-[11px] text-muted-foreground/70 max-w-sm">
                    在任意项目的【设定集 · 角色/场景/道具】面板中，点击「存入全局资产库」，即可在这里沉淀跨项目资产。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredAssets.map((asset) => {
                    const isImporting = importingId === asset.id;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className="p-3 bg-secondary/30 hover:bg-secondary/60 hover:border-purple-500/50 border border-border/80 rounded-xl flex flex-col justify-between gap-3 group transition-all cursor-pointer shadow-xs hover:shadow-lg"
                      >
                        <div className="space-y-2.5">
                          <div className="aspect-video w-full rounded-lg bg-black/40 border border-border overflow-hidden relative">
                            {asset.reference_image_url ? (
                              <img
                                src={normalizeAssetUrl(asset.reference_image_url)}
                                alt={asset.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                无基准预览图
                              </div>
                            )}

                            {/* Badge */}
                            <span
                              className={cn(
                                "absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold shadow-xs",
                                asset.asset_type === "character"
                                  ? "bg-purple-500 text-white"
                                  : asset.asset_type === "location"
                                  ? "bg-amber-500 text-black"
                                  : "bg-emerald-500 text-white"
                              )}
                            >
                              {asset.asset_type === "character"
                                ? "角色"
                                : asset.asset_type === "location"
                                ? "场景"
                                : "道具"}
                            </span>

                            {/* Hover Eye Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-2xs">
                              <Eye className="w-4 h-4 text-purple-400" />
                              <span>点击查看档案详情</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-foreground truncate group-hover:text-purple-300 transition-colors">
                                {asset.name}
                              </h4>
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-purple-400">
                                详情 <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                              {asset.visual_anchor || "无特征描述"}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div
                          className="flex items-center justify-between pt-2 border-t border-border/60"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(asset.id, asset.name);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="从全局库移除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {currentProjectId && (
                            <button
                              type="button"
                              disabled={isImporting}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImport(asset);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              {isImporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>导入至当前项目</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
