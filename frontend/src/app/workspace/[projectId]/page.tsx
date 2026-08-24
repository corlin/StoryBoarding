"use client";

import React, { useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { TopBar } from "@/components/workspace/TopBar";
import { ScriptPanel } from "@/components/script-view/ScriptPanel";
import { StoryboardPanel } from "@/components/storyboard-view/StoryboardPanel";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { api } from "@/lib/api";
import { generateStoryboardSvgUrl } from "@/lib/storyboardGraphics";
import { createDemoMatrixProject } from "@/lib/demoMatrixScene";

interface WorkspacePageProps {
  params: {
    projectId: string;
  };
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
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
    if (params.projectId === "demo") {
      const demoProj = createDemoMatrixProject();
      setProject(demoProj);
      selectShot(demoProj.sequences[0]?.shots[0]?.id || null);
    } else {
      fetchProject(params.projectId);
    }
  }, [params.projectId, fetchProject, selectShot, setProject]);

  const activeSequence = currentProject?.sequences[0];
  const shots = activeSequence?.shots || [];
  const totalDuration = shots.reduce((acc, s) => acc + s.duration, 0);

  const handleGenerateFromStory = async (story: string) => {
    if (!currentProject) return;
    if (params.projectId === "demo") {
      alert("AI 导演已完成拆镜规划！");
      return;
    }
    await api.generateFromStory({
      project_id: currentProject.id,
      story: story,
      target_duration: currentProject.target_duration,
    });
    await fetchProject(currentProject.id);
  };

  const handleRegenerateDirty = async () => {
    if (!currentProject) return;
    if (params.projectId === "demo") {
      // Regenerate all demo graphics locally
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
    if (params.projectId === "demo") {
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

  const handleImportScript = async (scriptText: string) => {
    if (!currentProject) return;
    if (params.projectId === "demo") {
      alert("演示模式：已完成剧本逆向解析！");
      return;
    }
    await api.generateFromScript({
      project_id: currentProject.id,
      script_text: scriptText,
    });
    await fetchProject(currentProject.id);
  };

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
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Left: Shot Script View */}
        <ScriptPanel
          shots={shots}
          sequenceId={activeSequence?.id || ""}
          selectedShotId={selectedShotId}
          onSelectShot={selectShot}
          onUpdateShot={saveShotRemote}
          onAddShot={addShot}
          onDeleteShot={deleteShot}
        />

        {/* Right: Storyboard View */}
        <StoryboardPanel
          shots={shots}
          selectedShotId={selectedShotId}
          onSelectShot={selectShot}
          onRegenerateDirty={handleRegenerateDirty}
          onRegenerateShotImage={handleRegenerateSingleShot}
        />
      </div>

      {/* Bottom: Timeline Bar */}
      <TimelineBar
        shots={shots}
        targetDuration={currentProject?.target_duration || 30}
        selectedShotId={selectedShotId}
        onSelectShot={selectShot}
      />
    </div>
  );
}
