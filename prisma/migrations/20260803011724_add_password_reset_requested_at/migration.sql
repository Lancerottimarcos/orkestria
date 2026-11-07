-- AlterTable
ALTER TABLE "Client" ADD COLUMN "passwordResetRequestedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordResetRequestedAt" DATETIME;
