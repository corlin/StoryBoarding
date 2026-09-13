ALTER TABLE `shots` ADD COLUMN `audio_strategy` text DEFAULT 'native_av' NOT NULL;
ALTER TABLE `shots` ADD COLUMN `lip_sync_status` text DEFAULT 'pending' NOT NULL;

-- Older deployments created production tables lazily in ensureSchema instead of
-- in 0000_initial.sql. Create the legacy shape here so a clean migration chain
-- and an existing production database both reach the same final schema.
CREATE TABLE IF NOT EXISTS `dialogue_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `shot_id` text,
  `sequence_id` text,
  `speaker` text DEFAULT '' NOT NULL,
  `text` text DEFAULT '' NOT NULL,
  `performance` text DEFAULT '' NOT NULL,
  `emotion` text DEFAULT '' NOT NULL,
  `audio_version` text DEFAULT '' NOT NULL,
  `audio_url` text DEFAULT '' NOT NULL,
  `actual_duration` real DEFAULT 0,
  `planned_duration` real DEFAULT 0,
  `is_voiceover` integer DEFAULT false NOT NULL,
  `order_index` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade,
  FOREIGN KEY (`shot_id`) REFERENCES `shots`(`id`) ON DELETE cascade,
  FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`id`) ON DELETE cascade
);

UPDATE `shots`
SET `audio_strategy` = CASE
  WHEN TRIM(COALESCE(`dialogue`, '')) = '' THEN 'native_av'
  WHEN LOWER(TRIM(`dialogue`)) LIKE '旁白%'
    OR LOWER(TRIM(`dialogue`)) LIKE '画外音%'
    OR LOWER(TRIM(`dialogue`)) LIKE 'narrator%' THEN 'post_dub'
  ELSE 'reference_audio_av'
END;

UPDATE `shots`
SET `lip_sync_status` = CASE
  WHEN TRIM(COALESCE(`dialogue`, '')) = '' OR `audio_strategy` IN ('post_dub', 'silent_broll') THEN 'not_applicable'
  ELSE 'pending'
END;

ALTER TABLE `dialogue_lines` ADD COLUMN `language` text DEFAULT 'zh-CN' NOT NULL;
ALTER TABLE `dialogue_lines` ADD COLUMN `voice_source` text DEFAULT '' NOT NULL;
ALTER TABLE `dialogue_lines` ADD COLUMN `voice_consent_status` text DEFAULT 'unverified' NOT NULL;
