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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BeatStreamEditorProps {
  project: ProjectModel | null;
  sequence: SequenceModel | null;
  onRefreshProject?: () => Promise<void>;
}

// Reelbench standard formula: (chars / 4.2) + 0.8s pause, minimum 1.5s
export function calculateDialogueDuration(dialogue: string): number {
  const clean = dialogue.replace(/[\s.,!?;:，。！？；：“”‘’"'\-\(\)（）]/g, "");
  const count = clean.length;
  if (count === 0) return 1.5;
  const raw = count / 4.2 + 0.8;
  return Math.max(1.5, Math.round(raw * 10) / 10);
}

export function parseBeatsFromScreenplay(text: string): BeatModel[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const beats: BeatModel[] = [];

  let currentSpeaker: string | null = null;
  let currentParenthetical: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip scene headers
    if (line.startsWith("第") && line.includes("场")) continue;
    if (line.startsWith("【场景氛围】")) continue;

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
      });
      currentSpeaker = null;
      currentParenthetical = null;
      continue;
    }

    // Parenthetical: (xxx)
    if (line.startsWith("(") && line.endsWith(")")) {
      currentParenthetical = line.slice(1, -1);
      continue;
    }

    // Speaker line (short name, no punctuation, next line is quote or parenthetical)
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
}) => {
  const [beats, setBeats] = useState<BeatModel[]>([]);
  const [hook, setHook] = useState("");
  const [cliffhanger, setCliffhanger] = useState("");
  const [payoff, setPayoff] = useState("");
  const [targetDuration, setTargetDuration] = useState(60.0);
  const [isSaving, setIsSaving] = useState(false);

  // Load beats from sequence or parse from screenplayText
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
          content: "浓雾里传来脚步声，栈桥显露，老周蹲在船头抽旱烟。",
          duration: 2.5,
        },
        {
          id: crypto.randomUUID(),
          type: "dialogue",
          speaker: "老周",
          parenthetical: "扯着嗓子，不急不躁",
          content: "上船喽——过河的抓紧，雾要变天。",
          duration: 3.6,
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

  const handleUpdatePayoffTag = (beatId: string, tag: string | null) => {
    setBeats(
      beats.map((b) => (b.id === beatId ? { ...b, payoff_tag: tag || undefined } : b))
    );
  };

  const handleAddBeat = (type: "action" | "dialogue") => {
    const newBeat: BeatModel = {
      id: crypto.randomUUID(),
      type,
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

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* 1. Reelbench Stage 04 Duration & Drama Dashboard */}
      <div className="p-3.5 bg-secondary/30 border-b border-border/80 space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Duration Meter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold font-mono text-foreground">{totalDuration}s</span>
                <span className="text-xs text-muted-foreground font-mono">/ {targetDuration}s</span>
              </div>
            </div>

            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-mono font-bold border",
                diffPercent === 0
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : diffPercent > 0
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-blue-500/15 text-blue-300 border-blue-500/30"
              )}
            >
              {diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`} 时长偏差
            </span>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              · {beats.length} 节拍 ({dialogueCount} 台词 · {beats.length - dialogueCount} 动作)
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddBeat("action")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>动作节拍 (2.5s)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddBeat("dialogue")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
            >
              <Volume2 className="w-3 h-3 text-blue-400" />
              <span>台词节拍 (字数折算)</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>保存节拍流</span>
            </button>
          </div>
        </div>

        {/* 2. Hook & Cliffhanger & Payoff Trio (Reelbench Standard) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="bg-background/80 border border-border/70 rounded-lg p-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                🪝 本集钩子 (Hook 0-3s)
              </span>
              <span className="text-[10px] text-muted-foreground">留存抓手</span>
            </div>
            <input
              type="text"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="如: 皮箱里到底装了什么，值得她指节发白"
              className="bg-transparent border-none p-0 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="bg-background/80 border border-border/70 rounded-lg p-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                ⚡ 本集断点 (Cliffhanger)
              </span>
              <span className="text-[10px] text-muted-foreground">集尾卡点</span>
            </div>
            <input
              type="text"
              value={cliffhanger}
              onChange={(e) => setCliffhanger(e.target.value)}
              placeholder="如: 陆行远的右手从上船起就没离开过大衣口袋"
              className="bg-transparent border-none p-0 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="bg-background/80 border border-border/70 rounded-lg p-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-400">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                💥 爽点认领 (Payoff / Twist)
              </span>
              <span className="text-[10px] text-muted-foreground">情绪高潮</span>
            </div>
            <input
              type="text"
              value={payoff}
              onChange={(e) => setPayoff(e.target.value)}
              placeholder="如: 悬念钩 / 身份揭破 / 反转 / 收束"
              className="bg-transparent border-none p-0 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      {/* 3. Beat Stream List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {beats.map((beat, idx) => {
          const isAction = beat.type === "action";
          return (
            <div
              key={beat.id}
              className={cn(
                "p-3 rounded-xl border transition-all flex items-start gap-3 group relative",
                isAction
                  ? "bg-card/40 border-border/70 hover:border-border"
                  : "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40"
              )}
            >
              {/* Beat Number & Type Icon */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <span className="w-5 h-5 rounded-full bg-secondary/80 text-[10px] font-mono font-bold flex items-center justify-center text-muted-foreground">
                  {idx + 1}
                </span>
                {isAction ? (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 font-mono">动</span>
                ) : (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-blue-500/15 text-blue-400 font-mono">台</span>
                )}
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {!isAction && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={beat.speaker || ""}
                      onChange={(e) => {
                        const speaker = e.target.value;
                        setBeats(beats.map((b) => (b.id === beat.id ? { ...b, speaker } : b)));
                      }}
                      placeholder="说话角色"
                      className="text-xs font-bold text-blue-300 bg-secondary/40 border border-border/60 rounded px-1.5 py-0.5 max-w-[100px] focus:outline-none focus:border-blue-500/60"
                    />
                    <input
                      type="text"
                      value={beat.parenthetical || ""}
                      onChange={(e) => {
                        const parenthetical = e.target.value;
                        setBeats(beats.map((b) => (b.id === beat.id ? { ...b, parenthetical } : b)));
                      }}
                      placeholder="语气/副动作 (如: 旱烟不离嘴)"
                      className="text-[11px] text-muted-foreground bg-transparent border-none p-0 focus:outline-none placeholder:text-muted-foreground/40 italic"
                    />
                  </div>
                )}

                <textarea
                  rows={2}
                  value={beat.content}
                  onChange={(e) => handleUpdateContent(beat.id, e.target.value)}
                  placeholder={isAction ? "输入动作推进节拍描写..." : "输入台词文本..."}
                  className="w-full bg-transparent border-none p-0 text-xs text-foreground focus:outline-none resize-none leading-relaxed"
                />

                {/* Tags Row */}
                <div className="flex items-center gap-2 pt-0.5">
                  {beat.payoff_tag ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      <Flame className="w-2.5 h-2.5" />
                      <span>{beat.payoff_tag}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdatePayoffTag(beat.id, null)}
                        className="hover:text-red-400 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {["悬念钩", "身份揭破", "反转"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleUpdatePayoffTag(beat.id, tag)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:text-purple-300 hover:bg-purple-500/15 transition-colors border border-border/50 cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Duration Capsule (Click to edit) */}
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <div className="flex items-center gap-1 bg-secondary/80 border border-border/80 px-2 py-1 rounded-lg">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="30"
                    value={beat.duration}
                    onChange={(e) => handleUpdateDuration(beat.id, parseFloat(e.target.value) || 2.5)}
                    className="w-12 bg-transparent text-xs font-mono font-bold text-foreground text-right focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">s</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteBeat(beat.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="删除此节拍"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
