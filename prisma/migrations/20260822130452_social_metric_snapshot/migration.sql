-- CreateTable
CREATE TABLE "SocialMetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "followers" INTEGER,
    "mediaCount" INTEGER,
    "reach" INTEGER,
    "profileViews" INTEGER,
    "engagedAccounts" INTEGER,
    "raw" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "socialAccountId" TEXT NOT NULL,
    CONSTRAINT "SocialMetricSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SocialMetricSnapshot_socialAccountId_idx" ON "SocialMetricSnapshot"("socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMetricSnapshot_socialAccountId_date_key" ON "SocialMetricSnapshot"("socialAccountId", "date");
