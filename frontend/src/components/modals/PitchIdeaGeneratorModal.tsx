"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Sparkles,
  Loader2,
  X,
  Lock,
  Target,
  ArrowRight,
  BookOpen,
  Users,
  Compass,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";

interface PitchProposal {
  id: string;
  title: string;
  flavor_tag: string;
  logline: string;
  structural_archetype?: string;
  narrative_center?: "character" | "creative" | "plot";
  hook_30s_breakdown?: {
    s0_3?: string;
    s3_10?: string;
    s10_30?: string;
  };
  characters: Array<{
    name: string;
    role: string;
    personality: string;
    visual_anchor: string;
  }>;
  synopsis: string;
  screenplay_preview: string;
}

interface PitchIdeaGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

export const PitchIdeaGeneratorModal: React.FC<PitchIdeaGeneratorModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const router = useRouter();

  // Inputs
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<"female_lead" | "male_lead" | "realistic">("female_lead");
  const [catharsisLevel, setCatharsisLevel] = useState<"restrained" | "commercial" | "extreme">("commercial");
  const [strictCast, setStrictCast] = useState(true);
  const [mustHaveBeats, setMustHaveBeats] = useState<string[]>(["女生放弃深造学习计划"]);
  const [newBeatInput, setNewBeatInput] = useState("");

  // States
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposals, setProposals] = useState<PitchProposal[]>([]);
  const [selectedProposalIndex, setSelectedProposalIndex] = useState<number | null>(null);
  const [isAdopting, setIsAdopting] = useState(false);

  if (!isOpen) return null;

  const handleAddBeat = () => {
    const trimmed = newBeatInput.trim();
    if (trimmed && !mustHaveBeats.includes(trimmed)) {
      setMustHaveBeats([...mustHaveBeats, trimmed]);
      setNewBeatInput("");
    }
  };

  const handleRemoveBeat = (index: number) => {
    setMustHaveBeats(mustHaveBeats.filter((_, i) => i !== index));
  };

  const handleGenerateProposals = async () => {
    if (!prompt.trim()) {
      notify.error("请输入您的一句话点子或灵感想法");
      return;
    }

    try {
      setIsGenerating(true);
      setProposals([]);
      setSelectedProposalIndex(null);

      const res = await api.generatePitchIdeas({
        prompt: prompt.trim(),
        genre,
        catharsis_level: catharsisLevel,
        strict_cast: strictCast,
        must_have_beats: mustHaveBeats,
      });

      if (res.proposals && res.proposals.length > 0) {
        setProposals(res.proposals);
        setSelectedProposalIndex(0);
        notify.success(`🎉 成功孵化出 ${res.proposals.length} 组不同走向的短剧提案！`);
      } else {
        notify.error("未获取到提案，请检查提示词或网络重试");
      }
    } catch (err: any) {
      console.error("Generate Pitch Proposals Error:", err);
      notify.error(err?.response?.data?.detail || err?.message || "孵化点子失败，请在设置中检查 API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdoptProposal = async (proposal: PitchProposal) => {
    try {
      setIsAdopting(true);
      notify.info("🚀 正在采纳提案并自动编译为短剧工作工程...");

      // Prepare 3-episode initial breakdown
      const initialEpisodes = [
        {
          title: `EP 1 · 入局篇 · 危机初现`,
          episode_number: 1,
          cliffhanger_hook: mustHaveBeats[0] || "命运关键抉择揭晓前一瞬",
          target_duration: 60.0,
          synopsis: proposal.synopsis.slice(0, 120),
        },
        {
          title: `EP 2 · 破局篇 · 身份反差`,
          episode_number: 2,
          cliffhanger_hook: "意外发现神秘线索指向上一次选择",
          target_duration: 60.0,
          synopsis: proposal.synopsis.slice(80, 200),
        },
        {
          title: `EP 3 · 终局篇 · 高光时刻`,
          episode_number: 3,
          cliffhanger_hook: "全剧最高潮对决，信念兑现",
          target_duration: 60.0,
          synopsis: proposal.synopsis.slice(150),
        },
      ];

      const created = await api.createSeries({
        title: proposal.title,
        story: proposal.synopsis,
        characters: proposal.characters.map((c) => ({
          name: c.name,
          role: c.role || "protagonist",
          personality: c.personality || "",
          visual_anchor: c.visual_anchor || "",
        })),
        episodes: initialEpisodes,
      });

      // Also persist the literary screenplay onto Sequence 1 if available
      if (proposal.screenplay_preview && created.sequences?.[0]?.id) {
        try {
          await api.updateSequenceScreenplay(created.id, created.sequences[0].id, proposal.screenplay_preview);
        } catch (_) {}
      }

      notify.success("✨ 短剧工程创建成功，即将进入导演工作台！");
      onClose();

      if (onProjectCreated) {
        onProjectCreated(created.id);
      } else {
        router.push(`/workspace?id=${created.id}`);
      }
    } catch (err: any) {
      console.error("Adopt Proposal Error:", err);
      notify.error(err?.response?.data?.detail || err?.message || "创建工程失败，请重试");
    } finally {
      setIsAdopting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">💡 一句话点子孵化器 (One-Line Pitch Generator)</h3>
                <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  消灭白纸焦虑
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                只需输入一句话或几个关键词，AI 为你秒级衍生 3 款不同走向的短剧提案与文学剧本
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two Steps */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Inspiration Input & Guardrails */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground/90 flex items-center justify-between mb-1.5">
                <span>你的故事点子 / 灵感火花 <span className="text-primary">*</span></span>
                <span className="text-[11px] text-muted-foreground font-normal">支持直接写一句话或核心反差</span>
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：女生放弃了出国深造的学习计划，偶然发现匿名资助她三年的恩人正是身边的合租室友..."
                  className="w-full bg-background border border-border rounded-xl p-3.5 text-xs leading-relaxed focus:outline-none focus:border-primary resize-none font-medium text-foreground placeholder:text-muted-foreground/60 shadow-inner"
                />
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-muted-foreground font-mono mr-1">示例灵感:</span>
                {[
                  "女生放弃深造学习计划，发现合租室友正是资助她三年的神秘人",
                  "假千金被逐出家门当天，手握跨国财阀全部资产继承权",
                  "全职主妇重返职场，空降顶头上司是自己资助过的穷学生",
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(sample);
                      if (sample.includes("放弃")) {
                        setMustHaveBeats(["女生放弃深造学习计划"]);
                      } else if (sample.includes("假千金")) {
                        setMustHaveBeats(["假千金被逐出家门"]);
                      } else {
                        setMustHaveBeats(["女主重返职场偶遇资助学生"]);
                      }
                    }}
                    className="text-[11px] bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg border border-border/60 transition-colors"
                  >
                    “{sample.slice(0, 18)}...”
                  </button>
                ))}
              </div>
            </div>

            {/* Guardrails Control Bar: Genre + Cast Lock + Catharsis Dial */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-secondary/30 rounded-xl border border-border/60">
              {/* 1. Genre Dial */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-primary" />
                  <span>受众赛道偏好</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "female_lead", label: "👸 女频精选", sub: "大女主/情感救赎" },
                    { id: "male_lead", label: "🤴 男频爽剧", sub: "逆袭/热血反击" },
                    { id: "realistic", label: "🌿 现实向", sub: "职场/温情治愈" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGenre(g.id as any)}
                      className={`p-1.5 rounded-lg text-left border transition-all ${
                        genre === g.id
                          ? "bg-primary/15 border-primary text-primary font-bold shadow-xs"
                          : "bg-background/50 border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="text-xs">{g.label}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{g.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Strict Cast Lock */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>角色闭环锁止 (防乱加人)</span>
                </label>
                <div
                  onClick={() => setStrictCast(!strictCast)}
                  className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-2 ${
                    strictCast
                      ? "bg-amber-500/10 border-amber-500/40 text-foreground"
                      : "bg-background/50 border-border/60 text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={strictCast}
                    onChange={(e) => setStrictCast(e.target.checked)}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1">
                      <span>🔒 严禁新增多余第三方 NPC</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      戏份严格限定在男女主 2~3 人，绝不擅自多加“女主上司/助理”等闲杂人
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Catharsis Level Dial */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>爽感烈度与价值观</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "restrained", label: "清醒克制", desc: "心理博弈" },
                    { id: "commercial", label: "好莱坞节奏", desc: "商业黄金" },
                    { id: "extreme", label: "极致反转", desc: "高能爽感" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCatharsisLevel(c.id as any)}
                      className={`p-1.5 rounded-lg text-center border transition-all ${
                        catharsisLevel === c.id
                          ? "bg-rose-500/15 border-rose-500 text-rose-400 font-bold shadow-xs"
                          : "bg-background/50 border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="text-xs">{c.label}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Must-Have Plot Beats Input */}
            <div className="p-3 bg-secondary/20 rounded-xl border border-border/60 space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-primary">
                  <Target className="w-3.5 h-3.5" />
                  <span>不可违背的核心剧情事件 (Must-Have Beats)</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-normal">
                  强制 AI 绝不跑偏，该事件必须在镜头中发生
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-1.5">
                {mustHaveBeats.map((beat, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 rounded-md font-medium"
                  >
                    <span>🎯 {beat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBeat(i)}
                      className="hover:text-rose-400 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="输入硬性关键剧情后按回车..."
                    value={newBeatInput}
                    onChange={(e) => setNewBeatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddBeat();
                      }
                    }}
                    className="bg-background border border-border rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-primary text-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAddBeat}
                    className="p-1 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded-md border border-border transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Trigger Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={isGenerating || !prompt.trim()}
                onClick={handleGenerateProposals}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-black shadow-lg disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>AI 编剧专家正在极速孵化 3 组提案...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>立即生成 3 款不同走向的短剧提案</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: 3 Generated Proposal Cards */}
          {proposals.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    🎯 AI 为您生成的 3 组短剧备选方案（点击卡片预览文学剧本）：
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  已严格遵循角色闭环与核心事件硬约束
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {proposals.map((p, idx) => {
                  const isSelected = selectedProposalIndex === idx;
                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => setSelectedProposalIndex(idx)}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-md ring-1 ring-primary/40"
                          : "bg-secondary/40 border-border/70 hover:bg-secondary/70 hover:border-border"
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                              {p.flavor_tag || `方案 ${idx + 1}`}
                            </span>
                            {p.structural_archetype && (
                              <span className="text-[9px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                                {p.structural_archetype}
                              </span>
                            )}
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </div>

                        <h4 className="text-sm font-bold text-foreground leading-snug">
                          《{p.title}》
                        </h4>

                        <p className="text-xs text-muted-foreground font-medium line-clamp-2">
                          “{p.logline}”
                        </p>

                        {/* 5-Min Drama 30s Hook Micro-Rhythm Preview */}
                        {p.hook_30s_breakdown && (
                          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] space-y-1 font-mono">
                            <div className="text-amber-400 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>前 30 秒黄金律卡点:</span>
                            </div>
                            {p.hook_30s_breakdown.s0_3 && (
                              <div className="text-muted-foreground line-clamp-1">
                                <span className="text-amber-300 font-semibold">0-3s:</span> {p.hook_30s_breakdown.s0_3}
                              </div>
                            )}
                            {p.hook_30s_breakdown.s3_10 && (
                              <div className="text-muted-foreground line-clamp-1">
                                <span className="text-sky-300 font-semibold">3-10s:</span> {p.hook_30s_breakdown.s3_10}
                              </div>
                            )}
                            {p.hook_30s_breakdown.s10_30 && (
                              <div className="text-muted-foreground line-clamp-1">
                                <span className="text-rose-300 font-semibold">10-30s:</span> {p.hook_30s_breakdown.s10_30}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-border/50">
                          <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3 text-sky-400" />
                            <span>登场角色 ({p.characters?.length || 2}人 · 严格闭环):</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {p.characters?.map((c, ci) => (
                              <span
                                key={ci}
                                className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded border border-border/70 text-foreground font-medium"
                              >
                                {c.name} ({c.role === "protagonist" ? "主角" : "对手"})
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground/90 line-clamp-3 leading-relaxed bg-background/40 p-2 rounded-lg border border-border/40 font-mono">
                          {p.synopsis}
                        </div>
                      </div>

                      <div className="pt-3 mt-2">
                        <button
                          type="button"
                          disabled={isAdopting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdoptProposal(p);
                          }}
                          className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                              : "bg-secondary text-foreground hover:bg-muted"
                          }`}
                        >
                          {isAdopting && isSelected ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          <span>采纳此方案立项成剧</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Screenplay Preview for Selected Proposal */}
              {selectedProposalIndex !== null && proposals[selectedProposalIndex] && (
                <div className="mt-4 p-4 bg-background/90 rounded-xl border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span>《{proposals[selectedProposalIndex].title}》· 核心文学剧本对白预演 (Master Screenplay Preview)</span>
                    </span>
                    <span className="text-[10px] font-mono text-primary">已融合必须发生的核心剧情事件</span>
                  </div>
                  <pre className="p-3 bg-secondary/50 rounded-lg text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto border border-border/50">
                    {proposals[selectedProposalIndex].screenplay_preview ||
                      "第 1 场 · 室内茶馆 · 夜\n\n【动作】外头暴雨如注，少女将深造退学申请书缓缓推过茶案。\n\n女主\n(神色平静却眼神决绝)\n我不去了。这座城市里，有我更值得守护的人。"}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
