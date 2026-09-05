"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { TopBar } from "@/components/workspace/TopBar";
import { ScriptPanel } from "@/components/script-view/ScriptPanel";
import { StoryboardPanel } from "@/components/storyboard-view/StoryboardPanel";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { CinemaTheaterModal } from "@/components/modals/CinemaTheaterModal";
import { ShotDetailDrawer } from "@/components/drawers/ShotDetailDrawer";
import { DirectorPipelineProgress } from "@/components/modals/DirectorPipelineProgress";
import { VersionHistoryDrawer } from "@/components/drawers/VersionHistoryDrawer";
import { CreateSnapshotModal } from "@/components/modals/CreateSnapshotModal";
import { EpisodePillTrack } from "@/components/workspace/EpisodePillTrack";
import { BibleModal } from "@/components/modals/BibleModal";
import { AIGenerateModal } from "@/components/modals/AIGenerateModal";
import { ExportDeliverablesModal } from "@/components/modals/ExportDeliverablesModal";
import { ImportScriptModal } from "@/components/modals/ImportScriptModal";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import { AdaptationTradeoffModal } from "@/components/modals/AdaptationTradeoffModal";
import { ProjectQualityRadarModal } from "@/components/modals/ProjectQualityRadarModal";
import { GlobalAssetLibraryModal } from "@/components/modals/GlobalAssetLibraryModal";
import { ProjectMediaLibraryModal } from "@/components/modals/ProjectMediaLibraryModal";
import { QuickStartWizardModal } from "@/components/modals/QuickStartWizardModal";
import { notify } from "@/components/ui/ToastNotification";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ProjectVersion, ProjectModel } from "@/types/shot";
import { History, Clock, RotateCcw, GitBranch, X, Lock, ChevronLeft, ChevronRight, FileText, Film, SlidersHorizontal } from "lucide-react";

interface WorkspaceClientProps {
  projectId?: string;
}

