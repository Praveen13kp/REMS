-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT;


-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
