CREATE TABLE IF NOT EXISTS `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`story` text,
	`target_duration` real DEFAULT 30 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

CREATE TABLE IF NOT EXISTS `sequences` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`order` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `shots` (
	`id` text PRIMARY KEY NOT NULL,
	`sequence_id` text NOT NULL,
	`order` integer NOT NULL,
	`duration` real DEFAULT 2.5 NOT NULL,
	`shot_size` text DEFAULT 'medium_shot' NOT NULL,
	`camera_angle` text DEFAULT 'eye_level' NOT NULL,
	`camera_movement` text DEFAULT '{}' NOT NULL,
	`subject` text DEFAULT '',
	`action` text DEFAULT '' NOT NULL,
	`dialogue` text DEFAULT '',
	`narrative_function` text DEFAULT '动作推进',
	`lighting` text DEFAULT '自然光',
	`audio` text DEFAULT '{}' NOT NULL,
	`image_prompt` text DEFAULT '',
	`video_prompt` text DEFAULT '',
	`continuity_data` text DEFAULT '{}' NOT NULL,
	`storyboard_image_url` text,
	`is_dirty` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `system_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`llm_provider` text DEFAULT 'openrouter' NOT NULL,
	`llm_api_key` text DEFAULT '',
	`llm_api_base` text DEFAULT 'https://openrouter.ai/api/v1',
	`llm_model` text DEFAULT 'deepseek/deepseek-chat',
	`image_provider` text DEFAULT 'openrouter' NOT NULL,
	`image_api_key` text DEFAULT '',
	`image_api_base` text DEFAULT 'https://openrouter.ai/api/v1',
	`image_model` text DEFAULT 'google/imagen-3',
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
