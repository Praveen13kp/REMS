ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BROKER';

DO $$ BEGIN
  CREATE TYPE "BrokerCompanyStatus" AS ENUM ('INVITED', 'ACTIVE', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "BrokerCompany" (
  "id" TEXT NOT NULL,
  "brokerUserId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "status" "BrokerCompanyStatus" NOT NULL DEFAULT 'INVITED',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "BrokerCompany_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BrokerCompany_brokerUserId_companyId_key"
  ON "BrokerCompany"("brokerUserId", "companyId");

CREATE INDEX IF NOT EXISTS "BrokerCompany_companyId_idx" ON "BrokerCompany"("companyId");
CREATE INDEX IF NOT EXISTS "BrokerCompany_brokerUserId_idx" ON "BrokerCompany"("brokerUserId");

ALTER TABLE "BrokerCompany"
  ADD CONSTRAINT "BrokerCompany_brokerUserId_fkey"
  FOREIGN KEY ("brokerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrokerCompany"
  ADD CONSTRAINT "BrokerCompany_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
