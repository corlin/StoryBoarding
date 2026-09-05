"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SequenceModel,
  ProjectModel,
  BeatModel,
} from "@/types/shot";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import {
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Zap,
  Target,
  Volume2,
  Save,
  Loader2,
  Flame,
  ArrowRight,
  BookOpen,
  MapPin,
  Users,
  Box,
  Edit2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BeatStreamEditorProps {
  project: ProjectModel | null;
  sequence: SequenceModel | null;
  onRefreshProject?: () => Promise<void>;
  onSwitchToStoryboard?: () => void;
}

// shuohao-skills novel-script standard formula: non-whitespace chars / 4.5 charsPerSecond (including punctuation pause)
export function calculateDialogueDuration(dialogue: string, charsPerSecond: number = 4.5): number {
  const nonWhitespace = String(dialogue ?? "").replace(/\s+/g, "");
  const count = nonWhitespace.length;
  if (count === 0) return 1.5;
  const raw = count / charsPerSecond;
  return Math.max(1.0, Math.round(raw * 10) / 10);
}

export function parseBeatsFromScreenplay(text: string): BeatModel[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const beats: BeatModel[] = [];

  let currentSpeaker: string | null = null;
  let currentParenthetical: string | null = null;
  let currentSceneNum = 1;
  let currentSceneTitle = "渡口栈桥";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Scene headers: e.g. 第 1 场 / 场次 1
    const sceneMatch = line.match(/第\s*(\d+)\s*场/) || line.match(/场次\s*(\d+)/);
    if (sceneMatch) {
      currentSceneNum = parseInt(sceneMatch[1], 10) || 1;
      continue;
    }
    if (line.startsWith("【场景氛围】") || line.startsWith("【场景】")) {
      currentSceneTitle = line.replace(/【.*?】/, "").trim();
      continue;
    }

    // Dialogue quotes: "..." or “...”
    const quoteMatch = line.match(/^“([^”]+)”$/) || line.match(/^"([^"]+)"$/);
    if (quoteMatch && currentSpeaker) {
      const dialogueText = quoteMatch[1];
      beats.push({
        id: crypto.randomUUID(),
        type: "dialogue",
        speaker: currentSpeaker,
        parenthetical: currentParenthetical || undefined,
        content: dialogueText,
        duration: calculateDialogueDuration(dialogueText),
        scene_number: currentSceneNum,
        scene_title: currentSceneTitle,
      });
      currentSpeaker = null;
      currentParenthetical = null;
      continue;
    }

    // Parenthetical: (xxx) or （xxx）
    const parenMatch = line.match(/^[\(（]([^\)）]+)[\)）]$/);
    if (parenMatch) {
      currentParenthetical = parenMatch[1];
      continue;
    }

    // Speaker line
    if (line.length <= 8 && !line.startsWith("【") && i + 1 < lines.length) {
      currentSpeaker = line;
      continue;
    }

    // Action beat
    const cleanAction = line.replace(/^【镜头.*?】/, "").replace(/^【动作】/, "").trim();
    if (cleanAction) {
      beats.push({
        id: crypto.randomUUID(),
        type: "action",
        content: cleanAction,
        duration: 2.5, // Reelbench action beat standard default
        scene_number: currentSceneNum,
        scene_title: currentSceneTitle,
      });
    }
    currentSpeaker = null;
    currentParenthetical = null;
  }

  return beats;
}

