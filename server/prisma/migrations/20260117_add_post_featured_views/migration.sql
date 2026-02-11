-- Add featured flags and view counter to posts
ALTER TABLE "Post"
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isMostViewedPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Post_views_non_negative" CHECK ("views" >= 0);

-- Indexes to speed up featured and most-viewed lookups
CREATE INDEX "Post_isFeatured_status_idx" ON "Post" ("isFeatured", "status");
CREATE INDEX "Post_status_views_idx" ON "Post" ("status", "views");
