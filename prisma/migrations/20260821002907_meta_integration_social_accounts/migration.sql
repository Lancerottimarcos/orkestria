-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "externalPageId" TEXT,
    "name" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastError" TEXT,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "connectedById" TEXT,
    CONSTRAINT "SocialAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SocialAccount_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KanbanCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "archivedAt" DATETIME,
    "scheduledNetwork" TEXT,
    "scheduledAt" DATETIME,
    "publishStatus" TEXT,
    "publishError" TEXT,
    "externalPostId" TEXT,
    "publishedAt" DATETIME,
    "urgentAlerted" BOOLEAN NOT NULL DEFAULT false,
    "estimatedHours" REAL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "columnId" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "assigneeId" TEXT,
    "postId" TEXT,
    "demandTypeId" TEXT,
    "socialAccountId" TEXT,
    CONSTRAINT "KanbanCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_demandTypeId_fkey" FOREIGN KEY ("demandTypeId") REFERENCES "DemandType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KanbanCard" ("archivedAt", "assigneeId", "clientId", "columnId", "completedAt", "createdAt", "demandTypeId", "description", "dueDate", "estimatedHours", "id", "position", "postId", "priority", "projectId", "scheduledAt", "scheduledNetwork", "title", "updatedAt", "urgentAlerted") SELECT "archivedAt", "assigneeId", "clientId", "columnId", "completedAt", "createdAt", "demandTypeId", "description", "dueDate", "estimatedHours", "id", "position", "postId", "priority", "projectId", "scheduledAt", "scheduledNetwork", "title", "updatedAt", "urgentAlerted" FROM "KanbanCard";
DROP TABLE "KanbanCard";
ALTER TABLE "new_KanbanCard" RENAME TO "KanbanCard";
CREATE INDEX "KanbanCard_columnId_position_idx" ON "KanbanCard"("columnId", "position");
CREATE INDEX "KanbanCard_socialAccountId_idx" ON "KanbanCard"("socialAccountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SocialAccount_clientId_idx" ON "SocialAccount"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_clientId_platform_key" ON "SocialAccount"("clientId", "platform");

-- TikTok saiu da jogada: qualquer demanda agendada pra TikTok volta a "não agendada"
-- em vez de ficar com um valor de rede que não existe mais.
UPDATE "KanbanCard" SET "scheduledNetwork" = NULL, "scheduledAt" = NULL
WHERE "scheduledNetwork" = 'TIKTOK';
