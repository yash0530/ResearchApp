import YahooFinance from "yahoo-finance2";
import { prisma } from "./prisma";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

const QUOTE_TTL_MS = 15 * 60 * 1000;
const FUNDAMENTAL_TTL_MS = 4 * 60 * 60 * 1000;
const QUARTER_TTL_MS = 24 * 60 * 60 * 1000;

export type SymbolValidation = {
  symbol: string;
  companyName?: string;
  dataStatus: "VERIFIED" | "UNVERIFIED";
};

export async function validateSymbol(symbol: string): Promise<SymbolValidation> {
  try {
    const quote = (await yahooFinance.quote(symbol)) as Record<string, unknown>;
    const name = stringValue(quote.shortName) || stringValue(quote.longName);
    const price = numberValue(quote.regularMarketPrice);
    if (!name && !price) {
      return { symbol, dataStatus: "UNVERIFIED" };
    }
    return { symbol, companyName: name, dataStatus: "VERIFIED" };
  } catch {
    return { symbol, dataStatus: "UNVERIFIED" };
  }
}

export async function ensureMarketData(symbols: string[]) {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))).slice(0, 12);
  for (const symbol of unique) {
    const ticker = await prisma.ticker.findUnique({ where: { symbol } });
    if (!ticker) continue;

    const latestSnapshot = await prisma.tickerMetricSnapshot.findFirst({
      where: { tickerId: ticker.id },
      orderBy: { asOf: "desc" },
    });
    const snapshotFresh =
      latestSnapshot && Date.now() - latestSnapshot.asOf.getTime() < Math.min(QUOTE_TTL_MS, FUNDAMENTAL_TTL_MS);

    if (!snapshotFresh) {
      await refreshMetricSnapshot(ticker.id, symbol);
    }

    const latestQuarter = await prisma.financialQuarter.findFirst({
      where: { tickerId: ticker.id },
      orderBy: { asOf: "desc" },
    });
    const quartersFresh = latestQuarter && Date.now() - latestQuarter.asOf.getTime() < QUARTER_TTL_MS;
    if (!quartersFresh) {
      await refreshFinancialQuarters(ticker.id, symbol);
    }
  }
}

async function refreshMetricSnapshot(tickerId: string, symbol: string) {
  try {
    const [quote, summary, history] = await Promise.all([
      safeQuote(symbol),
      safeSummary(symbol),
      safeHistory(symbol),
    ]);
    const price = numberValue(quote?.regularMarketPrice) ?? nestedNumber(summary, "price", "regularMarketPrice");
    const returns = calculateReturns(history, price);

    await prisma.tickerMetricSnapshot.create({
      data: {
        tickerId,
        symbol,
        price,
        marketCap:
          numberValue(quote?.marketCap) ??
          nestedNumber(summary, "price", "marketCap") ??
          nestedNumber(summary, "summaryDetail", "marketCap"),
        week52High:
          numberValue(quote?.fiftyTwoWeekHigh) ?? nestedNumber(summary, "summaryDetail", "fiftyTwoWeekHigh"),
        week52Low:
          numberValue(quote?.fiftyTwoWeekLow) ?? nestedNumber(summary, "summaryDetail", "fiftyTwoWeekLow"),
        forwardPe:
          numberValue(quote?.forwardPE) ??
          nestedNumber(summary, "summaryDetail", "forwardPE") ??
          nestedNumber(summary, "defaultKeyStatistics", "forwardPE"),
        trailingPe:
          numberValue(quote?.trailingPE) ??
          nestedNumber(summary, "summaryDetail", "trailingPE") ??
          nestedNumber(summary, "defaultKeyStatistics", "trailingPE"),
        analystMeanTarget: nestedNumber(summary, "financialData", "targetMeanPrice"),
        ytdReturnPct: returns.ytd,
        oneMonthReturnPct: returns.oneMonth,
        threeMonthReturnPct: returns.threeMonth,
        sixMonthReturnPct: returns.sixMonth,
        oneYearReturnPct: returns.oneYear,
      },
    });
  } catch {
    // Market context is helpful, not critical. Keep prompt flows alive.
  }
}

