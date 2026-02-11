-- Add isParent flag with default false
ALTER TABLE "NavItem" ADD COLUMN "isParent" BOOLEAN NOT NULL DEFAULT false;

-- Mark items that currently have children as parents
UPDATE "NavItem" AS parent
SET "isParent" = true
WHERE EXISTS (
  SELECT 1 FROM "NavItem" child WHERE child."parentId" = parent."id"
);

-- Ensure children are not marked as parents
UPDATE "NavItem"
SET "isParent" = false
WHERE "parentId" IS NOT NULL;
