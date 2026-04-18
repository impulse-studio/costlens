CREATE TABLE `api_key_project_mapping` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`api_key_prefix` text NOT NULL,
	`api_key_hash` text NOT NULL UNIQUE,
	`provider` text NOT NULL,
	`label` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_api_key_project_mapping_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_api_key_project_mapping_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `collector_run` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	CONSTRAINT `fk_collector_run_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `cost_line_item` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`provider` text NOT NULL,
	`service` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`period_label` text NOT NULL,
	`external_ref` text,
	`metadata_json` text,
	`collected_at` text NOT NULL,
	CONSTRAINT `fk_cost_line_item_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_cost_line_item_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `oidc_project_mapping` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`oidc_sub` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_oidc_project_mapping_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_oidc_project_mapping_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`vercel_project_id` text,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_project_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `project_slug_workspace_unique` UNIQUE(`workspace_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `akpm_project_idx` ON `api_key_project_mapping` (`project_id`);--> statement-breakpoint
CREATE INDEX `akpm_workspace_idx` ON `api_key_project_mapping` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `collector_run_workspace_idx` ON `collector_run` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `cost_line_item_workspace_idx` ON `cost_line_item` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `cost_line_item_provider_idx` ON `cost_line_item` (`provider`);--> statement-breakpoint
CREATE INDEX `oidc_pm_project_idx` ON `oidc_project_mapping` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_workspace_idx` ON `project` (`workspace_id`);