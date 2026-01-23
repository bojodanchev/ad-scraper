CREATE TABLE `ads` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`advertiser_id` text,
	`external_id` text,
	`headline` text,
	`body_text` text,
	`cta_text` text,
	`landing_url` text,
	`media_type` text,
	`media_urls` text,
	`thumbnail_url` text,
	`impressions_min` integer,
	`impressions_max` integer,
	`likes` integer,
	`comments` integer,
	`shares` integer,
	`days_running` integer,
	`country_targeting` text,
	`first_seen_at` text,
	`last_seen_at` text,
	`scraped_at` text,
	`analysis` text,
	FOREIGN KEY (`advertiser_id`) REFERENCES `advertisers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `advertisers` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`name` text NOT NULL,
	`username` text,
	`page_url` text,
	`avatar_url` text,
	`bio` text,
	`verified` integer DEFAULT false,
	`follower_count` integer,
	`following_count` integer,
	`total_likes` integer,
	`posts_count` integer,
	`avg_likes_per_post` integer,
	`avg_views_per_post` integer,
	`avg_comments_per_post` integer,
	`engagement_rate` text,
	`first_seen_at` text,
	`last_scraped_at` text,
	`is_tracked` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `collection_ads` (
	`collection_id` text NOT NULL,
	`ad_id` text NOT NULL,
	`notes` text,
	`added_at` text,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ad_id`) REFERENCES `ads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `creator_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`advertiser_id` text NOT NULL,
	`recorded_at` text NOT NULL,
	`follower_count` integer,
	`following_count` integer,
	`total_likes` integer,
	`posts_count` integer,
	`follower_growth` integer,
	`engagement_rate` text,
	FOREIGN KEY (`advertiser_id`) REFERENCES `advertisers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_ad_id` text,
	`platform` text,
	`model` text,
	`status` text NOT NULL,
	`input_type` text,
	`input_data` text,
	`tv_task_id` text,
	`hf_request_id` text,
	`output_video_url` text,
	`preview_url` text,
	`generated_at` text,
	`reviewed_at` text,
	`review_notes` text,
	`credits_used` integer,
	`estimated_cost_usd` text,
	`error_message` text,
	`retry_count` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`source_ad_id`) REFERENCES `ads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generation_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`platform` text,
	`priority` integer DEFAULT 0,
	`scheduled_for` text,
	`attempts` integer DEFAULT 0,
	`max_attempts` integer DEFAULT 3,
	`last_attempt_at` text,
	`last_error` text,
	`created_at` text,
	FOREIGN KEY (`job_id`) REFERENCES `generation_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scrape_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`search_type` text,
	`query` text,
	`status` text NOT NULL,
	`ads_found` integer DEFAULT 0,
	`apify_run_id` text,
	`started_at` text,
	`completed_at` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `script_remixes` (
	`id` text PRIMARY KEY NOT NULL,
	`source_ad_id` text,
	`original_script` text,
	`remixed_script` text,
	`offer` text,
	`variations` text,
	`analysis_data` text,
	`created_at` text,
	FOREIGN KEY (`source_ad_id`) REFERENCES `ads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `topview_avatars` (
	`id` text PRIMARY KEY NOT NULL,
	`tv_avatar_id` text,
	`name` text,
	`description` text,
	`source_video_url` text,
	`preview_url` text,
	`gender` text,
	`is_active` integer DEFAULT true,
	`created_at` text
);
