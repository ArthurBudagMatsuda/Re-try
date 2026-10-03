DROP TABLE `votes`;--> statement-breakpoint
DROP TABLE `voting_rounds`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
DROP TABLE `rate_limits`;--> statement-breakpoint
ALTER TABLE `attempts` ADD `token_name` text DEFAULT 'RE:TRY' NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `token_symbol` text DEFAULT 'RETRY' NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `logo_url` text DEFAULT '/token-logo.svg' NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `lifespan` integer;--> statement-breakpoint
ALTER TABLE `attempts` ADD `final_market_cap` real;--> statement-breakpoint
ALTER TABLE `attempts` ADD `final_holders` integer;--> statement-breakpoint
ALTER TABLE `attempts` ADD `buys` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `sells` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `transactions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_token_address` ON `attempts` (`token_address`);
