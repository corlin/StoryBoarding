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

export interface AnnotationItem {
  type: 'motion_arrow' | 'camera_arrow' | 'focal_marker' | 'text_label';
  color: string;
  from?: [number, number];
  to?: [number, number];
  position?: [number, number];
  text?: string;
}

export interface CompositionData {
  subject_position?: string;
  focal_point?: string;
  depth_elements?: string[];
  annotations?: AnnotationItem[];
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
  created_at: string;
  updated_at: string;
}

export interface SequenceModel {
  id: string;
  project_id: string;
  order: number;
  name: string;
  description?: string;
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
  created_at: string;
  updated_at: string;
  sequences: SequenceModel[];
}
