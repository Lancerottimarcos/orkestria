-- AlterTable
ALTER TABLE "ChatChannel" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "ChatChannel" ADD COLUMN "color" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatChannelMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" DATETIME,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ChatChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChatChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatChannelMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChatChannelMember" ("channelId", "createdAt", "id", "userId") SELECT "channelId", "createdAt", "id", "userId" FROM "ChatChannelMember";
DROP TABLE "ChatChannelMember";
ALTER TABLE "new_ChatChannelMember" RENAME TO "ChatChannelMember";
CREATE UNIQUE INDEX "ChatChannelMember_channelId_userId_key" ON "ChatChannelMember"("channelId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
