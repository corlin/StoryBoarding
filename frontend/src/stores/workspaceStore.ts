import { create } from "zustand";
import { ProjectModel, ShotModel, SequenceModel } from "@/types/shot";
import { api } from "@/lib/api";

interface WorkspaceState {
  currentProject: ProjectModel | null;
  selectedShotId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProject: (project: ProjectModel) => void;
  selectShot: (shotId: string | null) => void;
  fetchProject: (projectId: string) => Promise<void>;
  updateShotLocal: (shotId: string, updates: Partial<ShotModel>) => void;
  saveShotRemote: (shotId: string, updates: Partial<ShotModel>) => Promise<void>;
  addShot: (sequenceId: string) => Promise<void>;
  deleteShot: (shotId: string) => Promise<void>;
  regenerateShotImage: (shotId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentProject: null,
  selectedShotId: null,
  isLoading: false,
  error: null,

  setProject: (project) => set({ currentProject: project }),

  selectShot: (shotId) => set({ selectedShotId: shotId }),

  fetchProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const project = await api.getProject(projectId);
      
      const enrichedSequences: SequenceModel[] = (project.sequences || []).map((seq: any) => ({
        id: seq.id,
        project_id: seq.project_id || seq.projectId || project.id,
        name: seq.name || seq.title || "主场次",
        order: Number(seq.order) || 1,
        shots: (seq.shots || []).map((shot: any): ShotModel => {
          const size = shot.shot_size || shot.shotSize || "medium_shot";
          const angle = shot.camera_angle || shot.cameraAngle || "eye_level";
          const action = shot.action || "";
          const subject = shot.subject || "";
          const order = Number(shot.order) || 1;

          return {
            id: shot.id,
            sequence_id: shot.sequence_id || shot.sequenceId || seq.id,
            order,
            duration: Number(shot.duration) || 2.5,
            shot_size: size,
            camera_angle: angle,
            camera_movement: typeof shot.camera_movement === "object" ? shot.camera_movement : (typeof shot.cameraMovement === "object" ? shot.cameraMovement : { type: "static" }),
            subject,
            action,
            dialogue: shot.dialogue || "",
            composition: typeof shot.composition === "object" ? shot.composition : {},
            character_direction: shot.character_direction || "facing_camera",
            narrative_function: shot.narrative_function || shot.narrativeFunction || "动作推进",
            lighting: shot.lighting || "自然光影",
            audio: typeof shot.audio === "object" ? shot.audio : {},
            transition: shot.transition || "cut",
            image_prompt: shot.image_prompt || shot.imagePrompt || "",
            video_prompt: shot.video_prompt || shot.videoPrompt || "",
            continuity_data: typeof shot.continuity_data === "object" ? shot.continuity_data : (typeof shot.continuityData === "object" ? shot.continuityData : {}),
            storyboard_image_url:
              shot.storyboard_image_url ||
              shot.storyboardImageUrl ||
              "",
            is_dirty: typeof shot.is_dirty === "boolean" ? shot.is_dirty : (typeof shot.isDirty === "boolean" ? shot.isDirty : false),
            created_at: shot.created_at || shot.createdAt || new Date().toISOString(),
            updated_at: shot.updated_at || shot.updatedAt || new Date().toISOString(),
          };
        }),
      }));

      const enrichedProject: ProjectModel = {
        id: project.id,
        user_id: (project as any).user_id || "default",
        title: project.title,
        story: project.story || "",
        style_config: (project as any).style_config || {},
        target_duration: Number(project.target_duration || (project as any).targetDuration) || 30.0,
        shot_count: (project as any).shot_count || enrichedSequences.reduce((acc, s) => acc + s.shots.length, 0),
        created_at: project.created_at || (project as any).createdAt || new Date().toISOString(),
        updated_at: project.updated_at || (project as any).updatedAt || new Date().toISOString(),
        sequences: enrichedSequences,
      };

      set({ currentProject: enrichedProject, isLoading: false });
      const firstShot = enrichedSequences[0]?.shots[0];
      set({ selectedShotId: firstShot ? firstShot.id : null });
    } catch (err: any) {
      set({ error: err?.message || "Failed to load project", isLoading: false });
    }
  },

  updateShotLocal: (shotId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedSequences = currentProject.sequences.map((seq) => ({
      ...seq,
      shots: seq.shots.map((shot) => {
        if (shot.id === shotId) {
          let nextDirty = shot.is_dirty;
          if (updates.is_dirty !== undefined) {
            nextDirty = updates.is_dirty;
          } else {
            const isMetadataOnly = Object.keys(updates).every((k) =>
              ["duration", "shot_size", "camera_angle", "notes"].includes(k)
            );
            if (!isMetadataOnly) {
              nextDirty = true;
            }
          }

          return {
            ...shot,
            ...updates,
            is_dirty: nextDirty,
          };
        }
        return shot;
      }),
    }));

    set({
      currentProject: {
        ...currentProject,
        sequences: updatedSequences,
      },
    });
  },

  saveShotRemote: async (shotId, updates) => {
    get().updateShotLocal(shotId, updates);
    const { currentProject } = get();
    if (!currentProject || currentProject.id === "demo" || currentProject.id === "demo-matrix-cyber-master") {
      return;
    }

    try {
      await api.updateShot(shotId, updates);
    } catch (err) {
      console.error("Failed to persist shot changes to remote:", err);
    }
  },

  addShot: async (sequenceId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const seq = currentProject.sequences.find((s) => s.id === sequenceId) || currentProject.sequences[0];
    const newOrder = (seq?.shots.length || 0) + 1;

    if (currentProject.id === "demo" || currentProject.id === "demo-matrix-cyber-master") {
      const newLocalShot: ShotModel = {
        id: `shot-local-${Date.now()}`,
        sequence_id: sequenceId,
        order: newOrder,
        duration: 3.0,
        shot_size: "medium_shot",
        camera_angle: "eye_level",
        camera_movement: { type: "static" },
        subject: "新主体",
        action: "新动作描述...",
        composition: {},
        character_direction: "facing_camera",
        audio: {},
        transition: "cut",
        storyboard_image_url: "",
        continuity_data: {},
        is_dirty: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedSequences = currentProject.sequences.map((s) =>
        s.id === sequenceId ? { ...s, shots: [...s.shots, newLocalShot] } : s
      );

      set({
        currentProject: { ...currentProject, sequences: updatedSequences },
        selectedShotId: newLocalShot.id,
      });
      return;
    }

    const created = await api.createShot({
      sequence_id: sequenceId,
      order: newOrder,
      duration: 3.0,
      shot_size: "medium_shot",
      camera_angle: "eye_level",
      camera_movement: { type: "static" },
      subject: "新角色",
      action: "输入镜头具体动作描述...",
    });

    await get().fetchProject(currentProject.id);
    set({ selectedShotId: created.id });
  },

  deleteShot: async (shotId) => {
    const { currentProject, selectedShotId } = get();
    if (!currentProject) return;

    if (currentProject.id === "demo" || currentProject.id === "demo-matrix-cyber-master") {
      const updatedSequences = currentProject.sequences.map((seq) => ({
        ...seq,
        shots: seq.shots.filter((s) => s.id !== shotId).map((s, idx) => ({ ...s, order: idx + 1 })),
      }));
      set({
        currentProject: { ...currentProject, sequences: updatedSequences },
        selectedShotId: selectedShotId === shotId ? null : selectedShotId,
      });
      return;
    }

    await api.deleteShot(shotId);
    await get().fetchProject(currentProject.id);
  },

  regenerateShotImage: async (shotId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    if (currentProject.id === "demo" || currentProject.id === "demo-matrix-cyber-master") {
      get().updateShotLocal(shotId, { is_dirty: false });
      return;
    }

    try {
      const resp = await api.generateShotImage(shotId);
      if (resp && resp.storyboard_image_url) {
        get().updateShotLocal(shotId, {
          storyboard_image_url: resp.storyboard_image_url,
          is_dirty: false,
        });
      }
    } catch (e) {
      console.error(e);
    }
  },
}));
