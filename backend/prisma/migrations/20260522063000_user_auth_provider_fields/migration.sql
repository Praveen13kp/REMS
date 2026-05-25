ALTER TABLE "User"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'CREDENTIAL',
ADD COLUMN "providerId" TEXT;

UPDATE "User" u
SET
  "provider" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "Account" a
      WHERE a."userId" = u."id"
        AND a."providerId" = 'google'
        AND a."password" IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "Account" a
      WHERE a."userId" = u."id"
        AND a."providerId" = 'credential'
        AND a."password" IS NOT NULL
    )
    THEN 'GOOGLE'
    ELSE 'CREDENTIAL'
  END,
  "providerId" = COALESCE(
    (
      SELECT a."accountId"
      FROM "Account" a
      WHERE a."userId" = u."id"
        AND a."providerId" = 'google'
      ORDER BY a."createdAt" DESC
      LIMIT 1
    ),
    u."id"
  );
