CREATE TABLE `admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_target_idx` ON `admin_audit` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `admin_audit_created_at_idx` ON `admin_audit` (`created_at`);