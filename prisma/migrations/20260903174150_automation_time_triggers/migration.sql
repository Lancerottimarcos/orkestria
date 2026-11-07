-- CreateTable
CREATE TABLE "ColumnAutomationFired" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "automationId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    CONSTRAINT "ColumnAutomationFired_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "ColumnAutomation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColumnAutomationFired_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ColumnAutomationFired_automationId_cardId_key" ON "ColumnAutomationFired"("automationId", "cardId");
