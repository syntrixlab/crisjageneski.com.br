-- Navigation items upgrade: support navbar/footer visibility, hierarchy, and new targets

-- 1) Enum for navigation item type
CREATE TYPE "NavItemType" AS ENUM ('INTERNAL_PAGE', 'EXTERNAL_URL');

-- 2) Add new columns
ALTER TABLE "NavItem"
  ADD COLUMN "type" "NavItemType",
  ADD COLUMN "pageKey" TEXT,
  ADD COLUMN "url" TEXT,
  ADD COLUMN "showInNavbar" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showInFooter" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "orderNavbar" INTEGER DEFAULT 0,
  ADD COLUMN "orderFooter" INTEGER,
  ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- 3) Backfill data from the previous structure
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "order", "createdAt") - 1 AS rn
  FROM "NavItem"
)
UPDATE "NavItem" n
SET
  "type" = CASE WHEN n."isExternal" = true THEN 'EXTERNAL_URL'::"NavItemType" ELSE 'INTERNAL_PAGE'::"NavItemType" END,
  "pageKey" = CASE WHEN n."isExternal" = false AND n."href" LIKE '/p/%' THEN substring(n."href" from 4) ELSE NULL END,
  "url" = CASE WHEN n."isExternal" = true THEN n."href" ELSE NULL END,
  "showInNavbar" = true,
  "showInFooter" = false,
  "orderNavbar" = o.rn,
  "orderFooter" = NULL,
  "isVisible" = COALESCE(n."visible", true)
FROM ordered o
WHERE o.id = n.id;

-- 4) Enforce non-null constraints where needed
ALTER TABLE "NavItem"
  ALTER COLUMN "type" SET NOT NULL,
  ALTER COLUMN "orderNavbar" SET NOT NULL;

-- 5) Parent relationship (cascade delete children)
ALTER TABLE "NavItem"
  ADD CONSTRAINT "NavItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Remove old columns
ALTER TABLE "NavItem"
  DROP COLUMN "href",
  DROP COLUMN "order",
  DROP COLUMN "visible",
  DROP COLUMN "isExternal";

-- 7) Indexes and unique constraints for ordering per parent/context
CREATE INDEX "NavItem_showInNavbar_orderNavbar_idx" ON "NavItem" ("showInNavbar", "orderNavbar");
CREATE INDEX "NavItem_showInFooter_orderFooter_idx" ON "NavItem" ("showInFooter", "orderFooter");
CREATE INDEX "NavItem_parentId_idx" ON "NavItem" ("parentId");
CREATE UNIQUE INDEX "NavItem_orderNavbar_parentId_unique" ON "NavItem" ("parentId", "orderNavbar");
CREATE UNIQUE INDEX "NavItem_orderFooter_parentId_unique" ON "NavItem" ("parentId", "orderFooter");
