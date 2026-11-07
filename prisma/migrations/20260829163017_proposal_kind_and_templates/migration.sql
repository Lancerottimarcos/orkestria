-- CreateTable
CREATE TABLE "ProposalTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL,
    "headerUrl" TEXT,
    "footerUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SalesProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "kind" TEXT NOT NULL DEFAULT 'FULL',
    "contactName" TEXT,
    "notes" TEXT,
    "validUntil" DATETIME,
    "coverImageUrl" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "signerName" TEXT,
    "changeRequestedAt" DATETIME,
    "changeRequestMessage" TEXT,
    "paymentCondition" TEXT NOT NULL DEFAULT 'CASH',
    "installmentCount" INTEGER,
    "setupFee" REAL,
    "paymentMethods" TEXT,
    "proposalBodyJson" TEXT,
    "proposalVariablesJson" TEXT,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "createdById" TEXT,
    "proposalTemplateId" TEXT,
    CONSTRAINT "SalesProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesProposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "SalesOpportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesProposal_proposalTemplateId_fkey" FOREIGN KEY ("proposalTemplateId") REFERENCES "ProposalTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesProposal" ("acceptedAt", "changeRequestMessage", "changeRequestedAt", "clientId", "contactName", "coverImageUrl", "createdAt", "createdById", "id", "installmentCount", "notes", "opportunityId", "paymentCondition", "paymentMethods", "setupFee", "signerName", "status", "title", "token", "updatedAt", "validUntil") SELECT "acceptedAt", "changeRequestMessage", "changeRequestedAt", "clientId", "contactName", "coverImageUrl", "createdAt", "createdById", "id", "installmentCount", "notes", "opportunityId", "paymentCondition", "paymentMethods", "setupFee", "signerName", "status", "title", "token", "updatedAt", "validUntil" FROM "SalesProposal";
DROP TABLE "SalesProposal";
ALTER TABLE "new_SalesProposal" RENAME TO "SalesProposal";
CREATE UNIQUE INDEX "SalesProposal_token_key" ON "SalesProposal"("token");
CREATE INDEX "SalesProposal_clientId_idx" ON "SalesProposal"("clientId");
CREATE INDEX "SalesProposal_opportunityId_idx" ON "SalesProposal"("opportunityId");
CREATE INDEX "SalesProposal_proposalTemplateId_idx" ON "SalesProposal"("proposalTemplateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
