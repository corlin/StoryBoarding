"use client";

import React, { useState, useEffect } from "react";
import {
  ProjectModel,
  CharacterModel,
  LocationModel,
  PropModel,
  AdaptationTradeoffs,
  PayoffBeatItem,
} from "@/types/shot";
import { api, normalizeAssetUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import {
  BookOpen,
  Users,
  MapPin,
  Package,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Lock,
  Activity,
  Zap,
  Target,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Palette,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STYLE_PRESETS } from "@/lib/biblePresets";

interface PrepBibleStudioViewProps {
  project: ProjectModel | null;
  onRefreshProject?: () => Promise<void>;
  onOpenCharacterProfile?: (character: CharacterModel) => void;
  onOpenCharacterBible?: () => void;
  onOpenLocationBible?: () => void;
  onOpenPropBible?: () => void;
  onOpenGlobalAssetLibrary?: () => void;
}

export const PrepBibleStudioView: React.FC<PrepBibleStudioViewProps> = ({
  project,
  onRefreshProject,
  onOpenCharacterProfile,
  onOpenCharacterBible,
  onOpenLocationBible,
  onOpenPropBible,
  onOpenGlobalAssetLibrary,
}) => {
  const [leftActiveTab, setLeftActiveTab] = useState<"outline" | "style">("outline");
  const [rightActiveTab, setRightActiveTab] = useState<"characters" | "locations" | "props">("characters");
  const [isSaving, setIsSaving] = useState(false);

  // Left Section: Adaptation Tradeoffs, Payoff Beats & Visual Style
  const [dramaticCore, setDramaticCore] = useState("");
  const [tradeoffs, setTradeoffs] = useState<AdaptationTradeoffs>({
    keep: [],
    cut: [],
    merge: [],
    risk: [],
    payoff_beats: [],
  });
  const [payoffBeats, setPayoffBeats] = useState<PayoffBeatItem[]>([]);
  const [stylePrompt, setStylePrompt] = useState(STYLE_PRESETS[0].prompt);
  const [selectedPresetId, setSelectedPresetId] = useState("graphite_previz");

  useEffect(() => {
    if (!project) return;
    const tf = project.adaptation_tradeoffs || {
      keep: [],
      cut: [],
      merge: [],
      risk: [],
      payoff_beats: [],
    };
    setTradeoffs({
      keep: tf.keep || [],
      cut: tf.cut || [],
      merge: tf.merge || [],
      risk: tf.risk || [],
      payoff_beats: tf.payoff_beats || [],
    });
    setDramaticCore(tf.dramatic_core || project.story || "");
    setPayoffBeats(tf.payoff_beats && tf.payoff_beats.length > 0 ? tf.payoff_beats : []);

    const styleConfig = typeof project.style_config === "string" ? JSON.parse(project.style_config) : project.style_config || {};
    if (styleConfig.director_style_prompt) {
      setStylePrompt(styleConfig.director_style_prompt);
      const matched = STYLE_PRESETS.find((p) => p.prompt === styleConfig.director_style_prompt);
      if (matched) setSelectedPresetId(matched.id);
    }
  }, [project]);

  // Characters, Locations, Props from project
  const characters = project?.characters || [];
  const locations = project?.locations || [];
  const propsList = project?.props || [];

  const handleSaveTradeoffs = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const payload: AdaptationTradeoffs = {
        ...tradeoffs,
        dramatic_core: dramaticCore,
        payoff_beats: payoffBeats,
      };

      const existingStyle = typeof project.style_config === "string" ? JSON.parse(project.style_config) : project.style_config || {};
      const updatedStyle = {
        ...existingStyle,
        director_style_prompt: stylePrompt.trim(),
      };

      await api.updateProject(project.id, {
        adaptation_tradeoffs: payload,
        style_config: updatedStyle,
      });
      notify.success("✅ 大纲设定、爽点节拍与导演画风基准已成功保存！");
      await onRefreshProject?.();
    } catch (err: any) {
      notify.error(`保存失败: ${err.message || "网络异常"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBeat = () => {
    const newBeat: PayoffBeatItem = {
      id: `B${String(payoffBeats.length + 1).padStart(2, "0")}`,
      type: "悬念钩",
      weight: "major",
      episode: 1,
      setup: "在此输入前序因果铺垫...",
      payoff: "在此输入当期爽点/戏剧兑现...",
    };
    setPayoffBeats([...payoffBeats, newBeat]);
  };

  const handleRemoveBeat = (idx: number) => {
    setPayoffBeats(payoffBeats.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Studio Header Bar */}
      <div className="h-12 border-b border-border/70 bg-card/60 px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs md:text-sm font-bold text-foreground">
                STAGE 01 · 前期筹备与视听基准 (Pre-Production Studio)
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                双栏协同
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              左侧打磨剧情大纲与爽点雷达，右侧沉淀角色定妆、场景与道具视听基准
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveTradeoffs}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>保存设定</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body: Side-by-Side Split Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Script Outline & Pacing Radar & Director Style Studio */}
        <div className="flex-1 lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-border/70 overflow-hidden bg-card/20">
          <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            {/* Sub-tabs for Left Column */}
            <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-lg border border-border/70">
              <button
                type="button"
                onClick={() => setLeftActiveTab("outline")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  leftActiveTab === "outline"
                    ? "bg-purple-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Target className="w-3.5 h-3.5" />
                <span>大纲与爽点 ({payoffBeats.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setLeftActiveTab("style")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  leftActiveTab === "style"
                    ? "bg-purple-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>导演画风基准</span>
              </button>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono hidden sm:block">
              {leftActiveTab === "outline" ? "戏剧内核与各集兑现节点" : "全剧统一光影底色与控制词"}
            </div>
          </div>

          {leftActiveTab === "outline" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Dramatic Core Logline */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>核心戏剧冲突与故事梗概 (Dramatic Core)</span>
                </label>
                <textarea
                  value={dramaticCore}
                  onChange={(e) => setDramaticCore(e.target.value)}
                  rows={3}
                  placeholder="简述故事核心欲望、主角阻力与反转爆发点..."
                  className="w-full text-xs p-2.5 rounded-lg bg-secondary/40 border border-border/80 focus:outline-none focus:border-primary focus:bg-background transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Payoff Beats Track */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>分集爽点与戏剧兑现雷达 (Payoff Beats)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBeat}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>增加爽点节拍</span>
                  </button>
                </div>

                {payoffBeats.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-secondary/20">
                    <p className="text-xs text-muted-foreground">暂未配置爽点节拍，点击上方按钮添加</p>
                    <button
                      type="button"
                      onClick={handleAddBeat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted border border-border"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span>快速添加首个爆点节拍</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payoffBeats.map((beat, idx) => (
                      <div
                        key={beat.id || idx}
                        className="p-3 rounded-xl bg-card border border-border/70 hover:border-border transition-all shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {beat.id}
                            </span>
                            <span className="text-xs font-medium text-foreground">第 {beat.episode || 1} 集</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                              {beat.type}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-mono px-1.5 py-0.2 rounded",
                                beat.weight === "major"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                                  : "bg-secondary text-muted-foreground"
                              )}
                            >
                              {beat.weight === "major" ? "重点主线" : "支线推进"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveBeat(idx)}
                              className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground font-mono">因果铺垫 (Setup):</span>
                            <input
                              type="text"
                              value={beat.setup || ""}
                              onChange={(e) => {
                                const updated = [...payoffBeats];
                                updated[idx].setup = e.target.value;
                                setPayoffBeats(updated);
                              }}
                              placeholder="因果铺垫..."
                              className="w-full text-xs px-2 py-1 rounded bg-secondary/40 border border-border/70 focus:outline-none focus:border-primary mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground font-mono">戏剧兑现 (Payoff):</span>
                            <input
                              type="text"
                              value={beat.payoff || ""}
                              onChange={(e) => {
                                const updated = [...payoffBeats];
                                updated[idx].payoff = e.target.value;
                                setPayoffBeats(updated);
                              }}
                              placeholder="戏剧兑现与爽点..."
                              className="w-full text-xs px-2 py-1 rounded bg-secondary/40 border border-border/70 focus:outline-none focus:border-primary mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-start gap-2.5 text-xs text-purple-300">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                <p className="leading-relaxed text-[11px]">
                  <strong>全剧画风统一基准 (Global Visual Style Bible)：</strong>
                  此处选定的流派将作为全剧所有分镜头冲印显影时的底层光影与构图基调，点击右上角「保存设定」即可全项目生效。
                </p>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {STYLE_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setStylePrompt(preset.prompt);
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                          : "border-border/70 bg-secondary/30 hover:bg-secondary/60 hover:border-border"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {preset.name}
                          </h4>
                          {preset.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary border border-border/80 text-muted-foreground shrink-0">
                              {preset.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {preset.desc}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="inline-flex items-center gap-1 text-[11px] text-primary font-bold mt-2 pt-1.5 border-t border-primary/20">
                          <Check className="w-3.5 h-3.5" />
                          <span>当前选定画风</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Raw Prompt Inspector */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    <span>导演画风底层注入 Prompt (Global Style Suffix):</span>
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">已自动挂载至全剧管道</span>
                </div>
                <textarea
                  rows={4}
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/80 rounded-xl p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary focus:bg-background text-foreground/90 transition-all"
                  placeholder="可在此自定义微调画风底词..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visual Bible Studio (Characters, Locations, Props) */}
        <div className="flex-1 lg:w-1/2 flex flex-col overflow-hidden bg-card/30">
          <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            {/* Sub-tabs for Visual Assets */}
            <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-lg border border-border/70">
              <button
                type="button"
                onClick={() => setRightActiveTab("characters")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  rightActiveTab === "characters"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>角色定妆 ({characters.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightActiveTab("locations")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  rightActiveTab === "locations"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>场景基准 ({locations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightActiveTab("props")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  rightActiveTab === "props"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="w-3.5 h-3.5" />
                <span>道具物料 ({propsList.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] text-muted-foreground font-mono hidden sm:block">
                {rightActiveTab === "characters" && "统一演员面部、服化道定妆卡"}
                {rightActiveTab === "locations" && "核心场景光影与空间基准"}
                {rightActiveTab === "props" && "关键叙事与道具锚点"}
              </div>

              {/* Talent Pool & Asset Roster Picker */}
              {onOpenGlobalAssetLibrary && (
                <button
                  type="button"
                  onClick={onOpenGlobalAssetLibrary}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 transition-all cursor-pointer shadow-xs"
                  title="从导演专属资产中心挑选常驻主角班底、经典影棚场景或传世道具"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {rightActiveTab === "characters"
                      ? "从班底选角"
                      : rightActiveTab === "locations"
                      ? "从影棚选用"
                      : "从资产库选用"}
                  </span>
                </button>
              )}

              {rightActiveTab === "characters" && (
                <button
                  type="button"
                  onClick={onOpenCharacterBible}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all cursor-pointer shadow-xs"
                  title="新建试镜角色或调整角色档案"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建试镜角色</span>
                </button>
              )}

              {rightActiveTab === "locations" && (
                <button
                  type="button"
                  onClick={onOpenLocationBible}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all cursor-pointer shadow-xs"
                  title="添加新场景或调整场景光影锚点"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建剧本场景</span>
                </button>
              )}

              {rightActiveTab === "props" && (
                <button
                  type="button"
                  onClick={onOpenPropBible}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all cursor-pointer shadow-xs"
                  title="添加剧情信物或调整道具特征"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建道具物料</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Characters Grid */}
            {rightActiveTab === "characters" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {characters.length === 0 ? (
                  <div className="col-span-full p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 text-muted-foreground">
                    <Users className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="text-xs">暂无角色设定，可通过「导入外部剧本」或向导自动解析生成角色库</p>
                  </div>
                ) : (
                  characters.map((char) => {
                    const avatarUrl = char.avatar_url;
                    return (
                      <div
                        key={char.id}
                        onClick={() => onOpenCharacterProfile?.(char)}
                        className="p-3 rounded-xl bg-card border border-border/70 hover:border-primary/50 transition-all cursor-pointer group shadow-2xs space-y-2 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-24 h-14 rounded-lg bg-secondary/80 border border-border overflow-hidden shrink-0 flex items-center justify-center relative group/pic">
                            {avatarUrl ? (
                              <>
                                <img
                                  src={normalizeAssetUrl(avatarUrl)}
                                  alt={char.name}
                                  className="w-full h-full object-cover group-hover/pic:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white font-mono">
                                  定妆大图
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-muted-foreground gap-0.5">
                                <Users className="w-4 h-4 opacity-50" />
                                <span className="text-[9px] font-mono">待定妆</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-foreground truncate">{char.name}</h4>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                                  {char.role === "protagonist" ? "主角" : char.role === "antagonist" ? "反派" : "配角"}
                                </span>
                                {avatarUrl ? (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    已定妆
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    待冲印
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {char.personality || char.visual_anchor || "暂无外貌描述"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                          <span className="truncate max-w-[150px]">{char.voice_dna ? `🎙️ ${char.voice_dna}` : "未指定音色"}</span>
                          <span className="text-primary group-hover:underline flex items-center gap-0.5 shrink-0">
                            定妆与人设 <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Locations Grid */}
            {rightActiveTab === "locations" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locations.length === 0 ? (
                  <div className="col-span-full p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 text-muted-foreground">
                    <MapPin className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="text-xs">暂无场景设定，可点击上方「管理/新建场景」或解析剧本自动提炼</p>
                  </div>
                ) : (
                  locations.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={onOpenLocationBible}
                      className="p-3 rounded-xl bg-card border border-border/70 hover:border-amber-500/50 transition-all cursor-pointer group shadow-2xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-1.5 group-hover:text-amber-300 transition-colors">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            <span>{loc.name}</span>
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {loc.environment_type === "interior" ? "内景" : loc.environment_type === "exterior" ? "外景" : "抽象"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {loc.design_summary || loc.visual_anchor || loc.lighting_style || "暂无场景细节描述"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                        <span className="truncate max-w-[150px]">
                          {loc.lighting_style ? `☀️ ${loc.lighting_style}` : "自然光基准"}
                        </span>
                        <span className="text-amber-400 group-hover:underline flex items-center gap-0.5">
                          编辑光影/基准 <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Props Grid */}
            {rightActiveTab === "props" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {propsList.length === 0 ? (
                  <div className="col-span-full p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 text-muted-foreground">
                    <Package className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="text-xs">暂无道具设定，可点击上方「管理/新建道具」添加关键信物</p>
                  </div>
                ) : (
                  propsList.map((prop) => (
                    <div
                      key={prop.id}
                      onClick={onOpenPropBible}
                      className="p-3 rounded-xl bg-card border border-border/70 hover:border-purple-500/50 transition-all cursor-pointer group shadow-2xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
                            <Package className="w-3.5 h-3.5 text-purple-400" />
                            <span>{prop.name}</span>
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {prop.category === "weapon" ? "武器" : prop.category === "token" ? "信物" : prop.category === "document" ? "文书" : "道具"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {prop.description || prop.visual_anchor || "关键剧情道具"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                        <span>{prop.scale === "furniture" ? "家具级" : prop.scale === "tabletop" ? "桌面级" : "手持级"}</span>
                        <span className="text-purple-400 group-hover:underline flex items-center gap-0.5">
                          编辑物料 <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
