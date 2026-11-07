-- CreateTable
CREATE TABLE "CredentialRevealLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credentialId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "CredentialRevealLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ClientCredential" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CredentialRevealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CredentialRevealLog_credentialId_idx" ON "CredentialRevealLog"("credentialId");
