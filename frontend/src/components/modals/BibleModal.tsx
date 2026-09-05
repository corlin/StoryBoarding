"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  MapPin,
  Palette,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Loader2,
  Image as ImageIcon,
  Wand2,
  Camera,
  Layers,
  RefreshCw,
  Package,
  Mic,
  Sun,
  ExternalLink,
} from "lucide-react";
import { ProjectModel, CharacterModel, LocationModel, PropModel } from "@/types/shot";
import { api } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { cn } from "@/lib/utils";
import { CharacterProfileDrawer } from "@/components/drawers/CharacterProfileDrawer";

interface BibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectModel | null;
  mode?: "bible" | "style" | "characters" | "locations";
}

const TURNAROUND_PRESETS = [
  {
    id: "reelbench_16x9_realistic",
    name: "🏆 16:9 黄金三区定妆卡 · 半写实厚涂 (Reelbench 工业基准 · 推荐)",
    desc: "左区34%半身像面部基准 + 右上全身正/侧/背三视图平光量体 + 右下4-5个细节条，纯白底",
    template:
      "Single character model sheet on ONE 16:9 landscape canvas. The canvas is divided into three zones by thin hairline rules. LEFT ZONE — about 34% width: one bust portrait, head and shoulders, front-facing, centred, like an ID photograph, BOTH SHOULDERS FULLY VISIBLE, ending in a clean straight cut. LIGHTING IN LEFT ZONE ONLY: soft directional key light from upper left with gentle falloff, subtle ambient occlusion under chin and neck. RIGHT-TOP ZONE — remaining 66%: three FULL-BODY views of SAME character standing side by side (front view, side profile, back view) on shared ground line. PROPORTIONS ARE CRITICAL: identical height, ratio, relaxed posture. LIGHTING IN RIGHT ZONES: flat even orthographic lighting with no directional key and no cast shadows. RIGHT-BOTTOM ZONE: detail strip of 4-5 small isolated close-up studies of key costume/props/accessories, detail studies give way, not the figures. Pure white background (#FFFFFF). Semi-realistic character illustration, painterly rendering, soft blended edges, anatomically grounded, 8k uhd --no plastic waxy skin, over-smoothed doll face, perfectly symmetrical face",
  },
  {
    id: "reelbench_16x9_ghibli",
    name: "🎨 16:9 黄金三区定妆卡 · 吉卜力手绘 (Ghibli Cel Shading)",
    desc: "手绘赛璐璐动画风格，全图均匀日光无阴影，左区头像基准 + 右上三视图 + 右下细节",
    template:
      "Single character model sheet on ONE 16:9 landscape canvas divided into three zones by thin hairline rules. Hand-painted anime cel illustration in the manner of classic Studio Ghibli feature animation: clean confident ink linework, simple flat cel shading, warm naturalistic palette. LEFT ZONE (~34% width): bust portrait front-facing, centred ID framing, clean flat skin tone with single soft shadow shape and warm blush, clear expressive eyes with round highlight, grouped hair clumps. RIGHT-TOP ZONE: three FULL-BODY views of SAME character standing side by side (front, side, back) on one shared ground line, identical height and proportions. LIGHTING: even gentle daylight across the whole sheet with single soft shadow tone, flat lighting throughout. RIGHT-BOTTOM ZONE: 4-5 small isolated close-up studies of key props and details. Pure white background (#FFFFFF). Clean lineart, masterpiece --no photorealistic, 3d render, hyperrealistic skin texture, visible pores, subsurface scattering, harsh contrast",
  },
  {
    id: "turnaround_3view",
    name: "工业三视图 (Front/Side/Back)",
    desc: "全身三视图，正视、侧视、后背，对齐标准建模与多角度生图",
    template:
      "character sheet, full body turnaround, front view, side profile view, back view, neutral A-pose, clean neutral studio lighting, plain white background, cinematic realistic character design, precise facial alignment, 8k uhd",
  },
  {
    id: "turnaround_portrait_3quarter",
    name: "电影级特写 & 3/4 侧脸",
    desc: "聚焦面容骨骼与发型的高清微表情肖像，显著提升五官一致性",
    template:
      "character model sheet, multi-angle facial portraits, front view, 3/4 dynamic view, sharp profile view, neutral calm gaze, dramatic chiaroscuro movie lighting, clean neutral grey backdrop, 85mm portrait lens, ultra-detailed skin texture, 8k",
  },
  {
    id: "turnaround_drama_urban",
    name: "都市短剧男女主轻奢定妆卡",
    desc: "都市男女主时尚造型卡，全身与半身双机位高级感",
    template:
      "cinematic fashion lookbook, dual-angle character sheet, full body standing pose and waist-up medium portrait, modern tailored luxury wardrobe, sophisticated styling, soft rim light, 35mm cinematic film still, photorealistic, 8k resolution",
  },
  {
    id: "turnaround_anime_cel",
    name: "二次元/国风动漫立绘",
    desc: "清晰线稿与赛璐璐光影，多角度表情与全身",
    template:
      "anime character design sheet, multiple angles, full body front view and 3/4 view, detailed facial expression sketches, clean lineart, vibrant cel shading, neutral pose, character turnaround, white background, masterpiece",
  },
];

