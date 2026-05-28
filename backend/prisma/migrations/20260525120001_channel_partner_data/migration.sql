-- Data migration for channel_partner_module. Split from the previous
-- migration so the new "Role"=CHANNEL_PARTNER enum value and the new
-- "ChannelPartnerStatus" enum have committed before they are used here.

UPDATE "User" SET "role" = 'CHANNEL_PARTNER' WHERE "role" = 'BROKER';

-- Backfill from legacy BrokerCompany only if the table still exists
-- (it is dropped in a later migration; running this on a fresh DB after
-- that point must be a no-op).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BrokerCompany') THEN
    INSERT INTO "CompanyChannelPartner" ("id", "channelPartnerId", "companyId", "status", "invitedAt", "acceptedAt", "joinedAt", "revokedAt")
    SELECT "id", "brokerUserId", "companyId", "status"::text::"ChannelPartnerStatus", "invitedAt", "acceptedAt", "acceptedAt", "revokedAt"
    FROM "BrokerCompany"
    ON CONFLICT ("channelPartnerId","companyId") DO NOTHING;
  END IF;
END $$;
