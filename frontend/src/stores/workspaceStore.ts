import { create } from "zustand";
import { ProjectModel, ShotModel, SequenceModel } from "@/types/shot";
import { api } from "@/lib/api";

interface WorkspaceState {
  currentProject: ProjectModel | null;
  selectedShotId: string | null;
  activeEpisodeIndex: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProject: (project: ProjectModel) => void;
  selectShot: (shotId: string | null) => void;
  setActiveEpisodeIndex: (index: number) => void;
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
  activeEpisodeIndex: 0,
  isLoading: false,
  error: null,

  setProject: (project) => set({ currentProject: project }),

  selectShot: (shotId) => set({ selectedShotId: shotId }),

  setActiveEpisodeIndex: (index) => {
    const { currentProject } = get();
    const targetSeq = currentProject?.sequences[index];
    const firstShot = targetSeq?.shots[0];
    set({
      activeEpisodeIndex: index,
      selectedShotId: firstShot ? firstShot.id : null,
    });
  },

  fetchProject: async (projectId) => {
    const { currentProject } = get();
    // 彻底隔离工程数据：若正在切换至不同项目，立即重置当前工程与选中态，绝不残留旧数据导致串台
    if (currentProject && currentProject.id !== projectId) {
      set({ currentProject: null, selectedShotId: null, activeEpisodeIndex: 0 });
    }
    set({ isLoading: true, error: null });

    // 智能指数退避重试机制（吸收 Cloudflare D1 边缘多副本主从复制延迟，彻底抹平瞬态 404）
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [600, 1200, 2000];
    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const project = await api.getProject(projectId);
        
        const enrichedSequences: SequenceModel[] = (project.sequences || []).map((seq: any) => ({
          id: seq.id,
          project_id: seq.project_id || project.id,
          name: seq.title || seq.name || "主场次",
          order: Number(seq.order) || 1,
          episode_number: Number(seq.episode_number) || 1,
          cliffhanger_summary: seq.cliffhanger_summary || "",
          target_duration: Number(seq.target_duration) || 60.0,
          screenplay_text: seq.screenplay_text || "",
          shots: (seq.shots || []).map((shot: any): ShotModel => ({
            id: shot.id,
            sequence_id: shot.sequence_id || seq.id,
            order: Number(shot.order) || 1,
            duration: Number(shot.duration) || 2.5,
            shot_size: shot.shot_size || "medium_shot",
            camera_angle: shot.camera_angle || "eye_level",
            camera_movement: typeof shot.camera_movement === "object" ? shot.camera_movement : { type: "static" },
            subject: shot.subject || "",
            action: shot.action || "",
            dialogue: shot.dialogue || "",
            composition: typeof shot.composition === "object" ? shot.composition : {},
            character_direction: shot.character_direction || "facing_camera",
            narrative_function: shot.narrative_function || "动作推进",
            lighting: shot.lighting || "自然光影",
            audio: typeof shot.audio === "object" ? shot.audio : {},
            transition: shot.transition || "cut",
            image_prompt: shot.image_prompt || "",
            video_prompt: shot.video_prompt || "",
            continuity_data: typeof shot.continuity_data === "object" ? shot.continuity_data : {},
            storyboard_image_url: shot.storyboard_image_url || "",
            is_dirty: Boolean(shot.is_dirty),
            is_locked: Boolean(shot.is_locked),
            character_ids: Array.isArray(shot.character_ids) ? shot.character_ids : [],
            prop_ids: Array.isArray(shot.prop_ids) ? shot.prop_ids : [],
            location_id: shot.location_id || "",
            clip_id: shot.clip_id || "",
            start_time: Number(shot.start_time) || 0,
            end_time: Number(shot.end_time) || 0,
            dialogue_emotion: shot.dialogue_emotion || "",
            beat_type: shot.beat_type || "tension_build",
            emotional_voltage: Number(shot.emotional_voltage) || 50.0,
            information_gap: shot.information_gap || "",
            compute_tier: shot.compute_tier || "standard",
            created_at: shot.created_at || new Date().toISOString(),
            updated_at: shot.updated_at || new Date().toISOString(),
          })),
        }));

        const enrichedProject: ProjectModel = {
          id: project.id,
          user_id: project.user_id || "default",
          title: project.title,
          story: project.story || "",
          style_config: project.style_config || {},
          target_duration: Number(project.target_duration) || 30.0,
          shot_count: project.shot_count || enrichedSequences.reduce((acc, s) => acc + s.shots.length, 0),
          cover_image_url: project.cover_image_url || "",
          created_at: project.created_at || new Date().toISOString(),
          updated_at: project.updated_at || new Date().toISOString(),
          characters: Array.isArray(project.characters) ? project.characters : [],
          locations: Array.isArray(project.locations) ? project.locations : [],
          props: Array.isArray(project.props) ? project.props : [],
          sequences: enrichedSequences,
        };

        set({ currentProject: enrichedProject, isLoading: false, error: null });
        const firstShot = enrichedSequences[0]?.shots[0];
        set({ selectedShotId: firstShot ? firstShot.id : null });
        return; // 加载成功，直接返回
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        const isTransient = status === 404 || status === 502 || status === 503 || !status;
        
        // 若还有重试次数且属于瞬态/复制延迟错误，静默退避重试
        if (attempt < MAX_RETRIES && isTransient) {
          const delay = RETRY_DELAYS[attempt];
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        break;
      }
    }

    // 重试耗尽，确实无法加载时呈现清晰错误
    set({
      error: lastError?.response?.data?.detail || lastError?.message || "工程数据载入失败，请稍后重试",
      isLoading: false,
    });
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
