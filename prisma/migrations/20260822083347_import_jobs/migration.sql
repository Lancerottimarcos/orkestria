-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceBoardId" TEXT NOT NULL,
    "sourceBoardName" TEXT NOT NULL,
    "tokenEnc" TEXT,
    "totalCards" INTEGER NOT NULL DEFAULT 0,
    "importedCards" INTEGER NOT NULL DEFAULT 0,
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

-- CreateIndex
CREATE INDEX "ImportJob_targetBoardId_idx" ON "ImportJob"("targetBoardId");

-- CreateIndex
CREATE INDEX "ImportJob_clientId_idx" ON "ImportJob"("clientId");
