-- CreateTable
CREATE TABLE "ContractedService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "scope" TEXT,
    "value" REAL NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATETIME NOT NULL,
    "renewalDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "ContractedService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "token" TEXT NOT NULL,
    "feedback" TEXT,
    "reviewedAt" DATETIME,
    "scheduledDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "demandTypeId" TEXT,
    CONSTRAINT "Post_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Post_demandTypeId_fkey" FOREIGN KEY ("demandTypeId") REFERENCES "DemandType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("caption", "clientId", "createdAt", "demandTypeId", "feedback", "id", "projectId", "reviewedAt", "scheduledDate", "status", "title", "token", "updatedAt") SELECT "caption", "clientId", "createdAt", "demandTypeId", "feedback", "id", "projectId", "reviewedAt", "scheduledDate", "status", "title", "token", "updatedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_token_key" ON "Post"("token");
CREATE INDEX "Post_clientId_idx" ON "Post"("clientId");
CREATE INDEX "Post_status_idx" ON "Post"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ContractedService_clientId_idx" ON "ContractedService"("clientId");
