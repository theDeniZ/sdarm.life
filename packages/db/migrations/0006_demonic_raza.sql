CREATE INDEX `images_uploaded_at_idx` ON `images` (`uploaded_at`);--> statement-breakpoint
CREATE INDEX `posts_active_listing_idx` ON `posts` (`deleted_at`,`is_featured`,`published_at`);--> statement-breakpoint
CREATE INDEX `songbooks_sort_order_title_idx` ON `songbooks` (`sort_order`,`title`);--> statement-breakpoint
CREATE INDEX `subscribers_created_at_idx` ON `subscribers` (`created_at`);