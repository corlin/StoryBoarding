"use client";

import React, { useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Film, Users, Plus, Sparkles, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";

interface EpisodePillTrackProps {
  onOpenCharacterHub: () => void;
  onRefreshProject?: () => Promise<void> | void;
}

export function EpisodePillTrack({ onOpenCharacterHub, onRefreshProject }: EpisodePillTrackProps) {
  const { currentProject, activeEpisodeIndex, setActiveEpisodeIndex } = useWorkspaceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeStory, setEpisodeStory] = useState("");
  const [targetDuration, setTargetDuration] = useState(60);
  const [cliffhangerHook, setCliffhangerHook] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentProject) return null;

  const sequences = currentProject.sequences || [];
  const characters = currentProject.characters || [];
  const nextEpNum = sequences.length + 1;

  const handleOpenModal = () => {
    setEpisodeTitle(`第 ${nextEpNum} 集 · 危机升级`);
    setEpisodeStory("");
    setCliffhangerHook("生死悬念与突发反转");
    setTargetDuration(60);
    setIsAddModalOpen(true);
  };

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!episodeStory.trim()) {
      notify.error("请输入下一集的剧情梗概或故事片段");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.addEpisode(currentProject.id, {
        title: episodeTitle.trim() || `第 ${nextEpNum} 集`,
        story: episodeStory.trim(),
        target_duration: targetDuration,
        cliffhanger_summary: cliffhangerHook.trim(),
      });

      notify.success(`🎬 成功创建 ${res.episode_title}，已拆解 ${res.shots_count} 个镜头！`);
      setIsAddModalOpen(false);

      if (onRefreshProject) {
        await onRefreshProject();
      }
      setActiveEpisodeIndex(sequences.length);
    } catch (err: any) {
      console.error("Add Episode Failed:", err);
      notify.error(err?.response?.data?.detail || err?.message || "新增分集失败，请检查设置与网络");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-2.5 bg-[#121316]/90 border-b border-border/40 backdrop-blur-sm">
        {/* Left: Episode Selector Pills & Add Episode Button */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mr-1 shrink-0">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>短剧分集:</span>
          </div>

          {sequences.map((seq, idx) => {
            const isActive = idx === activeEpisodeIndex;
            const epNum = seq.episode_number || idx + 1;
            const shotCount = seq.shots?.length || 0;

            return (
              <button
                key={seq.id}
                onClick={() => setActiveEpisodeIndex(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                  isActive
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10"
                    : "bg-background/60 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span
                  className={`font-mono text-[10px] px-1 py-0.2 rounded ${
                    isActive ? "bg-amber-500/20 text-amber-300" : "bg-muted text-muted-foreground"
                  }`}
                >
                  EP {epNum}
                </span>
                <span className="max-w-[130px] truncate">{seq.title || seq.name || `第 ${epNum} 集`}</span>
                <span className="text-[10px] font-mono opacity-70">({shotCount}镜)</span>
                {seq.cliffhanger_summary && (
                  <span title={`集尾卡点: ${seq.cliffhanger_summary}`} className="text-rose-400 text-[11px]">
                    🎣
                  </span>
                )}
              </button>
            );
          })}

          {/* Add Next Episode Button */}
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-medium rounded-lg transition shrink-0 shadow-xs"
            title="在当前工程内无缝续写并追加下一集（继承全剧角色视觉 DNA）"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>追加下一集</span>
          </button>
        </div>

        {/* Right: Character Hub Drawer Trigger */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <button
            onClick={onOpenCharacterHub}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium rounded-lg transition"
            title="查看与微调全剧全局角色库及视觉基因锚点 (Visual DNA)"
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>全剧角色库</span>
            <span className="font-mono text-[10px] bg-sky-500/20 px-1.5 py-0.2 rounded text-sky-200">
              {characters.length}
            </span>
          </button>
        </div>
      </div>

      {/* Add Next Episode Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">追加短剧新集数 (EP {nextEpNum})</h3>
                  <p className="text-xs text-muted-foreground">自动继承全剧全局角色 Visual DNA，极速拆解新集镜头</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEpisode} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground/90 block mb-1">
                  本集分集标题 <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={episodeTitle}
                  onChange={(e) => setEpisodeTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground/90">
                    本集故事梗概 / 章节小说片段 <span className="text-primary">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">{episodeStory.length}/1000 字</span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="粘贴本集的小说章节片段，或描述主角的行动、新的危机与高潮对决..."
                  value={episodeStory}
                  onChange={(e) => setEpisodeStory(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-primary resize-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground/90 block mb-1">
                  集尾生死卡点 (Cliffhanger Hook)
                </label>
                <input
                  type="text"
                  placeholder="例如：冷月的佩剑刺入胸膛前一瞬，神秘人从屋檐破顶而入"
                  value={cliffhangerHook}
                  onChange={(e) => setCliffhangerHook(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium text-rose-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground/90 block mb-1.5">
                  目标片长 / 镜头密度
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[60, 75, 90].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setTargetDuration(dur)}
                      className={`py-2 rounded-lg text-xs font-mono font-medium border transition-all ${
                        targetDuration === dur
                          ? "bg-amber-500 text-black border-amber-500 font-semibold shadow-xs"
                          : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {dur}s ({dur <= 60 ? "8~10 镜" : dur <= 75 ? "10~12 镜" : "12~14 镜"})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>AI 导演正在并发拆镜...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>立即生成新集数</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
