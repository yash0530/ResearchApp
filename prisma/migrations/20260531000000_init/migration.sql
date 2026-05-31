-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2563eb',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ticker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSeeded" BOOLEAN NOT NULL DEFAULT false,
    "dataStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TickerTheme" (
    "tickerId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "role" TEXT,
    "purity" INTEGER NOT NULL DEFAULT 3,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("tickerId", "themeId"),
    CONSTRAINT "TickerTheme_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TickerTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'AD_HOC',
    "sourceAppHints" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "variableSchema" TEXT NOT NULL DEFAULT '{}',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ResearchRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptTemplateId" TEXT,
    "sourceApp" TEXT NOT NULL DEFAULT 'MANUAL',
    "variableValues" TEXT NOT NULL DEFAULT '{}',
    "renderedPrompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "copiedAt" DATETIME,
    "launchedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchRun_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "PromptTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "title" TEXT NOT NULL,
    "sourceApp" TEXT NOT NULL DEFAULT 'MANUAL',
    "rawOutput" TEXT NOT NULL,
    "summary" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "parseStatus" TEXT NOT NULL DEFAULT 'UNPARSED',
    "parseError" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ticker" TEXT,
    "themeSlug" TEXT,
    "confidence" INTEGER,
    "importance" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedClaim_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ticker" TEXT,
    "themeSlug" TEXT,
    "severity" TEXT,
    "timeframe" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedRisk_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedCatalyst" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ticker" TEXT,
    "themeSlug" TEXT,
    "importance" TEXT,
    "timeframe" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedCatalyst_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedTickerMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "themeSlug" TEXT,
    "sentiment" TEXT,
    "confidence" INTEGER,
    "role" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedTickerMention_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedAnalystTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "firm" TEXT,
    "rating" TEXT,
    "target" REAL,
    "previousTarget" REAL,
    "date" DATETIME,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedAnalystTarget_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedThemeSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "themeSlug" TEXT NOT NULL,
    "cycle" TEXT,
    "crowding" TEXT,
    "confidence" INTEGER,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedThemeSignal_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedWatchItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ticker" TEXT,
    "themeSlug" TEXT,
    "timeframe" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedWatchItem_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResearchEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscoveryCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT,
    "suggestedThemes" TEXT NOT NULL DEFAULT '[]',
    "sourceLine" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedTickerId" TEXT
);

-- CreateTable
CREATE TABLE "TickerMetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tickerId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" REAL,
    "marketCap" REAL,
    "week52High" REAL,
    "week52Low" REAL,
    "forwardPe" REAL,
    "trailingPe" REAL,
    "analystMeanTarget" REAL,
    "ytdReturnPct" REAL,
    "oneMonthReturnPct" REAL,
    "threeMonthReturnPct" REAL,
    "sixMonthReturnPct" REAL,
    "oneYearReturnPct" REAL,
    "asOf" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TickerMetricSnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialQuarter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tickerId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "periodEnd" DATETIME,
    "revenue" REAL,
    "grossProfit" REAL,
    "operatingIncome" REAL,
    "netIncome" REAL,
    "grossMargin" REAL,
    "fcf" REAL,
    "capex" REAL,
    "asOf" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialQuarter_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Ticker_symbol_key" ON "Ticker"("symbol");

-- CreateIndex
CREATE INDEX "TickerTheme_themeId_idx" ON "TickerTheme"("themeId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_slug_key" ON "PromptTemplate"("slug");

-- CreateIndex
CREATE INDEX "ResearchRun_createdAt_idx" ON "ResearchRun"("createdAt");

-- CreateIndex
CREATE INDEX "ResearchRun_sourceApp_idx" ON "ResearchRun"("sourceApp");

-- CreateIndex
CREATE INDEX "ResearchRun_status_idx" ON "ResearchRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchEntry_runId_key" ON "ResearchEntry"("runId");

-- CreateIndex
CREATE INDEX "ResearchEntry_createdAt_idx" ON "ResearchEntry"("createdAt");

-- CreateIndex
CREATE INDEX "ResearchEntry_status_idx" ON "ResearchEntry"("status");

-- CreateIndex
CREATE INDEX "ResearchEntry_deletedAt_idx" ON "ResearchEntry"("deletedAt");

-- CreateIndex
CREATE INDEX "ParsedClaim_ticker_idx" ON "ParsedClaim"("ticker");

-- CreateIndex
CREATE INDEX "ParsedClaim_themeSlug_idx" ON "ParsedClaim"("themeSlug");

-- CreateIndex
CREATE INDEX "ParsedRisk_ticker_idx" ON "ParsedRisk"("ticker");

-- CreateIndex
CREATE INDEX "ParsedRisk_themeSlug_idx" ON "ParsedRisk"("themeSlug");

-- CreateIndex
CREATE INDEX "ParsedCatalyst_ticker_idx" ON "ParsedCatalyst"("ticker");

-- CreateIndex
CREATE INDEX "ParsedCatalyst_themeSlug_idx" ON "ParsedCatalyst"("themeSlug");

-- CreateIndex
CREATE INDEX "ParsedTickerMention_ticker_idx" ON "ParsedTickerMention"("ticker");

-- CreateIndex
CREATE INDEX "ParsedTickerMention_themeSlug_idx" ON "ParsedTickerMention"("themeSlug");

-- CreateIndex
CREATE INDEX "ParsedAnalystTarget_ticker_idx" ON "ParsedAnalystTarget"("ticker");

-- CreateIndex
CREATE INDEX "ParsedAnalystTarget_firm_idx" ON "ParsedAnalystTarget"("firm");

-- CreateIndex
CREATE INDEX "ParsedThemeSignal_themeSlug_idx" ON "ParsedThemeSignal"("themeSlug");

-- CreateIndex
CREATE INDEX "ParsedWatchItem_ticker_idx" ON "ParsedWatchItem"("ticker");

-- CreateIndex
CREATE INDEX "ParsedWatchItem_themeSlug_idx" ON "ParsedWatchItem"("themeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryCandidate_symbol_key" ON "DiscoveryCandidate"("symbol");

-- CreateIndex
CREATE INDEX "TickerMetricSnapshot_symbol_idx" ON "TickerMetricSnapshot"("symbol");

-- CreateIndex
CREATE INDEX "TickerMetricSnapshot_tickerId_asOf_idx" ON "TickerMetricSnapshot"("tickerId", "asOf");

-- CreateIndex
CREATE INDEX "FinancialQuarter_symbol_idx" ON "FinancialQuarter"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialQuarter_tickerId_quarter_key" ON "FinancialQuarter"("tickerId", "quarter");
