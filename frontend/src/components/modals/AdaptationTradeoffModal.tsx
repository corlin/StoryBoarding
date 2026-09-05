"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ProjectModel,
  AdaptationTradeoffs,
  AdaptationTradeoffItem,
  PayoffBeatItem,
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
  Target,
  Zap,
  Flame,
  Activity,
  Layers,
  HelpCircle,
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
  const [activeTab, setActiveTab] = useState<"tradeoffs" | "beats">("tradeoffs");
  const [dramaticCore, setDramaticCore] = useState("");
  const [scaleDesc, setScaleDesc] = useState("6 集 · 单集 2 分钟 · 抽核模式");
  const [tradeoffs, setTradeoffs] = useState<AdaptationTradeoffs>({
    keep: [],
    cut: [],
    merge: [],
    risk: [],
    payoff_beats: [],
  });
  const [payoffBeats, setPayoffBeats] = useState<PayoffBeatItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // New item inputs
  const [activeCategory, setActiveCategory] = useState<"keep" | "cut" | "merge" | "risk">("keep");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const totalEpisodes = project?.sequences?.length || 6;

  useEffect(() => {
    if (!project) return;
    const existing = project.adaptation_tradeoffs || {};
    setDramaticCore(existing.dramatic_core || "浓雾渡口的一船陌生人，各自揣着说不出口的来路，雾散之前每个人都得亮一次底。");
    setScaleDesc(existing.scale_desc || `${totalEpisodes} 集 · 单集 2 分钟 · 抽核模式`);
    setTradeoffs({
      keep: existing.keep || [
        {
          id: "k1",
          title: "浓雾渡口的封闭空间",
          desc: "天然的单场景悬疑舞台，省景又聚戏，雾一厚，连自己的手都看不清。",
        },
        {
          id: "k2",
          title: "沈知微怀里的旧皮箱",
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
          title: "全剧困在船上容易发闷",
          desc: "固定每集外部威胁打进来：巡查船汽笛、突发暴雨、老周反常点破。",
        },
      ],
    });

    setPayoffBeats(existing.payoff_beats || [
      {
        id: "B01",
        type: "悬念钩",
        weight: "minor",
        episode: 1,
        setup: "皮箱谁都不许碰",
        payoff: "全船瞬间安静，各怀心思",
      },
      {
        id: "B02",
        type: "身份揭破",
        weight: "major",
        episode: 3,
        setup: "陆行远的右手始终揣在大衣口袋里",
        payoff: "胡二爷一句玩笑逼得他当众掏出口袋——是一方旧砚，砚底刻着县衙的印",
      },
      {
        id: "B03",
        type: "反转",
        weight: "major",
        episode: 5,
        setup: "老周四十年不问客人来路",
        payoff: "老周头一次开口，点破沈知微要去的县城根本没有接应她的人",
      },
      {
        id: "B04",
        type: "收束",
        weight: "minor",
        episode: 6,
        setup: "雾开始散，栈桥灯灭",
        payoff: "皮箱当众打开，一摞状纸与旧砚拼出冤案，船上谎言尽数落地",
      },
    ]);
  }, [project, totalEpisodes]);

  // Reelbench Beat-Gap Gate Calculation (maxBeatGap <= 3)
  const beatGapAnalysis = useMemo(() => {
    const activeEpSet = new Set(payoffBeats.map((b) => b.episode));
    const sortedEps = Array.from(activeEpSet).sort((a, b) => a - b);
    
    let maxGap = 0;
    if (sortedEps.length === 0) {
      maxGap = totalEpisodes;
    } else {
      // gap from E1 to first beat
      maxGap = Math.max(maxGap, sortedEps[0] - 1);
      // gap between beats
      for (let i = 0; i < sortedEps.length - 1; i++) {
        maxGap = Math.max(maxGap, sortedEps[i + 1] - sortedEps[i]);
      }
      // gap from last beat to end
      maxGap = Math.max(maxGap, totalEpisodes - sortedEps[sortedEps.length - 1]);
    }

    const passed = maxGap <= 3;
    return {
      passed,
      maxGap,
      sortedEps,
    };
  }, [payoffBeats, totalEpisodes]);

  if (!isOpen) return null;

  const handleAddItem = (category: "keep" | "cut" | "merge" | "risk") => {
    if (!newTitle.trim()) return;
    const newItem: AdaptationTradeoffItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      desc: newDesc.trim() || "导演自定义取舍设计",
    };
    setTradeoffs({
      ...tradeoffs,
      [category]: [...(tradeoffs[category] || []), newItem],
    });
    setNewTitle("");
    setNewDesc("");
  };

  const handleDeleteItem = (category: "keep" | "cut" | "merge" | "risk", id: string) => {
    setTradeoffs({
      ...tradeoffs,
      [category]: (tradeoffs[category] || []).filter((item) => item.id !== id),
    });
  };

  const handleAddPayoffBeat = () => {
    const nextIdx = payoffBeats.length + 1;
    const newBeat: PayoffBeatItem = {
      id: `B${String(nextIdx).padStart(2, "0")}`,
      type: "反转",
      weight: "minor",
      episode: Math.min(nextIdx + 1, totalEpisodes),
      setup: "前情因果伏笔设计...",
      payoff: "爆发性反转兑现设计...",
    };
    setPayoffBeats([...payoffBeats, newBeat]);
  };

  const handleDeletePayoffBeat = (id: string) => {
    setPayoffBeats(payoffBeats.filter((b) => b.id !== id));
  };

  const handleUpdatePayoffBeat = (id: string, updates: Partial<PayoffBeatItem>) => {
    setPayoffBeats(payoffBeats.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const handleSave = async () => {
    if (!project) return;
    try {
      setIsSaving(true);
      const payload: AdaptationTradeoffs = {
        dramatic_core: dramaticCore.trim(),
        scale_desc: scaleDesc.trim(),
        keep: tradeoffs.keep || [],
        cut: tradeoffs.cut || [],
        merge: tradeoffs.merge || [],
        risk: tradeoffs.risk || [],
        payoff_beats: payoffBeats,
      };

      await api.updateProjectAdaptationTradeoffs(project.id, payload);
      notify.success("✨ 大纲改编取舍与爽点雷达已成功同步保存！");
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
      placeholder: "原著最具辨识度的核心高光/标志性视觉",
    },
    {
      key: "cut" as const,
      label: "砍掉 (Cut)",
      icon: Scissors,
      color: "text-rose-400",
      borderColor: "border-rose-500/30",
      bgColor: "bg-rose-500/5",
      badgeColor: "bg-rose-500/20 text-rose-300",
      placeholder: "旁支无用场景、拖慢节奏的副线人物",
    },
    {
      key: "merge" as const,
      label: "合并 (Merge)",
      icon: GitMerge,
      color: "text-sky-400",
      borderColor: "border-sky-500/30",
      bgColor: "bg-sky-500/5",
      badgeColor: "bg-sky-500/20 text-sky-300",
      placeholder: "功能相似的角色或多合一的关键空间",
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4 shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>STAGE 01 · 大纲改编与爽点雷达工作室</span>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-mono">
                  Reelbench 标准
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                原著小说提炼、四象限结构取舍与爽点轴门控（maxBeatGap ≤ 3），作为强约束注入后续全剧本
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
              <span>保存大纲与爽点</span>
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

        {/* Tab Switcher & Spec Summary */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/80 mb-3 flex-wrap">
          <div className="flex items-center bg-secondary/80 p-1 rounded-lg border border-border/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("tradeoffs")}
              className={cn(
                "px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "tradeoffs"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>改编四象限取舍 (Tradeoffs)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("beats")}
              className={cn(
                "px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "beats"
                  ? "bg-purple-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>爽点表与门控 (Payoff Matrix)</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                {payoffBeats.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>规模: <strong>{scaleDesc}</strong></span>
          </div>
        </div>

        {/* Body Content */}
        {activeTab === "tradeoffs" ? (
          /* Tab 1: Dramatic Core & 4 Quadrants */
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            {/* Dramatic Core Box (.kernel in Reelbench) */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3 shrink-0">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-purple-300">
                    剧作改编核心内核 (Dramatic Core)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    抽核模式 · 贯穿全剧
                  </span>
                </div>
                <input
                  type="text"
                  value={dramaticCore}
                  onChange={(e) => setDramaticCore(e.target.value)}
                  placeholder="输入故事最深层的戏核：一句话点透全剧冲突与终局..."
                  className="w-full bg-transparent border-none p-0 text-xs font-medium text-foreground focus:outline-none placeholder:text-muted-foreground/50"
                />
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
                      "p-3 rounded-xl border flex flex-col min-h-[260px]",
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
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground text-xs">
                          <p>暂无条目</p>
                          <p className="text-[10px] mt-1 opacity-70">{col.placeholder}</p>
                        </div>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            className="group p-2.5 rounded-lg bg-card/80 border border-border/70 hover:border-border transition-all relative"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-xs font-bold text-foreground leading-snug">{item.title}</h4>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(col.key, item.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 p-0.5 transition-opacity"
                                title="删除条目"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Bar */}
            <div className="p-3 bg-secondary/40 rounded-xl border border-border shrink-0 flex flex-col sm:flex-row items-center gap-2.5">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs font-bold text-muted-foreground shrink-0">添加条目至:</span>
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value as any)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="keep">保留 (Keep)</option>
                  <option value="cut">砍掉 (Cut)</option>
                  <option value="merge">合并 (Merge)</option>
                  <option value="risk">风险 (Risk)</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="条目核心提要 (如: 浓雾渡口的封闭空间)..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full sm:w-56 bg-background border border-border rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-primary"
              />

              <input
                type="text"
                placeholder="剧作决策理由与对冲设计..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full flex-1 bg-background border border-border rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem(activeCategory);
                }}
              />

              <button
                type="button"
                onClick={() => handleAddItem(activeCategory)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-md transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>
          </div>
        ) : (
          /* Tab 2: Reelbench Payoff Timeline Track & Beat-Gap Gate */
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {/* Top Gate Status Indicator (maxBeatGap <= 3) */}
            <div
              className={cn(
                "p-3.5 rounded-xl border flex items-center justify-between gap-4 flex-wrap",
                beatGapAnalysis.passed
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              )}
            >
              <div className="flex items-center gap-2.5 text-xs">
                {beatGapAnalysis.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>
                      {beatGapAnalysis.passed
                        ? "✓ 爽点节奏门检测通过 (Beat-Gap Gate Passed)"
                        : "⚠️ 节奏门警告：存在大于 3 集的爽点真空期！"}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/30 border border-current">
                      maxBeatGap = {beatGapAnalysis.maxGap} 集 / 上限 3 集
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Reelbench 工业规范：相邻爽点间隔上限绝对不能超过 3 集，防止观众弃剧流失。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddPayoffBeat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增爽点 (B{String(payoffBeats.length + 1).padStart(2, "0")})</span>
              </button>
            </div>

            {/* Episode Timeline Track (E1 to E6 in Reelbench) */}
            <div className="p-3 bg-secondary/30 rounded-xl border border-border/80">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
                爽点在集数数轴上的分布 (Payoff Timeline Track)
              </span>

              <div className="relative flex items-center justify-between gap-2 py-3 px-2">
                {/* Connecting Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-border rounded-full -z-0" />

                {Array.from({ length: totalEpisodes }).map((_, idx) => {
                  const epNum = idx + 1;
                  const epBeats = payoffBeats.filter((b) => b.episode === epNum);
                  const hasBeat = epBeats.length > 0;

                  return (
                    <div key={epNum} className="relative z-10 flex flex-col items-center gap-1.5">
                      {/* Beat Badges Stacked on top */}
                      <div className="h-6 flex items-center gap-1">
                        {epBeats.map((b) => (
                          <span
                            key={b.id}
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[10px] font-mono font-bold tracking-tight shadow-xs border",
                              b.weight === "major"
                                ? "bg-purple-500 text-white border-purple-300"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            )}
                            title={`${b.id} · ${b.type} (${b.weight})`}
                          >
                            {b.type}
                          </span>
                        ))}
                      </div>

                      {/* Episode Node Circle */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 transition-transform",
                          hasBeat
                            ? "bg-purple-600 border-purple-300 text-white scale-110 shadow-md ring-2 ring-purple-500/30"
                            : "bg-card border-border text-muted-foreground"
                        )}
                      >
                        E{epNum}
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono">第{epNum}集</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Paired Setup vs Payoff Table (Reelbench Standard Table) */}
            <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border sticky top-0 z-10 text-[11px] font-mono text-muted-foreground select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3 w-28">类型</th>
                    <th className="py-2.5 px-3 w-20">权重</th>
                    <th className="py-2.5 px-3 w-20">集数</th>
                    <th className="py-2.5 px-3">铺垫 (Setup · 前期伏笔)</th>
                    <th className="py-2.5 px-3">兑现 (Payoff · 爽点爆发)</th>
                    <th className="py-2.5 px-2 w-10 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payoffBeats.map((beat) => (
                    <tr key={beat.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-400">
                        {beat.id}
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={beat.type}
                          onChange={(e) => handleUpdatePayoffBeat(beat.id, { type: e.target.value })}
                          className="bg-background border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-primary"
                        >
                          <option value="悬念钩">悬念钩</option>
                          <option value="身份揭破">身份揭破</option>
                          <option value="反转">反转</option>
                          <option value="收束">收束</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={beat.weight}
                          onChange={(e) => handleUpdatePayoffBeat(beat.id, { weight: e.target.value as any })}
                          className={cn(
                            "bg-background border border-border rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none",
                            beat.weight === "major" ? "text-purple-400" : "text-muted-foreground"
                          )}
                        >
                          <option value="major">major</option>
                          <option value="minor">minor</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={beat.episode}
                          onChange={(e) => handleUpdatePayoffBeat(beat.id, { episode: parseInt(e.target.value, 10) })}
                          className="bg-background border border-border rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none"
                        >
                          {Array.from({ length: totalEpisodes }).map((_, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              E{idx + 1}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={beat.setup}
                          onChange={(e) => handleUpdatePayoffBeat(beat.id, { setup: e.target.value })}
                          placeholder="伏笔铺垫内容..."
                          className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 text-xs text-foreground focus:outline-none"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={beat.payoff}
                          onChange={(e) => handleUpdatePayoffBeat(beat.id, { payoff: e.target.value })}
                          placeholder="爽点兑现爆发内容..."
                          className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 text-xs text-foreground focus:outline-none font-medium text-purple-200"
                        />
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeletePayoffBeat(beat.id)}
                          className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="删除该爽点"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
