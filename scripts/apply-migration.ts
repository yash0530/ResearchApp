import "dotenv/config";

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const dbPath = resolveSqlitePath(process.env.DATABASE_URL || "file:./dev.db");
const migrationsDir = path.resolve("prisma/migrations");
const trackingTable = "_SignalDeskMigration";

mkdirSync(path.dirname(dbPath), { recursive: true });
ensureTrackingTable();

for (const migrationName of migrationNames()) {
  if (isRecorded(migrationName)) {
    console.log(`Migration already recorded: ${migrationName}`);
    continue;
  }

  if (looksApplied(migrationName)) {
    recordMigration(migrationName);
    console.log(`Migration already present, recorded: ${migrationName}`);
    continue;
  }

  const migrationPath = path.join(migrationsDir, migrationName, "migration.sql");
  const sql = readFileSync(migrationPath, "utf8");
  execFileSync("sqlite3", [dbPath], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
  recordMigration(migrationName);
  console.log(`Applied migration: ${migrationName}`);
}

console.log(`Database ready at ${dbPath}`);

function migrationNames() {
  return readdirSync(migrationsDir)
    .filter((name) => statSync(path.join(migrationsDir, name)).isDirectory())
    .sort();
}

function resolveSqlitePath(url: string) {
  const raw = url.replace(/^file:/, "");
  if (path.isAbsolute(raw)) return raw;
  return path.resolve("prisma", raw);
}

function ensureTrackingTable() {
  execFileSync("sqlite3", [
    dbPath,
    `CREATE TABLE IF NOT EXISTS "${trackingTable}" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  ]);
}

function isRecorded(name: string) {
  const escaped = sqlString(name);
  const out = execFileSync("sqlite3", [dbPath, `SELECT name FROM "${trackingTable}" WHERE name=${escaped};`], {
    encoding: "utf8",
  });
  return out.trim() === name;
}

function recordMigration(name: string) {
  execFileSync("sqlite3", [dbPath, `INSERT OR IGNORE INTO "${trackingTable}" ("name") VALUES (${sqlString(name)});`]);
}

function looksApplied(name: string) {
  if (name.endsWith("_init")) {
    return existsSync(dbPath) && hasTable("Theme");
  }
  if (name.endsWith("_signal_contract_v2")) {
    return hasColumn("PromptTemplate", "isArchived") && hasTable("ParsedVerdict") && hasTable("ParsedQuestion");
  }
  if (name.endsWith("_finance_grounding")) {
    return hasColumn("TickerMetricSnapshot", "dataSource") && hasColumn("TickerMetricSnapshot", "sector");
  }
  if (name.endsWith("_entry_ignored_lines")) {
    return hasColumn("ResearchEntry", "ignoredLines");
  }
  if (name.endsWith("_day_change_pct")) {
    return hasColumn("TickerMetricSnapshot", "dayChangePct");
  }
  return false;
}

function hasTable(table: string) {
  const out = execFileSync("sqlite3", [dbPath, `SELECT name FROM sqlite_master WHERE type='table' AND name=${sqlString(table)};`], {
    encoding: "utf8",
  });
  return out.trim() === table;
}

function hasColumn(table: string, column: string) {
  try {
    const out = execFileSync("sqlite3", [dbPath, `PRAGMA table_info("${table}");`], { encoding: "utf8" });
    return out
      .split("\n")
      .filter(Boolean)
      .some((line) => line.split("|")[1] === column);
  } catch {
    return false;
  }
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
