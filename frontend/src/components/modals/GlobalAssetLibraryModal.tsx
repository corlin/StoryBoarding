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
  ShieldCheck,
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
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleImport = async (asset: any) => {
    if (!currentProjectId) {
      notify.info("请在具体项目内打开以执行导入");
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
      setAssets(assets.filter((a) => a.id !== id));
      notify.success(`已从全局库移除「${name}」`);
    } catch (e: any) {
      notify.error("删除失败");
    }
  };

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.visual_anchor || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>用户级 · 跨项目全局资产库</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 font-mono">
                  GLOBAL ASSET LIBRARY
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                独立于单一项目保存。沉淀您的主角班底、经典场景与传世道具，随时一键跨项目导入复用。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:border-primary"
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
                    className="p-3 bg-secondary/30 hover:bg-secondary/50 border border-border/80 rounded-xl flex flex-col justify-between gap-3 group transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="aspect-video w-full rounded-lg bg-black/40 border border-border overflow-hidden relative">
                        {asset.reference_image_url ? (
                          <img
                            src={normalizeAssetUrl(asset.reference_image_url)}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            无基准预览图
                          </div>
                        )}
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
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-foreground truncate">{asset.name}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {asset.visual_anchor || "无特征描述"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => handleDelete(asset.id, asset.name)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="从全局库移除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {currentProjectId && (
                        <button
                          type="button"
                          disabled={isImporting}
                          onClick={() => handleImport(asset)}
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
      </div>
    </div>
  );
};
