-- CreateTable
CREATE TABLE "ClientCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "username" TEXT,
    "secretEnc" TEXT NOT NULL,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "ClientCredential_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER,
    "maxScrollPercent" INTEGER,
    "proposalId" TEXT NOT NULL,
    CONSTRAINT "ProposalView_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SalesProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesProposalInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "value" REAL NOT NULL,
    "proposalId" TEXT NOT NULL,
    CONSTRAINT "SalesProposalInstallment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SalesProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minutes" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TimeEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BoardTemplateColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,
    CONSTRAINT "BoardTemplateColumn_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BoardTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardTemplateCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "columnId" TEXT NOT NULL,
    CONSTRAINT "BoardTemplateCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BoardTemplateColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContractTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL,
    "watermarkUrl" TEXT,
    "headerUrl" TEXT,
    "footerUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ContractTemplate" ("bodyJson", "createdAt", "footerUrl", "headerUrl", "id", "name", "updatedAt", "watermarkUrl") SELECT "bodyJson", "createdAt", "footerUrl", "headerUrl", "id", "name", "updatedAt", "watermarkUrl" FROM "ContractTemplate";
DROP TABLE "ContractTemplate";
ALTER TABLE "new_ContractTemplate" RENAME TO "ContractTemplate";
CREATE TABLE "new_ContractedService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "scope" TEXT,
    "value" REAL NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATETIME NOT NULL,
    "renewalDate" DATETIME,
    "contractUrl" TEXT,
    "contractName" TEXT,
    "signedAt" DATETIME,
    "signerName" TEXT,
    "signerDocument" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalId" TEXT,
    CONSTRAINT "ContractedService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContractedService_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SalesProposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ContractedService" ("clientId", "contractName", "contractUrl", "createdAt", "id", "name", "period", "renewalDate", "scope", "startDate", "updatedAt", "value") SELECT "clientId", "contractName", "contractUrl", "createdAt", "id", "name", "period", "renewalDate", "scope", "startDate", "updatedAt", "value" FROM "ContractedService";
DROP TABLE "ContractedService";
ALTER TABLE "new_ContractedService" RENAME TO "ContractedService";
CREATE INDEX "ContractedService_clientId_idx" ON "ContractedService"("clientId");
CREATE INDEX "ContractedService_proposalId_idx" ON "ContractedService"("proposalId");
CREATE TABLE "new_SalesProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contactName" TEXT,
    "notes" TEXT,
    "validUntil" DATETIME,
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
    "clientId" TEXT,
    "opportunityId" TEXT,
    "createdById" TEXT,
    CONSTRAINT "SalesProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesProposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "SalesOpportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesProposal" ("clientId", "contactName", "createdAt", "createdById", "id", "notes", "opportunityId", "status", "title", "token", "updatedAt", "validUntil") SELECT "clientId", "contactName", "createdAt", "createdById", "id", "notes", "opportunityId", "status", "title", "token", "updatedAt", "validUntil" FROM "SalesProposal";
DROP TABLE "SalesProposal";
ALTER TABLE "new_SalesProposal" RENAME TO "SalesProposal";
CREATE UNIQUE INDEX "SalesProposal_token_key" ON "SalesProposal"("token");
CREATE INDEX "SalesProposal_clientId_idx" ON "SalesProposal"("clientId");
CREATE INDEX "SalesProposal_opportunityId_idx" ON "SalesProposal"("opportunityId");
CREATE TABLE "new_SalesProposalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitValue" REAL NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "billingType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "proposalId" TEXT NOT NULL,
    CONSTRAINT "SalesProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SalesProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SalesProposalItem" ("description", "id", "position", "proposalId", "quantity", "unitValue") SELECT "description", "id", "position", "proposalId", "quantity", "unitValue" FROM "SalesProposalItem";
DROP TABLE "SalesProposalItem";
ALTER TABLE "new_SalesProposalItem" RENAME TO "SalesProposalItem";
CREATE INDEX "SalesProposalItem_proposalId_idx" ON "SalesProposalItem"("proposalId");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "recurrenceKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT,
    "serviceId" TEXT,
    "teamMemberId" TEXT,
    "contractedServiceId" TEXT,
    CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_contractedServiceId_fkey" FOREIGN KEY ("contractedServiceId") REFERENCES "ContractedService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "clientId", "createdAt", "description", "dueDate", "id", "paidDate", "recurrenceKey", "serviceId", "source", "status", "teamMemberId", "type", "updatedAt") SELECT "amount", "clientId", "createdAt", "description", "dueDate", "id", "paidDate", "recurrenceKey", "serviceId", "source", "status", "teamMemberId", "type", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_recurrenceKey_key" ON "Transaction"("recurrenceKey");
CREATE INDEX "Transaction_type_status_idx" ON "Transaction"("type", "status");
CREATE INDEX "Transaction_dueDate_idx" ON "Transaction"("dueDate");
CREATE INDEX "Transaction_contractedServiceId_idx" ON "Transaction"("contractedServiceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ClientCredential_clientId_idx" ON "ClientCredential"("clientId");

-- CreateIndex
CREATE INDEX "ProposalView_proposalId_idx" ON "ProposalView"("proposalId");

-- CreateIndex
CREATE INDEX "SalesProposalInstallment_proposalId_idx" ON "SalesProposalInstallment"("proposalId");

-- CreateIndex
CREATE INDEX "TimeEntry_cardId_idx" ON "TimeEntry"("cardId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_date_idx" ON "TimeEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "BoardTemplateColumn_templateId_idx" ON "BoardTemplateColumn"("templateId");

-- CreateIndex
CREATE INDEX "BoardTemplateCard_columnId_idx" ON "BoardTemplateCard"("columnId");
