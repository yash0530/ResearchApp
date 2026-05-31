-- Add prompt archiving and structured Signal Desk v2 parse rows.

ALTER TABLE "PromptTemplate" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ParsedVerdict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "ticker" TEXT,
    "themeSlug" TEXT,
    "stance" TEXT NOT NULL,
    "priority" INTEGER,
    "horizon" TEXT,
    "rationale" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedVerdict_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ParsedQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ticker" TEXT,
    "themeSlug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedQuestion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PromptTemplate_isArchived_idx" ON "PromptTemplate"("isArchived");
CREATE INDEX "ParsedVerdict_ticker_idx" ON "ParsedVerdict"("ticker");
CREATE INDEX "ParsedVerdict_themeSlug_idx" ON "ParsedVerdict"("themeSlug");
CREATE INDEX "ParsedVerdict_stance_idx" ON "ParsedVerdict"("stance");
CREATE INDEX "ParsedQuestion_ticker_idx" ON "ParsedQuestion"("ticker");
CREATE INDEX "ParsedQuestion_themeSlug_idx" ON "ParsedQuestion"("themeSlug");
