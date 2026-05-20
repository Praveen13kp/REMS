-- Integrations module: BYO multi-tenant lead-source credentials + webhook
-- event audit trail. See docs/integrations/01-build-plan.md.

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('META', 'GOOGLE_ADS', 'WEBSITE_FORM', 'JUSTDIAL', 'INDIAMART');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INVALID', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "externalIds" TEXT[],
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastVerifiedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastPolledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "credentialId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "rawPayload" JSONB NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_webhookToken_key" ON "IntegrationCredential"("webhookToken");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_companyId_provider_label_key" ON "IntegrationCredential"("companyId", "provider", "label");

-- CreateIndex
CREATE INDEX "IntegrationCredential_provider_idx" ON "IntegrationCredential"("provider");

-- CreateIndex
CREATE INDEX "IntegrationCredential_status_idx" ON "IntegrationCredential"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalId_key" ON "WebhookEvent"("provider", "externalId");

-- CreateIndex
CREATE INDEX "WebhookEvent_credentialId_receivedAt_idx" ON "WebhookEvent"("credentialId", "receivedAt");

-- AddForeignKey
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
