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
  adaptationTradeoffs: text("adaptation_tradeoffs").default("{}").notNull(), // Reelbench Outline Stage: { keep: [], cut: [], merge: [], risk: [] }
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
  hookSummary: text("hook_summary").default("").notNull(), // Reelbench 本集钩子 (Hook 0-3s)
  cliffhangerSummary: text("cliffhanger_summary").default("").notNull(), // 集尾强悬念卡点
  payoffSummary: text("payoff_summary").default("").notNull(), // 本集爽点/收束 (Payoff/Twist)
  targetDuration: real("target_duration").default(60.0).notNull(), // 单集目标时长
  screenplayText: text("screenplay_text").default("").notNull(), // 核心文学剧本母本正文 (Master Screenplay)
  beatsData: text("beats_data").default("[]").notNull(), // Reelbench Script Stage: 结构化动作/台词节拍流
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
  voiceDna: text("voice_dna").default("").notNull(), // Reelbench TTS Voice prompt & tone anchor
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
  isVariant: integer("is_variant", { mode: "boolean" }).default(false).notNull(), // Reelbench 变体场景标记
  parentLocationId: text("parent_location_id").default("").notNull(), // 继承的主场景 ID
  reuseStrategy: text("reuse_strategy").default("").notNull(), // 复用方案描述 (如同一机位换背板)
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
  imageHistory: text("image_history").default("[]").notNull(), // Reelbench Asset Pool: JSON array of historical image URLs
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
  // Screen Text & Motion Overlays (Reelbench Short Drama / Explainer Feature)
  screenText: text("screen_text").default("").notNull(),
  screenTextStyle: text("screen_text_style").default("bold_impact").notNull(), // 'bold_impact' | 'warning_banner' | 'key_point' | 'minimal_lower_third'
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
