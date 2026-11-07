-- AlterTable
ALTER TABLE "Client" ADD COLUMN "address" TEXT;
ALTER TABLE "Client" ADD COLUMN "document" TEXT;

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "document" TEXT;

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL,
    "watermarkUrl" TEXT,
    "headerUrl" TEXT,
    "footerUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
