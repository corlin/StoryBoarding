"use client";

import { buildVoiceAlignmentRows, voiceAlignmentCsv } from "@/lib/dialogueSpeaker";
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

  const dialogueShots = buildVoiceAlignmentRows(shots, characters);

  const handleCopyCsv = () => {
    navigator.clipboard.writeText(voiceAlignmentCsv(dialogueShots));
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
                  配音资料
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                导出所选镜头的台词与音色资料；需在配音工具中合成并核对实际时长
              </p>
            </div>
          </div>

          <button aria-label="关闭配音资料" onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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
                key={item.shotId}
                className="p-3.5 bg-background border border-border/70 rounded-xl space-y-2 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                      Shot #{item.shotOrder}
                    </span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Mic className="w-3 h-3 text-pink-400" />
                      {item.speakerName}{item.status === "unresolved" && item.speakerName !== "待确认说话者" ? "（待确认）" : ""}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">
                      语气: {item.emotion}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    计划镜头 {Number(item.duration.toFixed(2))}s
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
