-- AlterEnum
-- Postgres requires ALTER TYPE ADD VALUE to be committed before the value can
-- be used (e.g. as a column default), so this lives in its own migration.
ALTER TYPE "Role" ADD VALUE 'OWNER';
