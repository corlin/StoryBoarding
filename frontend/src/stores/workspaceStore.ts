import { create } from "zustand";
import { ProjectModel, ShotModel } from "@/types/shot";
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
      set({ currentProject: project, isLoading: false });
      // Default select first shot if available, or reset to null
      const firstShot = project.sequences[0]?.shots[0];
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

    set({ currentProject: { ...currentProject, sequences: updatedSequences } });
  },

  saveShotRemote: async (shotId, updates) => {
    get().updateShotLocal(shotId, updates);
    try {
      await api.updateShot(shotId, updates);
    } catch (err: any) {
      console.error("Failed to sync shot to backend", err);
      set({ error: err?.message || "同步镜头修改失败" });
    }
  },

  regenerateShotImage: async (shotId) => {
    try {
      const res = await api.generateShotImage(shotId);
      if (res && res.storyboard_image_url) {
        get().updateShotLocal(shotId, {
          storyboard_image_url: res.storyboard_image_url,
          is_dirty: false,
        });
      }
    } catch (err: any) {
      console.error("Failed to regenerate shot image", err);
      set({ error: err?.message || "单格重绘失败" });
    }
  },

  addShot: async (sequenceId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const newShot = await api.createShot({
        sequence_id: sequenceId,
        action: "新镜头动作描述",
        shot_size: "medium_shot",
        camera_angle: "eye_level",
        duration: 2.5,
      });

      const updatedSequences = currentProject.sequences.map((seq) => {
        if (seq.id === sequenceId) {
          return { ...seq, shots: [...seq.shots, newShot] };
        }
        return seq;
      });

      set({
        currentProject: { ...currentProject, sequences: updatedSequences },
        selectedShotId: newShot.id,
      });
    } catch (err: any) {
      set({ error: err?.message || "Failed to add shot" });
    }
  },

  deleteShot: async (shotId) => {
    const { currentProject, selectedShotId } = get();
    if (!currentProject) return;

    try {
      await api.deleteShot(shotId);
      const updatedSequences = currentProject.sequences.map((seq) => ({
        ...seq,
        shots: seq.shots.filter((s) => s.id !== shotId),
      }));

      set({
        currentProject: { ...currentProject, sequences: updatedSequences },
        selectedShotId: selectedShotId === shotId ? null : selectedShotId,
      });
    } catch (err: any) {
      set({ error: err?.message || "Failed to delete shot" });
    }
  },
}));
