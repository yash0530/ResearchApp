import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PROMPT_SEEDS } from "../lib/seed-prompts";
import { THEME_SEEDS, primaryThemeForTicker } from "../lib/taxonomy";
import { validateSymbol } from "../lib/market";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Signal Desk...");

  for (const theme of THEME_SEEDS) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: {
        name: theme.name,
        description: theme.description,
        color: theme.color,
      },
      create: {
        slug: theme.slug,
        name: theme.name,
        description: theme.description,
        color: theme.color,
      },
    });
  }

  const symbols = Array.from(new Set(THEME_SEEDS.flatMap((theme) => theme.tickers))).sort();
  const validations = await validateSymbolsWithConcurrency(symbols, 8);
  const validationMap = new Map(validations.map((v) => [v.symbol, v]));

  for (const symbol of symbols) {
    const validation = validationMap.get(symbol);
    await prisma.ticker.upsert({
      where: { symbol },
      update: {
        companyName: validation?.companyName,
        dataStatus: validation?.dataStatus ?? "UNVERIFIED",
        isSeeded: true,
        isActive: true,
      },
      create: {
        symbol,
        companyName: validation?.companyName,
        dataStatus: validation?.dataStatus ?? "UNVERIFIED",
        isSeeded: true,
        isActive: true,
      },
    });
  }

  for (const themeSeed of THEME_SEEDS) {
    const theme = await prisma.theme.findUniqueOrThrow({ where: { slug: themeSeed.slug } });
    for (const symbol of themeSeed.tickers) {
      const ticker = await prisma.ticker.findUniqueOrThrow({ where: { symbol } });
      await prisma.tickerTheme.upsert({
        where: {
          tickerId_themeId: {
            tickerId: ticker.id,
            themeId: theme.id,
          },
        },
        update: {
          role: roleFor(themeSeed.slug, symbol),
          isPrimary: primaryThemeForTicker(symbol) === themeSeed.slug,
        },
        create: {
          tickerId: ticker.id,
          themeId: theme.id,
          role: roleFor(themeSeed.slug, symbol),
          purity: primaryThemeForTicker(symbol) === themeSeed.slug ? 4 : 3,
          isPrimary: primaryThemeForTicker(symbol) === themeSeed.slug,
        },
      });
    }
  }

  for (const prompt of PROMPT_SEEDS) {
    await prisma.promptTemplate.upsert({
      where: { slug: prompt.slug },
      update: {
        title: prompt.title,
        description: prompt.description,
        body: prompt.body,
        cadence: prompt.cadence,
        tags: JSON.stringify(prompt.tags),
        sourceAppHints: JSON.stringify(prompt.sourceAppHints),
        variableSchema: JSON.stringify(defaultVariableSchema()),
        isFavorite: prompt.isFavorite ?? false,
        isArchived: prompt.isArchived ?? false,
      },
      create: {
        title: prompt.title,
        slug: prompt.slug,
        description: prompt.description,
        body: prompt.body,
        cadence: prompt.cadence,
        tags: JSON.stringify(prompt.tags),
        sourceAppHints: JSON.stringify(prompt.sourceAppHints),
        variableSchema: JSON.stringify(defaultVariableSchema()),
        isFavorite: prompt.isFavorite ?? false,
        isArchived: prompt.isArchived ?? false,
      },
    });
  }

  console.log(`Seeded ${THEME_SEEDS.length} themes, ${symbols.length} tickers, and ${PROMPT_SEEDS.length} prompts.`);
}

function roleFor(themeSlug: string, symbol: string) {
  const roles: Record<string, string> = {
    memory_storage: "Memory/storage beneficiary",
    accelerated_compute: "AI compute silicon exposure",
    foundry_semicap_packaging: "Manufacturing and packaging supply chain",
    eda_ip_design: "Chip design enablement",
    networking_optics_interconnect: "AI cluster data movement",
    servers_storage_hardware: "AI systems and hardware integration",
    power_grid_electrical: "Data-center power and electrification",
    cooling_thermal: "Thermal management and dense rack cooling",
    data_centers_digital_infra: "Digital infrastructure capacity",
    edge_ai_industrial_chips: "Edge AI and embedded silicon",
    robotics_physical_ai: "Physical AI deployment",
    drones_autonomy_defense: "Autonomy and defense platform exposure",
    hyperscaler_capex_indicators: "AI capex demand signal",
    materials_cables_supply_chain: "AI buildout materials and distribution",
  };
  return `${roles[themeSlug] ?? "AI infrastructure exposure"} (${symbol})`;
}

function defaultVariableSchema() {
  return {
    placeholders: ["themes", "tickers", "lookback", "financial_window", "horizon", "local_context", "research_type"],
    parseBlockRequired: true,
  };
}

async function validateSymbolsWithConcurrency(symbols: string[], concurrency: number) {
  const results: Awaited<ReturnType<typeof validateSymbol>>[] = [];
  let index = 0;
  async function worker() {
    while (index < symbols.length) {
      const symbol = symbols[index++];
      const result = await validateSymbolWithTimeout(symbol, 3500);
      results.push(result);
      process.stdout.write(result.dataStatus === "VERIFIED" ? "." : "x");
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  process.stdout.write("\n");
  return results;
}

async function validateSymbolWithTimeout(symbol: string, timeoutMs: number) {
  return Promise.race([
    validateSymbol(symbol),
    new Promise<Awaited<ReturnType<typeof validateSymbol>>>((resolve) =>
      setTimeout(() => resolve({ symbol, dataStatus: "UNVERIFIED" }), timeoutMs),
    ),
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
