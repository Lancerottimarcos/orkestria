-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN "refreshTokenEnc" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "refreshTokenExpiresAt" DATETIME;

-- CreateTable
CREATE TABLE "TikTokAppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientKey" TEXT,
    "clientSecretEnc" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "TikTokAppConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
