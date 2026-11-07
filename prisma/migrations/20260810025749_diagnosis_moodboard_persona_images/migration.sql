/*
  Warnings:

  - You are about to drop the `PersonaImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `screenshotUrl` on the `ProfileDiagnosis` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PersonaImage_personaId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PersonaImage";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Moodboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Moodboard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoodboardImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "moodboardId" TEXT NOT NULL,
    CONSTRAINT "MoodboardImage_moodboardId_fkey" FOREIGN KEY ("moodboardId") REFERENCES "Moodboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProfileDiagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instagramHandle" TEXT,
    "audience" TEXT,
    "positioning" TEXT,
    "contentPillars" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "avgLikes" INTEGER,
    "avgComments" INTEGER,
    "avgShares" INTEGER,
    "storyInteraction" TEXT,
    "rating" TEXT,
    "recommendations" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "ProfileDiagnosis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProfileDiagnosis" ("audience", "avgComments", "avgLikes", "avgShares", "clientId", "contentPillars", "id", "instagramHandle", "positioning", "rating", "recommendations", "storyInteraction", "strengths", "updatedAt", "weaknesses") SELECT "audience", "avgComments", "avgLikes", "avgShares", "clientId", "contentPillars", "id", "instagramHandle", "positioning", "rating", "recommendations", "storyInteraction", "strengths", "updatedAt", "weaknesses" FROM "ProfileDiagnosis";
DROP TABLE "ProfileDiagnosis";
ALTER TABLE "new_ProfileDiagnosis" RENAME TO "ProfileDiagnosis";
CREATE UNIQUE INDEX "ProfileDiagnosis_clientId_key" ON "ProfileDiagnosis"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Moodboard_clientId_key" ON "Moodboard"("clientId");

-- CreateIndex
CREATE INDEX "MoodboardImage_moodboardId_idx" ON "MoodboardImage"("moodboardId");
