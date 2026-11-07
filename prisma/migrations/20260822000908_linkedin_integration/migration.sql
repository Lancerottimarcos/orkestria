-- CreateTable
CREATE TABLE "LinkedInAppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "LinkedInAppConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
