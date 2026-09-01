import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
  ENVIRONMENT?: string;
  DEFAULT_LLM_API_BASE?: string;
  DEFAULT_LLM_MODEL?: string;
  DEFAULT_IMAGE_MODEL?: string;
};

let schemaInitialized = false;

export async function ensureSchema(d1: D1Database) {
  if (schemaInitialized) return;
  try {
    // 1. Ensure users table exists
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        avatar_url TEXT DEFAULT '',
        custom_settings TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 2. Ensure projects table exists
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        story TEXT,
        target_duration REAL NOT NULL DEFAULT 30.0,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 3. Ensure sequences table exists
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS sequences (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        order_num INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 4. Ensure shots table exists
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS shots (
        id TEXT PRIMARY KEY,
        sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
        order_num INTEGER NOT NULL DEFAULT 1,
        duration REAL NOT NULL DEFAULT 2.5,
        shot_size TEXT NOT NULL DEFAULT 'medium_shot',
        camera_angle TEXT NOT NULL DEFAULT 'eye_level',
        camera_movement TEXT NOT NULL DEFAULT '{}',
        subject TEXT DEFAULT '',
        action TEXT NOT NULL DEFAULT '',
        dialogue TEXT DEFAULT '',
        narrative_function TEXT DEFAULT '动作推进',
        lighting TEXT DEFAULT '自然光',
        audio TEXT NOT NULL DEFAULT '{}',
        image_prompt TEXT DEFAULT '',
        video_prompt TEXT DEFAULT '',
        continuity_data TEXT NOT NULL DEFAULT '{}',
        storyboard_image_url TEXT,
        is_dirty INTEGER NOT NULL DEFAULT 0,
        is_locked INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 5. Ensure project_versions table exists
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS project_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        version_tag TEXT NOT NULL,
        version_name TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'manual',
        shot_count INTEGER NOT NULL DEFAULT 0,
        total_duration REAL NOT NULL DEFAULT 30.0,
        snapshot_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 6. Ensure system_settings table exists
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY,
        llm_provider TEXT DEFAULT 'openrouter',
        llm_api_key TEXT,
        llm_api_base TEXT,
        llm_model TEXT,
        image_provider TEXT DEFAULT 'openrouter',
        image_api_key TEXT,
        image_api_base TEXT,
        image_model TEXT,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 7. Safe Alter Table migrations
    try {
      await d1.prepare(`ALTER TABLE projects ADD COLUMN user_id TEXT;`).run();
    } catch (_) {}

    try {
      await d1.prepare(`ALTER TABLE shots ADD COLUMN dialogue TEXT DEFAULT '';`).run();
    } catch (_) {}

    try {
      await d1.prepare(`ALTER TABLE shots ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;`).run();
    } catch (_) {}

    schemaInitialized = true;
  } catch (e) {
    console.warn("Schema initialization note:", e);
  }
}

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
