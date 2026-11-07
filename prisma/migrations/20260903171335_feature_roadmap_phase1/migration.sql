-- AlterTable
ALTER TABLE "ColumnAutomation" ADD COLUMN "triggerThresholdDays" INTEGER;

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "primaryColor" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "category" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "externalChargeId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "paymentLink" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clientAccess" TEXT;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "apiKeyEnc" TEXT,
    "model" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "AiConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "apiKeyEnc" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "EmailConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'asaas',
    "apiKeyEnc" TEXT,
    "sandbox" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "PaymentConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumberId" TEXT,
    "accessTokenEnc" TEXT,
    "verifyToken" TEXT,
    "appSecretEnc" TEXT,
    "displayName" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "WhatsAppConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "contactName" TEXT,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,
    CONSTRAINT "WhatsAppConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "text" TEXT,
    "mediaUrl" TEXT,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    "sentByUserId" TEXT,
    CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WhatsAppMessage_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "token" TEXT NOT NULL,
    "isNpsTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT,
    "createdById" TEXT,
    CONSTRAINT "CustomForm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CustomForm" ("active", "clientId", "createdAt", "createdById", "description", "id", "title", "token", "updatedAt") SELECT "active", "clientId", "createdAt", "createdById", "description", "id", "title", "token", "updatedAt" FROM "CustomForm";
DROP TABLE "CustomForm";
ALTER TABLE "new_CustomForm" RENAME TO "CustomForm";
CREATE UNIQUE INDEX "CustomForm_token_key" ON "CustomForm"("token");
CREATE INDEX "CustomForm_clientId_idx" ON "CustomForm"("clientId");
CREATE TABLE "new_TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minutes" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TimeEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TimeEntry" ("cardId", "createdAt", "date", "id", "minutes", "note", "userId") SELECT "cardId", "createdAt", "date", "id", "minutes", "note", "userId" FROM "TimeEntry";
DROP TABLE "TimeEntry";
ALTER TABLE "new_TimeEntry" RENAME TO "TimeEntry";
CREATE INDEX "TimeEntry_cardId_idx" ON "TimeEntry"("cardId");
CREATE INDEX "TimeEntry_userId_date_idx" ON "TimeEntry"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_phoneNumber_key" ON "WhatsAppConversation"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_clientId_idx" ON "WhatsAppConversation"("clientId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationId_createdAt_idx" ON "WhatsAppMessage"("conversationId", "createdAt");
