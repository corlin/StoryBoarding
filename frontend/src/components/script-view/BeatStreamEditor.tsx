"use client";

import { resolveDialogueSpeaker } from "@/lib/dialogueSpeaker";
import React, { useState, useEffect, useMemo, useRef } from "react";
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
  BookOpen,
  MapPin,
  Users,
  Box,
  Edit2,
  Check,
  RefreshCw,
  Scissors,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BeatStreamEditorProps {
  project: ProjectModel | null;
  sequence: SequenceModel | null;
  selectedShotId?: string | null;
  onRefreshProject?: () => Promise<void>;
  onSwitchToStoryboard?: () => void;
}

// industry-standard novel-script standard formula: non-whitespace chars / 4.5 charsPerSecond (including punctuation pause)
export function calculateDialogueDuration(dialogue: string, charsPerSecond: number = 4.5): number {
  const nonWhitespace = String(dialogue ?? "").replace(/\s+/g, "");
  const count = nonWhitespace.length;
  if (count === 0) return 1.5;
  const raw = count / charsPerSecond;
  return Math.max(1.0, Math.round(raw * 10) / 10);
}

/**
 * 智能按标点符号断句拆分（中英文逗号、分号、句号、感叹号、问号、破折号、省略号）
 * 返回两个拆分后的子句。如果没有合适标点，则从正中折半断开。
 */
export function splitLongDialogue(dialogue: string): [string, string] {
  const text = String(dialogue ?? "").trim();
  if (text.length <= 1) return [text, ""];

  // 标点符号集
  const punctRegex = /[，,。！？!?；;……——\n]/g;
  const matches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = punctRegex.exec(text)) !== null) {
    // 排除首字符和末字符处的无意义断点
    if (m.index > 3 && m.index < text.length - 4) {
      matches.push(m.index);
    }
  }

  const mid = Math.floor(text.length / 2);
  let bestSplitIndex = -1;

  if (matches.length > 0) {
    // 找距离正中最近的标点断点
    bestSplitIndex = matches.reduce((prev, curr) =>
      Math.abs(curr - mid) < Math.abs(prev - mid) ? curr : prev
    );
    // 包含当前断点标点在第一句中
    const part1 = text.slice(0, bestSplitIndex + 1).trim();
    const part2 = text.slice(bestSplitIndex + 1).trim();
    return [part1, part2];
  } else {
    // 无标点，从中间折半
    const part1 = text.slice(0, mid).trim();
    const part2 = text.slice(mid).trim();
    return [part1, part2];
  }
}

