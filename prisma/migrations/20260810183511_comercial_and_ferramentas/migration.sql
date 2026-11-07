-- CreateTable
CREATE TABLE "SalesProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contactName" TEXT,
    "notes" TEXT,
    "validUntil" DATETIME,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "createdById" TEXT,
    CONSTRAINT "SalesProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesProposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "SalesOpportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesProposalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitValue" REAL NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "proposalId" TEXT NOT NULL,
    CONSTRAINT "SalesProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SalesProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT,
    "createdById" TEXT,
    CONSTRAINT "CustomForm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomFormField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "formId" TEXT NOT NULL,
    CONSTRAINT "CustomFormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CustomForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomFormSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "respondentName" TEXT,
    "respondentEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formId" TEXT NOT NULL,
    CONSTRAINT "CustomFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CustomForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomFormFieldResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    CONSTRAINT "CustomFormFieldResponse_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFormField" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomFormFieldResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CustomFormSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShortLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "ShortLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesProposal_token_key" ON "SalesProposal"("token");

-- CreateIndex
CREATE INDEX "SalesProposal_clientId_idx" ON "SalesProposal"("clientId");

-- CreateIndex
CREATE INDEX "SalesProposal_opportunityId_idx" ON "SalesProposal"("opportunityId");

-- CreateIndex
CREATE INDEX "SalesProposalItem_proposalId_idx" ON "SalesProposalItem"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomForm_token_key" ON "CustomForm"("token");

-- CreateIndex
CREATE INDEX "CustomForm_clientId_idx" ON "CustomForm"("clientId");

-- CreateIndex
CREATE INDEX "CustomFormField_formId_idx" ON "CustomFormField"("formId");

-- CreateIndex
CREATE INDEX "CustomFormSubmission_formId_idx" ON "CustomFormSubmission"("formId");

-- CreateIndex
CREATE INDEX "CustomFormFieldResponse_fieldId_idx" ON "CustomFormFieldResponse"("fieldId");

-- CreateIndex
CREATE INDEX "CustomFormFieldResponse_submissionId_idx" ON "CustomFormFieldResponse"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortLink_slug_key" ON "ShortLink"("slug");
