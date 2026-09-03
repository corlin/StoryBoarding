"use client";

import React from "react";
import { X, Users, Sparkles, ShieldCheck, UserCheck } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface CharacterHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CharacterHubDrawer({ isOpen, onClose }: CharacterHubDrawerProps) {
  const { currentProject } = useWorkspaceStore();

  if (!isOpen || !currentProject) return null;

  const characters = currentProject.characters || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121316] border-l border-border/80 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-[#16181d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                全剧角色库与视觉 DNA
                <span className="text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0.5 rounded">
                  {characters.length} 人
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                跨集人脸与服装一致性锚点 (Visual DNA Anchor Bus)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-start gap-2.5 text-xs text-sky-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <span className="font-semibold">好莱坞连续性总线：</span>
              当前项目已开启角色视觉基因锚定。所有集数中的出镜画面将强制注入对应角色的纯英文视觉 DNA，保障人脸、发型与服装跨集高度一致。
            </p>
          </div>

          {characters.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">当前工程尚未提取全局角色</p>
              <p className="text-[11px]">通过长篇小说/剧本导入即可自动提炼角色资产</p>
            </div>
          ) : (
            characters.map((char) => (
              <div
                key={char.id}
                className="p-4 bg-background border border-border/70 rounded-xl space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border/60 overflow-hidden font-bold text-xs text-sky-400">
                      {char.avatar_url ? (
                        <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        char.name.slice(0, 1)
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">{char.name}</span>
                      <span className="text-[10px] text-muted-foreground">{char.personality || "核心出场人物"}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
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

                {/* Visual DNA Anchor Display */}
                <div>
                  <label className="text-[10px] font-mono text-sky-400/90 block mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    生图连续性锚点 (Visual DNA Anchor):
                  </label>
                  <p className="text-[11px] font-mono text-foreground/80 bg-muted/40 p-2.5 rounded-lg border border-border/50 leading-relaxed">
                    {char.visual_anchor || "未设置英文视觉锚点"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-[#16181d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted/60 hover:bg-muted text-foreground text-xs font-medium rounded-lg transition"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
}
