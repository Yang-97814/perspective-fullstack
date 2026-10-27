CREATE TABLE `guestbook` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guestbook_user_time_idx` ON `guestbook` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `guestbook_time_idx` ON `guestbook` (`created_at`);