async function refreshFinancialQuarters(tickerId: string, symbol: string) {
  try {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 3);
    const rows = (await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1,
      type: "quarterly",
      module: "all",
      merge: true,
    })) as Array<Record<string, unknown>>;

    const quarters = rows
      .filter((row) => row.date)
      .sort((a, b) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime())
      .slice(0, 8);

    for (const row of quarters) {
      const date = new Date(String(row.date));
      if (Number.isNaN(date.getTime())) continue;
      const revenue = numberValue(row.totalRevenue) ?? numberValue(row.quarterlyTotalRevenue);
      const grossProfit = numberValue(row.grossProfit) ?? numberValue(row.quarterlyGrossProfit);
      const operatingIncome = numberValue(row.operatingIncome) ?? numberValue(row.quarterlyOperatingIncome);
      const netIncome = numberValue(row.netIncome) ?? numberValue(row.quarterlyNetIncome);
      const fcf = numberValue(row.freeCashFlow) ?? numberValue(row.quarterlyFreeCashFlow);
      const capex = numberValue(row.capitalExpenditure) ?? numberValue(row.quarterlyCapitalExpenditure);
      const quarter = quarterLabel(date);
      await prisma.financialQuarter.upsert({
        where: { tickerId_quarter: { tickerId, quarter } },
        create: {
          tickerId,
          symbol,
          quarter,
          periodEnd: date,
          revenue,
          grossProfit,
          operatingIncome,
          netIncome,
          fcf,
          capex,
          grossMargin: revenue && grossProfit ? (grossProfit / revenue) * 100 : null,
        },
        update: {
          periodEnd: date,
          revenue,
          grossProfit,
          operatingIncome,
          netIncome,
          fcf,
          capex,
          grossMargin: revenue && grossProfit ? (grossProfit / revenue) * 100 : null,
          asOf: new Date(),
        },
      });
    }
  } catch {
    // Some tickers and ADRs have sparse statements. Do not block research.
  }
}

async function safeQuote(symbol: string) {
  try {
    return (await yahooFinance.quote(symbol)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function safeSummary(symbol: string) {
  try {
    return (await yahooFinance.quoteSummary(symbol, {
      modules: ["price", "summaryDetail", "financialData", "defaultKeyStatistics"],
    })) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function safeHistory(symbol: string) {
  try {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 1);
    const rows = (await yahooFinance.historical(symbol, {
      period1,
      period2: new Date(),
      interval: "1d",
    })) as Array<Record<string, unknown>>;
    return rows
      .filter((row) => row.date && numberValue(row.close))
      .sort((a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime());
  } catch {
    return [];
  }
}

function calculateReturns(history: Array<Record<string, unknown>>, currentPrice?: number | null) {
  const latest = currentPrice ?? numberValue(history.at(-1)?.close);
  if (!latest || !history.length) {
    return { ytd: null, oneMonth: null, threeMonth: null, sixMonth: null, oneYear: null };
  }
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const oneMonth = daysAgo(30);
  const threeMonth = daysAgo(90);
  const sixMonth = daysAgo(182);
  const oneYear = daysAgo(365);

  return {
    ytd: returnFrom(history, yearStart, latest),
    oneMonth: returnFrom(history, oneMonth, latest),
    threeMonth: returnFrom(history, threeMonth, latest),
    sixMonth: returnFrom(history, sixMonth, latest),
    oneYear: returnFrom(history, oneYear, latest),
  };
}

function returnFrom(history: Array<Record<string, unknown>>, targetDate: Date, latest: number) {
  const row = history.find((item) => new Date(String(item.date)).getTime() >= targetDate.getTime()) ?? history[0];
  const start = numberValue(row?.close);
  if (!start) return null;
  return ((latest - start) / start) * 100;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function quarterLabel(date: Date) {
  return `${date.getFullYear()}Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "raw" in value) {
    return numberValue((value as { raw?: unknown }).raw);
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/[$,%]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function nestedNumber(obj: Record<string, unknown> | null, key: string, nestedKey: string) {
  if (!obj) return null;
  const child = obj[key];
  if (!child || typeof child !== "object") return null;
  return numberValue((child as Record<string, unknown>)[nestedKey]);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
