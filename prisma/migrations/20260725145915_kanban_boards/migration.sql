-- CreateTable
CREATE TABLE "KanbanBoard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,
    CONSTRAINT "KanbanBoard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Seed a default board so existing columns have somewhere to attach
INSERT INTO "KanbanBoard" ("id", "name", "position", "createdAt", "clientId")
VALUES ('default_board_0000000001', 'Quadro Principal', 0, CURRENT_TIMESTAMP, NULL);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KanbanColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "boardId" TEXT NOT NULL,
    CONSTRAINT "KanbanColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "KanbanBoard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KanbanColumn" ("color", "createdAt", "id", "name", "position", "updatedAt", "boardId")
SELECT "color", "createdAt", "id", "name", "position", "updatedAt", 'default_board_0000000001' FROM "KanbanColumn";
DROP TABLE "KanbanColumn";
ALTER TABLE "new_KanbanColumn" RENAME TO "KanbanColumn";
CREATE INDEX "KanbanColumn_boardId_idx" ON "KanbanColumn"("boardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "KanbanBoard_clientId_idx" ON "KanbanBoard"("clientId");
