-- Add brandTagline field to SiteSettings
ALTER TABLE "SiteSettings"
  ADD COLUMN "brandTagline" VARCHAR(80);

UPDATE "SiteSettings"
  SET "brandTagline" = 'Psicologia Junguiana'
  WHERE "brandTagline" IS NULL;
