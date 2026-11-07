
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ColumnAutomation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trigger" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "columnId" TEXT NOT NULL,
    "cardId" TEXT,
    "triggerDemandTypeId" TEXT,
    "assigneeId" TEXT,
    "commentText" TEXT,
    "mentionUserId" TEXT,
    "checklistTitle" TEXT,
    "checklistItems" TEXT,
    "setDemandTypeId" TEXT,
    "moveToColumnId" TEXT,
    CONSTRAINT "ColumnAutomation_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_triggerDemandTypeId_fkey" FOREIGN KEY ("triggerDemandTypeId") REFERENCES "DemandType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_mentionUserId_fkey" FOREIGN KEY ("mentionUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_setDemandTypeId_fkey" FOREIGN KEY ("setDemandTypeId") REFERENCES "DemandType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomation_moveToColumnId_fkey" FOREIGN KEY ("moveToColumnId") REFERENCES "KanbanColumn" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ColumnAutomation" ("action", "active", "assigneeId", "checklistItems", "checklistTitle", "columnId", "commentText", "createdAt", "id", "mentionUserId", "moveToColumnId", "position", "setDemandTypeId", "trigger", "triggerDemandTypeId") SELECT "action", "active", "assigneeId", "checklistItems", "checklistTitle", "columnId", "commentText", "createdAt", "id", "mentionUserId", "moveToColumnId", "position", "setDemandTypeId", "trigger", "triggerDemandTypeId" FROM "ColumnAutomation";
DROP TABLE "ColumnAutomation";
ALTER TABLE "new_ColumnAutomation" RENAME TO "ColumnAutomation";
CREATE INDEX "ColumnAutomation_columnId_idx" ON "ColumnAutomation"("columnId");
CREATE INDEX "ColumnAutomation_cardId_idx" ON "ColumnAutomation"("cardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

