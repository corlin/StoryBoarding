"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Sparkles,
  GitFork,
  Mic,
  Plus,
  Trash2,
  Check,
  Quote,
  Activity,
  HeartHandshake,
  Volume2,
  Tag,
} from "lucide-react";
import { CharacterModel, CharacterProfile } from "@/types/shot";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";

interface CharacterProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterModel | null;
  onSave: (updatedChar: CharacterModel) => void;
  allCharacters?: CharacterModel[];
}

export const CharacterProfileDrawer: React.FC<CharacterProfileDrawerProps> = ({
  isOpen,
  onClose,
  character,
  onSave,
  allCharacters = [],
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "arc" | "voice">("profile");

  // Local state for profile_json
  const [profile, setProfile] = useState<CharacterProfile>({});
  const [tagInput, setTagInput] = useState("");

  // New relation input
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("");
  const [newRelDesc, setNewRelDesc] = useState("");

  // New evidence input
  const [newEvSource, setNewEvSource] = useState("");
  const [newEvQuote, setNewEvQuote] = useState("");
  const [newEvNote, setNewEvNote] = useState("");

  useEffect(() => {
    if (character) {
      const existing = character.profile_json || {};
      setProfile({
        code: existing.code || character.name,
        title_alias: existing.title_alias || "",
        gender: existing.gender || "未知",
        age: existing.age || "",
        identity: existing.identity || character.personality || "",
        appearance: existing.appearance || character.visual_anchor || "",
        disposition: existing.disposition || character.personality || "",
        motivation: existing.motivation || "",
        tags: existing.tags ? [...existing.tags] : [],
        arc_static: existing.arc_static || character.personality || "",
        arc_dynamic: existing.arc_dynamic || "",
        relations: existing.relations ? JSON.parse(JSON.stringify(existing.relations)) : [],
        evidences: existing.evidences ? JSON.parse(JSON.stringify(existing.evidences)) : [],
        voice_traits: existing.voice_traits || {
          timbre: character.voice_dna || "沉稳中音",
          pitch: "中",
          speed: "中速从容",
          accent: "标准普通话",
          emotion_baseline: "内敛平静",
          tts_prompt: character.voice_dna || "",
        },
      });
    }
  }, [character]);

  if (!isOpen || !character) return null;

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = profile.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      setProfile({ ...profile, tags: [...currentTags, tagInput.trim()] });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setProfile({
      ...profile,
      tags: (profile.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  const handleAddRelation = () => {
    if (!newRelTarget.trim()) {
      notify.error("请选择或填写关联目标角色");
      return;
    }
    const currentRelations = profile.relations || [];
    currentRelations.push({
      target_character_name: newRelTarget.trim(),
      relationship: newRelType.trim() || "关联",
      description: newRelDesc.trim(),
    });
    setProfile({ ...profile, relations: currentRelations });
    setNewRelTarget("");
    setNewRelType("");
    setNewRelDesc("");
  };

  const handleRemoveRelation = (index: number) => {
    const nextRels = [...(profile.relations || [])];
    nextRels.splice(index, 1);
    setProfile({ ...profile, relations: nextRels });
  };

  const handleAddEvidence = () => {
    if (!newEvQuote.trim()) {
      notify.error("请填写小说原文佐证摘录");
      return;
    }
    const currentEvs = profile.evidences || [];
    currentEvs.push({
      source_chapter: newEvSource.trim() || "原著选段",
      quote: newEvQuote.trim(),
      annotation: newEvNote.trim(),
    });
    setProfile({ ...profile, evidences: currentEvs });
    setNewEvSource("");
    setNewEvQuote("");
    setNewEvNote("");
  };

  const handleRemoveEvidence = (index: number) => {
    const nextEvs = [...(profile.evidences || [])];
    nextEvs.splice(index, 1);
    setProfile({ ...profile, evidences: nextEvs });
  };

  const handleVoiceChange = (field: keyof NonNullable<CharacterProfile["voice_traits"]>, value: string) => {
    const currentVoice = profile.voice_traits || {};
    const updatedVoice = { ...currentVoice, [field]: value };

    // Auto-synthesize tts_prompt if changing traits
    if (field !== "tts_prompt") {
      const parts = [
        updatedVoice.timbre,
        updatedVoice.pitch ? `${updatedVoice.pitch}音高` : "",
        updatedVoice.speed,
        updatedVoice.accent,
        updatedVoice.emotion_baseline ? `常态情绪:${updatedVoice.emotion_baseline}` : "",
      ].filter(Boolean);
      updatedVoice.tts_prompt = parts.join("，");
    }

    setProfile({ ...profile, voice_traits: updatedVoice });
  };

  const handleSaveAll = () => {
    const updatedCharacter: CharacterModel = {
      ...character,
      profile_json: profile,
      voice_dna: profile.voice_traits?.tts_prompt || character.voice_dna,
    };
    onSave(updatedCharacter);
    notify.success(`✨ 已更新「${character.name}」的深度人设与声音DNA档案！`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-card border-l border-border/80 shadow-2xl flex flex-col">
          {/* Top Bar Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-background/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">{character.name}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                    {character.role === "protagonist" ? "主角" : character.role === "antagonist" ? "反派" : "配角"}
                  </span>
                  {profile.title_alias && (
                    <span className="text-[11px] text-purple-400 font-medium">({profile.title_alias})</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Reelbench 工业级人设档案 · 六维画像 · 双轨弧光 · 关系网 · 声音DNA
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center border-b border-border px-6 bg-secondary/20">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={cn(
                "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer",
                activeTab === "profile"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>人物画像与原文佐证</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("arc")}
              className={cn(
                "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer",
                activeTab === "arc"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>剧作弧光与关系网</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("voice")}
              className={cn(
                "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer",
                activeTab === "voice"
                  ? "border-pink-500 text-pink-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>六维声音 DNA</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: Profile & Evidences */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 6D Dimension Attributes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>六维核心属性 (Six-Dimensional Character Attributes)</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">性别</label>
                      <input
                        type="text"
                        value={profile.gender || ""}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        placeholder="男 / 女 / 未知"
                        className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">年龄 / 外貌感知年龄</label>
                      <input
                        type="text"
                        value={profile.age || ""}
                        onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                        placeholder="例如: 24岁 / 外表清冷"
                        className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">头衔 / 别名</label>
                      <input
                        type="text"
                        value={profile.title_alias || ""}
                        onChange={(e) => setProfile({ ...profile, title_alias: e.target.value })}
                        placeholder="例如: 沈医生 / 小微"
                        className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">社会身份与职业 (Identity)</label>
                    <input
                      type="text"
                      value={profile.identity || ""}
                      onChange={(e) => setProfile({ ...profile, identity: e.target.value })}
                      placeholder="例如: 仁安医院实习心外科医生，实为首富遗落民间的长女"
                      className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">性格与处世特质 (Disposition)</label>
                    <textarea
                      rows={2}
                      value={profile.disposition || ""}
                      onChange={(e) => setProfile({ ...profile, disposition: e.target.value })}
                      placeholder="例如: 外表疏离寡言，内心戒备极重，但对弱小有本能的庇护欲，认定的事九头牛拉不回。"
                      className="w-full bg-secondary/40 border border-border/80 rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">核心动机与执念 (Motivation / Desire)</label>
                    <textarea
                      rows={2}
                      value={profile.motivation || ""}
                      onChange={(e) => setProfile({ ...profile, motivation: e.target.value })}
                      placeholder="例如: 查清母亲当年意外离世的真相，夺回属于母亲的实验科研专利。"
                      className="w-full bg-secondary/40 border border-border/80 rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">视觉造型基准 (Appearance Anchor)</label>
                    <textarea
                      rows={2}
                      value={profile.appearance || ""}
                      onChange={(e) => setProfile({ ...profile, appearance: e.target.value })}
                      placeholder="例如: 身穿略显洗旧的白大褂，长发随手用铅笔绾起，眼神清冽微凉，左耳垂有一颗细小黑痣。"
                      className="w-full bg-secondary/40 border border-border/80 rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500 leading-relaxed font-mono"
                    />
                  </div>
                </div>

                {/* Character Tags / Pills */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>性格锚点标签 (Character Tags)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(profile.tags || []).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400 ml-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                        placeholder="输入标签回车添加 (如: 警觉, 隐忍)"
                        className="bg-secondary/40 border border-border/80 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-purple-500 w-44"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="p-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reelbench Novel Evidences */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5 text-sky-400" />
                      <span>小说原著原句佐证 (Novel Evidences)</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground">支撑人设的真实原著原句摘录</span>
                  </div>

                  <div className="space-y-2.5">
                    {(profile.evidences || []).map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-secondary/20 border border-border/70 rounded-xl space-y-1.5 text-xs relative group"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(idx)}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-red-400 transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-mono">
                            {ev.source_chapter || "原著章节"}
                          </span>
                        </div>
                        <p className="text-foreground/90 italic border-l-2 border-sky-400/50 pl-2.5 py-0.5">
                          “{ev.quote}”
                        </p>
                        {ev.annotation && (
                          <p className="text-[11px] text-muted-foreground pl-2.5">
                            注：{ev.annotation}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Add Evidence Form */}
                    <div className="p-3 bg-secondary/30 border border-dashed border-border/80 rounded-xl space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={newEvSource}
                          onChange={(e) => setNewEvSource(e.target.value)}
                          placeholder="章节出处 (如: 第1章 归来)"
                          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                        />
                        <input
                          type="text"
                          value={newEvNote}
                          onChange={(e) => setNewEvNote(e.target.value)}
                          placeholder="人设解析 (如: 体现戒备与疏离感)"
                          className="col-span-2 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={newEvQuote}
                        onChange={(e) => setNewEvQuote(e.target.value)}
                        placeholder="粘贴原著原句 (例如: 她把那只旧皮箱紧紧护在胸前，指节因用力而泛出青白...)"
                        className="w-full bg-background border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddEvidence}
                        className="w-full py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>添加原著原文佐证</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Arc & Relations */}
            {activeTab === "arc" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Dual-Track Arc */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>剧作双轨弧光 (CAST 静态肖像 vs OUTLINE 动态反转)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-secondary/30 border border-border/80 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                        <span>CAST 静态状态 (初始状态)</span>
                      </div>
                      <textarea
                        rows={4}
                        value={profile.arc_static || ""}
                        onChange={(e) => setProfile({ ...profile, arc_static: e.target.value })}
                        placeholder="角色在出场之初的状态与世界观认知。例如: 孤僻寡言的寒门医学生，只想低调毕业给母亲治病，对豪门争斗敬而远之。"
                        className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-amber-500 leading-relaxed"
                      />
                    </div>
                    <div className="p-3 bg-secondary/30 border border-border/80 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                        <span>OUTLINE 动态演变弧光 (蜕变/反转)</span>
                      </div>
                      <textarea
                        rows={4}
                        value={profile.arc_dynamic || ""}
                        onChange={(e) => setProfile({ ...profile, arc_dynamic: e.target.value })}
                        placeholder="角色在全剧高潮与终局的认知飞跃与身份蜕变。例如: 在得知身世黑幕与母亲死亡真相后，彻底褪去软弱，化身执掌财团生杀大权的冷酷掌舵人。"
                        className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* Character Relations Network */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
                      <span>角色关系网络 (Relationship Network)</span>
                    </h3>
                    <span className="text-[10px] text-muted-foreground">与全剧其他人物的戏剧张力</span>
                  </div>

                  <div className="space-y-2.5">
                    {(profile.relations || []).map((rel, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-secondary/20 border border-border/70 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-foreground">{character.name}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold text-foreground">{rel.target_character_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            {rel.relationship}
                          </span>
                        </div>
                        <p className="text-muted-foreground flex-1 text-[11px] truncate">{rel.description}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelation(idx)}
                          className="text-muted-foreground hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add Relation Form */}
                    <div className="p-3 bg-secondary/30 border border-dashed border-border/80 rounded-xl space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {allCharacters.length > 0 ? (
                          <select
                            value={newRelTarget}
                            onChange={(e) => setNewRelTarget(e.target.value)}
                            className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                          >
                            <option value="">选择关联角色...</option>
                            {allCharacters
                              .filter((c) => c.id !== character.id)
                              .map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name} ({c.role === "protagonist" ? "主角" : c.role === "antagonist" ? "反派" : "配角"})
                                </option>
                              ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={newRelTarget}
                            onChange={(e) => setNewRelTarget(e.target.value)}
                            placeholder="目标角色姓名"
                            className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500"
                          />
                        )}
                        <input
                          type="text"
                          value={newRelType}
                          onChange={(e) => setNewRelType(e.target.value)}
                          placeholder="关系定义 (如: 宿敌/暗恋/师徒)"
                          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500"
                        />
                        <input
                          type="text"
                          value={newRelDesc}
                          onChange={(e) => setNewRelDesc(e.target.value)}
                          placeholder="戏剧张力与过往纠葛"
                          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddRelation}
                        className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>建立角色关系羁绊</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 6D Voice DNA */}
            {activeTab === "voice" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="p-3.5 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-start gap-3 text-pink-300 text-xs">
                  <Volume2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    <strong>Reelbench 六维声音 DNA 架构：</strong>音色（Timbre）、音高（Pitch）、语速（Speed）、口音（Accent）、情绪基准（Emotion
                    Baseline）与 TTS 提示词。此设定将直接注入配音引擎（CosyVoice / ElevenLabs /
                    F5-TTS），确保全剧对白配音的一致性与声线辨识度。
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">1. 音色特征 (Timbre)</label>
                      <input
                        type="text"
                        value={profile.voice_traits?.timbre || ""}
                        onChange={(e) => handleVoiceChange("timbre", e.target.value)}
                        placeholder="例如: 磁性清冽、带微哑质感、偏冷中音"
                        className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">2. 音高 (Pitch)</label>
                      <select
                        value={profile.voice_traits?.pitch || "中"}
                        onChange={(e) => handleVoiceChange("pitch", e.target.value)}
                        className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-pink-500 cursor-pointer"
                      >
                        <option value="低沉">低沉 (Deep Bass)</option>
                        <option value="偏低">偏低 (Low-Mid)</option>
                        <option value="中">中 (Mid / Neutral)</option>
                        <option value="偏高">偏高 (High-Mid)</option>
                        <option value="高亢">高亢 (High / Sharp)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">3. 语速习惯 (Speed / Pacing)</label>
                      <input
                        type="text"
                        value={profile.voice_traits?.speed || ""}
                        onChange={(e) => handleVoiceChange("speed", e.target.value)}
                        placeholder="例如: 节奏平缓从容，句尾微收"
                        className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">4. 地域口音 / 方言 (Accent)</label>
                      <input
                        type="text"
                        value={profile.voice_traits?.accent || ""}
                        onChange={(e) => handleVoiceChange("accent", e.target.value)}
                        placeholder="例如: 标准普通话 / 略带南方软音 / 港风腔调"
                        className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">5. 常态情绪基准 (Emotion Baseline)</label>
                    <input
                      type="text"
                      value={profile.voice_traits?.emotion_baseline || ""}
                      onChange={(e) => handleVoiceChange("emotion_baseline", e.target.value)}
                      placeholder="例如: 克制警惕，波澜不惊，不轻易流露情绪波动"
                      className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-pink-400" />
                        <span>6. 综合 TTS 声音驱动提示词 (Synthesized Prompt)</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">注入语音合成端</span>
                    </div>
                    <textarea
                      rows={3}
                      value={profile.voice_traits?.tts_prompt || ""}
                      onChange={(e) => handleVoiceChange("tts_prompt", e.target.value)}
                      placeholder="例如: 24岁年轻女性，磁性清冽偏冷中音，节奏平缓从容，克制警惕，不带多余情绪波动"
                      className="w-full bg-pink-500/5 border border-pink-500/30 rounded-xl p-3 text-xs text-pink-200 focus:outline-none focus:border-pink-500 font-mono leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-background/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存深度人设档案</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
