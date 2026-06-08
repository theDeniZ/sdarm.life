CREATE TABLE `book_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`land` text NOT NULL,
	`street` text NOT NULL,
	`plz` text NOT NULL,
	`city` text NOT NULL,
	`books` text NOT NULL,
	`wish` text,
	`language` text DEFAULT 'de' NOT NULL,
	`requested_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `book_requests_requested_at_idx` ON `book_requests` (`requested_at`);--> statement-breakpoint
CREATE INDEX `book_requests_email_idx` ON `book_requests` (`email`);