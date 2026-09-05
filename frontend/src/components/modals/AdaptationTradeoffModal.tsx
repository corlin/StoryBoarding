"use client";

import React, { useState, useEffect } from "react";
import {
  ProjectModel,
  AdaptationTradeoffs,
  AdaptationTradeoffItem,
} from "@/types/shot";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import {
  CheckCircle2,
  Scissors,
  GitMerge,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Loader2,
  BookOpen,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdaptationTradeoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  onRefreshProject?: () => Promise<void>;
}

export const AdaptationTradeoffModal: React.FC<AdaptationTradeoffModalProps> = ({
  isOpen,
  onClose,
  project,
  onRefreshProject,
}) => {
  const [tradeoffs, setTradeoffs] = useState<AdaptationTradeoffs>({
    keep: [],
    cut: [],
    merge: [],
    risk: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  // New item inputs
  const [activeCategory, setActiveCategory] = useState<"keep" | "cut" | "merge" | "risk">("keep");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (!project) return;
    const existing = project.adaptation_tradeoffs || {};
    setTradeoffs({
      keep: existing.keep || [
        {
          id: "k1",
          title: "浓雾渡口的封闭空间",
          desc: "天然的单场景悬疑舞台，省景又聚戏，雾一厚，连自己的手都看不清。",
        },
        {
          id: "k2",
          title: "怀里的旧皮箱/关键道具",
          desc: "全剧最强的悬念实体道具，每集给一眼，指节用力发白。",
        },
      ],
      cut: existing.cut || [
        {
          id: "c1",
          title: "县城当铺与客栈支线",
          desc: "空间跳出渡口，2分钟单集装不下第二个大舞台，直接剪除。",
        },
      ],
      merge: existing.merge || [
        {
          id: "m1",
          title: "岸边问路路人甲乙并入胡二爷",
          desc: "同一个功能（打探各人口风）不需要三张脸，合并由货郎统一承担。",
        },
      ],
      risk: existing.risk || [
        {
          id: "r1",
          title: "全剧困在船上容易闷",
          desc: "对冲策略：每集固定一次外部威胁打入（汽笛、巡查船逼近、水警盘查）。",
        },
      ],
    });
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!newTitle.trim()) {
      notify.error("请输入条目标题");
      return;
    }
    const newItem: AdaptationTradeoffItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      desc: newDesc.trim(),
    };
    setTradeoffs({
      ...tradeoffs,
      [activeCategory]: [...(tradeoffs[activeCategory] || []), newItem],
    });
    setNewTitle("");
    setNewDesc("");
    notify.success("已添加改编决策条目");
  };

  const handleRemoveItem = (cat: "keep" | "cut" | "merge" | "risk", id: string) => {
    setTradeoffs({
      ...tradeoffs,
      [cat]: (tradeoffs[cat] || []).filter((item) => item.id !== id),
    });
  };

  const handleSave = async () => {
    if (!project?.id) return;
    try {
      setIsSaving(true);
      await api.updateProject(project.id, {
        adaptation_tradeoffs: tradeoffs,
      });
      notify.success("✨ 大纲改编取舍矩阵已成功保存，全局生效！");
      if (onRefreshProject) {
        await onRefreshProject();
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.detail || err?.message || "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      key: "keep" as const,
      label: "保留 (Keep)",
      icon: CheckCircle2,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/5",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      placeholder: "必留的核心戏剧动作或标志性实体道具",
    },
    {
      key: "cut" as const,
      label: "砍掉 (Cut)",
      icon: Scissors,
      color: "text-red-400",
      borderColor: "border-red-500/30",
      bgColor: "bg-red-500/5",
      badgeColor: "bg-red-500/20 text-red-300",
      placeholder: "剪除的繁杂旁支或高成本多余场景",
    },
    {
      key: "merge" as const,
      label: "合并 (Merge)",
      icon: GitMerge,
      color: "text-blue-400",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/5",
      badgeColor: "bg-blue-500/20 text-blue-300",
      placeholder: "合并功能重叠的角色、对话或场景",
    },
    {
      key: "risk" as const,
      label: "风险与对冲 (Risk)",
      icon: AlertTriangle,
      color: "text-amber-400",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/5",
      badgeColor: "bg-amber-500/20 text-amber-300",
      placeholder: "结构隐患与相对应的对冲剧作设计",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>大纲改编取舍矩阵</span>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-mono">
                  STAGE 01 · OUTLINE
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                来自专业制片人改编法则：明确结构取舍，杜绝多余角色与废戏，并作为强约束注入 AI 剧本生成。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>保存矩阵</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Quadrants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-1 min-h-0 overflow-y-auto pr-1">
          {columns.map((col) => {
            const Icon = col.icon;
            const items = tradeoffs[col.key] || [];
            return (
              <div
                key={col.key}
                className={cn(
                  "p-3 rounded-xl border flex flex-col min-h-[300px]",
                  col.bgColor,
                  col.borderColor
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("w-4 h-4", col.color)} />
                    <span className="text-xs font-bold text-foreground">{col.label}</span>
                  </div>
                  <span className={cn("text-[10px] font-mono px-1.5 py-0.2 rounded font-bold", col.badgeColor)}>
                    {items.length}
                  </span>
                </div>

                {/* Items List */}
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {items.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-muted-foreground">
                      <p className="text-[11px] opacity-60">暂无{col.label}条目</p>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-background/90 border border-border/80 rounded-lg space-y-1 relative group hover:border-border transition-all shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-foreground leading-tight">{item.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(col.key, item.id)}
                            className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {item.desc && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Add Form at Bottom */}
        <div className="mt-3.5 p-3 bg-secondary/40 border border-border/80 rounded-xl space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">快速登记改编取舍条目：</span>
            <div className="flex items-center gap-1">
              {(["keep", "cut", "merge", "risk"] as const).map((cat) => {
                const labels: Record<string, string> = {
                  keep: "✅ 保留",
                  cut: "✂️ 砍掉",
                  merge: "🔀 合并",
                  risk: "⚠️ 风险",
                };
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer border",
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {labels[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="条目标题 (例如: 合并路人甲乙并入胡二爷)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="原因与具体取舍说明 (例如: 打探消息不需要三张脸，一人足矣)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="sm:col-span-2 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            ＋ 添加至「{activeCategory === "keep" ? "保留" : activeCategory === "cut" ? "砍掉" : activeCategory === "merge" ? "合并" : "风险"}」分类
          </button>
        </div>
      </div>
    </div>
  );
};
