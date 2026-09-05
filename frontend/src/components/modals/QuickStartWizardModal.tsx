"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Film,
  User,
  Layers,
  Wand2,
  Check,
  Play,
  FileText,
  Palette,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/components/ui/ToastNotification";

interface StylePreset {
  id: string;
  name: string;
  tagline: string;
  gradient: string;
  promptSuffix: string;
  negativePrompt: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: "modern_cinema",
    name: "现代都市商战",
    tagline: "现代写实 · 4K 电影质感 · 通透自然晨光",
    gradient: "from-blue-600/30 via-slate-800/50 to-zinc-950",
    promptSuffix: "Cinematic commercial film photography, natural rim lighting, 35mm lens, photorealistic, 8k uhd",
    negativePrompt: "cartoon, anime, 3d render, plastic, oversaturated, deformed face",
  },
  {
    id: "ancient_wuxia",
    name: "国风仙侠逆袭",
    tagline: "新中式厚涂 · 唯美仙侠 · 大气意境光影",
    gradient: "from-amber-600/30 via-stone-800/50 to-zinc-950",
    promptSuffix: "Chinese ancient wuxia fantasy aesthetic, semi-realistic painterly rendering, atmospheric fog, ethereal lighting, masterpiece",
    negativePrompt: "western modern clothing, cars, neon signs, low quality, distorted anatomy",
  },
  {
    id: "hollywood_noir",
    name: "好莱坞悬疑胶片",
    tagline: "低调冷光 · 35mm 胶片颗粒 · 戏剧张力",
    gradient: "from-cyan-700/30 via-gray-900/50 to-black",
    promptSuffix: "Hollywood suspense neo-noir film style, chiaroscuro lighting, dramatic shadows, 35mm film grain, anamorphic lens flare",
    negativePrompt: "flat lighting, bright cheerful colors, cartoonish, low contrast",
  },
  {
    id: "cyberpunk_future",
    name: "赛博朋克科幻",
    tagline: "霓虹雨夜 · 机械机能 · 高能对比光影",
    gradient: "from-fuchsia-600/30 via-purple-900/50 to-zinc-950",
    promptSuffix: "Cyberpunk sci-fi aesthetic, neon reflection on wet pavement, volumetric haze, cinematic contrast, blade runner style",
    negativePrompt: "ancient, medieval, day sunny, oversaturated cartoon",
  },
  {
    id: "ghibli_anime",
    name: "日系手绘动画",
    tagline: "清新赛璐璐 · 温暖治愈 · 经典吉卜力手绘感",
    gradient: "from-emerald-600/30 via-teal-900/50 to-zinc-950",
    promptSuffix: "Hand-painted anime cel illustration, Studio Ghibli inspired, clear expressive lineart, warm soft lighting, beautiful watercolor backdrop",
    negativePrompt: "photorealistic, hyperrealistic, 3d cgi render, harsh shadows",
  },
  {
    id: "disney_3d",
    name: "3D 电影高精动画",
    tagline: "皮克斯质感 · 丰富微表情 · 细腻次表面散射",
    gradient: "from-indigo-600/30 via-slate-900/50 to-zinc-950",
    promptSuffix: "3D animation feature film render style, Disney Pixar quality, subsurface scattering skin, expressive stylized characters, octane render",
    negativePrompt: "2d flat anime, realistic human photo, bad anatomy, noisy",
  },
];

const STORY_PRESETS = [
  {
    title: "都市悬疑反转：合约下的守护",
    text: "深夜暴雨，顶层复式公寓。女设计师苏晓在整理旧物时，意外发现三年前车祸的真正资助人竟是冷酷上司宋知远，而合约里隐藏着一条不可撤销的保护条款。两人当面对质，火花与真相同时爆发。",
  },
  {
    title: "赛博雨夜对决：黑客与特工",
    text: "霓虹闪烁的雨夜茶楼，黑客宗师墨客与特工展开近身肉搏。子弹时间下腰闪避，凌空踢碎全息屏幕，最终在暴雨倾盆的飞檐上短兵相接，揭露公司内部致命的代码机密。",
  },
  {
    title: "古风逆袭：被废弃的御医传人",
    text: "大雨倾盆的王府门前，曾被逐出京城的药圣后人顾清舟手持银针出现。老王爷命悬一线，太医束手无策，他当众断脉下针，起死回生，揭穿后宫数年的投毒阴谋。",
  },
];

interface QuickStartWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (story: string, options: { styleId: string; styleName: string; stylePrompt: string }) => Promise<void>;
  onSwitchToPro: () => void;
}

