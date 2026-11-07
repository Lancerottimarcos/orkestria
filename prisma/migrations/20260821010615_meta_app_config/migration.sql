-- CreateTable
CREATE TABLE "MetaAppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT,
    "appSecretEnc" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "MetaAppConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
