-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "moduleRestrictions" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "moduleOverrides" JSONB;
