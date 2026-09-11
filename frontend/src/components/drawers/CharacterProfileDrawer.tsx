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
  Camera,
  Layers,
  Wand2,
  Loader2,
  Maximize2,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { CharacterModel, CharacterProfile } from "@/types/shot";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";
import { api, normalizeAssetUrl } from "@/lib/api";

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
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>("");
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

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
          reference_hint: `像一个${existing.identity || character.personality || "沉稳有深度"}的人`,
          resonance: "胸腔共鸣自然",
          dynamic_range: "适中平稳",
          volume: "常态适中",
          inflection: "句末从容自然",
          tts_prompt: character.voice_dna || "",
        },
      });
      setCurrentAvatarUrl(character.avatar_url || "");
    }
  }, [character]);

  if (!isOpen || !character) return null;

  const handleGenerateAvatar = async () => {
    if (!character.id) return;
    try {
      setIsGeneratingAvatar(true);
      const promptToUse = profile.sheet_prompt || character.turnaround_prompt;
      const res = await api.generateCharacterAvatar(character.id, {
        prompt: promptToUse,
      });
      if (res.success && res.character?.avatar_url) {
        setCurrentAvatarUrl(res.character.avatar_url);
        const updatedChar: CharacterModel = {
          ...character,
          avatar_url: res.character.avatar_url,
          turnaround_prompt: res.character.turnaround_prompt || promptToUse,
          profile_json: profile,
        };
        onSave(updatedChar);
        notify.success(`✨ 已为「${character.name}」成功冲印最新基准定妆照并自动存档！`);
      } else {
        notify.error("生成定妆照未返回有效图片地址");
      }
    } catch (err: any) {
      console.error("生成定妆照异常:", err);
      notify.error(err?.response?.data?.detail || err?.message || "生成定妆照失败，请检查网络或 API Key 设置");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

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

    // Auto-synthesize high-density acoustic prompt if changing traits
    if (field !== "tts_prompt") {
      // Acoustic instrument specification conforming to industry-standard (<= 400 chars)
      const ageGender = `${profile.age || "adult"} ${profile.gender === "女" ? "female" : profile.gender === "男" ? "male" : "speaker"}`;
      const timbrePart = updatedVoice.timbre || "neutral tone";
      const pitchPart = updatedVoice.pitch ? `${updatedVoice.pitch} pitch` : "mid pitch";
      const resonancePart = updatedVoice.resonance || "natural chest resonance";
      const dynamicPart = updatedVoice.dynamic_range ? `${updatedVoice.dynamic_range} dynamic range` : "controlled dynamic range";
      const volumePart = updatedVoice.volume || "moderate volume";
      const speedPart = updatedVoice.speed || "steady pace";
      const inflectionPart = updatedVoice.inflection || "natural inflection";
      const accentPart = updatedVoice.accent || "Standard Mandarin";
      const emotionPart = updatedVoice.emotion_baseline || "calm and poised";

      const englishAcousticPrompt = `${ageGender}, ${timbrePart}, ${pitchPart}, ${resonancePart}, ${dynamicPart}. ${volumePart}, ${speedPart}, ${inflectionPart}. ${accentPart}. ${emotionPart}.`;
      updatedVoice.tts_prompt = englishAcousticPrompt;
    }

    setProfile({ ...profile, voice_traits: updatedVoice });
  };

  const handleSaveAll = () => {
    const updatedCharacter: CharacterModel = {
      ...character,
      profile_json: profile,
      voice_dna: profile.voice_traits?.tts_prompt || character.voice_dna,
      turnaround_prompt: profile.sheet_prompt || character.turnaround_prompt,
    };
    onSave(updatedCharacter);
    notify.success(`✨ 已更新「${character.name}」的深度人设、16:9 三区设定卡与声音 DNA 档案！`);
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
                  全套角色档案 · 六维画像 · 双轨弧光 · 关系网 · 音色特征
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
                {/* Visual Anchor: Character Model Sheet Preview Card (Industry Standard) */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 via-background to-purple-950/30 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold text-foreground">基准定妆卡监看 (Character Turnaround / Model Sheet)</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: normalizeAssetUrl(currentAvatarUrl), title: `${character.name} · 定妆大图` })}
                          className="text-[11px] text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1 font-mono hover:underline cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>查看大图</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isGeneratingAvatar}
                        onClick={handleGenerateAvatar}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer",
                          isGeneratingAvatar
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 opacity-60 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50"
                        )}
                        title="使用下方定妆指令一键调用 AI 冲印模型生成最新定妆照"
                      >
                        {isGeneratingAvatar ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>定妆冲印中...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>🎨 立即 AI 冲印定妆卡</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Image Display Canvas: 16:9 / Full View */}
                  <div
                    onClick={() => {
                      if (currentAvatarUrl) {
                        setLightboxImage({ url: normalizeAssetUrl(currentAvatarUrl), title: `${character.name} · 定妆卡` });
                      }
                    }}
                    className={cn(
                      "w-full h-44 sm:h-52 rounded-xl bg-black/50 border border-border/80 flex items-center justify-center overflow-hidden relative group/canvas",
                      currentAvatarUrl ? "cursor-zoom-in" : "cursor-default"
                    )}
                  >
                    {currentAvatarUrl ? (
                      <>
                        <img
                          src={normalizeAssetUrl(currentAvatarUrl)}
                          alt={character.name}
                          className="w-full h-full object-contain group-hover/canvas:scale-[1.01] transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-mono gap-1">
                          <Maximize2 className="w-4 h-4" />
                          <span>点击全屏查看高清定妆图</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 space-y-2 text-muted-foreground">
                        <Camera className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
                        <p className="text-xs">暂无定妆照，可在下方选择模版指令后点击右上角「🎨 立即 AI 冲印定妆卡」</p>
                      </div>
                    )}
                    {isGeneratingAvatar && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 space-y-2">
                        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                        <p className="text-xs font-semibold text-indigo-200">暗房显影中 · 正在生成角色三区定妆卡...</p>
                      </div>
                    )}
                  </div>
                </div>

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
                    <label className="text-[10px] text-muted-foreground block mb-1">外貌与服化道视觉锚点 (Appearance / Visual DNA)</label>
                    <textarea
                      rows={2}
                      value={profile.appearance || ""}
                      onChange={(e) => setProfile({ ...profile, appearance: e.target.value })}
                      placeholder="例如: 身穿略显洗旧的白大褂，长发随手用铅笔绾起，眼神清冽微凉，左耳垂有一颗细小黑痣。"
                      className="w-full bg-secondary/40 border border-border/80 rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500 leading-relaxed font-mono"
                    />
                  </div>
                </div>

                {/* Director Studio & industry-standard 16:9 / 9:16 Model Sheet Generator */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>定妆卡生成指令 (Character Model Sheet Prompt)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={profile.sheet_style || "live_action_casting"}
                        onChange={(e: any) => {
                          const newStyle = e.target.value;
                          setProfile({ ...profile, sheet_style: newStyle });
                        }}
                        className="text-[10px] bg-secondary/80 border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <option value="live_action_casting">🏆 16:9 影视实拍选角定妆卡 (Live-Action Casting · 推荐)</option>
                        <option value="chinese_casting_spec">📜 中文专业角色设定卡 (导演台本规范)</option>
                        <option value="realistic">🎬 16:9 黄金三区半写实厚涂 (Realistic)</option>
                        <option value="ghibli">🎨 16:9 吉卜力手绘 (Ghibli Cel)</option>
                        <option value="vertical_drama">📱 9:16 竖屏短剧全身立绘卡 (Mobile Drama)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const style = profile.sheet_style || "live_action_casting";
                          const desc = profile.appearance || character.visual_anchor || "28-year-old male, narrow oval face, sharp jawline, textured short black hair, clean facial features";
                          const tags = (profile.tags || []).join(", ") || "character details";
                          const genderStr = profile.gender === "女" ? "female" : profile.gender === "男" ? "male" : "person";
                          const ageStr = profile.age || "28";

                          let prompt = "";
                          if (style === "live_action_casting") {
                            prompt = `A professional real-life live-action character casting sheet on ONE 16:9 landscape canvas, seamless clean light grey-white studio photography background. The canvas is strictly divided into two sections by composition: LEFT ZONE (strictly 1/3 of total width): one ultra-sharp high-definition front-facing bust portrait ID photo taken with an 85mm portrait lens, head and shoulders fully in frame, body and face perfectly squared to camera, horizontal eye-level gaze, neutral restrained expression, lips gently closed without smiling, soft even frontal studio beauty lighting, sharp authentic skin texture with visible pores and natural micro-details (${desc}), absolutely no plastic waxy skin, no excessive airbrushing. RIGHT ZONE (strictly 2/3 of total width): exactly THREE full-body orthographic turnaround views of the EXACT SAME character standing side by side from left to right on a shared horizontal baseline: 1) Full frontal view facing camera directly in relaxed neutral posture; 2) Strict 90-degree profile side view showing precise head-to-toe silhouette; 3) Full back view facing away completely showing rear hairstyle and back of wardrobe. All three figures must be captured head-to-toe without cropping, identical height, identical anatomical proportions, standing relaxed with arms resting naturally at sides, zero perspective distortion, standard focal length. Matching consistent modern wardrobe across all views. High-end cinematic casting call portfolio, 8k uhd, photorealistic, master cinematography --no cartoon, anime, 3D render, plastic waxy skin, distorted limbs, mutated fingers, text, watermark, rulers, arrows`;
                          } else if (style === "chinese_casting_spec") {
                            prompt = `请根据提供的人物参考照片，提取并严格保留参考人物的真实外貌特征，为他制作一张专业的真人角色设定卡。参考照片仅用于确定人物身份、面部五官、脸型、肤色、发型及耳饰，不要照搬原照片的拍摄角度、背景和服装。

【人物设定】
${genderStr === "female" ? "女性" : "男性"}，${ageStr}岁，身材匀称偏瘦。
外貌特征：${profile.appearance || character.visual_anchor || "偏长的窄椭圆脸型、清晰利落的下颌线、略尖的下巴；浓密自然的平直眉；细长的深色杏仁眼，轻微内双；鼻梁直而偏窄；嘴唇偏薄轮廓清晰；黑色蓬松短发"}。整体气质冷静、利落。
必须严格保留参考人物的身份辨识度，不得将其生成成另一个人，不得擅自改变脸型、五官比例、年龄、肤色、发型及配饰。

【画面规格】
生成一整张横向16:9角色卡，所有内容整合在同一画幅内，采用干净的浅灰白色无缝摄影棚背景。
画面左侧严格占据总宽度的1/3，放置一张高清正面证件照：
* 人物头部与肩部完整入镜；身体和面部完全正对镜头；双眼保持水平，头部端正不歪头；
* 神情自然克制，嘴唇闭合不微笑；采用柔和均匀的正面摄影棚光线；
* 面部清晰锐利，保留真实皮肤纹理和毛孔；不得磨皮过度，不得产生蜡像感或塑料感。

画面右侧严格占据总宽度的2/3，依次排列同一人物的三张全身三视图：
1. 正面全身照：身体完全正对镜头；
2. 侧面全身照：严格90度侧身，呈现标准人物侧面轮廓；
3. 背面全身照：人物完全背对镜头，清楚呈现后脑发型与服装背面。
三个人物必须从头到脚完整入镜，保持相同高度、相同人体比例和相同站立基线。人物自然直立，双脚平行，双臂自然垂放在身体两侧，不摆姿势，不做动作。三视图之间间距均匀，不重叠，不产生近大远小或广角透视畸变。

【风格与画质】
真人实拍摄影质感，专业演员选角照和影视角色资产卡风格。自然真实的人体比例，真实皮肤、真实头发丝、真实布料材质，柔和均匀的摄影棚光线，高清8K细节。左侧证件照接近85mm人像镜头效果，右侧三视图采用无明显透视畸变的标准人物摄影效果。

【强制限制】
整张图只能出现同一个人物的四个形象：左侧一张证件照，右侧三张全身照。不得增加其他人物或额外视图。四个形象必须保持完全相同的五官、年龄、肤色、发型、身材比例和服装，不得出现换脸、发型变化、服装变化或年龄变化。禁止卡通、动漫、插画、游戏CG、3D建模感、塑料皮肤、过度磨皮、透视畸变、肢体异常、头脚裁切。画面中不要出现文字、姓名、数字、身高标尺、箭头、边框、装饰图形、品牌标志、字幕或水印。`;
                          } else if (style === "realistic") {
                            prompt = `Single character model sheet on ONE 16:9 landscape canvas. The canvas is divided into three zones by thin hairline rules. LEFT ZONE — vertical column occupying about 34% width: one bust portrait, head and shoulders, front-facing, centred, like an ID photograph, BOTH SHOULDERS FULLY VISIBLE, ending in a clean straight horizontal cut. Face rendered in sharpest focus: ${desc}. Young/adult skin with visible pores, wet specular eye highlight, natural asymmetry. LIGHTING IN LEFT ZONE ONLY: soft directional key light from upper left with gentle falloff, subtle ambient occlusion under chin. RIGHT-TOP ZONE — remaining 66%: three FULL-BODY views of SAME character standing side by side (front view, side profile, back view) on shared ground line. PROPORTIONS ARE CRITICAL: identical height, ratio, correct anatomy, relaxed posture. LIGHTING IN RIGHT ZONES: flat even orthographic lighting with no directional key and no cast shadows. RIGHT-BOTTOM ZONE: detail strip of 4-5 small isolated close-up studies (${tags}), detail studies give way, not the figures. Pure white background (#FFFFFF). Semi-realistic character illustration, painterly rendering, soft blended edges, anatomically grounded, 8k uhd --no plastic waxy skin, over-smoothed doll face, perfectly symmetrical face`;
                          } else if (style === "ghibli") {
                            prompt = `Single character model sheet on ONE 16:9 landscape canvas divided into three zones by thin hairline rules. Hand-painted anime cel illustration in the manner of classic Studio Ghibli feature animation: clean confident ink linework, simple flat cel shading, warm naturalistic palette. LEFT ZONE (~34% width): bust portrait front-facing, centred ID framing: ${desc}. Clean flat skin tone with single soft shadow shape and warm blush, clear expressive eyes with round highlight. RIGHT-TOP ZONE: three FULL-BODY views of SAME character standing side by side (front, side, back) on shared ground line, identical height and proportions. LIGHTING: even gentle daylight across whole sheet with single soft shadow tone. RIGHT-BOTTOM ZONE: 4-5 small isolated close-up studies of key props (${tags}). Pure white background (#FFFFFF). Clean lineart, masterpiece --no photorealistic, 3d render, hyperrealistic skin texture, visible pores, subsurface scattering, harsh contrast`;
                          } else {
                            prompt = `Vertical 9:16 mobile drama character turnaround sheet, clean solid white background (#FFFFFF). Dual-angle full-body view of SAME protagonist character standing side by side: standing front-facing relaxed pose on left, and 3/4 dynamic profile on right, plus one upper-chest portrait study at bottom: ${desc}, authentic facial features, modern urban wardrobe, tailored silhouette, 8k uhd, cinematic studio lighting, photorealistic textures --no deformed limbs, plastic skin, cropped head`;
                          }
                          setProfile({ ...profile, sheet_prompt: prompt });
                          notify.success(`✨ 已生成「${style === "live_action_casting" ? "16:9 实拍选角定妆卡" : style === "chinese_casting_spec" ? "中文专业角色设定卡" : "标准定妆卡"}」提示词！`);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded px-2 py-0.5 transition-colors cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>自动合成提示词</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={profile.sheet_prompt || ""}
                    onChange={(e) => setProfile({ ...profile, sheet_prompt: e.target.value })}
                    placeholder="选择上方模版类型并点击「自动合成提示词」..."
                    className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-2.5 text-xs text-indigo-200 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>📐 <strong>影视工业规范：</strong>左区 1/3 真实 85mm 正面证件照 + 右区 2/3 同基线全身正/侧(90°)/背三视图，浅灰白无缝棚光。</span>
                    <button
                      type="button"
                      disabled={isGeneratingAvatar}
                      onClick={handleGenerateAvatar}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>冲印定妆卡 ➔</span>
                    </button>
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

                {/* Director Studio Novel Evidences */}
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
                  <div className="space-y-1 text-[11px] leading-relaxed">
                    <p className="font-semibold text-pink-200">
                      双轨配音与声线引擎架构：
                    </p>
                    <p>
                      <strong>1. 克隆系引擎 (CosyVoice / IndexTTS2 / F5-TTS)</strong>：吃 <span className="text-amber-300 font-medium">参考音频提示 (Reference Hint)</span> 与情绪通道。
                    </p>
                    <p>
                      <strong>2. Voice Design 设计引擎 (ElevenLabs / MiniMax / Qwen3-TTS)</strong>：直接吃 <span className="text-sky-300 font-medium">英文声学参数 Prompt (≤400字符)</span>。严禁文学比喻与表演指导，严格按声学乐器参数构建。
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Track 1: Clone Engine Reference Hint */}
                  <div className="p-3 bg-secondary/30 border border-border/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                        <span>克隆参考音频提示 (Reference Hint for Voice Cloning)</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground">用于在录音库中挑选匹配的原声音频基准</span>
                    </div>
                    <input
                      type="text"
                      value={profile.voice_traits?.reference_hint || ""}
                      onChange={(e) => handleVoiceChange("reference_hint", e.target.value)}
                      placeholder="例如: 像一个在同一家医院急诊室连续值班十年的清冷主治女医师"
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Track 2: High-Density Acoustic Parameters */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span>声学实体参数解构 (Acoustic Instrument Parameters)</span>
                      </h4>
                      <span className="text-[10px] text-muted-foreground">声学乐器物理参数 · 杜绝文学散文</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">1. 音色特征 (Timbre)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.timbre || ""}
                          onChange={(e) => handleVoiceChange("timbre", e.target.value)}
                          placeholder="例如: 磁性清冽、微哑质感、偏冷中音"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">2. 音区与音高 (Pitch)</label>
                        <select
                          value={profile.voice_traits?.pitch || "中"}
                          onChange={(e) => handleVoiceChange("pitch", e.target.value)}
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="低沉">低沉 (Deep Bass)</option>
                          <option value="偏低">偏低 (Low-Mid)</option>
                          <option value="中">中 (Mid / Neutral)</option>
                          <option value="偏高">偏高 (High-Mid)</option>
                          <option value="高亢">高亢 (High / Sharp)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">3. 胸腔共鸣与支撑 (Resonance)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.resonance || ""}
                          onChange={(e) => handleVoiceChange("resonance", e.target.value)}
                          placeholder="例如: 沉稳胸腔共鸣 / 气声偏重轻微支撑"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">4. 动态起伏范围 (Dynamic Range)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.dynamic_range || ""}
                          onChange={(e) => handleVoiceChange("dynamic_range", e.target.value)}
                          placeholder="例如: 窄动态极度克制 / 宽动态富有张力"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">5. 音量基准 (Volume)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.volume || ""}
                          onChange={(e) => handleVoiceChange("volume", e.target.value)}
                          placeholder="例如: 偏轻克制 / 适中平稳 / 穿透力强"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">6. 语速节奏 (Speed / Pace)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.speed || ""}
                          onChange={(e) => handleVoiceChange("speed", e.target.value)}
                          placeholder="例如: 节奏从容微慢 / 紧凑利落"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">7. 语调微习惯 (Inflection)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.inflection || ""}
                          onChange={(e) => handleVoiceChange("inflection", e.target.value)}
                          placeholder="例如: 句尾微降收敛 / 平直不带波动"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">8. 地域口音 / 方言 (Accent)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.accent || ""}
                          onChange={(e) => handleVoiceChange("accent", e.target.value)}
                          placeholder="例如: 标准普通话 (Standard Mandarin)"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">9. 常态默认情绪 (Emotion)</label>
                        <input
                          type="text"
                          value={profile.voice_traits?.emotion_baseline || ""}
                          onChange={(e) => handleVoiceChange("emotion_baseline", e.target.value)}
                          placeholder="例如: 克制警惕，波澜不惊"
                          className="w-full bg-secondary/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Synthesized Voice Prompt Display */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        <span>Voice Design 高密度声学提示词 (Synthesized Prompt)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          字符数: <strong className={(profile.voice_traits?.tts_prompt?.length || 0) > 400 ? "text-red-400" : "text-emerald-400"}>{profile.voice_traits?.tts_prompt?.length || 0}</strong> / 400 字符限制门
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300 font-mono">ElevenLabs / MiniMax</span>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={profile.voice_traits?.tts_prompt || ""}
                      onChange={(e) => handleVoiceChange("tts_prompt", e.target.value)}
                      placeholder="Acoustic parameter string conforming to studio specification..."
                      className="w-full bg-pink-500/5 border border-pink-500/30 rounded-xl p-3 text-xs text-pink-200 focus:outline-none focus:border-pink-500 font-mono leading-relaxed"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      💡 提示：该提示词由上方声学乐器物理参数自动合成，不含表演台词与文学比喻，直接输入 ElevenLabs Voice Design / MiniMax TTS 引擎。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-background/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.collectGlobalAsset({
                      asset_type: "character",
                      name: character.name,
                      visual_anchor: character.visual_anchor || profile.appearance || profile.tags?.join("，") || "",
                      reference_image_url: currentAvatarUrl || character.avatar_url || "",
                      metadata: {
                        personality: character.personality,
                        voice_dna: profile.voice_traits?.tts_prompt || character.voice_dna,
                        turnaround_prompt: profile.sheet_prompt || character.turnaround_prompt,
                        profile_json: profile,
                      },
                    });
                    notify.success(`🌟 已成功将「${character.name}」收录为您的常驻签约主角班底！在任何新剧本中均可直接选用。`);
                  } catch (e: any) {
                    console.error(e);
                    notify.error(e?.message || "收录至班底失败");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition-all cursor-pointer"
                title="将此角色升格为导演的常驻演员班底，日后可在所有项目中直接指派出演"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>收录至常驻班底</span>
              </button>
            </div>
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

      {/* Fullscreen HD Lightbox Preview Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white/90 mb-2 px-1">
              <span className="text-xs font-bold font-mono tracking-wide">{lightboxImage.title}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-w-full max-h-[82vh] object-contain rounded-lg border border-white/20 shadow-2xl bg-black/40"
            />
          </div>
        </div>
      )}
    </div>
  );
};
