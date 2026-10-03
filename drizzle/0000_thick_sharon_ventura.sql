CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY NOT NULL,
	`attempt_number` integer NOT NULL,
	`token_address` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`ended_at` integer,
	`failure_reason` text,
	`peak_market_cap` real NOT NULL,
	`peak_holders` integer NOT NULL,
	`volume` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_attempt_number_unique` ON `attempts` (`attempt_number`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `limit_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `voting_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` integer NOT NULL,
	`round_number` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`retry_votes` integer DEFAULT 0 NOT NULL,
	`keep_votes` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `round_attempt_number` ON `voting_rounds` (`attempt_id`,`round_number`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text,
	`challenge` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_action_at` integer DEFAULT 0 NOT NULL,
	`last_simulation_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`voting_round_id` text NOT NULL,
	`wallet_address` text NOT NULL,
	`choice` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`voting_round_id`) REFERENCES `voting_rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_wallet_one_round` ON `votes` (`voting_round_id`,`wallet_address`);