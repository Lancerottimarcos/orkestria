-- CreateTable
CREATE TABLE "SalesStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalesOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "monthlyValue" REAL,
    "setupValue" REAL,
    "source" TEXT,
    "notes" TEXT,
    "expectedCloseDate" DATETIME,
    "closedAt" DATETIME,
    "lostReason" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stageId" TEXT NOT NULL,
    "responsibleId" TEXT,
    CONSTRAINT "SalesOpportunity_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "SalesStage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesOpportunity_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SalesOpportunity_stageId_idx" ON "SalesOpportunity"("stageId");

-- CreateIndex
CREATE INDEX "SalesOpportunity_responsibleId_idx" ON "SalesOpportunity"("responsibleId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesGoal_year_month_key" ON "SalesGoal"("year", "month");
