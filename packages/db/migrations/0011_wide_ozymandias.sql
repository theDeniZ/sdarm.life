CREATE TABLE `song_opens` (
	`song_id` integer PRIMARY KEY NOT NULL,
	`opens` integer DEFAULT 0 NOT NULL,
	`last_opened` integer,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
