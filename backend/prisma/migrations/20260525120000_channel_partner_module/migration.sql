-- 1. Role enum: add CHANNEL_PARTNER
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CHANNEL_PARTNER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'CHANNEL_PARTNER';
  END IF;
END $$;

-- 2. LeadVisibility enum
DO $$ BEGIN
  CREATE TYPE "LeadVisibility" AS ENUM ('FULL','PARTIAL','ANONYMOUS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. ChannelPartnerStatus enum
DO $$ BEGIN
  CREATE TYPE "ChannelPartnerStatus" AS ENUM ('INVITED','ACTIVE','REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. User.defaultCompanyId
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultCompanyId" TEXT;

-- 5. Lead.visibility + channelPartnerId
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "visibility" "LeadVisibility" NOT NULL DEFAULT 'FULL';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "channelPartnerId" TEXT;

-- 6. CompanyChannelPartner
CREATE TABLE IF NOT EXISTS "CompanyChannelPartner" (
  "id" TEXT PRIMARY KEY,
  "channelPartnerId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "status" "ChannelPartnerStatus" NOT NULL DEFAULT 'INVITED',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyChannelPartner_unique" ON "CompanyChannelPartner"("channelPartnerId","companyId");
CREATE INDEX IF NOT EXISTS "CompanyChannelPartner_companyId_idx" ON "CompanyChannelPartner"("companyId");
CREATE INDEX IF NOT EXISTS "CompanyChannelPartner_channelPartnerId_idx" ON "CompanyChannelPartner"("channelPartnerId");
DO $$ BEGIN
  ALTER TABLE "CompanyChannelPartner" ADD CONSTRAINT "CCP_channelPartner_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyChannelPartner" ADD CONSTRAINT "CCP_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. ChannelPartnerShare
CREATE TABLE IF NOT EXISTS "ChannelPartnerShare" (
  "id" TEXT PRIMARY KEY,
  "leadId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "channelPartnerId" TEXT NOT NULL,
  "visibility" "LeadVisibility" NOT NULL DEFAULT 'FULL',
  "status" "ChannelPartnerStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "CPShare_lead_company_unique" ON "ChannelPartnerShare"("leadId","companyId");
CREATE INDEX IF NOT EXISTS "CPShare_companyId_idx" ON "ChannelPartnerShare"("companyId");
CREATE INDEX IF NOT EXISTS "CPShare_channelPartnerId_idx" ON "ChannelPartnerShare"("channelPartnerId");
DO $$ BEGIN
  ALTER TABLE "ChannelPartnerShare" ADD CONSTRAINT "CPShare_lead_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ChannelPartnerShare" ADD CONSTRAINT "CPShare_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ChannelPartnerShare" ADD CONSTRAINT "CPShare_channelPartner_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Data migration moved to 20260525120001_channel_partner_data because
-- Postgres forbids using a newly-added enum value (CHANNEL_PARTNER) in
-- the same transaction it was created in. Splitting into two migrations
-- gives the ALTER TYPE a chance to commit before the UPDATE runs.
