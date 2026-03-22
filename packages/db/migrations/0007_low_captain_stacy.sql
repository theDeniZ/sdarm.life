CREATE TABLE `treasures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`description` text,
	`type` text DEFAULT 'book' NOT NULL,
	`language` text NOT NULL,
	`cover_gradient` text,
	`cover_accent_color` text,
	`cover_key` text,
	`is_free` integer DEFAULT true NOT NULL,
	`price` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`epub_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `treasures_sort_order_idx` ON `treasures` (`sort_order`);--> statement-breakpoint
CREATE INDEX `treasures_type_idx` ON `treasures` (`type`);--> statement-breakpoint
CREATE INDEX `treasures_language_idx` ON `treasures` (`language`);