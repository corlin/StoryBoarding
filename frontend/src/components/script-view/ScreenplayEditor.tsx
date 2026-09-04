"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Save,
  Loader2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { SequenceModel, ProjectModel } from "@/types/shot";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";

interface ScreenplayEditorProps {
  project: ProjectModel | null;
  sequence: SequenceModel | null;
  onRefreshProject?: () => Promise<void>;
}

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  project,
  sequence,
  onRefreshProject,
}) => {
  const [screenplayText, setScreenplayText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync initial screenplay text when sequence changes
  useEffect(() => {
    if (sequence) {
      if (sequence.screenplay_text) {
        setScreenplayText(sequence.screenplay_text);
      } else {
        // Generate a standard Hollywood screenplay template from shots if empty
        const defaultScreenplay = generateDefaultScreenplay(sequence);
        setScreenplayText(defaultScreenplay);
      }
    }
  }, [sequence?.id, sequence?.screenplay_text]);

  const generateDefaultScreenplay = (seq: SequenceModel): string => {
    const epNum = seq.episode_number || seq.order || 1;
    const lines: string[] = [
      `第 ${epNum} 场 · ${seq.title || `第 ${epNum} 集`} · 空间内景 · 夜`,
      "",
      `【场景氛围】${seq.cliffhanger_summary ? `全集紧扣生死卡点：“${seq.cliffhanger_summary}”` : "紧张对峙，暗流涌动。"}`,
      "",
    ];

    if (seq.shots && seq.shots.length > 0) {
      seq.shots.forEach((s, idx) => {
        lines.push(`【镜头 #${idx + 1} · ${s.shot_size || "中景"}】${s.action || "角色展开行动。"}`);
        if (s.dialogue) {
          lines.push("");
          lines.push(`  ${s.subject || "主角"}`);
          lines.push(`  “${s.dialogue}”`);
          lines.push("");
        }
      });
    } else {
      lines.push("【动作】角色在此处展开关键行动...");
      lines.push("");
      lines.push("  主角");
      lines.push("  (语气坚定)");
      lines.push("  “这一次，我绝不会再放手。”");
    }

    return lines.join("\n");
  };

  const handleSaveScreenplay = async () => {
    if (!project?.id || !sequence?.id) return;
    try {
      setIsSaving(true);
      await api.updateSequenceScreenplay(project.id, sequence.id, screenplayText);
      notify.success("💾 文学剧本母本已成功保存！");
      if (onRefreshProject) {
        await onRefreshProject();
      }
    } catch (err: any) {
      console.error("Save screenplay error:", err);
      notify.error(err?.response?.data?.detail || err?.message || "保存剧本失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyScreenplay = async () => {
    try {
      await navigator.clipboard.writeText(screenplayText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      notify.success("📋 文学剧本文本已复制到剪贴板");
    } catch (err) {
      notify.error("复制失败");
    }
  };

  if (!sequence) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-6 text-center">
        <BookOpen className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-xs">暂无选中的分集剧本</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card/60 rounded-xl border border-border/70 overflow-hidden shadow-xs">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/40 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>《{sequence.title || `第 ${sequence.episode_number || sequence.order} 集`}》文学剧本正文</span>
              <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                Master Script
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              好莱坞文学母本格式 · 自由编辑对白与动作描写
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyScreenplay}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-background hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors"
            title="复制剧本文学正文"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{isCopied ? "已复制" : "复制"}</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveScreenplay}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>保存剧本</span>
          </button>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="flex-1 p-4 flex flex-col">
        <textarea
          value={screenplayText}
          onChange={(e) => setScreenplayText(e.target.value)}
          placeholder="在此编写或粘贴本集的影视文学剧本（场景头、人物对白、文学动作描写）..."
          className="flex-1 w-full bg-background/80 border border-border/80 rounded-xl p-4 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-none text-foreground placeholder:text-muted-foreground/50 shadow-inner"
        />

        {/* Footer Advice */}
        <div className="flex items-center justify-between pt-2.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>修改文学剧本后点击「保存剧本」，分集母本即刻云端持久化更新。</span>
          </div>
          <span className="font-mono text-[10px]">
            {screenplayText.length} 字 · {sequence.shots?.length || 0} 个关联分镜
          </span>
        </div>
      </div>
    </div>
  );
};