export const QuickStartWizardModal: React.FC<QuickStartWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onSwitchToPro,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [storyText, setStoryText] = useState(STORY_PRESETS[0].text);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("modern_cinema");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedStyle = STYLE_PRESETS.find((s) => s.id === selectedStyleId) || STYLE_PRESETS[0];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!storyText.trim()) {
        notify.error("请输入故事剧情文本");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleFinish = async () => {
    try {
      setIsSubmitting(true);
      await onComplete(storyText.trim(), {
        styleId: selectedStyle.id,
        styleName: selectedStyle.name,
        stylePrompt: selectedStyle.promptSuffix,
      });
      onClose();
    } catch (err: any) {
      console.error("Wizard failed:", err);
      notify.error(err?.message || "向导生成失败，请检查网络或重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Wizard Top Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                <span>AI 短剧极速 3 步向导</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  零门槛 · 一键成片
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">无需懂影视专业黑话，3 步自动产出工业级商业短剧分镜</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToPro}
              className="text-xs text-muted-foreground hover:text-foreground font-medium px-2.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors cursor-pointer"
              title="跳过向导，直接进入专业双栏分镜工作台"
            >
              🛠️ 进入专业导演台
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wizard Step Indicator */}
        <div className="px-6 py-3 border-b border-border/60 bg-secondary/30 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 md:gap-3 flex-1">
            {/* Step 1 */}
            <div
              onClick={() => setCurrentStep(1)}
              className={cn(
                "flex items-center gap-1.5 cursor-pointer select-none transition-colors",
                currentStep === 1 ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono",
                  currentStep === 1
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary border border-border"
                )}
              >
                1
              </span>
              <span>剧情文本</span>
            </div>

            <div className="w-6 md:w-12 h-px bg-border shrink-0" />

            {/* Step 2 */}
            <div
              onClick={() => storyText.trim() && setCurrentStep(2)}
              className={cn(
                "flex items-center gap-1.5 cursor-pointer select-none transition-colors",
                currentStep === 2 ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono",
                  currentStep === 2
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary border border-border"
                )}
              >
                2
              </span>
              <span>视觉画风 (防跑脸)</span>
            </div>

            <div className="w-6 md:w-12 h-px bg-border shrink-0" />

            {/* Step 3 */}
            <div
              className={cn(
                "flex items-center gap-1.5 select-none",
                currentStep === 3 ? "text-primary font-bold" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono",
                  currentStep === 3
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary border border-border"
                )}
              >
                3
              </span>
              <span>一键出片放映</span>
            </div>
          </div>

          <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
            Step {currentStep} of 3
          </span>
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-5">
          {/* STEP 1: Story Input */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>输入故事梗概、场次剧本或小说段落</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">支持直接粘贴小说正文</span>
                </label>
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  rows={6}
                  placeholder="在此粘贴你的故事文本，AI 将自动推导角色、场景、台词与镜头景别..."
                  className="w-full text-xs md:text-sm bg-background border border-border rounded-xl p-3.5 leading-relaxed resize-none focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Sample Story Presets */}
              <div>
                <span className="text-xs font-medium text-muted-foreground block mb-2">
                  或直接点选高人气短剧模板试玩：
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {STORY_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStoryText(p.text)}
                      className="p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-muted text-left transition-all group cursor-pointer"
                    >
                      <h5 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </h5>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {p.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Style & Visual DNA Preset */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  <span>选择短剧视觉画风（像选滤镜一样轻松，底层自动锁定主角面部特征）</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  系统会自动在出片时注入好莱坞 16:9 黄金三区定妆规范，杜绝各镜头间角色脸部漂移。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {STYLE_PRESETS.map((st) => {
                  const isSelected = st.id === selectedStyleId;
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStyleId(st.id)}
                      className={cn(
                        "relative p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between h-32 bg-gradient-to-br shadow-xs",
                        st.gradient,
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 shadow-md"
                          : "border-border/80 hover:border-border hover:scale-[1.01]"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground">{st.name}</h4>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                          {st.tagline}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono text-muted-foreground/80 truncate">
                        {st.promptSuffix.slice(0, 32)}...
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Confirm & Launch Preview */}
          {currentStep === 3 && (
            <div className="space-y-4 text-center py-4 animate-in fade-in duration-150">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/30 shadow-md">
                <Film className="w-7 h-7" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-bold text-foreground">分镜与视听规范已全部就绪</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  点击下方按钮，AI 导演引擎将为你规划 18 镜标准分镜头，并直接开启<strong>全屏影院动态预演</strong>。
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-secondary/40 border border-border rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>选定画风:</span>
                  <span className="font-semibold text-foreground">{selectedStyle.name}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>故事摘要:</span>
                  <span className="font-semibold text-foreground max-w-[200px] truncate">
                    {storyText.slice(0, 30)}...
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>放映体验:</span>
                  <span className="font-semibold text-emerald-400">Ken Burns 运镜视差 + 台词打字机字幕</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20 shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-medium border border-border bg-secondary hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
              >
                <span>下一步</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在规划分镜与冲印...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>一键出片 · 开启全屏影院预演</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
