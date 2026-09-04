"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, BookOpen, Users, Film, ArrowRight, CheckCircle, RefreshCw, AlertCircle, Eye } from "lucide-react";
import { api } from "@/lib/api";

interface SeriesBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export function SeriesBlueprintModal({ isOpen, onClose, onOpenSettings }: SeriesBlueprintModalProps) {
  const router = useRouter();
  const isSubmittingRef = useRef(false);
  const [step, setStep] = useState<"input" | "analyzing" | "review" | "compiling">("input");
  const [rawText, setRawText] = useState("");
  const [targetEpisodes, setTargetEpisodes] = useState(3);
  const [errorMsg, setErrorMsg] = useState("");

  // Scanned blueprint data
  const [seriesTitle, setSeriesTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [characters, setCharacters] = useState<
    Array<{
      name: string;
      role: "protagonist" | "antagonist" | "supporting";
      personality: string;
      visual_anchor: string;
    }>
  >([]);
  const [episodes, setEpisodes] = useState<
    Array<{
      episode_number: number;
      title: string;
      act_type: string;
      target_duration: number;
      synopsis: string;
      cliffhanger_hook: string;
      featured_characters: string[];
    }>
  >([]);

  if (!isOpen) return null;

  // Step 1: Macro Narrative Scanner
  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setErrorMsg("请先粘贴小说、长篇剧本或企划文案");
      return;
    }

    setErrorMsg("");
    setStep("analyzing");

