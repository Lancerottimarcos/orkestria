
-- AlterTable
ALTER TABLE "User" ADD COLUMN "cargo" TEXT;
ALTER TABLE "User" ADD COLUMN "setor" TEXT;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,
    "authorId" TEXT,
    "mentionedUserId" TEXT,
    CONSTRAINT "Comment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ColumnAutomation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trigger" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "columnId" TEXT NOT NULL,
    "triggerDemandTypeId" TEXT,
    "assigneeId" TEXT,
    "commentText" TEXT,
    "mentionUserId" TEXT,
    "checklistTitle" TEXT,
    "checklistItems" TEXT,
    "setDemandTypeId" TEXT,
    "moveToColumnId" TEXT,
    CONSTRAINT "ColumnAutomation_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_triggerDemandTypeId_fkey" FOREIGN KEY ("triggerDemandTypeId") REFERENCES "DemandType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_mentionUserId_fkey" FOREIGN KEY ("mentionUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_setDemandTypeId_fkey" FOREIGN KEY ("setDemandTypeId") REFERENCES "DemandType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_moveToColumnId_fkey" FOREIGN KEY ("moveToColumnId") REFERENCES "KanbanColumn" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Checklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "folderId" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "cardId" TEXT,
    CONSTRAINT "Checklist_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Checklist_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Checklist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Checklist_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Checklist" ("clientId", "createdAt", "folderId", "id", "projectId", "title", "updatedAt") SELECT "clientId", "createdAt", "folderId", "id", "projectId", "title", "updatedAt" FROM "Checklist";
DROP TABLE "Checklist";
ALTER TABLE "new_Checklist" RENAME TO "Checklist";
CREATE INDEX "Checklist_folderId_idx" ON "Checklist"("folderId");
CREATE INDEX "Checklist_clientId_idx" ON "Checklist"("clientId");
CREATE INDEX "Checklist_projectId_idx" ON "Checklist"("projectId");
CREATE INDEX "Checklist_cardId_idx" ON "Checklist"("cardId");
CREATE TABLE "new_KanbanCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "urgentAlerted" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "columnId" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "assigneeId" TEXT,
    "postId" TEXT,
    "demandTypeId" TEXT,
    CONSTRAINT "KanbanCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_demandTypeId_fkey" FOREIGN KEY ("demandTypeId") REFERENCES "DemandType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KanbanCard" ("assigneeId", "clientId", "columnId", "createdAt", "demandTypeId", "description", "dueDate", "id", "position", "postId", "priority", "projectId", "title", "updatedAt") SELECT "assigneeId", "clientId", "columnId", "createdAt", "demandTypeId", "description", "dueDate", "id", "position", "postId", "priority", "projectId", "title", "updatedAt" FROM "KanbanCard";
DROP TABLE "KanbanCard";
ALTER TABLE "new_KanbanCard" RENAME TO "KanbanCard";
CREATE INDEX "KanbanCard_columnId_position_idx" ON "KanbanCard"("columnId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Comment_cardId_idx" ON "Comment"("cardId");

-- CreateIndex
CREATE INDEX "ColumnAutomation_columnId_idx" ON "ColumnAutomation"("columnId");

