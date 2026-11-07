-- AlterTable
ALTER TABLE "KanbanCard" ADD COLUMN "estimatedHours" REAL;

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "leadId" TEXT,
    CONSTRAINT "Squad_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "TeamMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SquadMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squadId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    CONSTRAINT "SquadMember_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SquadMember_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "value" REAL,
    "startDate" DATETIME,
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT,
    "squadId" TEXT,
    CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("clientId", "createdAt", "description", "dueDate", "id", "name", "serviceId", "startDate", "status", "updatedAt", "value") SELECT "clientId", "createdAt", "description", "dueDate", "id", "name", "serviceId", "startDate", "status", "updatedAt", "value" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_squadId_idx" ON "Project"("squadId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Squad_leadId_idx" ON "Squad"("leadId");

-- CreateIndex
CREATE INDEX "SquadMember_teamMemberId_idx" ON "SquadMember"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadMember_squadId_teamMemberId_key" ON "SquadMember"("squadId", "teamMemberId");
