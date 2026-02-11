-- Add hideScheduleCta flag to SiteSettings
ALTER TABLE "SiteSettings"
  ADD COLUMN "hideScheduleCta" BOOLEAN NOT NULL DEFAULT false;
