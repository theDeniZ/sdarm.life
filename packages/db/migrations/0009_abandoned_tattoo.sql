ALTER TABLE `subscribers` ADD `confirmed_at` integer;--> statement-breakpoint
-- Grandfather existing subscribers: those who signed up before Double-Opt-In are considered confirmed by their original action.
UPDATE `subscribers` SET `confirmed_at` = `created_at` WHERE `confirmed_at` IS NULL;--> statement-breakpoint
CREATE INDEX `subscribers_confirmed_at_idx` ON `subscribers` (`confirmed_at`);