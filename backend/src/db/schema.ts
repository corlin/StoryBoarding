import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  story: text("story"),
  targetDuration: real("target_duration").default(30.0).notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const sequences = sqliteTable("sequences", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").default(1).notNull(),
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
  action: text("action").notNull().default(""),
  dialogue: text("dialogue").default(""),
  narrativeFunction: text("narrative_function").default("动作推进"),
  lighting: text("lighting").default("自然光"),
  audio: text("audio").default("{}").notNull(), // JSON string
  imagePrompt: text("image_prompt").default(""),
  videoPrompt: text("video_prompt").default(""),
  continuityData: text("continuity_data").default("{}").notNull(), // JSON string
  storyboardImageUrl: text("storyboard_image_url"),
  isDirty: integer("is_dirty", { mode: "boolean" }).default(false).notNull(),
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
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

export const systemSettings = sqliteTable("system_settings", {
  id: text("id").primaryKey().default("default"),
  llmProvider: text("llm_provider").default("openrouter").notNull(),
  llmApiKey: text("llm_api_key").default(""),
  llmApiBase: text("llm_api_base").default("https://openrouter.ai/api/v1"),
  llmModel: text("llm_model").default("deepseek/deepseek-chat"),
  imageProvider: text("image_provider").default("openrouter").notNull(),
  imageApiKey: text("image_api_key").default(""),
  imageApiBase: text("image_api_base").default("https://openrouter.ai/api/v1"),
  imageModel: text("image_model").default("google/imagen-3"),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = typeof sequences.$inferInsert;

export type Shot = typeof shots.$inferSelect;
export type InsertShot = typeof shots.$inferInsert;

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
