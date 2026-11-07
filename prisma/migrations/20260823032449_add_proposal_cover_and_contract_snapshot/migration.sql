-- AlterTable
ALTER TABLE "ContractedService" ADD COLUMN "contractBodyJson" TEXT;
ALTER TABLE "ContractedService" ADD COLUMN "contractVariablesJson" TEXT;

-- AlterTable
ALTER TABLE "SalesProposal" ADD COLUMN "coverImageUrl" TEXT;
