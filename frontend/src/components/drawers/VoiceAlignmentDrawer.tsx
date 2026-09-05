"use client";

import React, { useState } from "react";
import { ShotModel, CharacterModel } from "@/types/shot";
import { X, Mic, Download, Copy, Check, Sparkles, Volume2 } from "lucide-react";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";

interface VoiceAlignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shots: ShotModel[];
  characters: CharacterModel[];
}

export const VoiceAlignmentDrawer: React.FC<VoiceAlignmentDrawerProps> = ({
  isOpen,
  onClose,
  shots,
  characters,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Filter dialogue shots
  const dialogueShots = shots
    .filter((s) => s.dialogue && s.dialogue.trim().length > 0)
    .map((shot, idx) => {
      // Find speaker character
      let char = characters.find((c) => (shot.character_ids || []).includes(c.id));
      if (!char && shot.subject) {
        char = characters.find((c) => shot.subject?.includes(c.name));
      }
      return {
        index: idx + 1,
        shotOrder: shot.order,
        speakerName: char?.name || shot.subject || "画外音",
        voiceDna: char?.voice_dna || char?.voiceDna || "沉稳中音，清晰自然",
        dialogue: shot.dialogue || "",
        emotion: shot.dialogue_emotion || shot.emotion || "正常叙事",
        duration: shot.duration || 2.5,
      };
    });

  const handleCopyCsv = () => {
    const header = "序号,镜头号,说话角色,声音特征/音色Prompt,台词文本,情感语气,预估时长(秒)\n";
    const rows = dialogueShots
      .map(
        (d) =>
          `"${d.index}","Shot #${d.shotOrder}","${d.speakerName}","${d.voiceDna.replace(/"/g, '""')}","${d.dialogue.replace(/"/g, '""')}","${d.emotion}","${d.duration}"`
      )
      .join("\n");
    navigator.clipboard.writeText(header + rows);
    setCopied(true);
    notify.success("已复制配音对齐单 CSV 数据至剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dialogueShots, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `voice_alignment_sheet_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notify.success("已下载配音对齐单 JSON 结构化清单");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl md:max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center border border-pink-500/30">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                角色配音对齐单 (Voice Alignment Sheet)
                <span className="text-[10px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30 px-1.5 py-0.2 rounded">
                  TTS直通
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                提取全剧台词与角色音色特征，一键对接 CosyVoice / ElevenLabs 批量合成
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-border/60 bg-card/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-mono">
            共检测到 <strong className="text-foreground">{dialogueShots.length}</strong> 处对白台词
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCsv}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>复制 CSV</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 JSON</span>
            </button>
          </div>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {dialogueShots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs gap-2">
              <Volume2 className="w-8 h-8 opacity-40" />
              <span>本集镜头暂无角色对白台词</span>
            </div>
          ) : (
            dialogueShots.map((item) => (
              <div
                key={item.shotOrder}
                className="p-3.5 bg-background border border-border/70 rounded-xl space-y-2 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                      Shot #{item.shotOrder}
                    </span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Mic className="w-3 h-3 text-pink-400" />
                      {item.speakerName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">
                      语气: {item.emotion}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    预估 {item.duration}s
                  </span>
                </div>

                <p className="text-xs text-foreground/95 bg-secondary/30 p-2.5 rounded-lg border border-border/50 leading-relaxed font-medium">
                  “{item.dialogue}”
                </p>

                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 truncate">
                  <span className="font-semibold text-pink-400/90">音色 Prompt:</span>
                  <span className="truncate">{item.voiceDna}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
