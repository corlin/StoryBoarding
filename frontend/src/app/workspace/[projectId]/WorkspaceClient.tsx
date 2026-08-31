"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { TopBar } from "@/components/workspace/TopBar";
import { ScriptPanel } from "@/components/script-view/ScriptPanel";
import { StoryboardPanel } from "@/components/storyboard-view/StoryboardPanel";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { CinemaTheaterModal } from "@/components/modals/CinemaTheaterModal";
import { ShotDetailDrawer } from "@/components/drawers/ShotDetailDrawer";
import { DirectorPipelineModal } from "@/components/workspace/DirectorPipelineModal";
import { notify } from "@/components/ui/ToastNotification";
import { api } from "@/lib/api";
import { generateStoryboardSvgUrl } from "@/lib/storyboardGraphics";
import { createDemoMatrixProject } from "@/lib/demoMatrixScene";

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

  useEffect(() => {
    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      const demoProj = createDemoMatrixProject();
      setProject(demoProj);
      selectShot(demoProj.sequences[0]?.shots[0]?.id || null);
    } else {
      fetchProject(effectiveProjectId);
    }
  }, [effectiveProjectId, fetchProject, selectShot, setProject]);

  const activeSequence = currentProject?.sequences[0];
  const shots = activeSequence?.shots || [];
  const totalDuration = shots.reduce((acc, s) => acc + (s.duration || 2.5), 0);

  const handleGenerateFromStory = async (story: string) => {
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
      notify.success("🎬 AI 导演拆镜完成！成功规划标准好莱坞镜头节拍");
    } catch (err: any) {
      console.error("AI拆镜失败:", err);
      notify.error(err?.message || "AI 导演拆镜失败，请检查网络或在右上角「设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportScript = async (scriptText: string) => {
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
      notify.success("📜 剧本逆向解析拆镜完成！");
    } catch (err: any) {
      console.error("导入剧本解析失败:", err);
      notify.error(err?.message || "剧本逆向解析失败，请检查网络或在右上角「设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDirty = async () => {
    if (!currentProject) return;
    const dirtyShots = shots.filter((s) => s.is_dirty);
    if (dirtyShots.length === 0) return;

    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      const updated = shots.map((s) => ({
        ...s,
        is_dirty: false,
        storyboard_image_url: generateStoryboardSvgUrl({
          order: s.order,
          shot_size: s.shot_size,
          camera_angle: s.camera_angle,
          action: s.action,
          subject: s.subject,
        }),
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
      notify.success("✨ 演示故事板已重绘完毕！");
      return;
    }

    setIsBatchRendering(true);
    setBatchProgress({ current: 0, total: dirtyShots.length });

    try {
      // Process one by one for smooth visual progress tracking
      let done = 0;
      for (const s of dirtyShots) {
        try {
          await regenerateShotImage(s.id);
        } catch (e) {
          console.error(`Failed to generate image for shot ${s.id}`, e);
        }
        done += 1;
        setBatchProgress({ current: done, total: dirtyShots.length });
      }
      await fetchProject(currentProject.id);
      notify.success(`🎨 全部 ${dirtyShots.length} 个待重绘镜头渲染完成！`);
    } catch (err: any) {
      notify.error("批量渲染出现异常");
    } finally {
      setIsBatchRendering(false);
    }
  };

  const handleRegenerateSingleShot = async (shotId: string) => {
    if (effectiveProjectId === "demo" || effectiveProjectId === "demo-matrix-cyber-master") {
      const shot = shots.find((s) => s.id === shotId);
      if (shot) {
        updateShotLocal(shotId, {
          is_dirty: false,
          storyboard_image_url: generateStoryboardSvgUrl({
            order: shot.order,
            shot_size: shot.shot_size,
            camera_angle: shot.camera_angle,
            action: shot.action,
            subject: shot.subject,
          }),
        });
        notify.success(`✨ 第 ${shot.order} 镜重绘成功！`);
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
        project={currentProject}
        totalDuration={totalDuration}
        onGenerateFromStory={handleGenerateFromStory}
        onImportScript={handleImportScript}
      />

      {/* Main Dual-View Workspace Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-hidden relative">
        {/* Left: Shot Script View */}
        <ScriptPanel
          shots={shots}
          sequenceId={activeSequence?.id || ""}
          selectedShotId={selectedShotId}
          onSelectShot={selectShot}
          onUpdateShot={saveShotRemote}
          onAddShot={addShot}
          onDeleteShot={deleteShot}
          onOpenDrawer={handleOpenDrawer}
        />

        {/* Right: Storyboard View */}
        <StoryboardPanel
          shots={shots}
          selectedShotId={selectedShotId}
          onSelectShot={selectShot}
          onRegenerateDirty={handleRegenerateDirty}
          onRegenerateShotImage={handleRegenerateSingleShot}
          onOpenTheater={handleOpenTheater}
          onOpenDrawer={handleOpenDrawer}
          isBatchRendering={isBatchRendering}
          batchProgress={batchProgress}
        />
      </div>

      {/* Bottom: Timeline Bar */}
      <TimelineBar
        shots={shots}
        targetDuration={currentProject?.target_duration || 30}
        selectedShotId={selectedShotId}
        onSelectShot={selectShot}
      />

      {/* Progressive Multi-Stage AI Director Pipeline Modal */}
      <DirectorPipelineModal
        isOpen={isGenerating}
        storyPreview={generationStory}
        targetDuration={currentProject?.target_duration || 30}
      />

      {/* Cinema Theater Modal (Animatic Dynamic Timeline Playback) */}
      <CinemaTheaterModal
        isOpen={isTheaterOpen}
        onClose={() => setIsTheaterOpen(false)}
        shots={shots}
        initialShotId={theaterShotId}
        targetDuration={currentProject?.target_duration || 30}
        onSelectShot={selectShot}
      />

      {/* Slide-out Shot Detail Drawer */}
      <ShotDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        shot={activeDrawerShot}
        onUpdateShot={async (shotId, updates) => {
          await saveShotRemote(shotId, updates);
        }}
        onRegenerateImage={handleRegenerateSingleShot}
      />
    </div>
  );
}
