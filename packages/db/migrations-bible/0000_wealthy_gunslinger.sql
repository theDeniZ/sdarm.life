CREATE TABLE `bible_books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`translation_id` text NOT NULL,
	`code` text NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`abbreviation` text NOT NULL,
	`testament` text NOT NULL,
	`chapter_count` integer NOT NULL,
	FOREIGN KEY (`translation_id`) REFERENCES `bible_translations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bible_books_translation_idx` ON `bible_books` (`translation_id`,`number`);--> statement-breakpoint
CREATE INDEX `bible_books_lookup_idx` ON `bible_books` (`translation_id`,`code`);--> statement-breakpoint
CREATE TABLE `bible_translations` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`abbreviation` text NOT NULL,
	`language` text NOT NULL,
	`year` integer DEFAULT 0 NOT NULL,
	`lxx_psalms` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`license_basis` text NOT NULL,
	`rights_holder` text,
	`notice` text,
	`provenance` text,
	`permission_ref` text,
	`permission_date` integer,
	`allow_download` integer DEFAULT false NOT NULL,
	`allow_offline` integer DEFAULT false NOT NULL,
	`allow_search_index` integer DEFAULT false NOT NULL,
	`allow_projector` integer DEFAULT true NOT NULL,
	`max_verses_per_request` integer,
	`verse_count` integer DEFAULT 0 NOT NULL,
	`book_count` integer DEFAULT 0 NOT NULL,
	`ingested_at` integer,
	`bundle_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bible_translations_slug_unique` ON `bible_translations` (`slug`);--> statement-breakpoint
CREATE INDEX `bible_translations_sort_order_idx` ON `bible_translations` (`sort_order`);--> statement-breakpoint
CREATE TABLE `bible_verses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`translation_id` text NOT NULL,
	`book` text NOT NULL,
	`chapter` integer NOT NULL,
	`verse` integer NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`translation_id`) REFERENCES `bible_translations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bible_verses_ref_idx` ON `bible_verses` (`translation_id`,`book`,`chapter`,`verse`);