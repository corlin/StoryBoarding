import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Film, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { NarrativeMode, NarrativeCenter } from "@/types/narrative";
import { NarrativeStyleSelector } from "@/components/director/NarrativeStyleSelector";
import { DirectorPipelineProgress } from "@/components/modals/DirectorPipelineProgress";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

export interface CreateProjectInitialValues {
  title?: string;
  story?: string;
  targetDuration?: number;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: CreateProjectInitialValues;
}

export function CreateProjectModal({ isOpen, onClose, initialValues }: CreateProjectModalProps) {
  const router = useRouter();
  const { openSettingsModal } = useAuthStore();

  const [title, setTitle] = useState(initialValues?.title || "");
  const [story, setStory] = useState(initialValues?.story || "");
  const [targetDuration, setTargetDuration] = useState(initialValues?.targetDuration || 30);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>("hollywood");
  const [structuralArchetype, setStructuralArchetype] = useState<string>("single_space_standoff");
  const [narrativeCenter, setNarrativeCenter] = useState<NarrativeCenter>("plot");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationElapsed, setCreationElapsed] = useState(0);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationStage, setCreationStage] = useState(0);
  const [creationComplete, setCreationComplete] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const progressIntervalRef = useRef<any>(null);

  // Sync initialValues when modal opens with new template
  React.useEffect(() => {
    if (isOpen && initialValues) {
      if (initialValues.title !== undefined) setTitle(initialValues.title);
      if (initialValues.story !== undefined) setStory(initialValues.story);
      if (initialValues.targetDuration !== undefined) setTargetDuration(initialValues.targetDuration);
      setIsSubmitting(false);
      setCreationError(null);
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsSubmitting(false);
    setCreationError(null);
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!useAuthStore.getState().checkAuthAndKey("新建分镜工程")) {
      return;
    }

    setIsSubmitting(true);
    setCreationElapsed(0);
    setCreationProgress(5);
    setCreationStage(0);
    setCreationComplete(false);
    setCreationError(null);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      setCreationElapsed(elapsedSec);

      if (elapsedSec < 3) {
        setCreationStage(0);
        setCreationProgress(Math.min(25, elapsedSec * 8 + 5));
      } else if (elapsedSec < 8) {
        setCreationStage(1);
        setCreationProgress(Math.min(60, 25 + (elapsedSec - 3) * 7));
      } else if (elapsedSec < 14) {
        setCreationStage(2);
        setCreationProgress(Math.min(90, 60 + (elapsedSec - 8) * 5));
      } else {
        setCreationStage(3);
        setCreationProgress(95);
      }
    }, 500);

    try {
      const created = await api.createProject({
        title: title.trim(),
        story: story.trim() || undefined,
        target_duration: targetDuration,
        aspect_ratio: aspectRatio,
        narrative_mode: narrativeMode,
        structural_archetype: narrativeMode === "drama_5min" ? structuralArchetype : undefined,
        narrative_center: narrativeMode === "drama_5min" ? narrativeCenter : undefined,
      });

      clearInterval(progressIntervalRef.current);
      setCreationProgress(100);
      setCreationStage(3);
      setCreationComplete(true);

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        router.push(`/workspace?id=${created.id}`);
      }, 800);
    } catch (err: any) {
      clearInterval(progressIntervalRef.current);
      console.error("Failed to create project:", err);
      setCreationError(err?.response?.data?.detail || err?.message || "创建工程失败，请重试");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {isSubmitting ? (
          <DirectorPipelineProgress
            title={title}
            story={story}
            targetDuration={targetDuration}
            progressPercent={creationProgress}
            activeStageIndex={creationStage}
            elapsedSeconds={creationElapsed}
            isComplete={creationComplete}
            errorMessage={creationError}
            onRetry={() => {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
              handleCreate(fakeEvent);
            }}
            onOpenSettings={() => {
              setIsSubmitting(false);
              onClose();
              openSettingsModal();
            }}
            onCancel={handleCancel}
            onClose={handleCancel}
          />
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">新建分镜工程</h3>
                <p className="text-xs text-muted-foreground">输入灵感梗概，AI 导演将自动完成剧情拆镜与视觉预演</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground/90 block mb-1">
                  工程标题 <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：《黑客帝国：雨夜茶馆决战》"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground/90">
                    故事剧本 / 场景设定 (可选)
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {story.length}/500 字
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="描述主角身份、核心冲突、环境氛围与关键动作... (留空将基于标题自动构思)"
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-primary resize-none font-medium"
                />
              </div>

              <NarrativeStyleSelector
                mode={narrativeMode}
                onModeChange={setNarrativeMode}
                archetype={structuralArchetype}
                onArchetypeChange={setStructuralArchetype}
                center={narrativeCenter}
                onCenterChange={setNarrativeCenter}
              />

              <div>
                <label className="text-xs font-medium text-foreground/90 block mb-1">
                  画幅视听规格
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("9:16")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                      aspectRatio === "9:16"
                        ? "bg-primary/20 text-primary border-primary font-bold shadow-xs"
                        : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>9:16 竖屏微短剧 (推荐)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("16:9")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                      aspectRatio === "16:9"
                        ? "bg-primary/20 text-primary border-primary font-bold shadow-xs"
                        : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>16:9 横屏画幅</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground/90 block mb-1">
                  目标成片时长 (秒)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[8, 15, 20, 30].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setTargetDuration(dur)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-mono font-medium border transition-all",
                        targetDuration === dur
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {dur}s ({dur <= 8 ? "3 镜" : dur <= 20 ? "6 镜" : "12 镜"})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>立即开始 AI 智能拆镜</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
