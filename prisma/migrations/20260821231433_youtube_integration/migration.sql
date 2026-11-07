-- CreateTable
CREATE TABLE "YouTubeAppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "YouTubeAppConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
