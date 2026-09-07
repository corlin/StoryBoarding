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
  FileCode2,
  Wand2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PrepBibleStudioViewProps {
  project: ProjectModel | null;
  onRefreshProject?: () => Promise<void>;
  onOpenImportScript?: () => void;
  onOpenWizard?: () => void;
  onOpenCharacterProfile?: (character: CharacterModel) => void;
}

export const PrepBibleStudioView: React.FC<PrepBibleStudioViewProps> = ({
  project,
  onRefreshProject,
  onOpenImportScript,
  onOpenWizard,
  onOpenCharacterProfile,
}) => {
  const [rightActiveTab, setRightActiveTab] = useState<"characters" | "locations" | "props">("characters");
  const [isSaving, setIsSaving] = useState(false);

  // Left Section: Adaptation Tradeoffs & Payoff Beats
  const [dramaticCore, setDramaticCore] = useState("");
  const [tradeoffs, setTradeoffs] = useState<AdaptationTradeoffs>({
    keep: [],
    cut: [],
    merge: [],
    risk: [],
    payoff_beats: [],
  });
  const [payoffBeats, setPayoffBeats] = useState<PayoffBeatItem[]>([]);

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
      await api.updateProject(project.id, {
        adaptation_tradeoffs: payload,
      });
      notify.success("✅ 大纲改编设定与爽点节拍已保存！");
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
                STAGE 01 & 02 · 前期筹备与视听基准 (Pre-Production Studio)
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
          {onOpenImportScript && (
            <button
              type="button"
              onClick={onOpenImportScript}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
              title="导入外部剧本文本进行 AI 拆解"
            >
              <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden md:inline">导入外部剧本</span>
            </button>
          )}

          {onOpenWizard && (
            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer shadow-2xs"
              title="一键呼出 3 步 AI 起步向导重新起草故事"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>3步AI起草</span>
            </button>
          )}

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
        {/* Left Column: Script Outline & Pacing Radar Studio */}
        <div className="flex-1 lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-border/70 overflow-hidden bg-card/20">
          <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Target className="w-4 h-4 text-purple-400" />
              <span>剧本改编大纲与爽点节拍雷达</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                {payoffBeats.length} 个节拍点
              </span>
            </div>
          </div>

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
                      className="p-3 rounded-xl bg-card border border-border/70 hover:border-amber-500/40 transition-all shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            BEAT {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">第 {beat.episode || 1} 集</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 font-medium">
                            {beat.type || "悬念钩"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                            {beat.weight === "major" ? "核心主线" : "支线爆点"}
                          </span>
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

            <div className="text-[11px] text-muted-foreground font-mono hidden sm:block">
              {rightActiveTab === "characters" && "统一演员面部、服化道定妆卡"}
              {rightActiveTab === "locations" && "核心场景光影与空间基准"}
              {rightActiveTab === "props" && "关键叙事与道具锚点"}
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
                          <div className="w-12 h-12 rounded-lg bg-secondary/80 border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                            {avatarUrl ? (
                              <img
                                src={normalizeAssetUrl(avatarUrl)}
                                alt={char.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-foreground truncate">{char.name}</h4>
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                                {char.role === "protagonist" ? "主角" : char.role === "antagonist" ? "反派" : "配角"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {char.personality || char.visual_anchor || "暂无外貌描述"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                          <span>{char.voice_dna ? `🎙️ ${char.voice_dna}` : "未指定音色"}</span>
                          <span className="text-primary group-hover:underline flex items-center gap-0.5">
                            详情设定 <ChevronRight className="w-3 h-3" />
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
                    <p className="text-xs">暂无场景设定，可通过解析剧本自动提炼</p>
                  </div>
                ) : (
                  locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="p-3 rounded-xl bg-card border border-border/70 hover:border-border transition-all shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>{loc.name}</span>
                        </h4>
                        <span className="text-[10px] font-mono text-muted-foreground">{loc.environment_type === "interior" ? "内景" : loc.environment_type === "exterior" ? "外景" : "抽象"}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {loc.design_summary || loc.visual_anchor || loc.lighting_style || "暂无场景细节描述"}
                      </p>
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
                    <p className="text-xs">暂无道具设定，支持添加关键剧情道具与信物</p>
                  </div>
                ) : (
                  propsList.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-3 rounded-xl bg-card border border-border/70 hover:border-border transition-all shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-purple-400" />
                          <span>{prop.name}</span>
                        </h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {prop.description || prop.visual_anchor || "关键剧情道具"}
                      </p>
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
