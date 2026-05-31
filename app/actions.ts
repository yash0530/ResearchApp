"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  Cadence,
  DiscoveryStatus,
  ResearchStatus,
  RunStatus,
  SourceApp,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureMarketData, validateSymbol } from "@/lib/market";
import { refreshSp500 } from "@/lib/finance-client";
import { buildLocalContext, renderPrompt, type BuilderValues, type LocalContextTicker } from "@/lib/prompt-renderer";
import { getLaunchPlan } from "@/lib/launch";
import { parseSignalDeskBlock, cleanTicker } from "@/lib/parser";
import { HORIZONS, FINANCIAL_WINDOWS, LOOKBACKS, SOURCE_APPS } from "@/lib/enums";

/**
 * Force-refresh market data for the given symbols.
 * Optionally triggers an S&P 500 snapshot refresh on the finance server first.
 * Resilient — never throws even if the finance server is down; the Yahoo fallback runs instead.
 */
export async function refreshTickerDataAction(symbols: string[]): Promise<void> {
  // Best-effort: refresh the finance server's S&P 500 snapshot.
  // We don't await the result or let it block; a failed refresh just means
  // we'll use whatever data is already cached on the finance side.
  await refreshSp500().catch(() => {});

  // Force-refresh market data for each symbol (bypasses TTL checks).
  await ensureMarketData(symbols, { force: true });

  revalidatePath("/");
  revalidatePath("/builder");
  revalidatePath("/tickers");
}

const builderSchema = z.object({
  sourceApp: z.enum(SOURCE_APPS),
  promptTemplateId: z.string().min(1),
  themeSlugs: z.array(z.string()).default([]),
  tickers: z.array(z.string()).default([]),
  lookback: z.enum(LOOKBACKS),
  financialWindow: z.enum(FINANCIAL_WINDOWS),
  horizon: z.enum(HORIZONS),
  researchType: z.string().min(1).default("dashboard"),
});

