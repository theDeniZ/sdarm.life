CREATE INDEX `song_parts_song_id_idx` ON `song_parts` (`song_id`);--> statement-breakpoint
CREATE INDEX `song_sheets_song_id_idx` ON `song_sheets` (`song_id`);--> statement-breakpoint
CREATE INDEX `songs_songbook_id_idx` ON `songs` (`songbook_id`);--> statement-breakpoint
CREATE INDEX `songs_songbook_id_number_idx` ON `songs` (`songbook_id`,`number`);