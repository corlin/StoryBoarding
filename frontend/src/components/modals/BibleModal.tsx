import React, { useState } from "react";
import { BookOpen, Users, MapPin, Palette, Plus, Trash2 } from "lucide-react";
import { ProjectModel } from "@/types/shot";

interface BibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  mode?: "bible" | "style";
}

export const BibleModal: React.FC<BibleModalProps> = ({
  isOpen,
  onClose,
  project,
  mode = "bible",
}) => {
  const [activeTab, setActiveTab] = useState<"characters" | "locations" | "style">(
    mode === "style" ? "style" : "characters"
  );

  // Mock initial items based on project or standard defaults
  const [characters, setCharacters] = useState([
    { name: "主角 (Main Character)", description: "机敏警惕，动作轻巧，眼神充满好奇与求生本能" },
  ]);

  const [locations, setLocations] = useState([
    { name: "主场景 (Main Setting)", description: "夜晚昏暗光影，木质质感台面，带有纵深的高光与清冷月光" },
  ]);

  const [stylePrompt, setStylePrompt] = useState(
    "Cinematic 2D animation storyboard sketch style, dramatic rim lighting, expressive line art, film ratio 16:9"
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">
            {project?.title ? `${project.title} — 设定与视觉规范` : "设定与视觉规范"}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4 shrink-0">
          固化全局角色特征、场景空间与视觉风格，作为 AI 导演生成每个分镜提示词时的统一前缀约束。
        </p>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab("characters")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "characters"
                ? "bg-primary/20 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>角色设定 (Characters)</span>
          </button>

          <button
            onClick={() => setActiveTab("locations")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "locations"
                ? "bg-primary/20 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>场景空间 (Locations)</span>
          </button>

          <button
            onClick={() => setActiveTab("style")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "style"
                ? "bg-primary/20 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>视觉风格 (Style Prefix)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === "characters" && (
            <div className="space-y-3">
              {characters.map((c, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border/70 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => {
                        const next = [...characters];
                        next[idx].name = e.target.value;
                        setCharacters(next);
                      }}
                      className="text-xs font-semibold bg-transparent border-b border-border/60 pb-0.5 focus:outline-none focus:border-primary w-2/3"
                    />
                    <button
                      onClick={() => setCharacters(characters.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={c.description}
                    onChange={(e) => {
                      const next = [...characters];
                      next[idx].description = e.target.value;
                      setCharacters(next);
                    }}
                    placeholder="描述角色外貌、显著特征、服装配色..."
                    className="w-full text-xs bg-background/80 border border-border/60 rounded p-2 focus:outline-none focus:border-primary resize-none leading-relaxed"
                  />
                </div>
              ))}
              <button
                onClick={() =>
                  setCharacters([...characters, { name: "新角色", description: "描述外貌与视觉特征..." }])
                }
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加角色设定</span>
              </button>
            </div>
          )}

          {activeTab === "locations" && (
            <div className="space-y-3">
              {locations.map((loc, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border/70 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => {
                        const next = [...locations];
                        next[idx].name = e.target.value;
                        setLocations(next);
                      }}
                      className="text-xs font-semibold bg-transparent border-b border-border/60 pb-0.5 focus:outline-none focus:border-primary w-2/3"
                    />
                    <button
                      onClick={() => setLocations(locations.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={loc.description}
                    onChange={(e) => {
                      const next = [...locations];
                      next[idx].description = e.target.value;
                      setLocations(next);
                    }}
                    placeholder="描述场景光影、关键道具、空间纵深..."
                    className="w-full text-xs bg-background/80 border border-border/60 rounded p-2 focus:outline-none focus:border-primary resize-none leading-relaxed"
                  />
                </div>
              ))}
              <button
                onClick={() =>
                  setLocations([...locations, { name: "新场景", description: "描述空间环境与光线..." }])
                }
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加场景空间</span>
              </button>
            </div>
          )}

          {activeTab === "style" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-border/70 bg-background/50 space-y-2">
                <label className="text-xs font-medium text-foreground block">
                  全局视觉画风提示词 (Global Style Prompt Prefix)
                </label>
                <textarea
                  rows={4}
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="例如：Cinematic 2D animation storyboard sketch style, expressive line art, black and white with amber highlights..."
                  className="w-full text-xs bg-background/80 border border-border/60 rounded p-2.5 font-mono focus:outline-none focus:border-primary resize-none leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  该前缀会自动注入至每个分镜的图像生成 Prompt 中，确保全片画风一致性。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            完成并应用设定
          </button>
        </div>
      </div>
    </div>
  );
};
