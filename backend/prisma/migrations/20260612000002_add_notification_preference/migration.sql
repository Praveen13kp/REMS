CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    type TEXT NOT NULL,
    email BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", type);
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "inapp" BOOLEAN NOT NULL DEFAULT true;
