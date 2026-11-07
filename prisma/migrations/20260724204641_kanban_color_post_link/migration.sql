-- AlterTable
ALTER TABLE "KanbanColumn" ADD COLUMN "color" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "scheduledDate" DATETIME;

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
    CONSTRAINT "KanbanCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanbanCard_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KanbanCard" ("assigneeId", "clientId", "columnId", "createdAt", "description", "dueDate", "id", "position", "priority", "projectId", "title", "updatedAt") SELECT "assigneeId", "clientId", "columnId", "createdAt", "description", "dueDate", "id", "position", "priority", "projectId", "title", "updatedAt" FROM "KanbanCard";
DROP TABLE "KanbanCard";
ALTER TABLE "new_KanbanCard" RENAME TO "KanbanCard";
CREATE INDEX "KanbanCard_columnId_position_idx" ON "KanbanCard"("columnId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
