CREATE TABLE IF NOT EXISTS `fin_photos` (
  `photo_id` integer PRIMARY KEY NOT NULL,
  `fin_id` text NOT NULL REFERENCES `fin` (`fin_id`) ON DELETE CASCADE,
  `storage_key` text NOT NULL UNIQUE,
  `original_name` text,
  `mime_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `sort_order` integer NOT NULL,
  `uploaded_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_fin_photos_order` ON `fin_photos` (`fin_id`, `sort_order`, `photo_id`);
