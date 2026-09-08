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
        "order" INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 4. Ensure shots table exists
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS shots (
        id TEXT PRIMARY KEY,
        sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
        "order" INTEGER NOT NULL DEFAULT 1,
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

    // 6. Ensure characters table exists (Global Character Roster)
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'protagonist',
        visual_anchor TEXT NOT NULL DEFAULT '',
        turnaround_prompt TEXT NOT NULL DEFAULT '',
        costume_variants TEXT NOT NULL DEFAULT '[]',
        avatar_url TEXT NOT NULL DEFAULT '',
        personality TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 7. Ensure locations table exists (Global Location Space Assets)
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        environment_type TEXT NOT NULL DEFAULT 'interior',
        visual_anchor TEXT NOT NULL DEFAULT '',
        reference_image_url TEXT NOT NULL DEFAULT '',
        lighting_style TEXT NOT NULL DEFAULT '自然光',
        lighting_states TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 8. Ensure props table exists (Narrative Props Asset Library)
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS props (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        visual_anchor TEXT NOT NULL DEFAULT '',
        reference_image_url TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 9. Ensure global_assets table exists (User-Level Cross-Project Asset Library)
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS global_assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asset_type TEXT NOT NULL,
        name TEXT NOT NULL,
        visual_anchor TEXT NOT NULL DEFAULT '',
        reference_image_url TEXT NOT NULL DEFAULT '',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 9. Safe Alter Table migrations
    try { await d1.prepare(`ALTER TABLE projects ADD COLUMN user_id TEXT;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE projects ADD COLUMN aspect_ratio TEXT NOT NULL DEFAULT '9:16';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE projects ADD COLUMN adaptation_tradeoffs TEXT NOT NULL DEFAULT '{}';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN "order" INTEGER NOT NULL DEFAULT 1;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN episode_number INTEGER NOT NULL DEFAULT 1;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN hook_summary TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN cliffhanger_summary TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN payoff_summary TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN target_duration REAL NOT NULL DEFAULT 60.0;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN screenplay_text TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE sequences ADD COLUMN beats_data TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE characters ADD COLUMN turnaround_prompt TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE characters ADD COLUMN costume_variants TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE characters ADD COLUMN voice_dna TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE characters ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE locations ADD COLUMN lighting_states TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE locations ADD COLUMN active_lighting_state TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE locations ADD COLUMN is_variant INTEGER NOT NULL DEFAULT 0;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE locations ADD COLUMN parent_location_id TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE locations ADD COLUMN reuse_strategy TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE locations ADD COLUMN design_summary TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE locations ADD COLUMN anchors_json TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE props ADD COLUMN scale TEXT NOT NULL DEFAULT 'handheld';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE props ADD COLUMN anchors_json TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE props ADD COLUMN states_json TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN "order" INTEGER NOT NULL DEFAULT 1;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN character_ids TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN prop_ids TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN location_id TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN dialogue TEXT DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN dialogue_emotion TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN image_history TEXT NOT NULL DEFAULT '[]';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN clip_id TEXT NOT NULL DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN startTime REAL NOT NULL DEFAULT 0.0;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN endTime REAL NOT NULL DEFAULT 0.0;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN beat_type TEXT DEFAULT 'tension_build';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN emotional_voltage REAL DEFAULT 50.0;`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN information_gap TEXT DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN compute_tier TEXT DEFAULT 'standard';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN screen_text TEXT DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN screen_text_style TEXT DEFAULT 'bold_impact';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN h3_prompt TEXT DEFAULT '';`).run(); } catch (_) {}
    try { await d1.prepare(`ALTER TABLE shots ADD COLUMN beats_range TEXT DEFAULT '[]';`).run(); } catch (_) {}

    // 10. P0-1: generation_jobs table
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS generation_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        shot_id TEXT REFERENCES shots(id) ON DELETE CASCADE,
        job_type TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        input_revision TEXT NOT NULL DEFAULT '',
        reference_asset_version TEXT NOT NULL DEFAULT '',
        parameters TEXT NOT NULL DEFAULT '{}',
        external_task_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        failure_reason TEXT NOT NULL DEFAULT '',
        result_url TEXT NOT NULL DEFAULT '',
        result_metadata TEXT NOT NULL DEFAULT '{}',
        cost_amount REAL DEFAULT 0,
        cost_currency TEXT NOT NULL DEFAULT '',
        cost_unit TEXT NOT NULL DEFAULT '',
        submitted_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 11. P0-1: takes table
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS takes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
        job_id TEXT REFERENCES generation_jobs(id) ON DELETE SET NULL,
        take_type TEXT NOT NULL DEFAULT 'video',
        source TEXT NOT NULL DEFAULT 'generated',
        media_url TEXT NOT NULL DEFAULT '',
        thumbnail_url TEXT NOT NULL DEFAULT '',
        duration REAL DEFAULT 0,
        resolution TEXT NOT NULL DEFAULT '',
        review_status TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT NOT NULL DEFAULT '',
        is_adopted INTEGER NOT NULL DEFAULT 0,
        adopted_at TEXT,
        reviewer_note TEXT NOT NULL DEFAULT '',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 12. P0-1: dialogue_lines table
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS dialogue_lines (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        shot_id TEXT REFERENCES shots(id) ON DELETE CASCADE,
        sequence_id TEXT REFERENCES sequences(id) ON DELETE CASCADE,
        speaker TEXT NOT NULL DEFAULT '',
        text TEXT NOT NULL DEFAULT '',
        performance TEXT NOT NULL DEFAULT '',
        emotion TEXT NOT NULL DEFAULT '',
        audio_version TEXT NOT NULL DEFAULT '',
        audio_url TEXT NOT NULL DEFAULT '',
        actual_duration REAL DEFAULT 0,
        planned_duration REAL DEFAULT 0,
        is_voiceover INTEGER NOT NULL DEFAULT 0,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 13. P0-1: edit_versions table
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS edit_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        sequence_id TEXT REFERENCES sequences(id) ON DELETE CASCADE,
        version_tag TEXT NOT NULL,
        version_name TEXT NOT NULL DEFAULT '',
        assembly_data TEXT NOT NULL DEFAULT '{}',
        subtitle_data TEXT NOT NULL DEFAULT '[]',
        export_result TEXT NOT NULL DEFAULT '{}',
        is_current INTEGER NOT NULL DEFAULT 0,
        total_duration REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    // 14. P0-1: asset_versions table
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS asset_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        asset_type TEXT NOT NULL,
        asset_ref_id TEXT NOT NULL DEFAULT '',
        version_number INTEGER NOT NULL DEFAULT 1,
        version_label TEXT NOT NULL DEFAULT '',
        reference_image_url TEXT NOT NULL DEFAULT '',
        visual_prompt TEXT NOT NULL DEFAULT '',
        state_data TEXT NOT NULL DEFAULT '{}',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `).run();

    schemaInitialized = true;
  } catch (e) {
    console.warn("Schema initialization note:", e);
  }
}

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