export const BeatStreamEditor: React.FC<BeatStreamEditorProps> = ({
  project,
  sequence,
  onRefreshProject,
  onSwitchToStoryboard,
}) => {
  const [beats, setBeats] = useState<BeatModel[]>([]);
  const [hook, setHook] = useState("");
  const [cliffhanger, setCliffhanger] = useState("");
  const [payoff, setPayoff] = useState("");
  const [targetDuration, setTargetDuration] = useState(60.0);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);

  // Load beats from sequence
  useEffect(() => {
    if (!sequence) return;
    setHook(sequence.hook_summary || "");
    setCliffhanger(sequence.cliffhanger_summary || "");
    setPayoff(sequence.payoff_summary || "悬念钩");
    setTargetDuration(sequence.target_duration || 60.0);

    if (sequence.beats_data && sequence.beats_data.length > 0) {
      setBeats(sequence.beats_data);
    } else if (sequence.screenplay_text) {
      const parsed = parseBeatsFromScreenplay(sequence.screenplay_text);
      setBeats(parsed);
    } else {
      setBeats([
        {
          id: crypto.randomUUID(),
          type: "action",
          scene_number: 1,
          scene_title: "渡口栈桥",
          location_code: "S02",
          lighting_state: "浓雾清晨",
          content: "浓雾里传来脚步声，栈桥显露，老周蹲在船头抽旱烟。",
          duration: 2.5,
        },
        {
          id: crypto.randomUUID(),
          type: "dialogue",
          scene_number: 1,
          scene_title: "渡口栈桥",
          location_code: "S02",
          speaker: "老周",
          parenthetical: "扯着嗓子，不急不躁",
          content: "上船喽——过河的抓紧，雾要变天。",
          duration: 3.6,
        },
        {
          id: crypto.randomUUID(),
          type: "action",
          scene_number: 2,
          scene_title: "渡船船舱",
          location_code: "S01",
          lighting_state: "晨雾",
          content: "舱里坐着两个人。胡二爷的货担占了半条长凳，陆行远靠着舱壁，右手揣在大衣口袋里没动过。",
          duration: 2.5,
        },
        {
          id: crypto.randomUUID(),
          type: "dialogue",
          scene_number: 2,
          scene_title: "渡船船舱",
          location_code: "S01",
          speaker: "胡二爷",
          parenthetical: "自来熟地凑近",
          content: "姑娘头回走这条水路吧？我一看一个准。",
          duration: 4.0,
        },
      ]);
    }
  }, [sequence]);

  // Duration analytics
  const totalDuration = useMemo(() => {
    return Math.round(beats.reduce((acc, b) => acc + (Number(b.duration) || 0), 0) * 10) / 10;
  }, [beats]);

  const diffPercent = useMemo(() => {
    if (!targetDuration || targetDuration <= 0) return 0;
    return Math.round(((totalDuration - targetDuration) / targetDuration) * 100);
  }, [totalDuration, targetDuration]);

  const dialogueCount = useMemo(() => {
    return beats.filter((b) => b.type === "dialogue").length;
  }, [beats]);

  // Group beats by scene
  const sceneGroups = useMemo(() => {
    const map = new Map<number, BeatModel[]>();
    beats.forEach((b) => {
      const sNum = b.scene_number || 1;
      if (!map.has(sNum)) map.set(sNum, []);
      map.get(sNum)!.push(b);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [beats]);

  const handleUpdateDuration = (beatId: string, newDuration: number) => {
    setBeats(
      beats.map((b) => (b.id === beatId ? { ...b, duration: Math.max(0.5, Math.round(newDuration * 10) / 10) } : b))
    );
  };

  const handleUpdateContent = (beatId: string, content: string) => {
    setBeats(
      beats.map((b) => {
        if (b.id !== beatId) return b;
        const autoDuration = b.type === "dialogue" ? calculateDialogueDuration(content) : b.duration;
        return { ...b, content, duration: autoDuration };
      })
    );
  };

  const handleAddBeatToScene = (sceneNum: number, type: "action" | "dialogue") => {
    const newBeat: BeatModel = {
      id: crypto.randomUUID(),
      type,
      scene_number: sceneNum,
      speaker: type === "dialogue" ? "主角" : undefined,
      content: type === "dialogue" ? "新台词内容" : "角色展开新行动动作描写...",
      duration: type === "dialogue" ? 2.5 : 2.5,
    };
    setBeats([...beats, newBeat]);
  };

  const handleDeleteBeat = (id: string) => {
    setBeats(beats.filter((b) => b.id !== id));
  };

  const handleSaveAll = async () => {
    if (!project?.id || !sequence?.id) return;
    try {
      setIsSaving(true);
      await api.updateSequenceScreenplay(project.id, sequence.id, {
        hook_summary: hook.trim(),
        cliffhanger_summary: cliffhanger.trim(),
        payoff_summary: payoff.trim(),
        target_duration: targetDuration,
        beats_data: beats,
      });
      notify.success("✨ 剧本节拍流与短剧卡点已成功保存！");
      if (onRefreshProject) {
        await onRefreshProject();
      }
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.detail || err?.message || "保存节拍流失败");
    } finally {
      setIsSaving(false);
    }
  };

  if (!sequence) return null;

  const characters = project?.characters || [];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden select-none">
      {/* 1. Reelbench Stage 04 Top Navigation & Quick Switcher */}
      <div className="px-5 py-3 border-b border-border/80 bg-card/40 flex items-center justify-between gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-mono">剧本 /</span>
          <span className="font-bold text-foreground">
            第 {sequence.episode_number || sequence.order || 1} 集
          </span>
          <span className="font-mono text-muted-foreground ml-1">
            {totalDuration}s / {targetDuration}s
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border flex items-center gap-1",
              Math.abs(diffPercent) <= 15
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
            )}
            title={Math.abs(diffPercent) <= 15 ? "时长落在 ±15% 安全容差带内" : "超出 ±15% 容差警戒线，需增删戏份"}
          >
            <span>{diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`}</span>
            <span className="text-[9px] opacity-70">
              {Math.abs(diffPercent) <= 15 ? "(±15%安全)" : "(超容差)"}
            </span>
          </span>
          <span className="text-muted-foreground text-[11px] hidden sm:inline">
            · {sceneGroups.length} 场 · {beats.length} 节拍 · {dialogueCount} 台词
          </span>
          {/* Cold-open 3-beat hook gate */}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-mono border hidden md:inline-flex items-center gap-1",
              beats.length > 0 && hook.trim().length > 0
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                : "bg-muted text-muted-foreground border-border"
            )}
            title="shuohao冷开场规则：前3拍内具象兑现开篇钩子"
          >
            <span>冷开场闸门: 前3拍</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToStoryboard && (
            <button
              onClick={onSwitchToStoryboard}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <span>看分镜</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>保存剧本</span>
          </button>
        </div>
      </div>

      {/* 2. Reelbench Triad Anchors (Hook / Cliffhanger / Payoff) */}
      <div className="p-4 border-b border-border/80 bg-secondary/20 space-y-2.5 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Hook Card */}
          <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>钩子 (Hook · 0-3s 抓人设问)</span>
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">双击改</span>
            </div>
            <input
              type="text"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="例如: 皮箱里到底装了什么，值得她指节发白..."
              className="w-full bg-transparent border-none p-0 text-xs font-medium text-foreground focus:outline-none"
            />
          </div>

          {/* Cliffhanger Card */}
          <div className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>断点 (Cliffhanger · 集尾高压死结)</span>
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">双击改</span>
            </div>
            <input
              type="text"
              value={cliffhanger}
              onChange={(e) => setCliffhanger(e.target.value)}
              placeholder="例如: 陆行远的右手从上船起就没离开过大衣口袋..."
              className="w-full bg-transparent border-none p-0 text-xs font-medium text-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Payoff Selector Tag */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-muted-foreground">爽点认领：</span>
          {["悬念钩", "身份揭破", "反转", "收束"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setPayoff(tag)}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer border",
                payoff === tag
                  ? "bg-purple-500 text-white border-purple-400 shadow-xs font-bold"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Scene-by-Scene Atomic Beat Flow (Reelbench Standard Container) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {sceneGroups.map(([sceneNum, sceneBeats]) => {
          const firstBeat = sceneBeats[0];
          const sceneTitle = firstBeat?.scene_title || `第 ${sceneNum} 场场景`;
          const sceneLocCode = firstBeat?.location_code || `S0${sceneNum}`;
          const sceneLighting = firstBeat?.lighting_state || "自然光影";

          return (
            <div
              key={sceneNum}
              className="rounded-2xl border border-border/80 bg-card/60 overflow-hidden shadow-xs"
            >
              {/* Scene Header Strip (.scene-h in Reelbench) */}
              <div className="px-4 py-2.5 bg-secondary/50 border-b border-border/80 flex items-center justify-between gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono font-bold text-foreground">场次 {sceneNum}</span>
                  <span className="font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                    {sceneLocCode}
                  </span>
                  <b className="text-foreground truncate">{sceneTitle}</b>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[10px] border border-amber-500/30 shrink-0">
                    {sceneLighting}
                  </span>
                </div>

                {/* Character & Prop Presence Pills (.badge.b-dim in Reelbench) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {characters.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className="px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground text-[10px] border border-border/60"
                    >
                      {c.name}
                    </span>
                  ))}
                  <span className="px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground text-[10px] border border-border/60 font-mono">
                    P01
                  </span>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => handleAddBeatToScene(sceneNum, "action")}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                      title="在该场次添加动作描写节拍"
                    >
                      + 动作
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBeatToScene(sceneNum, "dialogue")}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                      title="在该场次添加角色台词节拍"
                    >
                      + 台词
                    </button>
                  </div>
                </div>
              </div>

              {/* Atomic Beats Flow List (.flow in Reelbench) */}
              <div className="p-3 space-y-2">
                {sceneBeats.map((beat, idx) => {
                  const isAction = beat.type === "action";
                  const isEditing = editingBeatId === beat.id;

                  return (
                    <div
                      key={beat.id}
                      onDoubleClick={() => setEditingBeatId(beat.id)}
                      className={cn(
                        "group relative flex items-start gap-3 p-2.5 rounded-xl border transition-all text-xs",
                        isAction
                          ? "bg-amber-500/[0.03] border-border/60 hover:border-amber-500/40"
                          : "bg-blue-500/[0.03] border-border/60 hover:border-blue-500/40"
                      )}
                    >
                      {/* Beat Index & Hook Gate Indicator */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                        <span className="w-5 text-center font-mono text-[11px] text-muted-foreground/80">
                          {idx + 1}
                        </span>
                        {sceneNum === 1 && idx < 3 && (
                          <span
                            className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                            title="冷开场窗口期 (第 1-3 拍)"
                          >
                            H{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Main Beat Slot (.slot .view) */}
                      <div className="flex-1 min-w-0">
                        {isAction ? (
                          /* Action Beat (.is-act) */
                          <div>
                            {isEditing ? (
                              <textarea
                                autoFocus
                                rows={2}
                                value={beat.content}
                                onBlur={() => setEditingBeatId(null)}
                                onChange={(e) => handleUpdateContent(beat.id, e.target.value)}
                                className="w-full bg-background border border-primary rounded p-1.5 text-xs text-foreground focus:outline-none resize-none leading-relaxed"
                              />
                            ) : (
                              <p className="text-foreground/90 leading-relaxed font-normal">
                                {beat.content}
                              </p>
                            )}
                          </div>
                        ) : (
                          /* Dialogue Beat (.is-line) */
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sky-400 shrink-0">
                              {beat.speaker || "角色"}
                            </span>

                            {isEditing ? (
                              <div className="flex-1 min-w-[200px] space-y-1">
                                <input
                                  type="text"
                                  value={beat.speaker || ""}
                                  onChange={(e) => {
                                    const speaker = e.target.value;
                                    setBeats(beats.map((b) => (b.id === beat.id ? { ...b, speaker } : b)));
                                  }}
                                  placeholder="角色名"
                                  className="text-xs bg-background border border-border px-1 py-0.5 rounded mr-2"
                                />
                                <input
                                  type="text"
                                  value={beat.parenthetical || ""}
                                  onChange={(e) => {
                                    const parenthetical = e.target.value;
                                    setBeats(beats.map((b) => (b.id === beat.id ? { ...b, parenthetical } : b)));
                                  }}
                                  placeholder="语气提示 (如: 旱烟不离嘴)"
                                  className="text-xs bg-background border border-border px-1 py-0.5 rounded text-muted-foreground italic"
                                />
                                <textarea
                                  autoFocus
                                  rows={2}
                                  value={beat.content}
                                  onBlur={() => setEditingBeatId(null)}
                                  onChange={(e) => handleUpdateContent(beat.id, e.target.value)}
                                  className="w-full bg-background border border-primary rounded p-1.5 text-xs text-foreground focus:outline-none resize-none leading-relaxed mt-1"
                                />
                              </div>
                            ) : (
                              <>
                                <span className={cn("font-medium flex-1", beat.content.replace(/\s+/g, "").length > 35 ? "text-amber-300 underline decoration-wavy decoration-amber-500" : "text-foreground")}>
                                  {beat.content}
                                </span>
                                {beat.content.replace(/\s+/g, "").length > 35 && (
                                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1 py-0.2 rounded border border-amber-500/30 shrink-0" title="shuohao质量门：单句台词建议 ≤ 35 字">
                                    {beat.content.replace(/\s+/g, "").length}字 (&gt;35字)
                                  </span>
                                )}
                                {beat.parenthetical && (
                                  <em className="text-muted-foreground/80 text-[11px] not-italic shrink-0">
                                    （{beat.parenthetical}）
                                  </em>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pen Helper Tag (.pen 双击改) */}
                      {!isEditing && (
                        <span className="text-[10px] text-muted-foreground/40 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                          双击改
                        </span>
                      )}

                      {/* Duration Tag (.secs.mono in Reelbench) */}
                      <span className="font-mono text-muted-foreground text-[11px] shrink-0 pt-0.5 w-10 text-right">
                        {beat.duration}s
                      </span>

                      {/* Delete Beat Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBeat(beat.id)}
                        className="p-1 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                        title="删除该节拍"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
