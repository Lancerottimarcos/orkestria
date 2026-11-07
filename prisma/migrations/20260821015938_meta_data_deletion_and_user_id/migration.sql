-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN "metaUserId" TEXT;

-- CreateTable
CREATE TABLE "MetaDataDeletionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "confirmationCode" TEXT NOT NULL,
    "metaUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accountsRemoved" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaDataDeletionRequest_confirmationCode_key" ON "MetaDataDeletionRequest"("confirmationCode");

-- CreateIndex
CREATE INDEX "SocialAccount_metaUserId_idx" ON "SocialAccount"("metaUserId");
