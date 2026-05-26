-- Allow Channel Partners to capture leads in a private pool before
-- attaching them to any company.
ALTER TABLE "Lead" ALTER COLUMN "companyId" DROP NOT NULL;
