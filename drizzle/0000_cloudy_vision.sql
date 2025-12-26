CREATE TABLE `categories` (
	`user_id` integer NOT NULL,
	`category` text NOT NULL,
	`subcategory` text NOT NULL,
	`applies_to` text DEFAULT 'expense' NOT NULL,
	`is_common` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`user_id`, `category`, `subcategory`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CHECK (applies_to IN ('expense','income','both')),
	CHECK (is_common IN (0,1))
);
--> statement-breakpoint
CREATE INDEX `idx_categories_user_applies` ON `categories` (`user_id`,`applies_to`);--> statement-breakpoint
CREATE TABLE `fin` (
	`fin_id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`date` text NOT NULL,
	`scheduled_on` text,
	`schedule_rule_id` integer,
	`merchant` text,
	`comment` text,
	`place` text,
	`city` text,
	`category` text,
	`subcategory` text,
	`details` text,
	`original_currency` text NOT NULL,
	`original_amount_cents` integer NOT NULL,
	`fx_id` integer,
	`amount_cad_cents` integer NOT NULL,
	`amount_usd_cents` integer NOT NULL,
	`amount_cny_cents` integer NOT NULL,
	`amount_base_cad_cents` integer NOT NULL,
	`is_scheduled` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schedule_rule_id`) REFERENCES `schedule_rules`(`schedule_rule_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`fx_id`) REFERENCES `fx_snapshots`(`fx_id`) ON UPDATE no action ON DELETE set null,
	CHECK (type IN ('expense','income')),
	CHECK (original_currency IN ('CAD','USD','CNY')),
	CHECK (original_amount_cents >= 0),
	CHECK (amount_cad_cents >= 0),
	CHECK (amount_usd_cents >= 0),
	CHECK (amount_cny_cents >= 0),
	CHECK (amount_base_cad_cents >= 0),
	CHECK (is_scheduled IN (0,1))
);
--> statement-breakpoint
CREATE INDEX `idx_fin_user_date` ON `fin` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_fin_user_type_date` ON `fin` (`user_id`,`type`,`date`);--> statement-breakpoint
CREATE INDEX `idx_fin_user_cat` ON `fin` (`user_id`,`category`,`subcategory`);--> statement-breakpoint
CREATE INDEX `idx_fin_user_merchant` ON `fin` (`user_id`,`merchant`);--> statement-breakpoint
CREATE INDEX `idx_fin_user_fx` ON `fin` (`user_id`,`fx_id`);--> statement-breakpoint
CREATE INDEX `idx_fin_user_rule_scheduled_on` ON `fin` (`user_id`,`schedule_rule_id`,`scheduled_on`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_fin_rule_day` ON `fin` (`user_id`,`schedule_rule_id`,`scheduled_on`) WHERE schedule_rule_id IS NOT NULL AND scheduled_on IS NOT NULL;--> statement-breakpoint
CREATE TABLE `fin_items` (
	`item_id` integer PRIMARY KEY NOT NULL,
	`fin_id` text NOT NULL,
	`line_no` integer,
	`name` text NOT NULL,
	`qty` real,
	`unit` text,
	`unit_price_cents` integer,
	`original_amount_cents` integer NOT NULL,
	`person_id` integer,
	`category` text,
	`subcategory` text,
	`notes` text,
	FOREIGN KEY (`fin_id`) REFERENCES `fin`(`fin_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`person_id`) ON UPDATE no action ON DELETE set null,
	CHECK (original_amount_cents >= 0),
	CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_items_fin` ON `fin_items` (`fin_id`);--> statement-breakpoint
CREATE INDEX `idx_items_person` ON `fin_items` (`person_id`);--> statement-breakpoint
CREATE TABLE `fin_tags` (
	`fin_id` text NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`fin_id`, `tag_id`),
	FOREIGN KEY (`fin_id`) REFERENCES `fin`(`fin_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`tag_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fin_tags_tag` ON `fin_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `fx_snapshots` (
	`fx_id` integer PRIMARY KEY NOT NULL,
	`captured_at` text NOT NULL,
	`provider` text,
	`base_currency` text DEFAULT 'CAD' NOT NULL,
	`cad_to_usd` real NOT NULL,
	`cad_to_cny` real NOT NULL,
	CHECK (base_currency = 'CAD'),
	CHECK (cad_to_usd > 0),
	CHECK (cad_to_cny > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_fx_captured_at` ON `fx_snapshots` (`captured_at`);--> statement-breakpoint
CREATE TABLE `persons` (
	`person_id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CHECK (is_default IN (0,1)),
	CHECK (is_active IN (0,1))
);
--> statement-breakpoint
CREATE INDEX `idx_persons_user` ON `persons` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_persons_user_name` ON `persons` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`receipt_id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`fin_id` text,
	`file_path` text NOT NULL,
	`mime_type` text,
	`sha256` text,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fin_id`) REFERENCES `fin`(`fin_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_receipts_user` ON `receipts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_receipts_fin` ON `receipts` (`fin_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_receipts_sha256` ON `receipts` (`sha256`);--> statement-breakpoint
CREATE TABLE `schedule_rules` (
	`schedule_rule_id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text,
	`is_active` integer DEFAULT true NOT NULL,
	`interval` integer NOT NULL,
	`unit` text NOT NULL,
	`anchor_date` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CHECK (is_active IN (0,1)),
	CHECK (interval > 0),
	CHECK (unit IN ('day','week','month','year'))
);
--> statement-breakpoint
CREATE INDEX `idx_schedule_rules_user_active` ON `schedule_rules` (`user_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `tags` (
	`tag_id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tags_user` ON `tags` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_tags_user_name` ON `tags` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);