-- AlterTable
ALTER TABLE "KeyVisual" ADD COLUMN "colors" TEXT;
ALTER TABLE "KeyVisual" ADD COLUMN "layoutNotes" TEXT;
ALTER TABLE "KeyVisual" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "KeyVisual" ADD COLUMN "primaryFont" TEXT;
ALTER TABLE "KeyVisual" ADD COLUMN "secondaryFont" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeyVisualImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'reference',
    "position" INTEGER NOT NULL DEFAULT 0,
    "keyVisualId" TEXT NOT NULL,
    CONSTRAINT "KeyVisualImage_keyVisualId_fkey" FOREIGN KEY ("keyVisualId") REFERENCES "KeyVisual" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KeyVisualImage" ("id", "keyVisualId", "position", "url") SELECT "id", "keyVisualId", "position", "url" FROM "KeyVisualImage";
DROP TABLE "KeyVisualImage";
ALTER TABLE "new_KeyVisualImage" RENAME TO "KeyVisualImage";
CREATE INDEX "KeyVisualImage_keyVisualId_idx" ON "KeyVisualImage"("keyVisualId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