export function WorkspaceClient({ projectId }: WorkspaceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams();

  const queryId = searchParams?.get("id");
  const rawParamId = Array.isArray(routeParams?.projectId) ? routeParams.projectId[0] : routeParams?.projectId;
  const effectiveProjectId = queryId || rawParamId || projectId || "";

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStory, setGenerationStory] = useState("");
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const [theaterShotId, setTheaterShotId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerShotId, setDrawerShotId] = useState<string | null>(null);

  // Delegated Modal States (Centralized from TopBar)
  const [isOpenAIGenerateModal, setIsOpenAIGenerateModal] = useState(false);
  const [isOpenExportModal, setIsOpenExportModal] = useState(false);
  const [isOpenDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [isOpenBibleModal, setIsOpenBibleModal] = useState(false);
  const [bibleMode, setBibleMode] = useState<"bible" | "style" | "characters" | "locations">("bible");
  const [isOpenScriptModal, setIsOpenScriptModal] = useState(false);
  const [isOpenTradeoffModal, setIsOpenTradeoffModal] = useState(false);
  const [isOpenRadarModal, setIsOpenRadarModal] = useState(false);
  const [isGlobalAssetOpen, setIsGlobalAssetOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const hasAutoOpenedWizardRef = useRef(false);
  const abortBatchRenderRef = useRef(false);

  const { activeEpisodeIndex, setActiveEpisodeIndex } = useWorkspaceStore();

  // Mobile View Switcher Tab ("storyboard" | "script")
  const [mobileActiveTab, setMobileActiveTab] = useState<"storyboard" | "script">("storyboard");

  // Resizable Split-Pane states (5:5 equal default split)
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Drag listener for resizable split pane (percentage-based)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      if (containerWidth <= 0) return;
      const newPercent = Math.min(Math.max((e.clientX / containerWidth) * 100, 20), 80);
      setLeftPanelPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleResetDivider = () => {
    setLeftPanelPercent(50);
    setIsLeftPanelCollapsed(false);
    notify.info("左右栏宽度已复位至默认 5:5 对半均等比例");
  };

  // Version Control & Time Machine state
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isVersionsDrawerOpen, setIsVersionsDrawerOpen] = useState(false);
  const [isCreateSnapshotModalOpen, setIsCreateSnapshotModalOpen] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<ProjectVersion | null>(null);

  const {
    currentProject,
    selectedShotId,
    fetchProject,
    selectShot,
    saveShotRemote,
    addShot,
    deleteShot,
    regenerateShotImage,
    updateShotLocal,
    setProject,
  } = useWorkspaceStore();

  const loadVersions = useCallback(async () => {
    try {
      setIsLoadingVersions(true);
      const data = await api.getProjectVersions(effectiveProjectId);
      setVersions(data);
    } catch (e) {
      console.warn("Failed to load versions from server:", e);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [effectiveProjectId]);

  // 100% Server-First: Always load directly from Cloudflare D1 backend
  useEffect(() => {
    if (!effectiveProjectId || effectiveProjectId === "demo") {
      router.replace("/dashboard");
      return;
    }
    fetchProject(effectiveProjectId);
    loadVersions();
  }, [effectiveProjectId, fetchProject, loadVersions, router]);

  // When previewing a historical version, construct a virtual ProjectModel
  const displayProject: ProjectModel | null = previewVersion
    ? {
        id: previewVersion.project_id,
        user_id: "default",
        title: previewVersion.snapshot_data.project.title,
        story: previewVersion.snapshot_data.project.story,
        style_config: {},
        target_duration: previewVersion.snapshot_data.project.targetDuration || 30.0,
        shot_count: previewVersion.snapshot_data.shotCount,
        created_at: previewVersion.created_at,
        updated_at: previewVersion.created_at,
        sequences: previewVersion.snapshot_data.sequences.map((seq) => ({
          id: seq.id,
          project_id: seq.projectId || previewVersion.project_id,
          name: seq.title || "主场次",
          order: seq.order || 1,
          screenplay_text: seq.screenplay_text || seq.screenplayText || "",
          shots: (seq.shots || []).map((s: any) => ({
            id: s.id,
            sequence_id: s.sequenceId || seq.id,
            order: s.order,
            duration: Number(s.duration) || 2.5,
            shot_size: s.shotSize || s.shot_size || "medium_shot",
            camera_angle: s.cameraAngle || s.camera_angle || "eye_level",
            camera_movement: typeof s.cameraMovement === "object" ? s.cameraMovement : typeof s.camera_movement === "object" ? s.camera_movement : { type: "static" },
            subject: s.subject || "",
            action: s.action || "",
            dialogue: s.dialogue || "",
            composition: {},
            character_direction: "facing_camera",
            narrative_function: s.narrativeFunction || s.narrative_function || "动作推进",
            lighting: s.lighting || "自然光",
            audio: {},
            transition: "cut",
            storyboard_image_url: s.storyboardImageUrl || s.storyboard_image_url || "",
            is_dirty: false,
            is_locked: Boolean(s.isLocked || s.is_locked),
            created_at: s.createdAt || new Date().toISOString(),
            updated_at: s.updatedAt || new Date().toISOString(),
          })),
        })),
      }
    : currentProject;

  const activeSequence = displayProject?.sequences?.[activeEpisodeIndex] || displayProject?.sequences?.[0];
  const shots = activeSequence?.shots || [];
  const totalDuration = shots.reduce((acc, s) => acc + (s.duration || 2.5), 0);

  const activeVersionTag = versions[0]?.version_tag || "v1.0";

  // Active asynchronous batch rendering poll-synchronizer
  useEffect(() => {
    if (!currentProject || previewVersion || !isBatchRendering) return;

    const unrenderedCount = shots.filter((s) => !s.storyboard_image_url).length;
    if (unrenderedCount === 0) {
      setIsBatchRendering(false);
      notify.success("🎉 全片分镜画板已由云端后台冲印入库完毕！");
      return;
    }

    setBatchProgress({
      current: shots.length - unrenderedCount,
      total: shots.length,
    });

    const timer = setInterval(async () => {
      try {
        await fetchProject(effectiveProjectId);
      } catch (e) {
        console.warn("Polling project status error:", e);
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [currentProject, shots, previewVersion, effectiveProjectId, fetchProject, isBatchRendering]);

  // If newly created blank project (0 shots), automatically launch the 3-step Quick Wizard
  useEffect(() => {
    if (currentProject && !previewVersion && !hasAutoOpenedWizardRef.current) {
      const allShots = currentProject.sequences?.flatMap((seq) => seq.shots || []) || [];
      if (allShots.length === 0) {
        hasAutoOpenedWizardRef.current = true;
        setIsWizardOpen(true);
      }
    }
  }, [currentProject, previewVersion]);

  // Handlers for Version Time Machine
  const handleCreateSnapshot = async (name: string, tag?: string) => {
    try {
      await api.createProjectVersion(effectiveProjectId, {
        version_name: name,
        version_tag: tag,
        trigger_type: "manual",
      });
      await loadVersions();
      notify.success(`📸 已成功保存快照「${tag || "新版本"} · ${name}」至云端！`);
    } catch (e: any) {
      notify.error(e?.message || "保存快照失败");
    }
  };

  const handlePreviewVersion = (v: ProjectVersion) => {
    setPreviewVersion(v);
    setIsVersionsDrawerOpen(false);
    notify.info(`👁️ 已开启时光穿越：正在预览快照「${v.version_tag}」`);
  };

  const handleExitPreview = () => {
    setPreviewVersion(null);
    notify.info("已退出历史预览，切回当前实时编辑态");
  };

  const handleRollbackVersion = async (v: ProjectVersion) => {
    try {
      await api.rollbackProjectVersion(effectiveProjectId, v.id);
      setPreviewVersion(null);
      await fetchProject(effectiveProjectId);
      await loadVersions();
      notify.success(`⏪ 已成功将项目回滚至「${v.version_tag} · ${v.version_name}」！`);
    } catch (e: any) {
      notify.error(e?.message || "回滚版本失败");
    }
  };

  const handleForkVersion = async (v: ProjectVersion) => {
    try {
      const forked = await api.forkProjectVersion(effectiveProjectId, v.id);
      notify.success(`🌿 已成功从快照派生新分支项目！`);
      router.push(`/workspace?id=${forked.id}`);
    } catch (e: any) {
      notify.error(e?.message || "派生分支失败");
    }
  };

  const handleToggleLockShot = async (shotId: string, locked: boolean) => {
    if (previewVersion) {
      notify.info("当前处于历史版本只读预览模式，无法修改");
      return;
    }
    updateShotLocal(shotId, { is_locked: locked });
    await saveShotRemote(shotId, { is_locked: locked });
    notify.info(locked ? "🔒 镜头已锁定（AI重构时将保持不变）" : "🔓 镜头已解锁");
  };

  const handleAbortBatchRendering = () => {
    abortBatchRenderRef.current = true;
    setIsBatchRendering(false);
    notify.info("已中止后台冲印队列");
  };

  const startClientRenderQueue = async (targetProjectId: string) => {
    try {
      abortBatchRenderRef.current = false;
      setIsBatchRendering(true);
      const proj = await api.getProject(targetProjectId);
      const currentSeq = proj?.sequences?.[activeEpisodeIndex] || proj?.sequences?.[0];
      const targetShots = currentSeq?.shots || [];
      const unrendered = targetShots.filter(
        (s: any) => !s.storyboard_image_url || s.is_dirty
      );
      if (unrendered.length === 0) {
        setIsBatchRendering(false);
        notify.info("当前集数所有镜头画面均已冲印就绪");
        return;
      }

      setBatchProgress({ current: 0, total: unrendered.length });
      let completed = 0;

      // Concurrency worker pool: strictly max 3 parallel workers
      const concurrency = 3;
      let currentIndex = 0;

      const runWorker = async () => {
        while (currentIndex < unrendered.length) {
          if (abortBatchRenderRef.current) break;
          const indexToProcess = currentIndex++;
          const shot = unrendered[indexToProcess];
          if (!shot) break;
          try {
            await Promise.race([
              regenerateShotImage(shot.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("单镜头渲染超时(45s)")), 45000)
              ),
            ]);
          } catch (err) {
            console.warn(`Shot ${shot.id} render error:`, err);
          }
          if (abortBatchRenderRef.current) break;
          completed++;
          setBatchProgress({ current: completed, total: unrendered.length });
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, unrendered.length) },
        () => runWorker()
      );
      await Promise.all(workers);
      await fetchProject(targetProjectId);
      if (!abortBatchRenderRef.current) {
        notify.success(`🎨 本集 ${unrendered.length} 个镜头画面显影冲印完成！`);
      }
    } catch (e: any) {
      console.error("Client render queue error:", e);
    } finally {
      setIsBatchRendering(false);
    }
  };

  const handleGenerateFromStory = async (
    story: string,
    options?: {
      narrative_mode?: "hollywood" | "drama_5min" | "commercial";
      structural_archetype?: string;
      narrative_center?: "character" | "creative" | "plot";
    }
  ) => {
    const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore.getState();
    if (!isAuthenticated) {
      notify.info("🎬 请先登录或注册导演账号");
      openAuthModal("login");
      return;
    }
    const hasKey = !!user?.custom_settings?.llmApiKey;
    if (!hasKey) {
      notify.info("🎬 请先在「设置」中配置您的专属 OpenRouter API Key，开启 AI 智能拆镜服务");
      openSettingsModal();
      return;
    }

    if (previewVersion) {
      setPreviewVersion(null);
    }

    setIsGenerating(true);
    setGenerationStory(story);
    try {
      let targetProjectId = effectiveProjectId;
      if (targetProjectId === "demo" || targetProjectId === "demo-matrix-cyber-master") {
        const newProj = await api.createProject({
          title: story.slice(0, 24) || "新建 AI 分镜项目",
          story: story,
          target_duration: currentProject?.target_duration || 30.0,
          narrative_mode: options?.narrative_mode,
          structural_archetype: options?.structural_archetype,
          narrative_center: options?.narrative_center,
        });
        targetProjectId = newProj.id;
        router.push(`/workspace?id=${targetProjectId}`);
      }

      await api.generateFromStory({
        project_id: targetProjectId,
        story: story,
        target_duration: currentProject?.target_duration || 30.0,
        narrative_mode: options?.narrative_mode,
        structural_archetype: options?.structural_archetype,
        narrative_center: options?.narrative_center,
      });
      await fetchProject(targetProjectId);
      await loadVersions();
      notify.success("🎬 AI 导演拆镜完成！正在启动保活冲印队列显影全部画面...");
      startClientRenderQueue(targetProjectId);
    } catch (err: any) {
      console.error("AI拆镜失败:", err);
      notify.error(err?.response?.data?.detail || err?.message || "AI 导演拆镜失败，请检查网络或在右上角「设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportScript = async (scriptText: string) => {
    const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore.getState();
    if (!isAuthenticated) {
      notify.info("🎬 请先登录或注册导演账号");
      openAuthModal("login");
      return;
    }
    const hasKey = !!user?.custom_settings?.llmApiKey;
    if (!hasKey) {
      notify.info("🎬 请先在「设置」中配置您的专属 OpenRouter API Key，开启剧本解析服务");
      openSettingsModal();
      return;
    }

    if (previewVersion) {
      setPreviewVersion(null);
    }

    setIsGenerating(true);
    setGenerationStory(scriptText.slice(0, 80));
    try {
      let targetProjectId = effectiveProjectId;
      if (targetProjectId === "demo" || targetProjectId === "demo-matrix-cyber-master") {
        const newProj = await api.createProject({
          title: "导入剧本工程",
          story: scriptText.slice(0, 100),
          target_duration: currentProject?.target_duration || 30.0,
        });
        targetProjectId = newProj.id;
        router.push(`/workspace?id=${targetProjectId}`);
      }

      await api.generateFromScript({
        project_id: targetProjectId,
        script_text: scriptText,
      });
      await fetchProject(targetProjectId);
      await loadVersions();
      notify.success("📜 剧本逆向解析拆镜完成！正在启动保活冲印队列显影全部画面...");
      startClientRenderQueue(targetProjectId);
    } catch (err: any) {
      console.error("导入剧本解析失败:", err);
      notify.error(err?.response?.data?.detail || err?.message || "剧本逆向解析失败，请检查网络或在右上角头像「个人设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDirty = async () => {
    if (previewVersion) {
      notify.info("当前处于历史版本只读预览模式，无法重绘");
      return;
    }
    const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore.getState();
    if (!isAuthenticated) {
      notify.info("🎬 请先登录或注册导演账号");
      openAuthModal("login");
      return;
    }
    const hasKey = !!user?.custom_settings?.llmApiKey;
    if (!hasKey) {
      notify.info("🎬 请先在「设置」中配置您的专属 OpenRouter API Key，开启 AI 画面生成服务");
      openSettingsModal();
      return;
    }
    if (!currentProject) return;
    await startClientRenderQueue(currentProject.id);
  };

  const handleRegenerateSingleShot = async (shotId: string) => {
    if (previewVersion) {
      notify.info("当前处于历史版本只读预览模式，无法重绘");
      return;
    }
    const { user, isAuthenticated, openAuthModal, openSettingsModal } = useAuthStore.getState();
    if (!isAuthenticated) {
      notify.info("🎬 请先登录或注册导演账号");
      openAuthModal("login");
      return;
    }
    const hasKey = !!user?.custom_settings?.llmApiKey;
    if (!hasKey) {
      notify.info("🎬 请先在「设置」中配置您的专属 OpenRouter API Key，开启 AI 画面生成服务");
      openSettingsModal();
      return;
    }

    try {
      await regenerateShotImage(shotId);
      notify.success("🎨 镜头视觉画面冲印存盘完成！");
    } catch (e: any) {
      notify.error(e?.response?.data?.detail || e?.message || "镜头冲印失败，请检查图像 API 设置");
    }
  };

  const handleOpenTheater = (shotId?: string) => {
    const targetId = shotId || selectedShotId || shots[0]?.id;
    setTheaterShotId(targetId);
    selectShot(targetId);
    setIsTheaterOpen(true);
  };

  const handleOpenDrawer = (shotId: string) => {
    setDrawerShotId(shotId);
    selectShot(shotId);
    setIsDrawerOpen(true);
  };

  const handleConfirmDelete = async (projId: string) => {
    await api.deleteProject(projId);
    router.push("/dashboard");
  };

  const handleRadarNavigate = (section: string) => {
    if (section === "tradeoffs") {
      setIsOpenTradeoffModal(true);
    } else if (section === "bible_characters") {
      setBibleMode("characters");
      setIsOpenBibleModal(true);
    } else if (section === "bible_scenes") {
      setBibleMode("locations");
      setIsOpenBibleModal(true);
    } else if (section === "bible_props") {
      setBibleMode("bible");
      setIsOpenBibleModal(true);
    } else if (section === "script") {
      if (isLeftPanelCollapsed) setIsLeftPanelCollapsed(false);
      setMobileActiveTab("script");
      notify.info("已切换并聚焦至剧本节拍面板，请微调单句台词或冷开场");
    } else if (section === "storyboard") {
      setMobileActiveTab("storyboard");
      notify.info("已切换至分镜面板，请检查单镜时长与首帧提示词");
    }
  };

  const activeDrawerShot = shots.find((s) => s.id === drawerShotId) || shots.find((s) => s.id === selectedShotId) || null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Bar (Integrated with Episode Pills & Streamlined Actions) */}
      <TopBar
        project={displayProject}
        shots={shots}
        totalDuration={totalDuration}
        activeVersionTag={previewVersion ? `预览中: ${previewVersion.version_tag}` : activeVersionTag}
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        onToggleLeftPanel={() => setIsLeftPanelCollapsed((prev) => !prev)}
        onOpenAIGenerate={() => setIsOpenAIGenerateModal(true)}
        onOpenRadar={() => setIsOpenRadarModal(true)}
        onOpenExport={() => setIsOpenExportModal(true)}
        onOpenBible={(mode) => {
          setBibleMode(mode || "bible");
          setIsOpenBibleModal(true);
        }}
        onOpenTradeoff={() => setIsOpenTradeoffModal(true)}
        onOpenImportScript={() => setIsOpenScriptModal(true)}
        onOpenTheater={() => {
          setTheaterShotId(selectedShotId || shots[0]?.id || null);
          setIsTheaterOpen(true);
        }}
        onOpenCreateSnapshot={() => setIsCreateSnapshotModalOpen(true)}
        onOpenVersions={() => setIsVersionsDrawerOpen(true)}
        onOpenAssetLibrary={() => setIsGlobalAssetOpen(true)}
        onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
        onOpenDelete={() => setIsOpenDeleteModal(true)}
        onOpenWizard={() => setIsWizardOpen(true)}
      />

      {/* Time Travel Read-Only Banner */}
      {previewVersion && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-4 z-30 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium min-w-0">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              时光穿越只读预览：正在查看快照 <strong>{previewVersion.version_tag} · {previewVersion.version_name}</strong>（包含 {previewVersion.shot_count} 镜，共 {previewVersion.total_duration}s）
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleRollbackVersion(previewVersion)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>回滚至此版本</span>
            </button>
            <button
              onClick={() => handleForkVersion(previewVersion)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 text-xs border border-border transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>另存新分支</span>
            </button>
            <button
              onClick={handleExitPreview}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="退出快照预览，返回当前工作草稿"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Dual-View Tab Bar */}
      <div className="flex md:hidden border-b border-border bg-card">
        <button
          onClick={() => setMobileActiveTab("storyboard")}
          className={cn(
            "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
            mobileActiveTab === "storyboard"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Film className="w-4 h-4" />
          <span>分镜画板 ({shots.length})</span>
        </button>
        <button
          onClick={() => setMobileActiveTab("script")}
          className={cn(
            "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
            mobileActiveTab === "script"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>剧本节拍流</span>
        </button>
      </div>

      {/* Main Dual-View Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Script & Beat-Stream Workspace */}
        <div
          style={{ width: isLeftPanelCollapsed ? "0px" : `${leftPanelPercent}%` }}
          className={cn(
            "h-full border-r border-border flex flex-col bg-background/50 backdrop-blur-xs relative overflow-hidden",
            isDragging ? "transition-none" : "transition-[width] duration-200 ease-in-out",
            mobileActiveTab === "script" ? "!w-full flex-1 block md:flex-none" : "hidden md:block"
          )}
        >
          <div className="h-full flex flex-col min-w-[320px] w-full">
            <ScriptPanel
              shots={shots}
              sequenceId={activeSequence?.id || ""}
              selectedShotId={selectedShotId}
              characters={displayProject?.characters || []}
              project={displayProject}
              sequence={activeSequence}
              onRefreshProject={async () => {
                await fetchProject(effectiveProjectId);
              }}
              onSelectShot={selectShot}
              onUpdateShot={saveShotRemote}
              onAddShot={() => activeSequence && addShot(activeSequence.id)}
              onDeleteShot={deleteShot}
              onOpenDrawer={handleOpenDrawer}
            />
          </div>
        </div>

        {/* Resizable Divider Handle (Desktop Only) */}
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleResetDivider}
          title="按住鼠标左键左右拖拽调整分栏比例；双击恢复 50:50 均等分栏"
          className={cn(
            "w-2 hover:w-2.5 -mr-1 -ml-1 z-30 cursor-col-resize group flex items-center justify-center transition-all select-none relative",
            "hidden md:flex",
            isDragging ? "bg-primary/40 w-2.5" : "hover:bg-primary/20"
          )}
        >
          <div
            className={cn(
              "w-0.5 h-12 rounded-full transition-colors",
              isDragging ? "bg-primary" : "bg-border group-hover:bg-primary/70"
            )}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLeftPanelCollapsed((prev) => !prev);
            }}
            title={isLeftPanelCollapsed ? "展开左侧剧本流" : "收起左侧剧本流（纯净画板全屏）"}
            className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-card border border-border rounded-r-md shadow-xs flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
          >
            {isLeftPanelCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Right Column: Storyboard View (Grid & CallSheet) */}
        <div
          className={cn(
            "flex-1 h-full overflow-hidden bg-background min-w-0",
            mobileActiveTab === "storyboard" ? "w-full block" : "hidden md:block"
          )}
        >
          <StoryboardPanel
            shots={shots}
            selectedShotId={selectedShotId}
            aspectRatio={displayProject?.aspect_ratio === "9:16" ? "9:16" : "16:9"}
            characters={displayProject?.characters || []}
            locations={displayProject?.locations || []}
            propsList={displayProject?.props || []}
            onSelectShot={selectShot}
            onOpenDrawer={handleOpenDrawer}
            onOpenTheater={handleOpenTheater}
            onRegenerateDirty={handleRegenerateDirty}
            onRegenerateShotImage={handleRegenerateSingleShot}
            onToggleLock={handleToggleLockShot}
            isBatchRendering={isBatchRendering}
            batchProgress={batchProgress}
            onAbortBatchRendering={handleAbortBatchRendering}
          />
        </div>
      </div>

      {/* Bottom Column: Collapsible TimelineBar (Recovers 56px) */}
      <div className="border-t border-border bg-card/60 shrink-0">
        <div className="flex items-center justify-between px-4 py-1 text-[11px] text-muted-foreground bg-secondary/30">
          <button
            type="button"
            onClick={() => setIsTimelineCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 hover:text-foreground font-medium transition-colors cursor-pointer"
            title={isTimelineCollapsed ? "展开双轨时间轴与情绪电压波动条带" : "收起时间轴以最大化主创作区空间"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{isTimelineCollapsed ? "展开时间轴与情绪电压波形" : "收起时间轴"}</span>
          </button>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>{shots.length} 镜</span>
            <span>{totalDuration.toFixed(1)}s / {displayProject?.target_duration || 30}s</span>
          </div>
        </div>

        {!isTimelineCollapsed && (
          <TimelineBar
            shots={shots}
            targetDuration={displayProject?.target_duration || 30.0}
            selectedShotId={selectedShotId}
            sequences={displayProject?.sequences || []}
            activeEpisodeIndex={activeEpisodeIndex}
            onSelectEpisode={(idx) => setActiveEpisodeIndex(idx)}
            onSelectShot={(id) => selectShot(id)}
          />
        )}
      </div>

      {/* Centralized Modals & Drawers */}
      <DirectorPipelineProgress
        isOpen={isGenerating}
        title="AI 导演智能拆镜中"
        story={generationStory}
        targetDuration={displayProject?.target_duration || 30.0}
        onCancel={() => setIsGenerating(false)}
      />

      <CinemaTheaterModal
        isOpen={isTheaterOpen}
        shots={shots}
        sequences={displayProject?.sequences || []}
        initialShotId={theaterShotId}
        onSelectShot={selectShot}
        onClose={() => setIsTheaterOpen(false)}
        onOpenExport={() => setIsOpenExportModal(true)}
        onOpenDetail={(shot) => handleOpenDrawer(shot.id)}
      />

      {activeDrawerShot && (
        <ShotDetailDrawer
          isOpen={isDrawerOpen}
          shot={activeDrawerShot}
          characters={displayProject?.characters || []}
          locations={displayProject?.locations || []}
          propsList={displayProject?.props || []}
          onClose={() => setIsDrawerOpen(false)}
          onUpdateShot={saveShotRemote}
          onRegenerateImage={handleRegenerateSingleShot}
        />
      )}

      <VersionHistoryDrawer
        isOpen={isVersionsDrawerOpen}
        onClose={() => setIsVersionsDrawerOpen(false)}
        versions={versions}
        isLoading={isLoadingVersions}
        previewVersionId={previewVersion?.id}
        onPreviewVersion={handlePreviewVersion}
        onRollbackVersion={handleRollbackVersion}
        onForkVersion={handleForkVersion}
        onOpenCreateSnapshot={() => setIsCreateSnapshotModalOpen(true)}
      />

      <CreateSnapshotModal
        isOpen={isCreateSnapshotModalOpen}
        onClose={() => setIsCreateSnapshotModalOpen(false)}
        suggestedTag={`v1.${versions.length + 1}`}
        onConfirm={handleCreateSnapshot}
      />

      {/* Unified Visual Bible & Character DNA Central Registry (Single Instance) */}
      <BibleModal
        isOpen={isOpenBibleModal}
        onClose={() => setIsOpenBibleModal(false)}
        project={displayProject}
        mode={bibleMode}
      />

      <AIGenerateModal
        isOpen={isOpenAIGenerateModal}
        onClose={() => setIsOpenAIGenerateModal(false)}
        onGenerate={handleGenerateFromStory}
      />

      <ExportDeliverablesModal
        isOpen={isOpenExportModal}
        onClose={() => setIsOpenExportModal(false)}
        project={displayProject}
        shots={shots}
      />

      <DeleteProjectModal
        isOpen={isOpenDeleteModal}
        onClose={() => setIsOpenDeleteModal(false)}
        project={displayProject}
        onConfirmDelete={handleConfirmDelete}
      />

      <ImportScriptModal
        isOpen={isOpenScriptModal}
        onClose={() => setIsOpenScriptModal(false)}
        onImportScript={handleImportScript}
      />

      <AdaptationTradeoffModal
        isOpen={isOpenTradeoffModal}
        onClose={() => setIsOpenTradeoffModal(false)}
        project={displayProject}
      />

      <ProjectQualityRadarModal
        isOpen={isOpenRadarModal}
        onClose={() => setIsOpenRadarModal(false)}
        project={displayProject}
        shots={shots}
        onNavigateToSection={handleRadarNavigate}
      />

      <GlobalAssetLibraryModal
        isOpen={isGlobalAssetOpen}
        onClose={() => setIsGlobalAssetOpen(false)}
      />

      <ProjectMediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        projectId={effectiveProjectId}
      />

      <QuickStartWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSwitchToPro={() => setIsWizardOpen(false)}
        onComplete={async (story, options) => {
          setIsWizardOpen(false);
          // 1. Update project visual style preset
          if (options?.styleId) {
            try {
              await api.updateProject(effectiveProjectId, {
                style_config: {
                  preset_id: options.styleId,
                  style_name: options.styleName,
                  positive_prompt: options.stylePrompt,
                },
              });
            } catch (e) {
              console.warn("Failed to persist wizard style preset:", e);
            }
          }
          // 2. Trigger generation with chosen story in commercial/micro-drama mode
          await handleGenerateFromStory(story, {
            narrative_mode: "commercial",
            structural_archetype: "three_act",
            narrative_center: "character",
          });
        }}
      />
    </div>
  );
}
