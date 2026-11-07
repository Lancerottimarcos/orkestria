/*
  Warnings:

  - You are about to drop the column `contractName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `contractUrl` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContractedService" ADD COLUMN "contractName" TEXT;
ALTER TABLE "ContractedService" ADD COLUMN "contractUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "monthlyValue" REAL NOT NULL DEFAULT 0,
    "billingDay" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "coverColor" TEXT,
    "icon" TEXT,
    "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalEmail" TEXT,
    "portalPasswordHash" TEXT,
    "portalSlug" TEXT,
    "passwordResetRequestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("avatarUrl", "billingDay", "contactName", "coverColor", "coverUrl", "createdAt", "email", "icon", "id", "monthlyValue", "name", "notes", "passwordResetRequestedAt", "phone", "portalEmail", "portalEnabled", "portalPasswordHash", "portalSlug", "startDate", "status", "updatedAt") SELECT "avatarUrl", "billingDay", "contactName", "coverColor", "coverUrl", "createdAt", "email", "icon", "id", "monthlyValue", "name", "notes", "passwordResetRequestedAt", "phone", "portalEmail", "portalEnabled", "portalPasswordHash", "portalSlug", "startDate", "status", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_portalEmail_key" ON "Client"("portalEmail");
CREATE UNIQUE INDEX "Client_portalSlug_key" ON "Client"("portalSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
