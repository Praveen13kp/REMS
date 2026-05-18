-- DropIndex
DROP INDEX "Company_email_key";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "intakeTokens" JSONB;
