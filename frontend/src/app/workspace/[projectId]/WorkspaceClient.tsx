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
    } catch (err: any) {
      console.error("AI拆镜失败:", err);
      alert(err?.message || "AI 导演智能拆镜失败，请检查网络或在右上角「设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportScript = async (scriptText: string) => {
    setIsGenerating(true);
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
    } catch (err: any) {
      console.error("导入剧本解析失败:", err);
      alert(err?.message || "剧本逆向解析失败，请检查网络或在右上角「设置」中配置 OpenRouter API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDirty = async () => {
    if (!currentProject) return;
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
      return;
    }
    await api.generateProjectImages(currentProject.id);
    await fetchProject(currentProject.id);
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
      }
      return;
    }
    await regenerateShotImage(shotId);
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
        {isGenerating && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">AI 导演智能拆镜中，正在规划节拍与视听语言...</p>
            <p className="text-xs text-muted-foreground">调用好莱坞 6 阶段视觉导演状态机</p>
          </div>
        )}

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
        />
      </div>

      {/* Bottom: Timeline Bar */}
      <TimelineBar
        shots={shots}
        targetDuration={currentProject?.target_duration || 30}
        selectedShotId={selectedShotId}
        onSelectShot={selectShot}
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
