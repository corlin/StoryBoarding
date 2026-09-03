"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Users, MapPin, Palette, Plus, Trash2, Lock, Sparkles, Check, X, ShieldCheck, Loader2 } from "lucide-react";
import { ProjectModel, CharacterModel } from "@/types/shot";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface BibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  mode?: "bible" | "style" | "characters" | "locations";
}

const STYLE_PRESETS = [
  {
    id: "graphite_previz",
    name: "1. 经典好莱坞石墨素描 (Graphite Previz · 推荐)",
    desc: "纯黑白与克制灰阶、粗犷石墨铅笔速写线、自信结构笔触与运动指示箭头",
    prompt:
      "Professional pre-production director's storyboard sketch, 16:9 cinematic frame, rough graphite and dark pencil construction lines, bold confident gestural strokes, selective grayscale wash shading, clear silhouette staging, directional movement arrows --no speech balloons, comic panels, manga screentones, finished 3D render, saturated color painting, photorealistic film still, text paragraphs",
  },
  {
    id: "cinematic_value",
    name: "2. 电影感明暗大反差 (Cinematic Chiaroscuro)",
    desc: "强调高反差明暗光影、体积光雾与镜头景深，适合悬疑与动作大片",
    prompt:
      "Cinematic storyboard previsualization, high-contrast chiaroscuro graphite wash shading, strong atmospheric volumetric lighting, expressive film blocking, depth-of-field staging, directional arrows --no speech balloons, comic panels, finished 3D render",
  },
  {
    id: "accent_glow",
    name: "3. 局部点缀色高反差稿 (Monochrome with Accent)",
    desc: "90% 黑白灰阶速写 ➕ 10% 关键视觉焦点荧光点缀（如赛博青绿/警示红）",
    prompt:
      "Monochromatic director's storyboard sketch with subtle glowing cyan and amber accents, bold graphite contours, dynamic motion vectors, cinematic wide composition --no speech balloons, full color painting",
  },
];