export const VOICE_DNA_PRESETS = [
  {
    id: "mature_male",
    name: "🎩 沉稳大叔音 (35岁低沉磁性、成熟稳重、微烟嗓)",
    prompt: "35岁成熟男性，嗓音低沉磁性且富有共鸣，语速沉稳从容，咬字清晰利落，带轻微成熟烟嗓质感与压迫感",
  },
  {
    id: "cold_female",
    name: "👠 清冷御姐音 (26岁音色清亮、语调偏冷、干练果决)",
    prompt: "26岁职场女性，音色清亮通透，语调偏冷清从容，咬字干练利落，带有独立知性气质与决断力",
  },
  {
    id: "sunny_young",
    name: "☀️ 阳光少年音 (19岁清朗明快、朝气蓬勃、富有感染力)",
    prompt: "19岁年轻男性，嗓音清脆明朗，语调自然上扬富有朝气活力，情绪饱满真实，语速轻快有节奏感",
  },
  {
    id: "sweet_girl",
    name: "🌸 甜美娇俏音 (22岁软糯灵动、尾音微翘、温柔亲和)",
    prompt: "22岁年轻女性，声线甜美柔和，咬字软糯灵动，带有微翘的尾音与温柔亲和力，情感表达细腻",
  },
  {
    id: "dark_villain",
    name: "♟️ 阴鸷反派音 (42岁沙哑压抑、阴冷微气声、掌控力)",
    prompt: "42岁中年男性，嗓音微带沙哑与压迫感，语速缓慢阴沉，伴随冷冽的气声吐字，极具威慑与控制感",
  },
  {
    id: "gentle_scholar",
    name: "📚 温润公子音 (28岁温和文雅、如沐春风、书卷气)",
    prompt: "28岁青年男性，音色如玉般温润，谈吐平和文雅，语速适中带有谦逊教养与浓厚书卷气",
  },
];

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
  const [activeTab, setActiveTab] = useState<"characters" | "locations" | "props" | "style">(
    mode === "style" ? "style" : mode === "locations" ? "locations" : "characters"
  );

  // Characters, Locations & Props State
  const [characters, setCharacters] = useState<CharacterModel[]>([]);
  const [locations, setLocations] = useState<LocationModel[]>([]);
  const [propsList, setPropsList] = useState<PropModel[]>([]);
  const [generatingCharId, setGeneratingCharId] = useState<string | null>(null);
  const [generatingLocId, setGeneratingLocId] = useState<string | null>(null);
  const [generatingPropId, setGeneratingPropId] = useState<string | null>(null);

  // Style Prompt State
  const [sceneAnchor, setSceneAnchor] = useState("");
  const [stylePrompt, setStylePrompt] = useState(STYLE_PRESETS[0].prompt);
  const [selectedPresetId, setSelectedPresetId] = useState("graphite_previz");
  const [isSaving, setIsSaving] = useState(false);

  // New character form
  const [newCharName, setNewCharName] = useState("");
  const [newCharRole, setNewCharRole] = useState<"protagonist" | "antagonist" | "supporting">("supporting");
  const [newCharAnchor, setNewCharAnchor] = useState("");
  const [newCharPersonality, setNewCharPersonality] = useState("");
  const [profileDrawerChar, setProfileDrawerChar] = useState<CharacterModel | null>(null);
  const [newCharVoice, setNewCharVoice] = useState("");
  const [newCharTurnaround, setNewCharTurnaround] = useState(TURNAROUND_PRESETS[1].template);

  // New location form
  const [newLocName, setNewLocName] = useState("");
  const [newLocEnv, setNewLocEnv] = useState<"interior" | "exterior" | "abstract">("interior");
  const [newLocAnchor, setNewLocAnchor] = useState("");
  const [newLocLighting, setNewLocLighting] = useState("自然光");
  const [newLocLightingStates, setNewLocLightingStates] = useState("晨雾, 浓雾清晨, 薄雾午前");
  const [newLocIsVariant, setNewLocIsVariant] = useState(false);
  const [newLocParentId, setNewLocParentId] = useState("");
  const [newLocReuseStrategy, setNewLocReuseStrategy] = useState("");
  const [newLocDesignSummary, setNewLocDesignSummary] = useState("");
  const [newLocAnchors, setNewLocAnchors] = useState("");

  // New prop form (Reelbench Narrative Props)
  const [newPropName, setNewPropName] = useState("");
  const [newPropCat, setNewPropCat] = useState<"weapon" | "token" | "document" | "general">("token");
  const [newPropScale, setNewPropScale] = useState<"handheld" | "tabletop" | "furniture">("handheld");
  const [newPropAnchors, setNewPropAnchors] = useState("");
  const [newPropAnchor, setNewPropAnchor] = useState("");
  const [newPropDesc, setNewPropDesc] = useState("");

  useEffect(() => {
    if (project) {
      setCharacters(project.characters || []);
      setLocations(project.locations || []);
      setPropsList(project.props || []);
      const styleConfig = typeof project.style_config === "string" ? JSON.parse(project.style_config) : project.style_config || {};
      setSceneAnchor(styleConfig.scene_anchor || styleConfig.sceneAnchor || "高档现代都市写字楼，极简冷色调，大理石落地窗，雨幕反光。");
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
      turnaround_prompt: newCharTurnaround.trim(),
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

  const handleGenerateAvatar = async (char: CharacterModel) => {
    if (!char.id) return;
    try {
      setGeneratingCharId(char.id);
      const res = await api.generateCharacterAvatar(char.id, {
        prompt: char.turnaround_prompt,
      });
      if (res.success && res.character?.avatar_url) {
        setCharacters(
          characters.map((c) =>
            c.id === char.id
              ? {
                  ...c,
                  avatar_url: res.character.avatar_url,
                  turnaround_prompt: res.character.turnaround_prompt || c.turnaround_prompt,
                }
              : c
          )
        );
        notify.success(`✨ ${char.name} 的基准定妆照已成功生成并存入资产库！`);
      }
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.detail || err?.message || "生成定妆照失败，请检查配置");
    } finally {
      setGeneratingCharId(null);
    }
  };

  const handleAddLocation = () => {
    if (!newLocName.trim()) {
      notify.error("请输入场景空间名称");
      return;
    }
    const statesArray = newLocLightingStates
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Parse anchors from comma/newline separated string
    const anchorsList = newLocAnchors
      .split(/[\n;；]/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[:：]/);
        if (parts.length >= 2) {
          return { name: parts[0].trim(), desc: parts.slice(1).join(":").trim() };
        }
        return { name: line, desc: "关键视觉识别基准" };
      });

    const newLoc: LocationModel = {
      id: crypto.randomUUID(),
      project_id: project?.id || "",
      name: newLocName.trim(),
      environment_type: newLocEnv,
      visual_anchor: newLocAnchor.trim() || `${newLocName.trim()}, architectural space, consistent spatial lighting`,
      lighting_style: newLocLighting.trim() || "自然光",
      lighting_states: statesArray.length > 0 ? statesArray : ["自然光"],
      active_lighting_state: statesArray[0] || "自然光",
      is_variant: newLocIsVariant,
      parent_location_id: newLocIsVariant ? newLocParentId : "",
      reuse_strategy: newLocIsVariant ? newLocReuseStrategy.trim() : "",
      design_summary: newLocDesignSummary.trim(),
      anchors: anchorsList,
    };
    setLocations([...locations, newLoc]);
    setNewLocName("");
    setNewLocAnchor("");
    setNewLocIsVariant(false);
    setNewLocReuseStrategy("");
    setNewLocDesignSummary("");
    setNewLocAnchors("");
    notify.success(`已添加场景空间「${newLoc.name}」`);
  };

  const handleRemoveLocation = (id: string) => {
    setLocations(locations.filter((l) => l.id !== id));
  };

  const handleGenerateLocConcept = async (loc: LocationModel) => {
    if (!loc.id) return;
    try {
      setGeneratingLocId(loc.id);
      const res = await api.generateLocationConcept(loc.id);
      if (res.success && res.location?.reference_image_url) {
        setLocations(
          locations.map((l) =>
            l.id === loc.id
              ? { ...l, reference_image_url: res.location.reference_image_url }
              : l
          )
        );
        notify.success(`✨ 场景「${loc.name}」概念基准图已生成！`);
      }
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.detail || err?.message || "生成场景基准图失败");
    } finally {
      setGeneratingLocId(null);
    }
  };

  const handleAddProp = () => {
    if (!newPropName.trim()) {
      notify.error("请输入道具名称");
      return;
    }
    const scalePhrase = newPropScale === "furniture" ? "furniture scale" : newPropScale === "tabletop" ? "tabletop scale" : "handheld scale";
    const anchorsList = newPropAnchors
      .split(/[\n;；]/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[:：]/);
        if (parts.length >= 2) {
          return { name: parts[0].trim(), desc: parts.slice(1).join(":").trim() };
        }
        return { name: line, desc: "特写可核对特征" };
      });

    const newProp: PropModel = {
      id: crypto.randomUUID(),
      project_id: project?.id || "",
      name: newPropName.trim(),
      category: newPropCat,
      scale: newPropScale,
      visual_anchor: newPropAnchor.trim() || `${newPropName.trim()}, ${scalePhrase}, isolated on pure white background (#FFFFFF), sharp studio photography, 8k uhd --no hands, fingers`,
      description: newPropDesc.trim() || "关键叙事道具",
      anchors: anchorsList,
    };
    setPropsList([...propsList, newProp]);
    setNewPropName("");
    setNewPropAnchor("");
    setNewPropDesc("");
    setNewPropAnchors("");
    notify.success(`已添加叙事道具「${newProp.name}」`);
  };

  const handleRemoveProp = (id: string) => {
    setPropsList(propsList.filter((p) => p.id !== id));
  };

  const handleGeneratePropConcept = async (prop: PropModel) => {
    if (!prop.id) return;
    try {
      setGeneratingPropId(prop.id);
      const res = await api.generatePropConcept(prop.id);
      if (res.success && res.prop?.reference_image_url) {
        setPropsList(
          propsList.map((p) =>
            p.id === prop.id
              ? { ...p, reference_image_url: res.prop.reference_image_url }
              : p
          )
        );
        notify.success(`✨ 道具「${prop.name}」纯白底特写基准图已生成！`);
      }
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.detail || err?.message || "生成道具基准图失败");
    } finally {
      setGeneratingPropId(null);
    }
  };

  const handleCollectGlobalAsset = async (type: "character" | "location" | "prop", item: any) => {
    try {
      const res = await api.collectGlobalAsset({
        asset_type: type,
        name: item.name,
        visual_anchor: item.visual_anchor || item.visualAnchor || "",
        reference_image_url: item.avatar_url || item.reference_image_url || "",
        metadata: {
          role: item.role,
          personality: item.personality,
          voice_dna: item.voice_dna || item.voiceDna,
          lighting_style: item.lighting_style,
          lighting_states: item.lighting_states,
          is_variant: item.is_variant,
          category: item.category,
        },
      });
      notify.success(res.message || `✨ 「${item.name}」已成功保存至全局资产库！`);
    } catch (e: any) {
      notify.error(e?.message || "加入全局资产库失败");
    }
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
        locations: locations as any,
        props: propsList as any,
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
      <div className="bg-card border border-border rounded-2xl p-6 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
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
                锁定全剧多角色定妆谱（多角度视觉 DNA）与空间场景基准，实现多镜头极致一致性
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
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeTab === "characters"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>🎭 全剧角色定妆谱 ({characters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("locations")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeTab === "locations"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>🏛️ 场景空间资产库 ({locations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("props")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeTab === "props"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>📦 叙事道具库 ({propsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("style")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeTab === "style"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
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
                <strong>双轨一致性引擎：</strong>此处登记的角色将在拆镜与生图时，自动注入英文 Visual DNA 文本与多角度定妆图（Model Sheet），并按空间隔离（Spatial Scoping）排布，防止男女同框串脸串色。
              </p>
            </div>

            {/* Character Cards List */}
            <div className="space-y-3.5">
              {characters.map((char, idx) => {
                const isGenerating = generatingCharId === char.id;
                return (
                  <div key={char.id || idx} className="p-4 bg-background border border-border/70 rounded-xl space-y-3 relative group">
                    <div className="flex items-start justify-between gap-4">
                      {/* Avatar preview */}
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-secondary/80 border border-border flex items-center justify-center overflow-hidden shrink-0 relative group/avatar">
                          {char.avatar_url ? (
                            <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-0.5">
                              <Camera className="w-4 h-4 opacity-50" />
                              <span className="text-[9px]">未定妆</span>
                            </div>
                          )}
                          {isGenerating && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{char.name}</span>
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
                          <span className="text-xs text-muted-foreground">{char.personality || "出场角色"}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCollectGlobalAsset("character", char)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition-all cursor-pointer"
                          title="将此角色存入用户级跨项目全局资产库（Reelbench Standard）"
                        >
                          <Layers className="w-3 h-3" />
                          <span className="hidden sm:inline">加入资产库</span>
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => handleGenerateAvatar(char)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 transition-all disabled:opacity-50 cursor-pointer"
                          title="使用多角度定妆提示词一键 AI 生成定妆照"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>定妆中...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3 h-3" />
                              <span>AI 一键定妆</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCharacter(char.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="移除该角色"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Visual DNA Text */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        视觉特征基因 (Visual DNA Anchor - 英文面容、发型、服装):
                      </label>
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

                    {/* Turnaround / Model Sheet Prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Layers className="w-3 h-3 text-sky-400" />
                          <span>多角度定妆生成提示词 (Turnaround / Model Sheet):</span>
                        </label>
                        <select
                          onChange={(e) => {
                            const p = TURNAROUND_PRESETS.find((x) => x.id === e.target.value);
                            if (p) {
                              setCharacters(characters.map((c) => (c.id === char.id ? { ...c, turnaround_prompt: p.template } : c)));
                            }
                          }}
                          className="text-[10px] bg-secondary/80 border border-border/80 rounded px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <option value="">快速套用定妆模版...</option>
                          {TURNAROUND_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={2}
                        value={char.turnaround_prompt || ""}
                        placeholder="例如: character sheet, front view, side view, neutral lighting, plain background, 8k uhd"
                        onChange={(e) => {
                          const val = e.target.value;
                          setCharacters(characters.map((c) => (c.id === char.id ? { ...c, turnaround_prompt: val } : c)));
                        }}
                        className="w-full bg-secondary/30 border border-border/80 rounded-lg p-2 text-xs font-mono text-muted-foreground focus:text-foreground focus:outline-none focus:border-primary/60 leading-relaxed"
                      />
                    </div>

                    {/* Reelbench Voice DNA / Audio Prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Mic className="w-3 h-3 text-pink-400" />
                          <span>角色音色特征 (Voice DNA / TTS Prompt):</span>
                        </label>
                        <select
                          onChange={(e) => {
                            const p = VOICE_DNA_PRESETS.find((x) => x.id === e.target.value);
                            if (p) {
                              setCharacters(characters.map((c) => (c.id === char.id ? { ...c, voice_dna: p.prompt, voiceDna: p.prompt } : c)));
                              notify.success(`已为 ${char.name} 套用「${p.name.split(" ")[1]}」音色特征！`);
                            }
                          }}
                          className="text-[10px] bg-secondary/80 border border-border/80 rounded px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <option value="">套用音色预设模版...</option>
                          {VOICE_DNA_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={char.voice_dna || (char as any).voiceDna || ""}
                        placeholder="例如: 30岁磁性低沉男声，语速从容，带轻微烟嗓质感 (CosyVoice/ElevenLabs)"
                        onChange={(e) => {
                          const val = e.target.value;
                          setCharacters(characters.map((c) => (c.id === char.id ? { ...c, voice_dna: val, voiceDna: val } : c)));
                        }}
                        className="w-full bg-secondary/30 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-pink-200 focus:outline-none focus:border-pink-500/60 font-mono"
                      />
                    </div>

                    {/* Reelbench 4-Part Cast Profile & Evidence Entry */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-medium">
                          {char.profile_json?.tags?.length ? `${char.profile_json.tags.length} 个锚点标签` : "标准人设"}
                        </span>
                        {char.profile_json?.evidences?.length ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-medium">
                            {char.profile_json.evidences.length} 条原著佐证
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfileDrawerChar(char)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors py-1 px-2 rounded-md hover:bg-purple-500/10 cursor-pointer"
                      >
                        <span>详情：画像 · 弧光 · 关系 · 原文佐证</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Character Box */}
            <div className="p-4 bg-secondary/30 border border-dashed border-border/80 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>新增角色并锁定视觉 DNA</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="角色姓名 (例如: 陆沉)"
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
                  placeholder="性格设定 (例如: 狠厉偏执财阀)"
                  value={newCharPersonality}
                  onChange={(e) => setNewCharPersonality(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <input
                type="text"
                placeholder="纯英文视觉特征提示词 (例如: Lu Chen, 30yo Asian male, sharp jawline, neat short black hair, tailored charcoal suit)"
                value={newCharAnchor}
                onChange={(e) => setNewCharAnchor(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddCharacter}
                className="w-full py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-medium text-foreground transition-colors cursor-pointer"
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
                <strong>场景空间资产库：</strong>此处登记的场景空间可直接与镜头（Shot）进行显式绑定。AI 拆镜与生图将精确复用空间透视与光影基准，杜绝各集场景穿帮与色彩漂移。
              </p>
            </div>

            {/* Location Cards List */}
            <div className="space-y-3.5">
              {locations.map((loc, idx) => {
                const isGenerating = generatingLocId === loc.id;
                return (
                  <div key={loc.id || idx} className="p-4 bg-background border border-border/70 rounded-xl space-y-3 relative group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-12 rounded-lg bg-secondary/80 border border-border flex items-center justify-center overflow-hidden shrink-0 relative">
                          {loc.reference_image_url ? (
                            <img src={loc.reference_image_url} alt={loc.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-0.5">
                              <MapPin className="w-3.5 h-3.5 opacity-50" />
                              <span className="text-[9px]">无概念图</span>
                            </div>
                          )}
                          {isGenerating && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{loc.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {loc.environment_type === "interior" ? "室内空间" : loc.environment_type === "exterior" ? "室外环境" : "概念抽象"}
                            </span>
                            {loc.is_variant ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                变体场景 · 复用基准
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                主场景
                              </span>
                            )}
                          </div>
                          {loc.design_summary && (
                            <p className="text-[11px] text-amber-200/90 mt-1 italic leading-relaxed">
                              🎯 设计意图: {loc.design_summary}
                            </p>
                          )}
                          {loc.is_variant && loc.reuse_strategy && (
                            <div className="text-[11px] text-purple-300/90 mt-0.5 flex items-center gap-1">
                              <span>🔄 复用方案: {loc.reuse_strategy}</span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground truncate block max-w-[320px] mt-0.5">{loc.visual_anchor || "核心场景空间"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCollectGlobalAsset("location", loc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition-all cursor-pointer"
                          title="将此场景空间存入用户级跨项目全局资产库（Reelbench Standard）"
                        >
                          <Layers className="w-3 h-3" />
                          <span className="hidden sm:inline">加入资产库</span>
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => handleGenerateLocConcept(loc)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all disabled:opacity-50 cursor-pointer"
                          title="一键 AI 生成场景空间概念基准图"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>生成中...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>生成基准图</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(loc.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="移除场景"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Reelbench Lighting States Bar */}
                    <div className="bg-secondary/40 border border-border/60 rounded-lg p-2 flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground text-[11px] font-medium shrink-0">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>光照状态:</span>
                      </div>
                      {(loc.lighting_states && loc.lighting_states.length > 0 ? loc.lighting_states : ["自然光"]).map((st) => {
                        const isActive = (loc.active_lighting_state || loc.lighting_states?.[0] || "自然光") === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setLocations(locations.map((l) => (l.id === loc.id ? { ...l, active_lighting_state: st } : l)));
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-medium transition-colors border",
                              isActive
                                ? "bg-amber-500 text-black border-amber-500 font-bold shadow-xs"
                                : "bg-background/80 text-muted-foreground border-border hover:text-foreground"
                            )}
                          >
                            {st}
                          </button>
                        );
                      })}
                      <input
                        type="text"
                        placeholder="新增状态 (如: 晚霞)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            const current = loc.lighting_states || [];
                            if (!current.includes(val)) {
                              setLocations(
                                locations.map((l) =>
                                  l.id === loc.id
                                    ? { ...l, lighting_states: [...current, val], active_lighting_state: val }
                                    : l
                                )
                              );
                            }
                            e.currentTarget.value = "";
                          }
                        }}
                        className="bg-background/90 border border-border/80 rounded px-2 py-0.5 text-[10px] focus:outline-none focus:border-amber-500/60 max-w-[110px]"
                      />
                    </div>

                    {/* shuohao-skills 3-5 Concrete Anchors List */}
                    <div className="bg-secondary/30 border border-border/60 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                        <span className="flex items-center gap-1 text-amber-300">
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>一致性具象锚点 (3–5个可画可核对特征):</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {loc.anchors?.length || 0} 个锚点 · 空景生成不漂移
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(loc.anchors || []).map((anc, aIdx) => (
                          <span
                            key={aIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            title={anc.desc}
                          >
                            <strong>{anc.name}</strong>: {anc.desc}
                          </span>
                        ))}
                        {(!loc.anchors || loc.anchors.length === 0) && (
                          <span className="text-[10px] text-muted-foreground italic">
                            暂未细化具体实体锚点（可通过编辑或登记时补充）
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        场景空间透视与光影特征描述 (Visual Spatial Anchor · 自动锁定空景):
                      </label>
                      <textarea
                        rows={2}
                        value={loc.visual_anchor || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocations(locations.map((l) => (l.id === loc.id ? { ...l, visual_anchor: val } : l)));
                        }}
                        className="w-full bg-secondary/50 border border-border/80 rounded-lg p-2 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500/60 leading-relaxed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Location Box */}
            <div className="p-4 bg-secondary/30 border border-dashed border-border/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>登记新场景空间并锁定基准</span>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-purple-300 font-normal cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newLocIsVariant}
                    onChange={(e) => setNewLocIsVariant(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>设为主场景变体（复用母体机位换背板）</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="场景名称 (例如: 渡口栈桥)"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
                <select
                  value={newLocEnv}
                  onChange={(e: any) => setNewLocEnv(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="interior">室内空间 (Interior)</option>
                  <option value="exterior">室外环境 (Exterior)</option>
                  <option value="abstract">概念抽象 (Abstract)</option>
                </select>
                <input
                  type="text"
                  placeholder="光照状态预设 (逗号分隔，如: 晨雾, 浓雾清晨, 薄雾午前)"
                  value={newLocLightingStates}
                  onChange={(e) => setNewLocLightingStates(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {newLocIsVariant && (
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div>
                    <label className="text-[10px] text-purple-300 block mb-1">选择继承的主场景 (Parent Location):</label>
                    <select
                      value={newLocParentId}
                      onChange={(e) => setNewLocParentId(e.target.value)}
                      className="w-full bg-background border border-purple-500/30 rounded px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value="">-- 请选择主场景 --</option>
                      {locations.filter((l) => !l.is_variant).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-purple-300 block mb-1">复用方案说明 (Reuse Strategy):</label>
                    <input
                      type="text"
                      placeholder="如: 同一机位换背板，芦苇前景遮挡"
                      value={newLocReuseStrategy}
                      onChange={(e) => setNewLocReuseStrategy(e.target.value)}
                      className="w-full bg-background border border-purple-500/30 rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="空间设计意图 (例如: 人与人避不开视线的狭窄审讯室，逼出所有秘密)"
                  value={newLocDesignSummary}
                  onChange={(e) => setNewLocDesignSummary(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="3-5个具象一致性锚点 (如: 补丁船篷:漏下一道光缝; 船头铜铃:拳头大绿锈斑驳)"
                  value={newLocAnchors}
                  onChange={(e) => setNewLocAnchors(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <input
                type="text"
                placeholder="场景空间透视特征提示词 (例如: Interior of an old wooden ferry passenger cabin, canvas canopy, empty scene without people)"
                value={newLocAnchor}
                onChange={(e) => setNewLocAnchor(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                className="w-full py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                ＋ 添加场景至全剧空间库
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Narrative Props (Reelbench Standard) */}
        {activeTab === "props" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
              <Package className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>关键叙事道具库：</strong>登记全片核心道具（信物、武器、密函、关键令牌等）。AI 生成将采用纯白底特写摄影棚标准拍摄基准，并在分镜特写关联时锁定视觉细节，杜绝穿帮。
              </p>
            </div>

            {/* Props Cards List */}
            <div className="space-y-3.5">
              {propsList.map((p, idx) => {
                const isGenerating = generatingPropId === p.id;
                return (
                  <div key={p.id || idx} className="p-4 bg-background border border-border/70 rounded-xl space-y-3 relative group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-secondary/80 border border-border flex items-center justify-center overflow-hidden shrink-0 relative">
                          {p.reference_image_url ? (
                            <img src={p.reference_image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-0.5">
                              <Package className="w-4 h-4 opacity-50" />
                              <span className="text-[9px]">无基准图</span>
                            </div>
                          )}
                          {isGenerating && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{p.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {p.category === "weapon" ? "武器刀械" : p.category === "token" ? "信物道具" : p.category === "document" ? "密函公文" : "常规物品"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              {p.scale === "furniture" ? "家具级" : p.scale === "tabletop" ? "桌面级" : "手持级"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{p.description || "叙事关键物品"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCollectGlobalAsset("prop", p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition-all cursor-pointer"
                          title="将此道具存入用户级跨项目全局资产库（Reelbench Standard）"
                        >
                          <Layers className="w-3 h-3" />
                          <span className="hidden sm:inline">加入资产库</span>
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => handleGeneratePropConcept(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition-all disabled:opacity-50 cursor-pointer"
                          title="一键 AI 生成纯白底特写道具参考图"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>生成中...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>生成白底参考图</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProp(p.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="移除道具"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* shuohao-skills Prop Anchors & Scale Control */}
                    <div className="bg-secondary/30 border border-border/60 rounded-lg p-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                        <span className="flex items-center gap-1 text-emerald-300">
                          <Package className="w-3 h-3 text-emerald-400" />
                          <span>经得起特写的细节锚点 (3–5个微观特征):</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          尺度：<strong>{p.scale === "furniture" ? "furniture scale" : p.scale === "tabletop" ? "tabletop scale" : "handheld scale"}</strong> · 纯白可抠
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(p.anchors || []).map((anc, aIdx) => (
                          <span
                            key={aIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            title={anc.desc}
                          >
                            <strong>{anc.name}</strong>: {anc.desc}
                          </span>
                        ))}
                        {(!p.anchors || p.anchors.length === 0) && (
                          <span className="text-[10px] text-muted-foreground italic">
                            暂未登记微观特写锚点（如铜扣划痕、磨损边角）
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        道具纯白底特写视觉基因 (Visual DNA · 强制注入尺度短语与无手指令):
                      </label>
                      <textarea
                        rows={2}
                        value={p.visual_anchor || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPropsList(propsList.map((item) => (item.id === p.id ? { ...item, visual_anchor: val, visualAnchor: val } : item)));
                        }}
                        className="w-full bg-secondary/50 border border-border/80 rounded-lg p-2 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500/60 leading-relaxed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Prop Box */}
            <div className="p-4 bg-secondary/30 border border-dashed border-border/80 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>登记新叙事道具</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="道具名称 (例如: 祖传青玉佩)"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
                <select
                  value={newPropCat}
                  onChange={(e: any) => setNewPropCat(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="token">信物饰品 (Token)</option>
                  <option value="weapon">武器刀械 (Weapon)</option>
                  <option value="document">密函证物 (Document)</option>
                  <option value="general">常规器物 (General)</option>
                </select>
                <input
                  type="text"
                  placeholder="作用描述 (例如: 男主身份信物)"
                  value={newPropDesc}
                  onChange={(e) => setNewPropDesc(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <input
                type="text"
                placeholder="纯英文特写外观特征 (例如: ancient dark green jade pendant, intricate dragon carving, isolated on white background, studio lighting)"
                value={newPropAnchor}
                onChange={(e) => setNewPropAnchor(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddProp}
                className="w-full py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                ＋ 添加道具至全剧道具库
              </button>
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
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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

      {/* Character Profile & Voice DNA Drawer */}
      <CharacterProfileDrawer
        isOpen={Boolean(profileDrawerChar)}
        onClose={() => setProfileDrawerChar(null)}
        character={profileDrawerChar}
        allCharacters={characters}
        onSave={(updatedChar) => {
          setCharacters(characters.map((c) => (c.id === updatedChar.id ? updatedChar : c)));
          setProfileDrawerChar(null);
        }}
      />
    </div>
  );
};
