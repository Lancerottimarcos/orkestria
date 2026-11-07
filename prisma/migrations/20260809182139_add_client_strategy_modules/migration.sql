-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoUrl" TEXT,
    "name" TEXT,
    "age" TEXT,
    "location" TEXT,
    "occupation" TEXT,
    "incomeLevel" TEXT,
    "painPoints" TEXT,
    "desires" TEXT,
    "goals" TEXT,
    "objections" TEXT,
    "buyingTriggers" TEXT,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Persona_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonaImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "personaId" TEXT NOT NULL,
    CONSTRAINT "PersonaImage_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfileDiagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instagramHandle" TEXT,
    "screenshotUrl" TEXT,
    "audience" TEXT,
    "positioning" TEXT,
    "contentPillars" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "avgLikes" INTEGER,
    "avgComments" INTEGER,
    "avgShares" INTEGER,
    "storyInteraction" TEXT,
    "rating" TEXT,
    "recommendations" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "ProfileDiagnosis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "avatarUrl" TEXT,
    "followers" TEXT,
    "frequency" TEXT,
    "type" TEXT,
    "sells" TEXT,
    "differential" TEXT,
    "niche" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "opportunities" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Competitor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Positioning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoUrl" TEXT,
    "niche" TEXT,
    "archetypePrimary" TEXT,
    "archetypeSecondary" TEXT,
    "essence" TEXT,
    "personalityTraits" TEXT,
    "communicationStyle" TEXT,
    "toneOfVoice" TEXT,
    "toneExample" TEXT,
    "colorPalette" TEXT,
    "typography" TEXT,
    "visualStyle" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Positioning_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_clientId_key" ON "Persona"("clientId");

-- CreateIndex
CREATE INDEX "PersonaImage_personaId_idx" ON "PersonaImage"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileDiagnosis_clientId_key" ON "ProfileDiagnosis"("clientId");

-- CreateIndex
CREATE INDEX "Competitor_clientId_idx" ON "Competitor"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Positioning_clientId_key" ON "Positioning"("clientId");
