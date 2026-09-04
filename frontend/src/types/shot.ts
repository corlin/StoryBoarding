export type ShotSize =
  | 'extreme_wide_shot'
  | 'wide_shot'
  | 'full_shot'
  | 'medium_shot'
  | 'medium_close_up'
  | 'close_up'
  | 'extreme_close_up';

export type CameraAngle =
  | 'eye_level'
  | 'low_angle'
  | 'high_angle'
  | 'dutch_angle'
  | 'birds_eye'
  | 'worms_eye';

export interface CameraMovement {
  type: string;
  speed?: 'slow' | 'medium' | 'fast' | 'sudden';
  secondary?: string;
}

export interface CompositionData {
  subject_position?: string;
  focal_point?: string;
  depth_elements?: string[];
}

export interface AudioData {
  music?: string;
  sfx?: string[];
  ambient?: string;
}

export interface ContinuityData {
  screen_direction?: string;
  character_positions?: Record<string, string>;
  props?: string[];
  eyeline?: string;
  motion_in?: string;
  motion_out?: string;
  transition_recommendation?: string;
}

export interface ShotModel {
  id: string;
  sequence_id: string;
  order: number;
  duration: number;
  shot_size: ShotSize;
  camera_angle: CameraAngle;
  camera_movement: CameraMovement;
  subject: string;
  action: string;
  dialogue?: string;
  composition: CompositionData;
  character_direction: string;
  narrative_function?: string;
  lighting?: string;
  audio: AudioData;
  emotion?: string;
  transition: string;
  notes?: string;
  storyboard_image_url?: string;
  image_prompt?: string;
  video_prompt?: string;
  continuity_data: ContinuityData;
  is_dirty: boolean;
  is_locked?: boolean;
  // Narrative OS Phase 1: Dramatic Beat State Tree
  beat_type?: 'hook' | 'inciting_incident' | 'tension_build' | 'plot_twist' | 'climax_payoff' | 'cliffhanger_hook';
  emotional_voltage?: number; // 0.0 - 100.0 (Quantitative Tension/Payoff Voltage)
  information_gap?: string; // Why audience must watch the next shot (Dramatic Hook)
  compute_tier?: 'flagship' | 'standard' | 'economy';
  created_at: string;
  updated_at: string;
}

export interface CharacterModel {
  id: string;
  project_id: string;
  name: string;
  role: "protagonist" | "antagonist" | "supporting";
  visual_anchor: string;
  visualAnchor?: string;
  avatar_url?: string;
  personality?: string;
  created_at?: string;
}

export interface SequenceModel {
  id: string;
  project_id: string;
  order: number;
  name: string;
  title?: string;
  description?: string;
  screenplay_text?: string;
  episode_number?: number;
  cliffhanger_summary?: string;
  target_duration?: number;
  shots: ShotModel[];
}

export interface ProjectModel {
  id: string;
  user_id: string;
  title: string;
  story?: string;
  creative_brief?: string;
  style_config: Record<string, any>;
  target_duration: number;
  shot_count?: number;
  cover_image_url?: string;
  preview_images?: string[];
  created_at: string;
  updated_at: string;
  characters?: CharacterModel[];
  sequences: SequenceModel[];
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_tag: string;
  version_name: string;
  trigger_type: "manual" | "auto_pre_ai" | "rollback_backup";
  shot_count: number;
  total_duration: number;
  snapshot_data: {
    project: any;
    sequences: any[];
    shotCount: number;
    totalDuration: number;
  };
  created_at: string;
}
