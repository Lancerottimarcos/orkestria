-- AlterTable
ALTER TABLE "SocialMetricSnapshot" ADD COLUMN "comments" INTEGER;
ALTER TABLE "SocialMetricSnapshot" ADD COLUMN "impressions" INTEGER;
ALTER TABLE "SocialMetricSnapshot" ADD COLUMN "likes" INTEGER;
ALTER TABLE "SocialMetricSnapshot" ADD COLUMN "profileLinkTaps" INTEGER;
ALTER TABLE "SocialMetricSnapshot" ADD COLUMN "saves" INTEGER;
ALTER TABLE "SocialMetricSnapshot" ADD COLUMN "shares" INTEGER;
ALTER TABLE "SocialMetricSnapshot" ADD COLUMN "totalInteractions" INTEGER;

-- CreateTable
CREATE TABLE "PostMetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "impressions" INTEGER,
    "reach" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "videoViews" INTEGER,
    "raw" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kanbanCardId" TEXT NOT NULL,
    CONSTRAINT "PostMetricSnapshot_kanbanCardId_fkey" FOREIGN KEY ("kanbanCardId") REFERENCES "KanbanCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PostMetricSnapshot_kanbanCardId_idx" ON "PostMetricSnapshot"("kanbanCardId");

-- CreateIndex
CREATE UNIQUE INDEX "PostMetricSnapshot_kanbanCardId_date_key" ON "PostMetricSnapshot"("kanbanCardId", "date");
