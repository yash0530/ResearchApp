-- Add ignoredLines column to ResearchEntry.
-- Additive — stores JSON-encoded string array of unrecognised parser lines.
-- Nullable-safe: existing rows default to empty array '[]'.

ALTER TABLE "ResearchEntry" ADD COLUMN "ignoredLines" TEXT NOT NULL DEFAULT '[]';
