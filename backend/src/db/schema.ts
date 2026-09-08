import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  avatarUrl: text("avatar_url").default(""),
  customSettings: text("custom_settings").default("{}").notNull(), // JSON string for personal API Keys & Model overrides
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  story: text("story"),
  targetDuration: real("target_duration").default(30.0).notNull(),
  aspectRatio: text("aspect_ratio").default("9:16").notNull(), // '9:16' | '16:9'
  adaptationTradeoffs: text("adaptation_tradeoffs").default("{}").notNull(), // Director Studio Outline Stage: { keep: [], cut: [], merge: [], risk: [] }
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const sequences = sqliteTable("sequences", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").default(1).notNull(),
  // Multi-Episode Series Enhancements
  episodeNumber: integer("episode_number").default(1).notNull(),
  hookSummary: text("hook_summary").default("").notNull(), // Director Studio 本集钩子 (Hook 0-3s)
  cliffhangerSummary: text("cliffhanger_summary").default("").notNull(), // 集尾强悬念卡点
  payoffSummary: text("payoff_summary").default("").notNull(), // 本集爽点/收束 (Payoff/Twist)
  targetDuration: real("target_duration").default(60.0).notNull(), // 单集目标时长
  screenplayText: text("screenplay_text").default("").notNull(), // 核心文学剧本母本正文 (Master Screenplay)
  beatsData: text("beats_data").default("[]").notNull(), // Director Studio Script Stage: 结构化动作/台词节拍流
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Global Character Roster Asset Table (Multi-Episode Visual DNA & Continuity Anchor)
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").default("protagonist").notNull(), // 'protagonist' | 'antagonist' | 'supporting'
  visualAnchor: text("visual_anchor").notNull().default(""), // Pure English visual DNA prompt anchor
  turnaroundPrompt: text("turnaround_prompt").default("").notNull(), // Model Sheet / 3-view turnaround prompt
  costumeVariants: text("costume_variants").default("[]").notNull(), // JSON string array of costume variants
  avatarUrl: text("avatar_url").default("").notNull(),
  personality: text("personality").default("").notNull(),
  voiceDna: text("voice_dna").default("").notNull(), // Director Studio TTS Voice prompt & tone anchor
  // Director Studio STAGE 02 Cast Profile & Evidence Architecture
  profileJson: text("profile_json").default("{}").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Global Location/Scene Space Asset Table
export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  environmentType: text("environment_type").default("interior").notNull(), // 'interior' | 'exterior' | 'abstract'
  visualAnchor: text("visual_anchor").notNull().default(""), // Scene spatial and lighting anchor prompt
  referenceImageUrl: text("reference_image_url").default("").notNull(),
  lightingStyle: text("lighting_style").default("自然光").notNull(),
  lightingStates: text("lighting_states").default("[]").notNull(), // JSON string array of lighting variants, e.g. ["晨雾", "浓雾清晨", "薄雾午前"]
  activeLightingState: text("active_lighting_state").default("").notNull(),
  isVariant: integer("is_variant", { mode: "boolean" }).default(false).notNull(), // Director Studio 变体场景标记
  parentLocationId: text("parent_location_id").default("").notNull(), // 继承的主场景 ID
  reuseStrategy: text("reuse_strategy").default("").notNull(), // 复用方案描述 (如同一机位换背板)
  // Director Studio & industry-standard novel-art standard: Design Summary & 3-5 Concrete Anchors
  designSummary: text("design_summary").default("").notNull(), // 空间设计意图 (非户型说明)
  anchorsJson: text("anchors_json").default("[]").notNull(), // 3-5个具象可核对实体锚点 [{name, desc}]
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Global Narrative Props Asset Table (Key Plot Items / Close-up Anchors)
export const props = sqliteTable("props", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").default("general").notNull(), // 'weapon' | 'token' | 'document' | 'general'
  visualAnchor: text("visual_anchor").notNull().default(""), // Pure English visual DNA prompt (white-backdrop closeup)
  referenceImageUrl: text("reference_image_url").default("").notNull(),
  description: text("description").default("").notNull(),
  // Director Studio & industry-standard novel-art prop standards:
  scale: text("scale").default("handheld").notNull(), // 'handheld' (手持级) | 'tabletop' (桌面级) | 'furniture' (家具级)
  anchorsJson: text("anchors_json").default("[]").notNull(), // 经得起特写的细节锚点 (3-5个)
  statesJson: text("states_json").default("[]").notNull(), // 道具状态变体 (如: 合上/打开) [{state, prompt}]
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const shots = sqliteTable("shots", {
  id: text("id").primaryKey(),
  sequenceId: text("sequence_id").notNull().references(() => sequences.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  duration: real("duration").default(2.5).notNull(),
  shotSize: text("shot_size").notNull().default("medium_shot"),
  cameraAngle: text("camera_angle").notNull().default("eye_level"),
  cameraMovement: text("camera_movement").default("{}").notNull(), // JSON string
  subject: text("subject").default(""),
  characterIds: text("character_ids").default("[]").notNull(), // JSON array of character IDs
  propIds: text("prop_ids").default("[]").notNull(), // JSON array of bound prop IDs
  locationId: text("location_id").default("").notNull(), // Bound location ID
  action: text("action").notNull().default(""),
  dialogue: text("dialogue").default(""),
  dialogueEmotion: text("dialogue_emotion").default("").notNull(), // Voice emotion tag for TTS
  narrativeFunction: text("narrative_function").default("动作推进"),
  lighting: text("lighting").default("自然光"),
  audio: text("audio").default("{}").notNull(), // JSON string
  imagePrompt: text("image_prompt").default(""),
  videoPrompt: text("video_prompt").default(""),
  continuityData: text("continuity_data").default("{}").notNull(), // JSON string
  storyboardImageUrl: text("storyboard_image_url"),
  imageHistory: text("image_history").default("[]").notNull(), // Director Studio Asset Pool: JSON array of historical image URLs
  isDirty: integer("is_dirty", { mode: "boolean" }).default(false).notNull(),
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
  // Two-Tier Video Generation Hierarchy (Clip <= 15s -> Shot 2-5s)
  clipId: text("clip_id").default("").notNull(),
  startTime: real("startTime").default(0.0).notNull(),
  endTime: real("endTime").default(0.0).notNull(),
  // Narrative OS Phase 1: Dramatic Beat State Tree
  beatType: text("beat_type").default("tension_build").notNull(), // 'hook' | 'inciting_incident' | 'tension_build' | 'plot_twist' | 'climax_payoff' | 'cliffhanger_hook'
  emotionalVoltage: real("emotional_voltage").default(50.0).notNull(), // 0.0 - 100.0 (Quantitative Tension/Payoff Voltage)
  informationGap: text("information_gap").default("").notNull(), // Why audience must watch the next shot (Dramatic Hook)
  computeTier: text("compute_tier").default("standard").notNull(), // 'flagship' | 'standard' | 'economy'
  // Screen Text & Motion Overlays (Director Studio Short Drama / Explainer Feature)
  screenText: text("screen_text").default("").notNull(),
  screenTextStyle: text("screen_text_style").default("bold_impact").notNull(), // 'bold_impact' | 'warning_banner' | 'key_point' | 'minimal_lower_third'
  // MiniMax Hailuo H3 multi-modal prompt & beat range alignment
  h3Prompt: text("h3_prompt").default("").notNull(),
  beatsRange: text("beats_range").default("[]").notNull(), // JSON string [start, end]
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const globalAssets = sqliteTable("global_assets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assetType: text("asset_type").notNull(), // 'character' | 'location' | 'prop'
  name: text("name").notNull(),
  visualAnchor: text("visual_anchor").notNull().default(""),
  referenceImageUrl: text("reference_image_url").default("").notNull(),
  metadataJson: text("metadata_json").default("{}").notNull(), // role, lightingStates, category, voiceDna, etc.
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const projectVersions = sqliteTable("project_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  versionTag: text("version_tag").notNull(), // e.g. "v1.0", "v1.1"
  versionName: text("version_name").notNull(), // e.g. "AI 拆镜前备份", "制片人定稿版"
  triggerType: text("trigger_type").notNull().default("manual"), // "manual" | "auto_pre_ai" | "rollback_backup"
  shotCount: integer("shot_count").notNull().default(0),
  totalDuration: real("total_duration").notNull().default(30.0),
  snapshotData: text("snapshot_data").notNull(), // Full JSON snapshot of project, sequences, and shots
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = typeof sequences.$inferInsert;

export type Shot = typeof shots.$inferSelect;
export type InsertShot = typeof shots.$inferInsert;

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

export type Prop = typeof props.$inferSelect;
export type InsertProp = typeof props.$inferInsert;

// ============================================================
// P0-1: Short Drama Production Pipeline Data Models
// ============================================================

// GenerationJob: tracks every AI generation attempt (image/video/audio)
export const generationJobs = sqliteTable("generation_jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotId: text("shot_id").references(() => shots.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(), // 'image' | 'video' | 'audio' | 'tts'
  provider: text("provider").notNull().default(""), // 'openrouter' | 'minimax' | 'runway' | 'kling' | 'wan' | 'external'
  model: text("model").notNull().default(""),
  inputRevision: text("input_revision").notNull().default(""), // snapshot hash of input prompt
  referenceAssetVersion: text("reference_asset_version").notNull().default(""),
  parameters: text("parameters").notNull().default("{}"), // JSON: aspect_ratio, duration, seed, etc.
  externalTaskId: text("external_task_id").notNull().default(""), // provider-side task ID
  status: text("status").notNull().default("pending"), // 'pending' | 'submitted' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
  failureReason: text("failure_reason").notNull().default(""),
  resultUrl: text("result_url").notNull().default(""),
  resultMetadata: text("result_metadata").notNull().default("{}"), // JSON: duration, resolution, etc.
  costAmount: real("cost_amount").default(0), // numeric cost
  costCurrency: text("cost_currency").notNull().default(""), // 'USD' | 'CNY' | 'unknown'
  costUnit: text("cost_unit").notNull().default(""), // 'per_call' | 'per_second' | 'per_image'
  submittedAt: text("submitted_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Take: each actual media output from a generation job or external upload
export const takes = sqliteTable("takes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotId: text("shot_id").notNull().references(() => shots.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => generationJobs.id, { onDelete: "set null" }),
  takeType: text("take_type").notNull().default("video"), // 'video' | 'image' | 'audio'
  source: text("source").notNull().default("generated"), // 'generated' | 'external_upload'
  mediaUrl: text("media_url").notNull().default(""),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  duration: real("duration").default(0), // seconds
  resolution: text("resolution").notNull().default(""), // e.g. '1024x576'
  reviewStatus: text("review_status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  rejectionReason: text("rejection_reason").notNull().default(""),
  isAdopted: integer("is_adopted", { mode: "boolean" }).default(false).notNull(),
  adoptedAt: text("adopted_at"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// DialogueLine: explicit speaker, text, performance, audio version, actual duration
export const dialogueLines = sqliteTable("dialogue_lines", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotId: text("shot_id").references(() => shots.id, { onDelete: "cascade" }),
  sequenceId: text("sequence_id").references(() => sequences.id, { onDelete: "cascade" }),
  speaker: text("speaker").notNull().default(""), // character name or '旁白'
  text: text("text").notNull().default(""),
  performance: text("performance").notNull().default(""), // emotion/tone direction
  emotion: text("emotion").notNull().default(""),
  audioVersion: text("audio_version").notNull().default(""), // reference to audio take/file
  audioUrl: text("audio_url").notNull().default(""),
  actualDuration: real("actual_duration").default(0), // seconds, from actual audio
  plannedDuration: real("planned_duration").default(0), // seconds, from shot plan
  isVoiceover: integer("is_voiceover", { mode: "boolean" }).default(false).notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// EditVersion: saved edit assembly using specific takes, in/out points, audio tracks, subtitles
export const editVersions = sqliteTable("edit_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sequenceId: text("sequence_id").references(() => sequences.id, { onDelete: "cascade" }),
  versionTag: text("version_tag").notNull(), // e.g. 'v1.0', 'v1.1-rework'
  versionName: text("version_name").notNull().default(""),
  assemblyData: text("assembly_data").notNull().default("{}"), // JSON: [{shotId, takeId, inPoint, outPoint, audioTracks}]
  subtitleData: text("subtitle_data").notNull().default("[]"), // JSON array of subtitle cues
  exportResult: text("export_result").notNull().default("{}"), // JSON: {mp4Url, srtUrl, manifestUrl, exportedAt}
  isCurrent: integer("is_current", { mode: "boolean" }).default(false).notNull(),
  totalDuration: real("total_duration").default(0),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// AssetVersion: versioned reference for character, costume, scene, prop
export const assetVersions = sqliteTable("asset_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  assetType: text("asset_type").notNull(), // 'character' | 'costume' | 'scene' | 'prop'
  assetRefId: text("asset_ref_id").notNull().default(""), // ID in characters/locations/props table
  versionNumber: integer("version_number").notNull().default(1),
  versionLabel: text("version_label").notNull().default(""),
  referenceImageUrl: text("reference_image_url").notNull().default(""),
  visualPrompt: text("visual_prompt").notNull().default(""),
  stateData: text("state_data").notNull().default("{}"), // JSON: holder, open/closed state, known info
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;
export type Take = typeof takes.$inferSelect;
export type InsertTake = typeof takes.$inferInsert;
export type DialogueLine = typeof dialogueLines.$inferSelect;
export type InsertDialogueLine = typeof dialogueLines.$inferInsert;
export type EditVersion = typeof editVersions.$inferSelect;
export type InsertEditVersion = typeof editVersions.$inferInsert;
export type AssetVersion = typeof assetVersions.$inferSelect;
export type InsertAssetVersion = typeof assetVersions.$inferInsert;
