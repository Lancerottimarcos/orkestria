-- AlterTable
ALTER TABLE "User" ADD COLUMN "moduleAccess" TEXT;

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
    "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalEmail" TEXT,
    "portalPasswordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("billingDay", "contactName", "createdAt", "email", "id", "monthlyValue", "name", "notes", "phone", "startDate", "status", "updatedAt") SELECT "billingDay", "contactName", "createdAt", "email", "id", "monthlyValue", "name", "notes", "phone", "startDate", "status", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_portalEmail_key" ON "Client"("portalEmail");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
