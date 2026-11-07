/*
  Warnings:

  - You are about to drop the column `tokenEnc` on the `ImportJob` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceBoardId" TEXT NOT NULL,
    "sourceBoardName" TEXT NOT NULL,
    "totalCards" INTEGER NOT NULL DEFAULT 0,
    "importedCards" INTEGER NOT NULL DEFAULT 0,
    "pendingData" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "targetBoardId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "ImportJob_targetBoardId_fkey" FOREIGN KEY ("targetBoardId") REFERENCES "KanbanBoard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImportJob" ("clientId", "completedAt", "createdAt", "createdById", "errorMessage", "id", "importedCards", "platform", "sourceBoardId", "sourceBoardName", "status", "targetBoardId", "totalCards") SELECT "clientId", "completedAt", "createdAt", "createdById", "errorMessage", "id", "importedCards", "platform", "sourceBoardId", "sourceBoardName", "status", "targetBoardId", "totalCards" FROM "ImportJob";
DROP TABLE "ImportJob";
ALTER TABLE "new_ImportJob" RENAME TO "ImportJob";
CREATE INDEX "ImportJob_targetBoardId_idx" ON "ImportJob"("targetBoardId");
CREATE INDEX "ImportJob_clientId_idx" ON "ImportJob"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
