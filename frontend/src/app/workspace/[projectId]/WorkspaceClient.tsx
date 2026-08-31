"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { TopBar } from "@/components/workspace/TopBar";
import { ScriptPanel } from "@/components/script-view/ScriptPanel";
import { StoryboardPanel } from "@/components/storyboard-view/StoryboardPanel";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { CinemaTheaterModal } from "@/components/modals/CinemaTheaterModal";
import { ShotDetailDrawer } from "@/components/drawers/ShotDetailDrawer";
import { DirectorPipelineModal } from "@/components/workspace/DirectorPipelineModal";
import { VersionHistoryDrawer } from "@/components/drawers/VersionHistoryDrawer";
import { CreateSnapshotModal } from "@/components/modals/CreateSnapshotModal";
import { notify } from "@/components/ui/ToastNotification";
import { api } from "@/lib/api";
import { createDemoMatrixProject } from "@/lib/demoMatrixScene";
import { ProjectVersion, ProjectModel } from "@/types/shot";
import { History, Clock, RotateCcw, GitBranch, X, Lock } from "lucide-react";

interface WorkspaceClientProps {
  projectId?: string;
}

export function WorkspaceClient({ projectId }: WorkspaceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams();

  const queryId = searchParams?.get("id") || searchParams?.get("projectId");
  const rawParamId = Array.isArray(routeParams?.projectId) ? routeParams.projectId[0] : routeParams?.projectId;
  const pathId = typeof window !== "undefined"
    ? window.location.pathname.replace(/^\/workspace\/?/, "").split("/")[0].split("?")[0]
    : "";

  const effectiveProjectId = queryId || (rawParamId && rawParamId !== "demo" ? rawParamId : "") || pathId || projectId || "demo";

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStory, setGenerationStory] = useState("");
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const [theaterShotId, setTheaterShotId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerShotId, setDrawerShotId] = useState<string | null>(null);

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
    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      setVersions([]);
      return;
    }
    try {
      setIsLoadingVersions(true);
      const data = await api.getProjectVersions(effectiveProjectId);
      setVersions(data);
    } catch (e) {
      console.warn("Failed to load versions:", e);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      const demoProj = createDemoMatrixProject();
      setProject(demoProj);
      selectShot(demoProj.sequences[0]?.shots[0]?.id || null);
    } else {
      fetchProject(effectiveProjectId);
      loadVersions();
    }
  }, [effectiveProjectId, fetchProject, selectShot, setProject, loadVersions]);

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

  const activeSequence = displayProject?.sequences[0];
  const shots = activeSequence?.shots || [];
  const totalDuration = shots.reduce((acc, s) => acc + (s.duration || 2.5), 0);

  const activeVersionTag = versions[0]?.version_tag || "v1.0";

  // Auto Streaming Darkroom Queue (3-Worker concurrency for unrendered shots upon entering workspace)
  const autoStreamTriggeredRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!currentProject || previewVersion) return;
    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") return;

    const unrenderedShots = shots.filter((s) => !s.storyboard_image_url);
    if (unrenderedShots.length > 0 && autoStreamTriggeredRef.current !== currentProject.id) {
      autoStreamTriggeredRef.current = currentProject.id;

      (async () => {
        setIsBatchRendering(true);
        setBatchProgress({ current: 0, total: unrenderedShots.length });

        let done = 0;
        const queue = [...unrenderedShots];
        const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
          while (queue.length > 0) {
            const item = queue.shift();
            if (!item) break;
            try {
              await regenerateShotImage(item.id);
            } catch (e) {
              console.warn(`Streaming darkroom failed for shot ${item.id}`, e);
            }
            done += 1;
            setBatchProgress({ current: done, total: unrenderedShots.length });
          }
        });

        await Promise.all(workers);
        setIsBatchRendering(false);
        notify.success(`🎉 全片 ${unrenderedShots.length} 镜导演画板已全部洗印就绪！`);
      })();
    }
  }, [currentProject, shots, previewVersion, effectiveProjectId, regenerateShotImage]);

  // Handlers for Version Time Machine
  const handleCreateSnapshot = async (name: string, tag?: string) => {
    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      notify.info("Demo 演示项目不支持持久化保存快照");
      return;
    }

    try {
      await api.createProjectVersion(effectiveProjectId, {
        version_name: name,
        version_tag: tag,
        trigger_type: "manual",
      });
      await loadVersions();
      notify.success(`📸 已成功保存快照「${tag || "新版本"} · ${name}」！`);
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

  const handleGenerateFromStory = async (story: string) => {
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
        });
        targetProjectId = newProj.id;
        router.push(`/workspace?id=${targetProjectId}`);
      }

      await api.generateFromStory({
        project_id: targetProjectId,
        story: story,
        target_duration: currentProject?.target_duration || 30.0,
      });
      await fetchProject(targetProjectId);
      await loadVersions();
      notify.success("🎬 AI 导演拆镜完成！(已自动保存拆镜前备份快照)");
    } catch (err: any) {
      console.error("AI拆镜失败:", err);
      notify.error(err?.message || "AI 导演拆镜失败，请检查网络或在右上角「设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportScript = async (scriptText: string) => {
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
      notify.success("📜 剧本逆向解析拆镜完成！(已自动保存前置快照)");
    } catch (err: any) {
      console.error("导入剧本解析失败:", err);
      notify.error(err?.message || "剧本逆向解析失败，请检查网络或在右上角「设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDirty = async () => {
    if (previewVersion) {
      notify.info("当前处于历史版本只读预览模式，无法重绘");
      return;
    }
    if (!currentProject) return;
    const previzShots = shots.filter(
      (s) => s.is_dirty || !s.storyboard_image_url || s.storyboard_image_url.startsWith("data:image/svg")
    );
    if (previzShots.length === 0) {
      notify.info("当前所有镜头均已是高精成片状态");
      return;
    }

    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      const updated = shots.map((s) => ({
        ...s,
        is_dirty: false,
        storyboard_image_url: `https://image.pollinations.ai/prompt/${encodeURIComponent(
          `cinematic 2d film storyboard illustration, 16:9 widescreen, ${s.action}, cyberpunk tea house martial arts matrix aesthetic`
        )}?width=1024&height=576&seed=${s.order * 1000 + Date.now() % 1000}&model=flux&nologo=true`,
      }));
      setProject({
        ...currentProject,
        sequences: [
          {
            ...currentProject.sequences[0],
            shots: updated,
          },
        ],
      });
      notify.success("✨ 演示故事板画面已重新绘制！");
      return;
    }

    setIsBatchRendering(true);
    setBatchProgress({ current: 0, total: previzShots.length });

    try {
      let done = 0;
      for (const s of previzShots) {
        try {
          await regenerateShotImage(s.id);
        } catch (e) {
          console.error(`Failed to develop image for shot ${s.id}`, e);
        }
        done += 1;
        setBatchProgress({ current: done, total: previzShots.length });
      }
      await fetchProject(currentProject.id);
      notify.success(`🎨 全部 ${previzShots.length} 个镜头画面渲染完成！`);
    } catch (err: any) {
      notify.error("批量冲印队列出现异常");
    } finally {
      setIsBatchRendering(false);
    }
  };

  const handleRegenerateSingleShot = async (shotId: string) => {
    if (previewVersion) {
      notify.info("当前处于历史版本只读预览模式，无法重绘");
      return;
    }

    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      const shot = shots.find((s) => s.id === shotId);
      if (shot) {
        updateShotLocal(shotId, {
          is_dirty: false,
          storyboard_image_url: `https://image.pollinations.ai/prompt/${encodeURIComponent(
            `cinematic 2d film storyboard illustration, 16:9 widescreen, ${shot.action}, cyberpunk tea house martial arts matrix aesthetic`
          )}?width=1024&height=576&seed=${shot.order * 1000 + Date.now() % 1000}&model=flux&nologo=true`,
        });
        notify.success(`✨ 第 ${shot.order} 镜重新打样成功！`);
      }
      return;
    }

    try {
      await regenerateShotImage(shotId);
      notify.success("🎨 镜头视觉画面重绘完成！");
    } catch (e: any) {
      notify.error("镜头重绘失败，请检查图像 API 设置");
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

  const activeDrawerShot = shots.find((s) => s.id === drawerShotId) || shots.find((s) => s.id === selectedShotId) || null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Bar */}
      <TopBar
        project={displayProject}
        totalDuration={totalDuration}
        activeVersionTag={previewVersion ? `预览中: ${previewVersion.version_tag}` : activeVersionTag}
        onGenerateFromStory={handleGenerateFromStory}
        onImportScript={handleImportScript}
        onOpenVersions={() => setIsVersionsDrawerOpen(true)}
        onOpenCreateSnapshot={() => setIsCreateSnapshotModalOpen(true)}
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
              title="退出预览切回当前"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Dual-View Workspace Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-hidden relative">
        {/* Left: Shot Script View */}
        <ScriptPanel
          shots={shots}
          sequenceId={activeSequence?.id || ""}
          selectedShotId={selectedShotId}
          onSelectShot={selectShot}
          onUpdateShot={async (shotId, updates) => {
            if (previewVersion) {
              notify.info("当前处于历史预览模式，无法编辑");
              return;
            }
            await saveShotRemote(shotId, updates);
          }}
          onAddShot={async (seqId) => {
            if (previewVersion) {
              notify.info("当前处于历史预览模式，无法添加镜头");
              return;
            }
            await addShot(seqId);
          }}
          onDeleteShot={async (shotId) => {
            if (previewVersion) {
              notify.info("当前处于历史预览模式，无法删除镜头");
              return;
            }
            await deleteShot(shotId);
          }}
          onOpenDrawer={handleOpenDrawer}
        />

        {/* Right: Storyboard View */}
        <StoryboardPanel
          shots={shots}
          selectedShotId={selectedShotId}
          onSelectShot={selectShot}
          onRegenerateDirty={handleRegenerateDirty}
          onRegenerateShotImage={handleRegenerateSingleShot}
          onToggleLock={handleToggleLockShot}
          onOpenTheater={handleOpenTheater}
          onOpenDrawer={handleOpenDrawer}
          isBatchRendering={isBatchRendering}
          batchProgress={batchProgress}
        />
      </div>

      {/* Bottom: Timeline Bar */}
      <TimelineBar
        shots={shots}
        targetDuration={displayProject?.target_duration || 30}
        selectedShotId={selectedShotId}
        onSelectShot={selectShot}
      />

      {/* Progressive Multi-Stage AI Director Pipeline Modal */}
      <DirectorPipelineModal
        isOpen={isGenerating}
        storyPreview={generationStory}
        targetDuration={displayProject?.target_duration || 30}
      />

      {/* Version History Drawer */}
      <VersionHistoryDrawer
        isOpen={isVersionsDrawerOpen}
        onClose={() => setIsVersionsDrawerOpen(false)}
        versions={versions}
        previewVersionId={previewVersion?.id || null}
        onPreviewVersion={handlePreviewVersion}
        onRollbackVersion={handleRollbackVersion}
        onForkVersion={handleForkVersion}
        onOpenCreateSnapshot={() => {
          setIsVersionsDrawerOpen(false);
          setIsCreateSnapshotModalOpen(true);
        }}
        isLoading={isLoadingVersions}
      />

      {/* Create Snapshot Modal */}
      <CreateSnapshotModal
        isOpen={isCreateSnapshotModalOpen}
        onClose={() => setIsCreateSnapshotModalOpen(false)}
        onConfirm={handleCreateSnapshot}
        suggestedTag={`v1.${versions.length + 1}`}
      />

      {/* Cinema Theater Modal (Animatic Dynamic Timeline Playback) */}
      <CinemaTheaterModal
        isOpen={isTheaterOpen}
        onClose={() => setIsTheaterOpen(false)}
        shots={shots}
        initialShotId={theaterShotId}
        targetDuration={displayProject?.target_duration || 30}
        onSelectShot={selectShot}
      />

      {/* Slide-out Shot Detail Drawer */}
      <ShotDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        shot={activeDrawerShot}
        onUpdateShot={async (shotId, updates) => {
          if (previewVersion) {
            notify.info("当前处于历史预览模式，无法编辑");
            return;
          }
          await saveShotRemote(shotId, updates);
        }}
        onRegenerateImage={handleRegenerateSingleShot}
      />
    </div>
  );
}