    try {
      const res = await api.analyzeSeries({
        text: rawText.trim(),
        target_episodes: targetEpisodes,
      });

      setSeriesTitle(res.series_title || "新多集短剧企划");
      setLogline(res.logline || "");
      setCharacters(res.characters || []);
      setEpisodes(res.episodes || []);
      setStep("review");
    } catch (err: any) {
      console.error("Series analysis error:", err);
      setErrorMsg(err?.response?.data?.detail || err?.message || "长篇宏观扫描失败，请检查网络或 API Key");
      setStep("input");
    }
  };

  // Step 2: Confirm & Create Multi-Episode Project
  const handleConfirmCreate = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setStep("compiling");
    setErrorMsg("");

    try {
      const newProj = await api.createSeries({
        title: seriesTitle,
        story: rawText.slice(0, 1000),
        characters,
        episodes,
      });

      onClose();
      router.push(`/workspace/${newProj.id}`);
    } catch (err: any) {
      console.error("Series creation error:", err);
      setErrorMsg(err?.response?.data?.detail || err?.message || "多集工程创建失败");
      setStep("review");
      isSubmittingRef.current = false;
    }
  };

  const handleFillSample = () => {
    setRawText(`雨夜，暴雨倾盆。
古老的苏氏茶馆外，霓虹灯管在雨水中发出滋滋的电流杂音。
身穿午夜蓝风衣的青年剑客林风靠在残破的青砖柱旁，腰间横挎着一柄古朴的长剑。他眉头微蹙，一道细长的刀疤划过眉心，眼神如深渊般警觉。
茶馆厚重的木门吱呀一声被推开，冷风夹杂着血腥气灌入屋内。
迎面走来的是一位身穿黑色定制西装、面容冷峻如刀刻的中年男子——冷月，天鹰集团最神秘的执行官。冷月的目光穿透烟雨，落在了林风手中的剑柄上。
“三年了，林风。你以为藏在这座雨夜茶馆里，就能躲过基因清算的倒计时吗？”冷月冷笑道，右手缓缓抬起。
林风猛然握紧剑柄：“苏家的血仇，今晚必须由你的命来偿还。”
电光石火间，冷月打了个响指，四面八方的雨幕中瞬间浮现出数十名手持战术步枪的仿生雇佣兵，红外激光瞄准器瞬间织成了一张死亡之网，牢牢锁定了林风周身！
就在林风拔剑出鞘、银光斩破雨夜的一刹那，冷月嘴角浮现出一抹诡异的狞笑，一颗微型引爆器在他掌心闪烁着猩红的倒计时：00:03、00:02……`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#121316] border border-border/80 w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-[#16181d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                长篇小说 / 剧本一键成剧 · 架构编译器
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                  Multi-Episode Narrative OS
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                万字小说导入 ➔ 自动提取全剧角色 DNA ➔ 智能切分 3~5 集生死悬念卡点
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">操作提示：</span>
                {errorMsg}
              </div>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded font-medium transition"
                >
                  去配置 Key
                </button>
              )}
            </div>
          )}

          {/* Step: Input */}
          {(step === "input" || step === "analyzing") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <span>粘贴长篇小说章节 / 连续分集大纲 / 剧本原著</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (支持 500 ~ 20,000 字长篇输入)
                  </span>
                </label>
                <button
                  onClick={handleFillSample}
                  className="text-xs text-amber-400 hover:text-amber-300 transition flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  填入武侠朋克长篇样例
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                disabled={step === "analyzing"}
                placeholder="在此粘贴万字长文、小说章节或短剧企划案……AI 将为您智能抽取主角/反派人物卡与视觉 DNA，并切分为多集连贯短剧。"
                className="w-full h-64 bg-background border border-border/70 rounded-lg p-4 text-xs font-mono text-foreground leading-relaxed focus:outline-none focus:border-amber-500/60 resize-none"
              />

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">目标切分集数：</label>
                  <div className="flex items-center gap-1.5">
                    {[3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTargetEpisodes(num)}
                        disabled={step === "analyzing"}
                        className={`px-3 py-1 text-xs rounded border transition ${
                          targetEpisodes === num
                            ? "bg-amber-500/20 border-amber-500 text-amber-300 font-semibold"
                            : "bg-background border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {num} 集短剧 (每集 60~90s)
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={step === "analyzing" || !rawText.trim()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                  {step === "analyzing" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      宏观叙事扫描中 (约 2~3 秒)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      开始宏观叙事扫描 (Stage 1)
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Review Blueprint Drawer */}
          {(step === "review" || step === "compiling") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Title & Logline */}
              <div className="p-4 bg-background/80 border border-border/70 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    短剧企划总览 · Series Overview
                  </span>
                  <button
                    onClick={() => setStep("input")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition underline"
                  >
                    重新修改原著长文
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={seriesTitle}
                    onChange={(e) => setSeriesTitle(e.target.value)}
                    className="w-full text-sm font-bold bg-transparent border-b border-border/70 pb-1 focus:outline-none focus:border-amber-400"
                    placeholder="剧集名称"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">{logline}</p>
                </div>
              </div>

              {/* Characters Roster */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>全局角色资产库与视觉 DNA 锚点 (Character Roster & Visual DNA)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (全剧所有分镜将强制锁定以下英文视觉特征)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {characters.map((char, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-background border border-border/70 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{char.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              char.role === "protagonist"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : char.role === "antagonist"
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            }`}
                          >
                            {char.role === "protagonist" ? "主角" : char.role === "antagonist" ? "反派" : "配角"}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{char.personality}</p>
                      <div className="pt-1">
                        <label className="text-[10px] font-mono text-sky-400/90 block mb-0.5">
                          Visual DNA Anchor (纯英文生图提示词基准):
                        </label>
                        <p className="text-[10px] font-mono text-foreground/80 bg-muted/40 p-2 rounded border border-border/50 leading-normal">
                          {char.visual_anchor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Episodes Outlines */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>短剧各集大纲与集尾生死卡点 (Multi-Episode Narrative Breakdown)</span>
                </div>

                <div className="space-y-3">
                  {episodes.map((ep, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-background border border-border/70 rounded-lg space-y-2 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            EPISODE {ep.episode_number}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{ep.title}</span>
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                          ⏱️ {ep.target_duration}s
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{ep.synopsis}</p>

                      {/* Cliffhanger Hook High-visibility Box */}
                      <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded flex items-start gap-2 text-xs text-rose-300">
                        <span className="text-sm">🎣</span>
                        <div>
                          <span className="font-semibold text-[11px] text-rose-200">集尾卡点绝境悬念：</span>
                          <span className="text-[11px]">{ep.cliffhanger_hook}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "review" || step === "compiling") && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-[#16181d]">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>架构已校验：{characters.length} 位全局角色，{episodes.length} 集高潮短剧已就绪</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("input")}
                disabled={step === "compiling"}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                disabled={step === "compiling"}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                {step === "compiling" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    各集微观并发拆拍中 (约 5~8 秒)...
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    立即一键建构整部短剧
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
