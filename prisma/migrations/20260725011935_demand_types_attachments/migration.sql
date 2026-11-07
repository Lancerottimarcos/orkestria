-- CreateTable
CREATE TABLE "DemandType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT,
    "postId" TEXT,
    CONSTRAINT "Attachment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing Post.imageUrl values into Attachment rows before dropping the column
INSERT INTO "Attachment" ("id", "url", "type", "position", "status", "feedback", "reviewedAt", "createdAt", "postId")
SELECT 'legacy_' || lower(hex(randomblob(12))), "imageUrl", 'IMAGE', 0, "status", "feedback", "reviewedAt", "createdAt", "id"
FROM "Post";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KanbanCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
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
INSERT INTO "new_KanbanCard" ("assigneeId", "clientId", "columnId", "createdAt", "description", "dueDate", "id", "position", "postId", "priority", "projectId", "title", "updatedAt") SELECT "assigneeId", "clientId", "columnId", "createdAt", "description", "dueDate", "id", "position", "postId", "priority", "projectId", "title", "updatedAt" FROM "KanbanCard";
DROP TABLE "KanbanCard";
ALTER TABLE "new_KanbanCard" RENAME TO "KanbanCard";
CREATE INDEX "KanbanCard_columnId_position_idx" ON "KanbanCard"("columnId", "position");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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
INSERT INTO "new_Post" ("caption", "clientId", "createdAt", "feedback", "id", "projectId", "reviewedAt", "scheduledDate", "status", "title", "token", "updatedAt") SELECT "caption", "clientId", "createdAt", "feedback", "id", "projectId", "reviewedAt", "scheduledDate", "status", "title", "token", "updatedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_token_key" ON "Post"("token");
CREATE INDEX "Post_clientId_idx" ON "Post"("clientId");
CREATE INDEX "Post_status_idx" ON "Post"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Attachment_cardId_idx" ON "Attachment"("cardId");

-- CreateIndex
CREATE INDEX "Attachment_postId_idx" ON "Attachment"("postId");
