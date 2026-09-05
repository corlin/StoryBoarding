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
  character_ids?: string[];
  location_id?: string;
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
  image_history?: string[]; // Reelbench Content-Addressed History Asset Pool
  image_prompt?: string;
  video_prompt?: string;
  continuity_data: ContinuityData;
  is_dirty: boolean;
  is_locked?: boolean;
  // Two-Tier Video Generation (Clip <= 15s -> Shot 2-5s)
  clip_id?: string;
  start_time?: number;
  end_time?: number;
  prop_ids?: string[];
  dialogue_emotion?: string;
  // Narrative OS Phase 1: Dramatic Beat State Tree
  beat_type?: 'hook' | 'inciting_incident' | 'tension_build' | 'plot_twist' | 'climax_payoff' | 'cliffhanger_hook';
  emotional_voltage?: number; // 0.0 - 100.0 (Quantitative Tension/Payoff Voltage)
  information_gap?: string; // Why audience must watch the next shot (Dramatic Hook)
  compute_tier?: 'flagship' | 'standard' | 'economy';
  act_progression?: string; // '启动·钩子与建置' | '升级·检验与逼迫' | '假高潮·行动与质变' | '兑现·核心反转与余味'
  hook_phase?: string; // '0-3s入画' | '3-10s加压' | '10-30s揭底牌' | '后段高潮'
  // Reelbench Screen Text & Motion Overlays
  screen_text?: string;
  screen_text_style?: 'bold_impact' | 'warning_banner' | 'key_point' | 'minimal_lower_third';
  created_at: string;
  updated_at: string;
}

export interface CharacterProfile {
  code?: string; // e.g. 'C01'
  title_alias?: string; // e.g. '姑娘' | '货郎'
  gender?: string;
  age?: string;
  identity?: string;
  appearance?: string;
  disposition?: string;
  motivation?: string;
  tags?: string[]; // e.g. ['拘谨', '警觉', '倔强']
  arc_static?: string; // CAST 中的静态人物设定
  arc_dynamic?: string; // OUTLINE 中的戏剧转变弧光
  relations?: Array<{
    target_character_name?: string;
    target_name?: string;
    relationship?: string;
    relation?: string;
    description?: string;
  }>;
  evidences?: Array<{
    source_chapter?: string;
    quote: string;
    annotation?: string;
  }>; // 小说原文支持佐证原句
  voice_traits?: {
    timbre?: string;
    pitch?: string;
    speed?: string;
    accent?: string;
    emotion?: string;
    emotion_baseline?: string;
    tts_prompt?: string;
    reference?: string;
  };
}

export interface CharacterModel {
  id: string;
  project_id: string;
  name: string;
  role: "protagonist" | "antagonist" | "supporting";
  visual_anchor: string;
  visualAnchor?: string;
  turnaround_prompt?: string;
  costume_variants?: string[];
  avatar_url?: string;
  personality?: string;
  voice_dna?: string;
  voiceDna?: string;
  profile_json?: CharacterProfile;
  created_at?: string;
}

export interface BeatModel {
  id: string;
  type: "action" | "dialogue";
  speaker?: string;
  content: string;
  parenthetical?: string;
  duration: number; // calculated or customized duration in seconds
  payoff_tag?: string; // '悬念钩' | '身份揭破' | '反转' | '收束' | null
  // Reelbench Scene and Asset Continuity metadata
  scene_number?: number;
  scene_title?: string;
  location_id?: string;
  location_code?: string; // e.g. 'S01' | 'S02'
  lighting_state?: string; // e.g. '浓雾清晨' | '晨雾'
  character_ids?: string[];
  prop_ids?: string[];
}

export interface PayoffBeatItem {
  id: string; // e.g. 'B01'
  type: string; // '悬念钩' | '身份揭破' | '反转' | '收束'
  weight: "major" | "minor";
  episode: number; // e.g. 1, 3, 5
  setup: string; // 前期因果铺垫 (Setup)
  payoff: string; // 当期戏剧兑现 (Payoff)
}

export interface AdaptationTradeoffItem {
  id: string;
  title: string;
  desc: string;
  source?: string;
}

export interface AdaptationTradeoffs {
  dramatic_core?: string; // Reelbench 改编内核
  scale_desc?: string; // 规模与体裁
  keep?: AdaptationTradeoffItem[];
  cut?: AdaptationTradeoffItem[];
  merge?: AdaptationTradeoffItem[];
  risk?: AdaptationTradeoffItem[];
  payoff_beats?: PayoffBeatItem[]; // Reelbench 爽点表与门控
}

export interface LocationModel {
  id: string;
  project_id: string;
  name: string;
  environment_type: "interior" | "exterior" | "abstract";
  visual_anchor: string;
  reference_image_url?: string;
  lighting_style?: string;
  lighting_states?: string[];
  active_lighting_state?: string;
  is_variant?: boolean;
  parent_location_id?: string;
  reuse_strategy?: string;
  created_at?: string;
}

export interface PropModel {
  id: string;
  project_id: string;
  name: string;
  category: "weapon" | "token" | "document" | "general";
  visual_anchor: string;
  visualAnchor?: string;
  reference_image_url?: string;
  description?: string;
  created_at?: string;
}

export interface ClipModel {
  id: string;
  sequence_id: string;
  order: number;
  duration: number; // <= 15s
  location_id?: string;
  lighting_state?: string;
  shots: ShotModel[];
  h3_prompt?: string; // MiniMax Hailuo H3 multi-modal prompt with timestamps
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
  hook_summary?: string;
  cliffhanger_summary?: string;
  payoff_summary?: string;
  target_duration?: number;
  beats_data?: BeatModel[];
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
  aspect_ratio?: "9:16" | "16:9";
  adaptation_tradeoffs?: AdaptationTradeoffs;
  shot_count?: number;
  cover_image_url?: string;
  preview_images?: string[];
  narrative_mode?: "hollywood" | "drama_5min" | "commercial";
  structural_archetype?: string;
  narrative_center?: "character" | "creative" | "plot";
  created_at: string;
  updated_at: string;
  characters?: CharacterModel[];
  locations?: LocationModel[];
  props?: PropModel[];
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
