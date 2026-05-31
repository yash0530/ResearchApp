# Signal Desk

Signal Desk is a local-first AI infrastructure research workspace. It stores reusable prompts, renders enum-driven prompt runs, opens external research apps with copy-first launch, captures pasted outputs, parses strict `SIGNAL_DESK_DATA` blocks, tracks ticker discoveries, and visualizes claims/risks/targets over time.

## Stack

- Next.js App Router + TypeScript
- Prisma + SQLite
- Tailwind CSS
- Recharts
- lucide-react
- yahoo-finance2 for lightweight cached market context

## Setup

Install dependencies:

```bash
npm install
```

Create the local SQLite database, generate Prisma Client, and seed the curated AI infrastructure universe:

```bash
npm run db:setup
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Core Workflow

1. Go to `/builder`.
2. Pick source app, prompt, themes, tickers, lookback, financial window, and horizon.
3. Render the prompt. Signal Desk creates a run and injects cached local market context.
4. Copy/open Perplexity, Claude, Gemini, ChatGPT, or manual mode.
5. Paste the external output into `/runs`.
6. Signal Desk saves raw output, parses the strict block, creates discoveries for unknown tickers, and updates `/insights`.

## Verification

```bash
npm run lint
npm test
npm run build
```

## Notes

- This app does not call external AI APIs or automate logged-in websites.
- Firm-specific targets like UBS or Morgan Stanley are captured from pasted research via `TARGET` lines.
- Prisma migrate was flaky in this local Node/SQLite environment, so `db:setup` applies the checked-in migration SQL directly and remains idempotent.
