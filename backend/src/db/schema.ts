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
  // Narrative OS Phase 1: Dramatic Beat State Tree
  beatType: text("beat_type").default("tension_build").notNull(), // 'hook' | 'inciting_incident' | 'tension_build' | 'plot_twist' | 'climax_payoff' | 'cliffhanger_hook'
  emotionalVoltage: real("emotional_voltage").default(50.0).notNull(), // 0.0 - 100.0 (Quantitative Tension/Payoff Voltage)
  informationGap: text("information_gap").default("").notNull(), // Why audience must watch the next shot (Dramatic Hook)
  computeTier: text("compute_tier").default("standard").notNull(), // 'flagship' | 'standard' | 'economy'
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