export function parseBeatsFromScreenplay(text: string, fallbackSceneTitle: string = "主场景"): BeatModel[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const beats: BeatModel[] = [];

  let currentSpeaker: string | null = null;
  let currentParenthetical: string | null = null;
  let currentSceneNum = 1;
  let currentSceneTitle = fallbackSceneTitle;

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
        duration: 2.5, // Director Studio action beat standard default
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
  selectedShotId,
  onRefreshProject,
  onSwitchToStoryboard,
}) => {
  const [beats, setBeats] = useState<BeatModel[]>([]);
  const [hook, setHook] = useState("");
  const [cliffhanger, setCliffhanger] = useState("");
  const [payoff, setPayoff] = useState("");
  const [targetDuration, setTargetDuration] = useState(60.0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingToShots, setIsSyncingToShots] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Find index of shot in current sequence to align with beat index
  const selectedShotIndex = useMemo(() => {
    if (!selectedShotId || !sequence?.shots) return -1;
    return sequence.shots.findIndex((s) => s.id === selectedShotId);
  }, [selectedShotId, sequence?.shots]);

  // Auto-scroll to matching beat when selectedShotId changes
  useEffect(() => {
    if (selectedShotIndex < 0) return;
    const targetElement = document.getElementById(`beat-item-${selectedShotIndex}`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedShotIndex]);

  // Convert current atomic beats into clean screenplay format with shot blocks for 100% stable parsing
  const convertBeatsToScreenplayText = (seq: SequenceModel, beatList: BeatModel[]): string => {
    const epNum = seq.episode_number || seq.order || 1;
    const lines: string[] = [
      `第 ${epNum} 场 · ${seq.title || `第 ${epNum} 集`} · 空间内景`,
      "",
    ];

    beatList.forEach((b, idx) => {
      if (b.type === "action") {
        lines.push(`【镜头 #${idx + 1}】${b.content || "角色展开关键行动调度。"}`);
      } else {
        lines.push(`【镜头 #${idx + 1}】${b.speaker || "角色"}入画`);
        lines.push(`  ${b.speaker || "角色"}：“${b.content || ""}”`);
      }
      lines.push("");
    });

    return lines.join("\n");
  };

  const handleCopyFullScript = () => {
    if (!sequence || beats.length === 0) {
      notify.error("暂无可复制的剧本节拍内容");
      return;
    }
    const scriptText = convertBeatsToScreenplayText(sequence, beats);
    navigator.clipboard.writeText(scriptText);
    setIsCopiedScript(true);
    notify.success(`📋 已复制第 ${sequence.episode_number || sequence.order || 1} 集标准剧本台本文本！`);
    setTimeout(() => setIsCopiedScript(false), 2000);
  };

  const handleSyncToShots = async () => {
    if (!project?.id || !sequence?.id) return;
    try {
      setIsSyncingToShots(true);
      // 1. First persist beats and anchors
      await api.updateSequenceScreenplay(project.id, sequence.id, {
        hook_summary: hook.trim(),
        cliffhanger_summary: cliffhanger.trim(),
        payoff_summary: payoff.trim(),
        target_duration: targetDuration,
        beats_data: beats,
      });

      // 2. Generate structured screenplay text and trigger differential reconciliation
      const screenplayStr = convertBeatsToScreenplayText(sequence, beats);
      const res = await api.syncSequenceScreenplayToShots(project.id, sequence.id, screenplayStr);

      const updatedCount = res.diff?.updated || 0;
      const createdCount = res.diff?.created || 0;
      const lockedCount = res.diff?.locked_preserved || 0;

      notify.success(`✨ 已成功同步分镜！更新 ${updatedCount} 镜，新建 ${createdCount} 镜，锁定保护 ${lockedCount} 镜`);
      if (onRefreshProject) {
        await onRefreshProject();
      }
      if (onSwitchToStoryboard) {
        onSwitchToStoryboard();
      }
    } catch (err: any) {
      console.error("Sync beats to shots error:", err);
      notify.error(err?.response?.data?.detail || err?.message || "同步分镜失败");
    } finally {
      setIsSyncingToShots(false);
    }
  };

  // 从分镜派生完整节拍流的通用函数
  const deriveBeatsFromShots = (seq: SequenceModel): BeatModel[] => {
    if (!seq.shots || seq.shots.length === 0) {
      return [
        {
          id: crypto.randomUUID(),
          type: "action",
          scene_number: 1,
          scene_title: seq.name || "主场次",
          content: "展开核心剧情动作调度...",
          duration: 2.5,
        },
      ];
    }
    const derived: BeatModel[] = [];
    seq.shots.forEach((s) => {
      const sceneTitle = s.subject?.split(/[,，\s]/)[0] || seq.name || `主场景`;
      if (s.action && s.action.trim()) {
        derived.push({
          id: `beat-action-${s.id}`,
          type: "action",
          scene_number: 1,
          scene_title: sceneTitle,
          content: s.action.trim(),
          duration: s.dialogue ? Math.max(1.0, (s.duration || 2.5) * 0.4) : (s.duration || 2.5),
        });
      }
      if (s.dialogue && s.dialogue.trim()) {
        derived.push({
          id: `beat-dialogue-${s.id}`,
          type: "dialogue",
          scene_number: 1,
          scene_title: sceneTitle,
          speaker: resolveDialogueSpeaker(s, project?.characters || []).speakerName,
          content: s.dialogue.trim(),
          duration: Math.max(1.5, (s.duration || 2.5) * 0.6),
        });
      }
    });
    return derived.length > 0 ? derived : [
      {
        id: crypto.randomUUID(),
        type: "action",
        scene_number: 1,
        scene_title: seq.name || "主场次",
        content: "展开核心剧情动作调度...",
        duration: 2.5,
      },
    ];
  };

  // Load beats from sequence
  useEffect(() => {
    if (!sequence) return;
    setHook(sequence.hook_summary || "");
    setCliffhanger(sequence.cliffhanger_summary || "");
    setPayoff(sequence.payoff_summary || "悬念钩");
    setTargetDuration(sequence.target_duration || 60.0);

    const shotsCount = sequence.shots?.length || 0;

    if (sequence.beats_data && sequence.beats_data.length > 0) {
      setBeats(sequence.beats_data);
    } else if (sequence.screenplay_text && sequence.screenplay_text.trim()) {
      const parsed = parseBeatsFromScreenplay(sequence.screenplay_text, sequence.name || "主场景");
      // 若剧本仅为极简梗概（解析出的节拍过少，如仅有1拍，而分镜镜头数已有多个），优先自动采用分镜派生，避免 -96% 伪超容差
      if (shotsCount > 2 && parsed.length <= 1) {
        setBeats(deriveBeatsFromShots(sequence));
      } else {
        setBeats(parsed);
      }
    } else if (shotsCount > 0) {
      setBeats(deriveBeatsFromShots(sequence));
    } else {
      setBeats([
        {
          id: crypto.randomUUID(),
          type: "action",
          scene_number: 1,
          scene_title: sequence.name || "主场次",
          content: "镜头初始动作构建中...",
          duration: 2.5,
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

  const handleSplitBeat = (targetBeat: BeatModel) => {
    const isAction = targetBeat.type === "action";
    const [part1, part2] = splitLongDialogue(targetBeat.content);
    if (!part2) {
      notify.error("内容过短或未找到合适断句标点，无法拆分");
      return;
    }

    const duration1 = isAction ? Math.max(1.5, Math.round((targetBeat.duration || 2.5) / 2 * 10) / 10) : calculateDialogueDuration(part1);
    const duration2 = isAction ? Math.max(1.5, Math.round((targetBeat.duration || 2.5) / 2 * 10) / 10) : calculateDialogueDuration(part2);

    const beat1: BeatModel = {
      ...targetBeat,
      content: part1,
      duration: duration1,
    };

    const beat2: BeatModel = {
      id: crypto.randomUUID(),
      type: targetBeat.type,
      scene_number: targetBeat.scene_number,
      scene_title: targetBeat.scene_title,
      speaker: targetBeat.speaker,
      parenthetical: undefined,
      content: part2,
      duration: duration2,
      location_code: targetBeat.location_code,
      lighting_state: targetBeat.lighting_state,
    };

    // 在 targetBeat 的原位置后面紧接着插入拆分出的第二拍
    const targetIndex = beats.findIndex((b) => b.id === targetBeat.id);
    if (targetIndex === -1) return;

    const newBeats = [...beats];
    newBeats.splice(targetIndex, 1, beat1, beat2);
    setBeats(newBeats);
    notify.success(isAction ? "已将动作描写拆分为双镜节拍！" : "已智能拆分为双句台词节拍，符合节奏规范！");
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
      {/* 1. Director Studio Stage 04 Top Navigation & Quick Switcher */}
      <div className="px-5 py-3 border-b border-border/80 bg-card/40 flex items-center justify-between gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-mono">剧本 /</span>
          <span className="font-bold text-foreground">
            第 {sequence.episode_number || sequence.order || 1} 集
          </span>
          <span className="font-mono text-muted-foreground ml-1">
            计划 {totalDuration}s / 目标 {targetDuration}s
          </span>
          {Math.abs(diffPercent) > 15 && (
            <span
              className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border flex items-center gap-1 bg-red-500/10 text-red-400 border-red-500/30 animate-pulse cursor-help"
              title="计划时长与目标相差超过 15%；不代表实际配音时长或剧情质量"
            >
              <span>{diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`}</span>
              <span className="text-[9px] opacity-80">(超容差)</span>
            </span>
          )}
          {/* 当存在有效镜头时，提供从分镜一键无损同步节拍按钮 */}
          {sequence.shots && sequence.shots.length > 0 && (
            <button
              onClick={() => {
                const synced = deriveBeatsFromShots(sequence);
                setBeats(synced);
                notify.success(`已从本集 ${sequence.shots.length} 个镜头快速对齐 ${synced.length} 个剧本节拍！`);
              }}
              title="从当前分镜镜头智能反向派生节拍流与台词"
              className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-border bg-secondary/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>同步分镜</span>
            </button>
          )}
          <span className="text-muted-foreground text-[11px] hidden sm:inline">
            · {sceneGroups.length} 场 · {beats.length} 节拍
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Full Screenplay Script Button */}
          <button
            type="button"
            onClick={handleCopyFullScript}
            disabled={beats.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary hover:bg-muted text-foreground border border-border transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="一键复制本集标准剧组台本文本 (含场次、角色对白与括号动作)"
          >
            {isCopiedScript ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span>复制剧本</span>
              </>
            )}
          </button>

          {/* Sync Screenplay to Storyboard Shots Button (Differential Update) */}
          <button
            type="button"
            onClick={handleSyncToShots}
            disabled={isSyncingToShots || isSaving || beats.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="将当前修改后的节拍流与台词，差量同步更新至右侧分镜画板（已锁定镜头将被安全保护）"
          >
            {isSyncingToShots ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>同步更新分镜</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || isSyncingToShots}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-secondary hover:bg-muted text-foreground border border-border transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="仅保存剧本节拍与三幕短剧卡点数据"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>保存剧本</span>
          </button>
        </div>
      </div>

      {/* 2. Director Studio Triad Anchors (Hook / Cliffhanger / Payoff) */}
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

      {/* 3. Scene-by-Scene Atomic Beat Flow (Industry Standard Container) */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
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
              {/* Scene Header Strip (.scene-h in Director Studio) */}
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

                {/* Character & Prop Presence Pills (.badge.b-dim in Director Studio) */}
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

              {/* Atomic Beats Flow List (.flow in Director Studio) */}
              <div className="p-3 space-y-2">
                {sceneBeats.map((beat, idx) => {
                  const isAction = beat.type === "action";
                  const isEditing = editingBeatId === beat.id;
                  const globalBeatIndex = beats.findIndex((b) => b.id === beat.id);
                  const isBeatSelected = selectedShotIndex >= 0 && globalBeatIndex === selectedShotIndex;

                  return (
                    <div
                      key={beat.id}
                      id={`beat-item-${globalBeatIndex}`}
                      onDoubleClick={() => setEditingBeatId(beat.id)}
                      className={cn(
                        "group relative flex items-start gap-3 p-2.5 rounded-xl border transition-all text-xs",
                        isBeatSelected
                          ? "border-primary ring-2 ring-primary/40 bg-primary/10 shadow-md"
                          : isAction
                          ? "bg-amber-500/[0.03] border-border/60 hover:border-amber-500/40"
                          : "bg-blue-500/[0.03] border-border/60 hover:border-blue-500/40"
                      )}
                    >
                      {/* Beat Index */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <span className={cn(
                          "w-5 text-center font-mono text-[11px] font-bold rounded",
                          isBeatSelected
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground/60"
                        )}>
                          {idx + 1}
                        </span>
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
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0" title="影视工业质量门：单句台词建议 ≤ 35 字">
                                      {beat.content.replace(/\s+/g, "").length}字 (&gt;35字)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSplitBeat(beat);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[10px] font-medium transition-all shadow-xs cursor-pointer active:scale-95"
                                      title="智能在标点符号处断句，一分为二拆为双拍，消除超长告警"
                                    >
                                      <Scissors className="w-2.5 h-2.5" />
                                      <span>⚡ 一键智能拆句</span>
                                    </button>
                                  </div>
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

                      {/* Duration Tag (.secs.mono in Director Studio) */}
                      <span className="font-mono text-muted-foreground text-[11px] shrink-0 pt-0.5 w-10 text-right">
                        {Number(beat.duration.toFixed(2))}s
                      </span>

                      {/* Quick Split Beat Button (Hover Action) */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSplitBeat(beat);
                          }}
                          className="p-1 rounded text-muted-foreground/40 hover:text-amber-300 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                          title="✂️ 将该节拍按标点一分为二（快速拆为双镜）"
                        >
                          <Scissors className="w-3 h-3" />
                        </button>
                      )}

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
