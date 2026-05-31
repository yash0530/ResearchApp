export type ThemeSeed = {
  slug: string;
  name: string;
  description: string;
  color: string;
  tickers: string[];
};

export const THEME_SEEDS: ThemeSeed[] = [
  {
    slug: "memory_storage",
    name: "Memory & Storage",
    description: "DRAM, HBM, NAND, HDD, SSD, and storage-cycle beneficiaries.",
    color: "#0f766e",
    tickers: ["MU", "SNDK", "WDC", "STX"],
  },
  {
    slug: "accelerated_compute",
    name: "Accelerated Compute",
    description: "GPU, accelerator, custom compute, and core AI silicon suppliers.",
    color: "#2563eb",
    tickers: ["NVDA", "AMD", "AVGO", "MRVL", "INTC", "ARM", "TSM"],
  },
  {
    slug: "foundry_semicap_packaging",
    name: "Foundry, Semicap & Packaging",
    description: "Foundries, wafer equipment, advanced packaging, test, and semiconductor manufacturing supply chain.",
    color: "#7c3aed",
    tickers: ["TSM", "ASML", "AMAT", "LRCX", "KLAC", "ONTO", "ACLS", "TER", "AMKR", "MKSI", "COHU", "CAMT", "FORM", "ICHR", "UCTT"],
  },
  {
    slug: "eda_ip_design",
    name: "EDA, IP & Design",
    description: "Chip design software, verification, IP licensing, and simulation picks and shovels.",
    color: "#9333ea",
    tickers: ["SNPS", "CDNS", "ARM", "ANSS"],
  },
  {
    slug: "networking_optics_interconnect",
    name: "Networking, Optics & Interconnect",
    description: "AI cluster switching, optical transport, copper/optical interconnect, and data movement bottlenecks.",
    color: "#0891b2",
    tickers: ["ANET", "CSCO", "CIEN", "COHR", "LITE", "FN", "ALAB", "AVGO", "MRVL", "GLW", "APH", "TEL"],
  },
  {
    slug: "servers_storage_hardware",
    name: "Servers, Storage & Hardware",
    description: "AI server OEMs, ODMs, hardware integrators, storage systems, and contract manufacturing.",
    color: "#475569",
    tickers: ["DELL", "HPE", "SMCI", "NTAP", "PSTG", "CLS", "FLEX", "JBL", "SANM"],
  },
  {
    slug: "power_grid_electrical",
    name: "Power, Grid & Electrical",
    description: "Electrical equipment, power generation, grid construction, backup power, and data-center power scarcity.",
    color: "#ca8a04",
    tickers: ["VRT", "ETN", "GEV", "HUBB", "PWR", "NVT", "BE", "FLNC", "EMR", "GNRC", "CEG", "VST", "TLN", "NEE", "SO", "NRG"],
  },
  {
    slug: "cooling_thermal",
    name: "Cooling & Thermal",
    description: "Liquid cooling, HVAC, thermal management, water systems, and dense-rack heat removal.",
    color: "#0284c7",
    tickers: ["VRT", "TT", "CARR", "JCI", "DOV", "MOD", "AAON", "XYL", "WTS"],
  },
  {
    slug: "data_centers_digital_infra",
    name: "Data Centers & Digital Infra",
    description: "Data-center REITs, towers, AI campuses, neoclouds, and digital infrastructure operators.",
    color: "#16a34a",
    tickers: ["EQIX", "DLR", "IRM", "AMT", "CCI", "SBAC", "DBRG", "GDS", "NBIS", "CORZ", "IREN", "CIFR", "WULF", "APLD", "CRWV"],
  },
  {
    slug: "edge_ai_industrial_chips",
    name: "Edge AI & Industrial Chips",
    description: "Edge inference, analog, embedded, automotive, industrial, and power semiconductors.",
    color: "#4f46e5",
    tickers: ["QCOM", "NXPI", "TXN", "ADI", "MPWR", "MCHP", "ON", "STM"],
  },
  {
    slug: "robotics_physical_ai",
    name: "Robotics & Physical AI",
    description: "Industrial automation, machine vision, surgical robotics, warehouse automation, and embodied AI.",
    color: "#db2777",
    tickers: ["ROK", "TER", "ISRG", "HON", "ZBRA", "CGNX", "SYM", "TSLA", "SERV", "ABBNY"],
  },
  {
    slug: "drones_autonomy_defense",
    name: "Drones, Autonomy & Defense",
    description: "Autonomous systems, defense electronics, drones, air mobility, and AI-enabled defense platforms.",
    color: "#b91c1c",
    tickers: ["AVAV", "KTOS", "RCAT", "RTX", "LMT", "NOC", "GD", "BA", "ACHR", "JOBY", "EH"],
  },
  {
    slug: "hyperscaler_capex_indicators",
    name: "Hyperscaler Capex Indicators",
    description: "Cloud platforms and large buyers whose capex plans drive the infrastructure supply chain.",
    color: "#1d4ed8",
    tickers: ["MSFT", "AMZN", "GOOGL", "META", "ORCL"],
  },
  {
    slug: "materials_cables_supply_chain",
    name: "Materials, Cables & Supply Chain",
    description: "Copper, steel, cables, distribution, and raw material suppliers tied to AI buildout capacity.",
    color: "#92400e",
    tickers: ["FCX", "SCCO", "TECK", "BDC", "WCC", "NUE", "STLD"],
  },
];

export const ALL_SEED_TICKERS = Array.from(
  new Set(THEME_SEEDS.flatMap((theme) => theme.tickers)),
).sort();

export function primaryThemeForTicker(symbol: string) {
  return THEME_SEEDS.find((theme) => theme.tickers.includes(symbol))?.slug ?? null;
}
