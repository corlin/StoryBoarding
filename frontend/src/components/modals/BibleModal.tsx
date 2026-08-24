import React, { useState } from "react";
import { BookOpen, Users, MapPin, Palette, Plus, Trash2, Lock, Sparkles, Check } from "lucide-react";
import { ProjectModel } from "@/types/shot";

interface BibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  mode?: "bible" | "style";
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
  mode = "bible",
}) => {
  const [activeTab, setActiveTab] = useState<"characters" | "locations" | "style">(
    mode === "style" ? "style" : "characters"
  );

  // Reference 1: Character Reference Lock
  const [characters, setCharacters] = useState([
    {
      name: "Reference 1: 主角墨客 (Moke)",
      description:
        "黑色立领长衫风衣，黑色墨镜，短发，体态挺拔沉稳，武术宗师气质。五官结构与服装道具严格锁定，严禁面部漂移。",
      isAnchor: true,
    },
  ]);

  // Reference 2: Environment Reference Lock
  const [locations, setLocations] = useState([
    {
      name: "Reference 2: 古风赛博雨夜茶楼 (Cyber Tea House)",
      description:
        "赛博雨夜，青瓦飞檐古典中式茶楼，悬挂红色发光灯笼，周围全息绿色数据流雨幕与潮湿反射青石巷道。空间透视与光影方向严格锁定。",
      isAnchor: true,
    },
  ]);

  const [stylePrompt, setStylePrompt] = useState(STYLE_PRESETS[0].prompt);
  const [selectedPresetId, setSelectedPresetId] = useState("graphite_previz");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                导演设定集 (Production Bible & Style Standards)
              </h2>
              <p className="text-xs text-muted-foreground">
                严格遵循好莱坞工业规范，固化 Reference 1（角色基准）与 Reference 2（场景基准）
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab("characters")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "characters"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Reference 1: 角色基准锁</span>
          </button>

          <button
            onClick={() => setActiveTab("locations")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "locations"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Reference 2: 场景基准锁</span>
          </button>

          <button
            onClick={() => setActiveTab("style")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "style"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>分镜画风预设 (Style)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Reference 1: Character Reference Lock */}
          {activeTab === "characters" && (
            <div className="space-y-4">
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg text-xs text-sky-300 flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
                <span>
                  <strong>Reference Image 1 是强制性角色连续性基准</strong>：锁定五官、发型、体态比例、服装配饰与专属道具，生成过程中严禁脸部漂移与服装突变。
                </span>
              </div>

              {characters.map((c, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => {
                          const next = [...characters];
                          next[idx].name = e.target.value;
                          setCharacters(next);
                        }}
                        className="text-xs font-semibold bg-transparent border-b border-border/60 pb-0.5 focus:outline-none focus:border-primary w-64 text-foreground"
                      />
                    </div>
                    {characters.length > 1 && (
                      <button
                        onClick={() => setCharacters(characters.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      不可漂移的视觉特征（五官、发型、服装、手持道具）
                    </label>
                    <textarea
                      rows={3}
                      value={c.description}
                      onChange={(e) => {
                        const next = [...characters];
                        next[idx].description = e.target.value;
                        setCharacters(next);
                      }}
                      className="w-full text-xs bg-background border border-border rounded-lg p-2.5 focus:outline-none focus:border-primary resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setCharacters([
                    ...characters,
                    { name: `配角 #${characters.length + 1}`, description: "设定外貌与服装特征...", isAnchor: false },
                  ])
                }
                className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-primary hover:border-primary/50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加次要角色设定</span>
              </button>
            </div>
          )}

          {/* Reference 2: Environment Reference Lock */}
          {activeTab === "locations" && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  <strong>Reference Image 2 是强制性场景与世界观基准</strong>：锁定建筑结构、空间几何、地标方位、门窗透视与环境光源，严禁场景空间颠倒。
                </span>
              </div>

              {locations.map((l, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <input
                        type="text"
                        value={l.name}
                        onChange={(e) => {
                          const next = [...locations];
                          next[idx].name = e.target.value;
                          setLocations(next);
                        }}
                        className="text-xs font-semibold bg-transparent border-b border-border/60 pb-0.5 focus:outline-none focus:border-primary w-64 text-foreground"
                      />
                    </div>
                    {locations.length > 1 && (
                      <button
                        onClick={() => setLocations(locations.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      空间结构、地标位置、门窗道具与环境光源方向
                    </label>
                    <textarea
                      rows={3}
                      value={l.description}
                      onChange={(e) => {
                        const next = [...locations];
                        next[idx].description = e.target.value;
                        setLocations(next);
                      }}
                      className="w-full text-xs bg-background border border-border rounded-lg p-2.5 focus:outline-none focus:border-primary resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setLocations([
                    ...locations,
                    { name: `场景 #${locations.length + 1}`, description: "设定场景与空间结构...", isAnchor: false },
                  ])
                }
                className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-primary hover:border-primary/50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加辅助场景设定</span>
              </button>
            </div>
          )}

          {/* Style Presets */}
          {activeTab === "style" && (
            <div className="space-y-4">
              <label className="text-xs font-semibold text-muted-foreground block">
                选择导演级分镜画风预设：
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {STYLE_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setStylePrompt(preset.prompt);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedPresetId === preset.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border bg-background/50 hover:border-border/80 hover:bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{preset.name}</span>
                      {selectedPresetId === preset.id && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{preset.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  当前生图全局约束 Prompt（可微调）
                </label>
                <textarea
                  rows={3}
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  className="w-full text-xs font-mono bg-background border border-border rounded-lg p-2.5 focus:outline-none focus:border-primary resize-none leading-relaxed text-foreground/90"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground">修改将自动同步至 AI 导演提示词引擎</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-colors"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  );
};
