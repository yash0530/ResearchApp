import "dotenv/config";

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dbPath = resolveSqlitePath(process.env.DATABASE_URL || "file:./dev.db");
const migrationPath = path.resolve("prisma/migrations/20260531000000_init/migration.sql");

mkdirSync(path.dirname(dbPath), { recursive: true });

if (existsSync(dbPath) && hasTable(dbPath, "Theme")) {
  console.log(`Database already initialized at ${dbPath}`);
  process.exit(0);
}

const sql = readFileSync(migrationPath, "utf8");
execFileSync("sqlite3", [dbPath], {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
});
console.log(`Applied migration SQL to ${dbPath}`);

function resolveSqlitePath(url: string) {
  const raw = url.replace(/^file:/, "");
  if (path.isAbsolute(raw)) return raw;
  return path.resolve("prisma", raw);
}

function hasTable(db: string, table: string) {
  try {
    const out = execFileSync("sqlite3", [db, `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`], {
      encoding: "utf8",
    });
    return out.trim() === table;
  } catch {
    return false;
  }
}
