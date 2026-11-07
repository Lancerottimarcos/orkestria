-- CreateTable
CREATE TABLE "PositioningImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "positioningId" TEXT NOT NULL,
    CONSTRAINT "PositioningImage_positioningId_fkey" FOREIGN KEY ("positioningId") REFERENCES "Positioning" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeyVisual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guidelines" TEXT,
    "doNotes" TEXT,
    "dontNotes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "KeyVisual_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeyVisualImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "keyVisualId" TEXT NOT NULL,
    CONSTRAINT "KeyVisualImage_keyVisualId_fkey" FOREIGN KEY ("keyVisualId") REFERENCES "KeyVisual" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PositioningImage_positioningId_idx" ON "PositioningImage"("positioningId");

-- CreateIndex
CREATE UNIQUE INDEX "KeyVisual_clientId_key" ON "KeyVisual"("clientId");

-- CreateIndex
CREATE INDEX "KeyVisualImage_keyVisualId_idx" ON "KeyVisualImage"("keyVisualId");
