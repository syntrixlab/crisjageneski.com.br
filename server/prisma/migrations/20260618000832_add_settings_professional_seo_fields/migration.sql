-- AlterTable
ALTER TABLE "SiteSettings"
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" JSONB,
ADD COLUMN "officeHours" JSONB,
ADD COLUMN "metaDescription" VARCHAR(320),
ADD COLUMN "ogImageUrl" TEXT,
ADD COLUMN "gaId" TEXT,
ADD COLUMN "gscVerification" TEXT;
