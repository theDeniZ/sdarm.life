CREATE TABLE `bible_books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`translation_id` integer NOT NULL,
	`code` text NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`abbreviation` text NOT NULL,
	`testament` text NOT NULL,
	`chapter_count` integer NOT NULL,
	FOREIGN KEY (`translation_id`) REFERENCES `bible_translations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bible_books_translation_id_idx` ON `bible_books` (`translation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bible_books_translation_code_uniq` ON `bible_books` (`translation_id`,`code`);--> statement-breakpoint
CREATE TABLE `bible_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`treasure_id` integer NOT NULL,
	`code` text NOT NULL,
	`year` integer NOT NULL,
	`copyright` text,
	`license` text NOT NULL,
	FOREIGN KEY (`treasure_id`) REFERENCES `treasures`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bible_translations_treasure_id_unique` ON `bible_translations` (`treasure_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bible_translations_code_unique` ON `bible_translations` (`code`);--> statement-breakpoint
CREATE INDEX `bible_translations_code_idx` ON `bible_translations` (`code`);--> statement-breakpoint
CREATE TABLE `bible_verses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`chapter` integer NOT NULL,
	`verse` integer NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `bible_books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bible_verses_book_chapter_idx` ON `bible_verses` (`book_id`,`chapter`);--> statement-breakpoint
CREATE UNIQUE INDEX `bible_verses_book_chapter_verse_uniq` ON `bible_verses` (`book_id`,`chapter`,`verse`);