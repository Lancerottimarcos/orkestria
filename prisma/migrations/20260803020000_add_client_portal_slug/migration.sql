-- AlterTable
ALTER TABLE "Client" ADD COLUMN "portalSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_portalSlug_key" ON "Client"("portalSlug");
