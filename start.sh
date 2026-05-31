#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found on PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found on PATH."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -f "prisma/dev.db" ]; then
  echo "Setting up local database..."
  npm run db:setup
else
  echo "Local database found. Regenerating Prisma client..."
  npx prisma generate
fi

echo "Starting Signal Desk at http://localhost:3000"
npm run dev