export async function createRenderedRunAction(input: BuilderValues) {
  const values = builderSchema.parse(input);
  const tickers = values.tickers.map((t) => t.toUpperCase()).slice(0, 12);
  await ensureMarketData(tickers);

  const [template, themes, tickerRows] = await Promise.all([
    prisma.promptTemplate.findUniqueOrThrow({ where: { id: values.promptTemplateId } }),
    prisma.theme.findMany({
      where: values.themeSlugs.length ? { slug: { in: values.themeSlugs } } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.ticker.findMany({
      where: tickers.length ? { symbol: { in: tickers } } : undefined,
      include: {
        metricSnapshots: { orderBy: { asOf: "desc" }, take: 1 },
        financials: { orderBy: { periodEnd: "desc" }, take: 8 },
      },
      orderBy: { symbol: "asc" },
    }),
  ]);

  const localContext = buildLocalContext(tickerRows as LocalContextTicker[]);
  const renderedPrompt = renderPrompt({
    body: template.body,
    themes,
    values: { ...values, tickers },
    localContext,
  });

  const run = await prisma.researchRun.create({
    data: {
      promptTemplateId: template.id,
      sourceApp: values.sourceApp as SourceApp,
      variableValues: JSON.stringify({ ...values, tickers }),
      renderedPrompt,
      status: RunStatus.DRAFT,
    },
  });

  revalidatePath("/");
  revalidatePath("/runs");
  return {
    runId: run.id,
    renderedPrompt,
    launchPlan: getLaunchPlan(values.sourceApp, renderedPrompt),
  };
}

export async function markRunLaunchedAction(runId: string, launched: boolean) {
  await prisma.researchRun.update({
    where: { id: runId },
    data: {
      copiedAt: new Date(),
      launchedAt: launched ? new Date() : null,
      status: launched ? RunStatus.LAUNCHED : RunStatus.COPIED,
    },
  });
  revalidatePath("/");
  revalidatePath("/runs");
}

const researchOutputSchema = z.object({
  runId: z.string().optional(),
  title: z.string().min(1),
  rawOutput: z.string().min(1),
  summary: z.string().optional(),
  notes: z.string().optional(),
  sourceApp: z.enum(SOURCE_APPS).default("MANUAL"),
});

export async function saveResearchOutputAction(input: z.infer<typeof researchOutputSchema>) {
  const values = researchOutputSchema.parse(input);
  const existing = values.runId
    ? await prisma.researchEntry.findUnique({ where: { runId: values.runId } })
    : null;
  const parsed = parseSignalDeskBlock(values.rawOutput);
  const parseStatus = parsed.lineCount ? "PARSED" : "NO_BLOCK";

  const entry = existing
    ? await prisma.researchEntry.update({
        where: { id: existing.id },
        data: {
          title: values.title,
          rawOutput: values.rawOutput,
          summary: values.summary || null,
          notes: values.notes || null,
          sourceApp: values.sourceApp as SourceApp,
          parseStatus,
          parseError: parsed.ignoredLines.length ? `${parsed.ignoredLines.length} ignored line(s)` : null,
          ignoredLines: JSON.stringify(parsed.ignoredLines),
        },
      })
    : await prisma.researchEntry.create({
        data: {
          runId: values.runId || null,
          title: values.title,
          rawOutput: values.rawOutput,
          summary: values.summary || null,
          notes: values.notes || null,
          sourceApp: values.sourceApp as SourceApp,
          parseStatus,
          parseError: parsed.ignoredLines.length ? `${parsed.ignoredLines.length} ignored line(s)` : null,
          ignoredLines: JSON.stringify(parsed.ignoredLines),
        },
      });

  await replaceParsedRows(entry.id, parsed);

  if (values.runId) {
    await prisma.researchRun.update({
      where: { id: values.runId },
      data: {
        completedAt: new Date(),
        status: parsed.lineCount ? RunStatus.PARSED : RunStatus.OUTPUT_SAVED,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/runs");
  revalidatePath("/research");
  revalidatePath("/insights");
  revalidatePath("/discoveries");
  return { entryId: entry.id, parseStatus, ignoredCount: parsed.ignoredLines.length };
}

async function replaceParsedRows(entryId: string, parsed: ReturnType<typeof parseSignalDeskBlock>) {
  const knownTickers = new Set((await prisma.ticker.findMany({ select: { symbol: true } })).map((t) => t.symbol));
  await prisma.$transaction([
    prisma.parsedClaim.deleteMany({ where: { entryId } }),
    prisma.parsedRisk.deleteMany({ where: { entryId } }),
    prisma.parsedCatalyst.deleteMany({ where: { entryId } }),
    prisma.parsedTickerMention.deleteMany({ where: { entryId } }),
    prisma.parsedAnalystTarget.deleteMany({ where: { entryId } }),
    prisma.parsedThemeSignal.deleteMany({ where: { entryId } }),
    prisma.parsedWatchItem.deleteMany({ where: { entryId } }),
    prisma.parsedVerdict.deleteMany({ where: { entryId } }),
    prisma.parsedQuestion.deleteMany({ where: { entryId } }),
  ]);

  await prisma.$transaction([
    ...parsed.claims.map((item) => prisma.parsedClaim.create({ data: { entryId, ...item } })),
    ...parsed.risks.map((item) => prisma.parsedRisk.create({ data: { entryId, ...item } })),
    ...parsed.catalysts.map((item) => prisma.parsedCatalyst.create({ data: { entryId, ...item } })),
    ...parsed.tickerMentions.map((item) => prisma.parsedTickerMention.create({ data: { entryId, ...item } })),
    ...parsed.analystTargets.map((item) => prisma.parsedAnalystTarget.create({ data: { entryId, ...item } })),
    ...parsed.themeSignals.map((item) => prisma.parsedThemeSignal.create({ data: { entryId, ...item } })),
    ...parsed.watchItems.map((item) => prisma.parsedWatchItem.create({ data: { entryId, ...item } })),
    ...parsed.verdicts.map((item) => prisma.parsedVerdict.create({ data: { entryId, ...item } })),
    ...parsed.questions.map((item) => prisma.parsedQuestion.create({ data: { entryId, ...item } })),
  ]);

  const candidates = new Map<string, { symbol: string; sourceLine: string; companyName?: string; suggestedTheme?: string }>();
  for (const discovery of parsed.discoveries) {
    candidates.set(discovery.symbol, {
      symbol: discovery.symbol,
      sourceLine: discovery.sourceLine,
      companyName: discovery.companyName,
      suggestedTheme: discovery.suggestedTheme,
    });
  }
  for (const item of [...parsed.tickerMentions, ...parsed.analystTargets, ...parsed.watchItems]) {
    const symbol = cleanTicker(item.ticker);
    if (symbol && !knownTickers.has(symbol)) {
      candidates.set(symbol, {
        symbol,
        sourceLine: `${symbol} found in parsed output`,
        suggestedTheme: "themeSlug" in item ? item.themeSlug : undefined,
      });
    }
  }

  for (const candidate of candidates.values()) {
    if (knownTickers.has(candidate.symbol)) continue;
    await prisma.discoveryCandidate.upsert({
      where: { symbol: candidate.symbol },
      create: {
        symbol: candidate.symbol,
        companyName: candidate.companyName,
        suggestedThemes: JSON.stringify(candidate.suggestedTheme ? [candidate.suggestedTheme] : []),
        sourceLine: candidate.sourceLine,
      },
      update: {
        companyName: candidate.companyName,
        sourceLine: candidate.sourceLine,
        suggestedThemes: JSON.stringify(candidate.suggestedTheme ? [candidate.suggestedTheme] : []),
        occurrences: { increment: 1 },
        lastSeenAt: new Date(),
      },
    });
  }
}

export async function updateResearchStatusAction(entryId: string, status: ResearchStatus) {
  await prisma.researchEntry.update({ where: { id: entryId }, data: { status } });
  revalidatePath("/");
  revalidatePath("/research");
  revalidatePath("/insights");
}

export async function softDeleteResearchAction(entryId: string) {
  await prisma.researchEntry.update({ where: { id: entryId }, data: { deletedAt: new Date() } });
  revalidatePath("/");
  revalidatePath("/research");
  revalidatePath("/insights");
}

export async function restoreResearchAction(entryId: string) {
  await prisma.researchEntry.update({ where: { id: entryId }, data: { deletedAt: null } });
  revalidatePath("/research");
  revalidatePath("/insights");
}

const promptSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  body: z.string().min(1),
  cadence: z.nativeEnum(Cadence),
  tags: z.string().optional(),
});

export async function upsertPromptAction(input: z.infer<typeof promptSchema>) {
  const values = promptSchema.parse(input);
  const data = {
    title: values.title,
    slug: values.slug,
    description: values.description,
    body: values.body,
    cadence: values.cadence,
    tags: JSON.stringify(splitCsv(values.tags)),
    sourceAppHints: JSON.stringify(["PERPLEXITY", "CLAUDE"]),
    variableSchema: JSON.stringify({ placeholders: ["themes", "tickers", "lookback", "financial_window", "horizon", "local_context"] }),
  };
  if (values.id) {
    await prisma.promptTemplate.update({ where: { id: values.id }, data });
  } else {
    await prisma.promptTemplate.create({ data });
  }
  revalidatePath("/prompts");
  revalidatePath("/builder");
}

export async function togglePromptFavoriteAction(id: string, isFavorite: boolean) {
  await prisma.promptTemplate.update({ where: { id }, data: { isFavorite } });
  revalidatePath("/");
  revalidatePath("/prompts");
  revalidatePath("/builder");
}

export async function togglePromptArchivedAction(id: string, isArchived: boolean) {
  await prisma.promptTemplate.update({ where: { id }, data: { isArchived } });
  revalidatePath("/");
  revalidatePath("/prompts");
  revalidatePath("/builder");
}

export async function duplicatePromptAction(id: string) {
  const prompt = await prisma.promptTemplate.findUniqueOrThrow({ where: { id } });
  await prisma.promptTemplate.create({
    data: {
      title: `${prompt.title} Copy`,
      slug: `${prompt.slug}-copy-${Date.now()}`,
      description: prompt.description,
      body: prompt.body,
      cadence: prompt.cadence,
      tags: prompt.tags,
      sourceAppHints: prompt.sourceAppHints,
      variableSchema: prompt.variableSchema,
    },
  });
  revalidatePath("/prompts");
}

export async function deletePromptAction(id: string) {
  await prisma.promptTemplate.delete({ where: { id } });
  revalidatePath("/prompts");
  revalidatePath("/builder");
}

const themeSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  color: z.string().min(1).default("#2563eb"),
});

export async function createThemeAction(input: z.infer<typeof themeSchema>) {
  const values = themeSchema.parse(input);
  await prisma.theme.upsert({
    where: { slug: values.slug },
    create: values,
    update: values,
  });
  revalidatePath("/themes");
  revalidatePath("/builder");
}

const tickerSchema = z.object({
  symbol: z.string().min(1),
  companyName: z.string().optional(),
  notes: z.string().optional(),
  themeSlug: z.string().optional(),
});

export async function createTickerAction(input: z.infer<typeof tickerSchema>) {
  const values = tickerSchema.parse(input);
  const symbol = values.symbol.toUpperCase().trim();
  const validation = await validateSymbol(symbol);
  const ticker = await prisma.ticker.upsert({
    where: { symbol },
    create: {
      symbol,
      companyName: values.companyName || validation.companyName,
      notes: values.notes,
      dataStatus: validation.dataStatus,
    },
    update: {
      companyName: values.companyName || validation.companyName,
      notes: values.notes,
      dataStatus: validation.dataStatus,
      isActive: true,
    },
  });
  if (values.themeSlug) {
    const theme = await prisma.theme.findUnique({ where: { slug: values.themeSlug } });
    if (theme) {
      await prisma.tickerTheme.upsert({
        where: { tickerId_themeId: { tickerId: ticker.id, themeId: theme.id } },
        create: { tickerId: ticker.id, themeId: theme.id, role: "User-added AI infrastructure exposure", isPrimary: false },
        update: {},
      });
    }
  }
  revalidatePath("/themes");
  revalidatePath("/builder");
}

export async function reviewDiscoveryAction(symbol: string, status: DiscoveryStatus, themeSlug?: string) {
  const candidate = await prisma.discoveryCandidate.findUniqueOrThrow({ where: { symbol } });
  if (status === DiscoveryStatus.ACCEPTED) {
    const validation = await validateSymbol(symbol);
    const ticker = await prisma.ticker.upsert({
      where: { symbol },
      create: {
        symbol,
        companyName: candidate.companyName || validation.companyName,
        dataStatus: validation.dataStatus,
      },
      update: {
        companyName: candidate.companyName || validation.companyName,
        dataStatus: validation.dataStatus,
        isActive: true,
      },
    });
    if (themeSlug) {
      const theme = await prisma.theme.findUnique({ where: { slug: themeSlug } });
      if (theme) {
        await prisma.tickerTheme.upsert({
          where: { tickerId_themeId: { tickerId: ticker.id, themeId: theme.id } },
          create: { tickerId: ticker.id, themeId: theme.id, role: "Accepted from discovery queue" },
          update: {},
        });
      }
    }
    await prisma.discoveryCandidate.update({
      where: { symbol },
      data: { status, acceptedTickerId: ticker.id },
    });
  } else {
    await prisma.discoveryCandidate.update({ where: { symbol }, data: { status } });
  }
  revalidatePath("/discoveries");
  revalidatePath("/themes");
  revalidatePath("/builder");
}

function splitCsv(value?: string) {
  return (value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
