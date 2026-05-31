-- Add finance-grounding columns to TickerMetricSnapshot.
-- All columns are additive (nullable or have defaults) — no existing data is affected.

ALTER TABLE "TickerMetricSnapshot" ADD COLUMN "sector" TEXT;
ALTER TABLE "TickerMetricSnapshot" ADD COLUMN "beta" REAL;
ALTER TABLE "TickerMetricSnapshot" ADD COLUMN "sectorMomentumPercentile" REAL;
ALTER TABLE "TickerMetricSnapshot" ADD COLUMN "forwardPeSectorAvg" REAL;
ALTER TABLE "TickerMetricSnapshot" ADD COLUMN "spotlightTags" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "TickerMetricSnapshot" ADD COLUMN "dataSource" TEXT NOT NULL DEFAULT 'yahoo';