export const BibleModal: React.FC<BibleModalProps> = ({
  isOpen,
  onClose,
  project,
  mode = "characters",
}) => {
  const { fetchProject } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<"characters" | "locations" | "style">(
    mode === "style" ? "style" : mode === "locations" ? "locations" : "characters"
  );

  // Characters State from Project
  const [characters, setCharacters] = useState<CharacterModel[]>([]);
  // Scene Environment Anchor State
  const [sceneAnchor, setSceneAnchor] = useState("");
  // Style Prompt State
  const [stylePrompt, setStylePrompt] = useState(STYLE_PRESETS[0].prompt);
  const [selectedPresetId, setSelectedPresetId] = useState("graphite_previz");
  const [isSaving, setIsSaving] = useState(false);

  // New character form
  const [newCharName, setNewCharName] = useState("");
  const [newCharRole, setNewCharRole] = useState<"protagonist" | "antagonist" | "supporting">("supporting");
  const [newCharAnchor, setNewCharAnchor] = useState("");
  const [newCharPersonality, setNewCharPersonality] = useState("");

  useEffect(() => {
    if (project) {
      setCharacters(project.characters || []);
      const styleConfig = typeof project.style_config === "string" ? JSON.parse(project.style_config) : project.style_config || {};
      setSceneAnchor(styleConfig.scene_anchor || styleConfig.sceneAnchor || "古风赛博雨夜茶楼，青瓦飞檐古典中式建筑，悬挂红色发光灯笼，潮湿青石巷道反射荧光。");
      if (styleConfig.director_style_prompt) {
        setStylePrompt(styleConfig.director_style_prompt);
      }
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleAddCharacter = () => {
    if (!newCharName.trim()) {
      notify.error("请输入角色名称");
      return;
    }
    const newChar: CharacterModel = {
      id: crypto.randomUUID(),
      project_id: project?.id || "",
      name: newCharName.trim(),
      role: newCharRole,
      visual_anchor: newCharAnchor.trim() || `${newCharName.trim()}, distinctive cinematic appearance, consistent face and attire`,
      personality: newCharPersonality.trim() || "核心人物",
    };
    setCharacters([...characters, newChar]);
    setNewCharName("");
    setNewCharAnchor("");
    setNewCharPersonality("");
    notify.success(`已添加角色 ${newChar.name}`);
  };

  const handleRemoveCharacter = (id: string) => {
    setCharacters(characters.filter((c) => c.id !== id));
  };

  const handleSaveBible = async () => {
    if (!project) return;
    try {
      setIsSaving(true);
      const existingStyle = typeof project.style_config === "string" ? JSON.parse(project.style_config) : project.style_config || {};
      const updatedStyle = {
        ...existingStyle,
        scene_anchor: sceneAnchor.trim(),
        director_style_prompt: stylePrompt.trim(),
      };

      await api.updateProject(project.id, {
        style_config: updatedStyle,
        characters: characters,
      });

      await fetchProject(project.id);
      notify.success("🎬 全剧视听设定中枢已成功保存，全局生效！");
      onClose();
    } catch (err: any) {
      console.error("Save Bible Error:", err);
      notify.error(err?.message || "保存设定集失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                全剧视听设定中枢 (Unified Visual Bible)
                <span className="text-[10px] font-mono bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                  单一真实数据源
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                锁定 Reference 1（角色视觉基因 Visual DNA）与 Reference 2（核心场景空间透视锁）
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab("characters")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "characters"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>🎭 全剧角色定妆谱 ({characters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("locations")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "locations"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>🏛️ 核心场景空间锁</span>
          </button>

          <button
            onClick={() => setActiveTab("style")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "style"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>🎨 导演画风基准</span>
          </button>
        </div>

        {/* Tab Content: Characters */}
        {activeTab === "characters" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-start gap-2.5 text-xs text-sky-300">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>全剧连续性总线：</strong>此处登记的所有角色，将在全剧所有集数生图时强制注入对应的纯英文 Visual DNA 提示词，实现面部五官、发型体态与标志性服装高度连贯锁死。
              </p>
            </div>

            {/* Character Cards List */}
            <div className="space-y-3">
              {characters.map((char, idx) => (
                <div key={char.id || idx} className="p-4 bg-background border border-border/70 rounded-xl space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border/60 overflow-hidden font-bold text-xs text-sky-400">
                        {char.name.slice(0, 1)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground">{char.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{char.personality || "出场人物"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <button
                        onClick={() => handleRemoveCharacter(char.id)}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                        title="移除该角色"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">纯英文生图锁定的视觉基因 (Visual DNA Prompt Anchor):</label>
                    <textarea
                      rows={2}
                      value={char.visual_anchor || (char as any).visualAnchor || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCharacters(characters.map((c) => (c.id === char.id ? { ...c, visual_anchor: val, visualAnchor: val } : c)));
                      }}
                      className="w-full bg-secondary/50 border border-border/80 rounded-lg p-2 text-xs font-mono text-sky-200 focus:outline-none focus:border-sky-500/60 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Character Box */}
            <div className="p-3.5 bg-secondary/30 border border-dashed border-border/80 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>新增角色并锁定视觉 DNA</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="角色姓名 (例如: 楚玄)"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
                <select
                  value={newCharRole}
                  onChange={(e: any) => setNewCharRole(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="protagonist">主角 (Protagonist)</option>
                  <option value="antagonist">反派 (Antagonist)</option>
                  <option value="supporting">配角 (Supporting)</option>
                </select>
                <input
                  type="text"
                  placeholder="性格特点 (例如: 冷峻孤傲剑客)"
                  value={newCharPersonality}
                  onChange={(e) => setNewCharPersonality(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <input
                type="text"
                placeholder="纯英文视觉特征提示词 (例如: Chu Xuan, 25yo swordsman, piercing dark eyes, black silk hooded cloak, silver broadsword)"
                value={newCharAnchor}
                onChange={(e) => setNewCharAnchor(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddCharacter}
                className="w-full py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-medium text-foreground transition-colors"
              >
                ＋ 添加角色至全剧基因谱
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Locations */}
        {activeTab === "locations" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>Reference 2 核心场景空间基准锁：</strong>
                固化全剧关键地理空间的透视关系、建筑材质、光影氛围与环境反射。生图引擎将此基准作为空间隐喻注入，杜绝各集场景出现违和穿帮。
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                核心场景空间描述与光影锁定基准 (Environment Anchor):
              </label>
              <textarea
                rows={5}
                value={sceneAnchor}
                onChange={(e) => setSceneAnchor(e.target.value)}
                placeholder="例如：赛博雨夜，青瓦飞檐古典中式茶楼，悬挂红色发光灯笼，潮湿反光青石巷道，全息绿色数据流雨幕..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-primary font-medium"
              />
            </div>
          </div>
        )}

        {/* Tab Content: Style */}
        {activeTab === "style" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                    setStylePrompt(preset.prompt);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedPresetId === preset.id
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 bg-secondary/40 hover:bg-secondary hover:border-border"
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-foreground mb-1">{preset.name}</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{preset.desc}</p>
                  </div>
                  {selectedPresetId === preset.id && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold mt-2">
                      <Check className="w-3 h-3" />
                      当前画风
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">导演画风控制 Prompt (Global Style Suffix):</label>
              <textarea
                rows={4}
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-3 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveBible}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>保存设定并全局同步</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
