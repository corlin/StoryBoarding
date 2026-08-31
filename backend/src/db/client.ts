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
    // Ensure project_versions table exists
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

    // Check and add is_locked column to shots if not exists
    try {
      await d1.prepare(`ALTER TABLE shots ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;`).run();
    } catch (_) {
      // Column may already exist
    }

    schemaInitialized = true;
  } catch (e) {
    console.warn("Schema self-healing check note:", e);
  }
}

export function getDb(d1: D1Database) {
  ensureSchema(d1);
  return drizzle(d1, { schema });
}
