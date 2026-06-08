import { Cadence, SourceApp } from "@prisma/client";

type PromptSeed = {
  title: string;
  slug: string;
  description: string;
  cadence: Cadence;
  tags: string[];
  sourceAppHints: SourceApp[];
  isFavorite?: boolean;
  isArchived?: boolean;
  body: string;
};

const OUTPUT_FORMAT = `## How to format your answer

Write a clear, skeptical, sourced research report for a human first, USING MARKDOWN TABLES wherever you compare multiple things (tickers, verdicts, targets, risks). Suggested sections (include the ones that apply): Summary, Tickers, Verdicts, Catalysts, Risks, Analyst Targets, Theme Read, Watch List, Open Questions. Be specific, cite dates for events/target changes/earnings, separate proven numbers from narrative, and include disconfirming evidence.

Then, at the VERY END, output exactly ONE fenced code block tagged \`json\` that encodes the same findings as structured data. Nothing after it.

Rules for the JSON block:
- Use only these arrays (omit any that are empty): themes, tickers, claims, risks, catalysts, targets, watch, verdicts, discoveries, questions.
- Enum values are case-insensitive. cycle = dormant|emerging|heating_up|crowded|rolling_over; crowding/importance/severity = low|medium|high; sentiment = bullish|neutral|bearish|mixed; stance = research_now|watch|defer|avoid.
- confidence and priority are integers 1-5. Numbers (target, previous_target) are plain numbers, no $ or commas. Dates are YYYY-MM-DD.
- For ANY ticker you mention that is NOT in my selected ticker list above, you MUST add an entry to discoveries — this is how my tracked universe grows, so do not skip it.
- The JSON below shows SHAPE ONLY. Replace every value with your real findings; do not echo the example numbers, tickers, or firms.

Example (shape only — replace with your real findings):
\`\`\`json
{
  "themes": [{"theme":"memory_storage","cycle":"heating_up","crowding":"high","confidence":4,"summary":"HBM tightness"}],
  "tickers": [{"ticker":"MU","theme":"memory_storage","sentiment":"bullish","confidence":4,"role":"HBM beneficiary"}],
  "claims": [{"text":"HBM demand is supply constrained","ticker":"MU","theme":"memory_storage","confidence":4,"importance":"high"}],
  "risks": [{"text":"DRAM pricing rolls over","ticker":"MU","theme":"memory_storage","severity":"high","timeframe":"next_quarter"}],
  "catalysts": [{"text":"Guidance raised","ticker":"MU","theme":"memory_storage","importance":"medium","timeframe":"next_quarter"}],
  "targets": [{"ticker":"MU","firm":"UBS","rating":"buy","target":155,"previous_target":140,"date":"2026-05-20"}],
  "watch": [{"text":"Gross margin guide","ticker":"MU","theme":"memory_storage","timeframe":"next_2_quarters"}],
  "verdicts": [{"ticker":"MU","theme":"memory_storage","stance":"RESEARCH_NOW","priority":4,"horizon":"next_12_months","rationale":"Structural demand driver."}],
  "discoveries": [{"ticker":"ALAB","company":"Astera Labs","theme":"networking_optics_interconnect","reason":"connectivity exposure"}],
  "questions": [{"text":"Too dependent on one hyperscaler capex cycle?","ticker":"MU","theme":"memory_storage"}]
}
\`\`\``;

function promptV2({
  title,
  role,
  task,
  tableColumns,
  bullets,
}: {
  title: string;
  role: string;
  task: string;
  tableColumns: string[];
  bullets: string[];
}) {
  return `# ${title}

You are my AI infrastructure investing research analyst.

Today's date is {{today}}. Anchor every "recent"/"latest" judgment to this date, and treat anything you cannot date as undated (not necessarily recent).

My investment focus:
- Public-market AI infrastructure: chips, memory, optics, networking, power, cooling, data centers, robotics, drones, and adjacent second-order beneficiaries.

My current book / context:
{{portfolio_context}}

Role: ${role}

Task:
${task}

Inputs:
- Themes: {{themes}}
- Tickers: {{tickers}}
- Lookback window: {{lookback}}
- Financial window: {{financial_window}}
- Horizon: {{horizon}}

Local Context (cached Signal Desk data — your numeric and narrative baseline):
{{local_context}}

Use the Local Context as your baseline. Do NOT merely restate it — update and extend it with fresh findings, and call out specifically what changed versus the cached values. Judge staleness using each line's as_of date.

Quality and honesty rules:
- Be factual, sourced, skeptical, and specific. Cite a date for every recent event, target change, and earnings reference.
- Separate what is proven in reported numbers from what is only narrative or analyst forecast.
- Distinguish current-consensus trades from emerging second-derivative trades.
- Include disconfirming evidence for every major bullish claim.
- NEVER invent analyst price targets, firm names, ratings, dates, or financial figures. If you cannot verify a value, omit it or mark it UNVERIFIED — do not present a guess as fact.
- Prefer public equities, ADRs, and ETFs over private or speculative names.
- No generic "AI is growing" filler: every claim needs a specific number, date, or sourced event.

Requirements:
1. Markdown table with columns: ${tableColumns.join(" | ")}.
${bullets.map((b) => `- ${b}`).join("\n")}

${OUTPUT_FORMAT}`;
}

const OLD_PARSE_CONTRACT = `
After the readable report, end with a strict parse block for Signal Desk.

Parse block rules:
- Include exactly one SIGNAL_DESK_DATA_START and one SIGNAL_DESK_DATA_END.
- Use only these line types: THEME, TICKER, CLAIM, RISK, CATALYST, TARGET, WATCH, DISCOVERY_TICKER, QUESTION.
- Format every machine-readable line as TYPE|key=value|key=value.
- Do not use pipe characters inside values.
- confidence must be 1-5.
- importance, severity, and crowding must be low, medium, or high.
- cycle must be dormant, emerging, heating_up, crowded, or rolling_over.
- If you mention a ticker that is not in my selected ticker list, include DISCOVERY_TICKER.

Required examples:
SIGNAL_DESK_DATA_START
THEME|theme=memory_storage|cycle=heating_up|crowding=high|confidence=4|summary=HBM demand remains the dominant driver, but valuation and cycle risk are rising
TICKER|ticker=MU|theme=memory_storage|sentiment=bullish|confidence=4|role=HBM and DRAM cycle beneficiary
CLAIM|text=HBM demand remains supply constrained into the next reported quarter|ticker=MU|theme=memory_storage|confidence=4|importance=high|source_url=https://example.com
RISK|text=Memory pricing rolls over faster than expected|ticker=MU|theme=memory_storage|severity=high|timeframe=next_2_quarters|source_url=https://example.com
CATALYST|text=Management raises HBM revenue expectations|ticker=MU|theme=memory_storage|importance=high|timeframe=next_quarter|source_url=https://example.com
TARGET|ticker=MU|firm=UBS|rating=buy|target=155|previous_target=140|date=2026-05-20|source_url=https://example.com
WATCH|text=Gross margin expansion versus prior guide|ticker=MU|theme=memory_storage|timeframe=next_2_quarters
DISCOVERY_TICKER|ticker=ALAB|company=Astera Labs|theme=networking_optics_interconnect|reason=CXL and connectivity exposure appeared in source work
QUESTION|text=Is this thesis too dependent on one hyperscaler capex cycle?|ticker=MU|theme=memory_storage
SIGNAL_DESK_DATA_END`;

function oldPrompt({
  title,
  role,
  task,
  deliver,
  extra = "",
}: {
  title: string;
  role: string;
  task: string;
  deliver: string;
  extra?: string;
}) {
  return `# ${title}

You are my AI infrastructure investing research analyst.

My context:
- I run research manually through external deep-research tools.
- My current focus is public-market AI infrastructure.
- I care about chips, memory, optics, networking, power, cooling, data centers, robotics, drones, and adjacent second-order beneficiaries.
- I am already highly exposed to memory names, especially Micron / DRAM / SanDisk, so do not merely confirm my current book.

Selected themes:
{{themes}}

Selected tickers:
{{tickers}}

Research window:
- News/lookback: {{lookback}}
- Financial window: {{financial_window}}
- Forward horizon: {{horizon}}

Local cached context from Signal Desk:
{{local_context}}

Role:
${role}

Task:
${task}

Deliver:
${deliver}

Quality rules:
- Be factual, sourced, skeptical, and specific.
- Separate what is proven in numbers from what is only narrative.
- Distinguish current consensus trades from emerging second-derivative trades.
- Call out stale, low-quality, or circular sources.
- Prefer public equities, ADRs, and ETFs.
- Include disconfirming evidence.
- Include dates for recent events, target changes, and earnings references.
- Do not give generic "AI is growing" commentary.
${extra}

${OLD_PARSE_CONTRACT}`;
}

export const PROMPT_SEEDS: PromptSeed[] = [
  // 6 Active v2 Prompts
  {
    title: "Daily Signal Triage",
    slug: "daily-signal-triage",
    description: "Morning triage of market signal, lookback news, and baseline comparison.",
    cadence: "DAILY",
    tags: ["daily", "triage", "signals"],
    sourceAppHints: ["PERPLEXITY", "CLAUDE"],
    isFavorite: true,
    isArchived: false,
    body: promptV2({
      title: "Daily Signal Triage",
      role: "Morning desk analyst who compresses AI infrastructure signal from the lookback window into an investable dashboard, with blunt stance calls and explicit comparison to the cached Local Context baseline.",
      task: "Scan the selected themes and tickers for what changed, what matters, and what deserves study today. Use the Local Context as a numeric baseline — call out exactly what moved versus that baseline. Flag any new analyst target changes, earnings references, or macro regime shifts with their dates.",
      tableColumns: ["Ticker", "What Changed vs Baseline", "Stance", "Priority (1-5)", "Horizon", "Rationale"],
      bullets: [
        "Open with up to 5 tight bullets on the highest-signal data shifts — each bullet must cite a specific date, number, or sourced event.",
        "Identify near-term macro or micro catalysts with specific expected dates or triggers.",
        "List up to 3 disconfirming signals that challenge the current baseline.",
        "Identify any tickers newly entering or exiting the conversation — emit DISCOVERY_TICKER for anything not in my list.",
        "Strictly avoid long-form prose introductions or generic AI commentary.",
      ],
    }),
  },
  {
    title: "Theme / Bottleneck Monitor",
    slug: "theme-bottleneck-monitor",
    description: "Monitor key bottlenecks, cycle stages, and hardware value-chain shifts.",
    cadence: "WEEKLY",
    tags: ["themes", "bottlenecks", "monitor"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isArchived: false,
    body: promptV2({
      title: "Theme / Bottleneck Monitor",
      role: "Sector specialist tracking where capital, capacity, and orders are stacking up in the AI infrastructure value chain — distinguishing bottlenecks with real revenue proof from those still in narrative phase.",
      task: "For each selected theme, assess cycle stage, crowding, order backlog status, and capacity constraint indicators. Use Local Context cycle and crowding fields as your baseline — update them where fresh data justifies a change, and explain why. Identify which bottlenecks are moving from theory to billed revenue, which are peaking, and which are emerging.",
      tableColumns: ["Theme", "Cycle Stage", "Crowding", "Revenue Proof", "Bottleneck State", "Key Milestone"],
      bullets: [
        "For each theme, cite a specific capacity, backlog, lead-time, or pricing data point with date — no narrative-only claims.",
        "Distinguish cycle stages with evidence: emerging (early proof), heating_up (demand confirmed, supply lag), crowded (consensus, peak narrative), rolling_over (demand weakness or supply relief emerging).",
        "Identify one concrete near-term milestone (earnings date, product launch, capacity date) that could reprice each theme.",
        "List any second-derivative or adjacent themes not in my list that are gaining traction — emit DISCOVERY_TICKER for public names.",
        "Include disconfirming evidence: which themes could be rolling over despite bullish narrative?",
      ],
    }),
  },
  {
    title: "Ticker Battlecard + Valuation Check",
    slug: "ticker-battlecard-valuation-check",
    description: "Compare multiple tickers on valuation, fundamentals, and core thesis.",
    cadence: "AD_HOC",
    tags: ["tickers", "comparison", "valuation"],
    sourceAppHints: ["CLAUDE", "CHATGPT"],
    isArchived: false,
    body: promptV2({
      title: "Ticker Battlecard + Valuation Check",
      role: "Fundamental analyst who refuses to let narrative outrun numbers — comparing selected tickers on revenue proof, margin trajectory, and valuation versus the cached Local Context financial baseline.",
      task: "For each selected ticker, identify its exact role in the AI infrastructure stack, what percentage of revenue is attributable to AI, whether fundamentals support the narrative, and how current valuation compares to earnings trajectory. Use the Local Context financial fields as your baseline — update any metrics where you have fresher data and flag the discrepancy.",
      tableColumns: ["Ticker", "Role in Stack", "AI Revenue % (Proven)", "Valuation vs Growth", "Stance", "Priority"],
      bullets: [
        "For each ticker, cite a specific revenue figure, margin level, or guidance number with quarter/date — mark clearly if extrapolated versus reported.",
        "Separate what is proven in reported financials from what is only management commentary or analyst forecast.",
        "Highlight thesis-killer risks: what would need to be true for the AI revenue narrative to disappoint?",
        "Rank tickers by risk-adjusted preference for capital allocation and explain the ordering.",
        "Include at least one disconfirming data point per ticker — a risk, miss, or margin concern grounded in numbers.",
        "Note any analyst target changes (firm, old target, new target, date) from the lookback window.",
      ],
    }),
  },
  {
    title: "Discovery Scout",
    slug: "discovery-scout",
    description: "Scan for underfollowed second-derivative names and theme-adjacent players.",
    cadence: "WEEKLY",
    tags: ["discovery", "scout", "ideas"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isArchived: false,
    body: promptV2({
      title: "Discovery Scout",
      role: "Contrarian thematic scout surfacing second- and third-derivative AI infrastructure ideas before they enter consensus — with revenue inflection proof, not just narrative potential.",
      task: "Find public equities, ADRs, or ETFs connected to the selected themes that are NOT the standard GPU/memory consensus trades. Rank ideas by probability of earnings inflection, margin expansion, or narrative re-rating within the horizon. Use Local Context as a baseline to verify what is already tracked — focus only on names that add diversification or a differentiated angle.",
      tableColumns: ["Ticker", "Proposed Theme", "Inflection Proof", "Crowding State", "Thesis Killer", "Stance"],
      bullets: [
        "Focus on names outside the core GPU/memory consensus — do not recycle well-known names unless they have a fresh, non-consensus angle.",
        "For each idea, cite a specific revenue event, design win, order flow, or product milestone that grounds the thesis — no narrative-only pitches.",
        "Assess how crowded each idea already is: early/underfollowed, entering consensus, or already crowded.",
        "State the single most important thesis-killer for each idea.",
        "Emit a DISCOVERY_TICKER line for every compelling name outside my selected ticker list — this is mandatory.",
        "Exclude names that are too speculative (no revenue proof), already over-owned, or pure-play AI hype without infrastructure exposure.",
      ],
    }),
  },
  {
    title: "Earnings / Event Review",
    slug: "earnings-event-review",
    description: "Comprehensive prep and postmortem review of upcoming or completed earnings events.",
    cadence: "AD_HOC",
    tags: ["earnings", "events", "review"],
    sourceAppHints: ["PERPLEXITY", "CLAUDE"],
    isArchived: false,
    body: promptV2({
      title: "Earnings / Event Review",
      role: "Event analyst who separates permanent thesis changes from one-day price reactions — anchoring analysis on specific reported numbers, guidance revisions, and management quotes with exact dates.",
      task: "For each selected ticker with an upcoming or recently completed earnings event, identify consensus expectations, key segment metrics, guidance quality, and what specifically changed in the investment thesis. Use Local Context financial metrics as your baseline — note where reported results beat, missed, or confirmed the baseline. For upcoming events, build the guidepost checklist; for completed events, deliver the postmortem.",
      tableColumns: ["Ticker", "Event Date", "Consensus vs Result", "Beat/Miss (Specific $)", "Thesis Change?", "Stance"],
      bullets: [
        "For each ticker, state the exact event date (or expected date), consensus estimate, and reported result with specific dollar or percentage figures.",
        "Separate what changed in the fundamental thesis from what was temporary price reaction or one-quarter noise.",
        "Detail management commentary on margins, backlogs, and forward guidance with direct quotes where available.",
        "List analyst target or rating changes post-event (firm, old target, new target, date).",
        "For upcoming events: list the 3 most important guideposts (specific metrics, thresholds, or commentary to watch).",
        "Include at least one disconfirming signal — a miss, guidance cut, or margin compression indicator.",
      ],
    }),
  },
  {
    title: "Portfolio Risk + Research Priority",
    slug: "portfolio-risk-research-priority",
    description: "Blunt skeptical review prioritizing research next-steps and Debias checks.",
    cadence: "WEEKLY",
    tags: ["risk", "debias", "priority"],
    sourceAppHints: ["CLAUDE", "CHATGPT"],
    isArchived: false,
    body: promptV2({
      title: "Portfolio Risk + Research Priority",
      role: "Blunt anti-confirmation-bias analyst whose job is NOT to validate current views — challenging concentration risk, cycle assumptions, and narrative crowding with evidence-based skepticism.",
      task: "Challenge the selected themes and tickers. Find ways the AI infrastructure thesis could be over-owned, cyclically fragile, margin-dilutive, capex constrained, overvalued, or already fully priced. Use Local Context as the baseline to identify where assumptions may have drifted from the data. Recommend specific, actionable research steps to resolve the highest-priority ambiguities.",
      tableColumns: ["Ticker / Theme", "Concentration Risk", "Thesis Threat (Specific)", "What Would Change My Mind", "Stance", "Priority"],
      bullets: [
        "List the 5 most critical thesis threats with specific evidence — each threat must reference a number, date, or sourced concern, not a generic risk.",
        "Identify where the Local Context baseline may be stale, overly optimistic, or extrapolating narrative beyond reported numbers.",
        "Propose 3-5 specific, resolvable research questions — questions with a concrete answer path, not open-ended speculation.",
        "Identify better diversifiers if concentration in memory or any single theme is too high — prefer public equities, ADRs, or ETFs.",
        "State explicitly: what would need to be true for you to upgrade or downgrade each major position or theme?",
        "Include at least one scenario where the entire AI infrastructure thesis underperforms for 12+ months and what the early signals would be.",
      ],
    }),
  },

  // 15 Archived old prompts (slugs are preserved and marked isArchived: true)
  {
    title: "Daily AI Infrastructure Dashboard",
    slug: "daily-ai-infrastructure-dashboard",
    description: "Morning scan across AI infrastructure themes, tickers, risks, catalysts, and narrative shifts.",
    cadence: "DAILY",
    tags: ["daily", "dashboard", "ai-infra"],
    sourceAppHints: ["PERPLEXITY", "CLAUDE"],
    isFavorite: false,
    isArchived: true,
    body: oldPrompt({
      title: "Daily AI Infrastructure Dashboard",
      role: "Act as a morning desk analyst who compresses the last day/week of AI infrastructure signal into an investable dashboard.",
      task: "Scan the selected themes and tickers for what changed, what matters, and what I should study today. Use the local context as a baseline, then update it with fresh news, analyst notes, earnings references, and market action.",
      deliver: "1. Executive dashboard with 10 bullets max. 2. Theme table with state, what changed, tickers, proof level, crowding, and watch items. 3. Top 3 developments today. 4. Top 3 stocks to study. 5. Top 3 areas not to chase. 6. Disconfirming evidence.",
    }),
  },
  {
    title: "New AI Infra Idea Finder",
    slug: "new-ai-infra-idea-finder",
    description: "Find underfollowed second- and third-derivative AI infrastructure beneficiaries.",
    cadence: "WEEKLY",
    tags: ["ideas", "discovery", "underfollowed"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isFavorite: false,
    isArchived: true,
    body: oldPrompt({
      title: "New AI Infra Idea Finder",
      role: "Act as a contrarian thematic scout looking for investable AI infrastructure names before they become obvious.",
      task: "Find public names, ADRs, or ETFs connected to the selected AI infrastructure themes that are not the standard GPU/memory consensus trades. Rank ideas by probability of earnings inflection, narrative expansion, market crowding, and relevance over the next 3-12 months.",
      deliver: "1. Ten underfollowed subthemes. 2. Best public tickers per subtheme. 3. What proof confirms the thesis. 4. What evidence kills it. 5. Names that are too speculative or already over-owned.",
      extra: "Include DISCOVERY_TICKER lines for every compelling ticker outside my selected list.",
    }),
  },
  {
    title: "Theme Deep Dive",
    slug: "theme-deep-dive",
    description: "One-theme deep research report with cycle state, winners, risks, and milestones.",
    cadence: "WEEKLY",
    tags: ["theme", "deep-dive"],
    sourceAppHints: ["CLAUDE", "PERPLEXITY"],
    isArchived: true,
    body: oldPrompt({
      title: "Theme Deep Dive",
      role: "Act as a sector specialist covering one AI infrastructure bottleneck.",
      task: "Deeply research the selected theme. Explain the narrative, where the theme is in the market cycle, what changed over the last 90 days, who the arms dealers are, who the speculative hype names are, and what milestones could make the area rerate.",
      deliver: "1. Narrative in one paragraph. 2. Cycle stage. 3. 90-day changes. 4. Key public winners. 5. Arms dealers versus hype names. 6. Milestones for next 1, 2, and 4 quarters. 7. Best stocks, watchlist names, and names to avoid.",
    }),
  },
  {
    title: "Ticker Battle Card",
    slug: "ticker-battle-card",
    description: "Compare selected tickers competing for the next research or capital allocation slot.",
    cadence: "AD_HOC",
    tags: ["ticker", "comparison", "battle-card"],
    sourceAppHints: ["CLAUDE", "CHATGPT"],
    isArchived: true,
    body: oldPrompt({
      title: "Ticker Battle Card",
      role: "Act as a fundamental analyst comparing multiple AI infrastructure stocks on risk/reward.",
      task: "For each selected ticker, identify its exact role in the AI infrastructure stack, revenue exposure to AI, what is priced in, catalysts, thesis breakers, valuation framing, and whether it is core, satellite, speculative, or avoid.",
      deliver: "Start with a comparison table. Then rank: best risk/reward now, best long-duration compounder, best not-yet-but-soon setup, worst crowded trade. Include firm targets and rating changes if available.",
    }),
  },
  {
    title: "Micron / Memory Cycle Review",
    slug: "micron-memory-cycle-review",
    description: "Focused memory-cycle review for Micron, SanDisk, and adjacent memory/storage names.",
    cadence: "WEEKLY",
    tags: ["memory", "micron", "cycle"],
    sourceAppHints: ["PERPLEXITY", "CLAUDE"],
    isFavorite: false,
    isArchived: true,
    body: oldPrompt({
      title: "Micron / Memory Cycle Review",
      role: "Act as a memory-cycle analyst with skepticism about extrapolating HBM hype too far.",
      task: "Analyze selected memory/storage tickers over the lookback and financial window. Focus on HBM, DRAM pricing, NAND pricing, supply additions, hyperscaler demand, China risk, Samsung/SK Hynix behavior, margin trajectory, and analyst target changes.",
      deliver: "1. Memory cycle state. 2. Company-by-company table. 3. HBM versus non-HBM exposure. 4. Last 6-quarter financial trajectory. 5. Institutional target changes. 6. Bull/base/bear path for the next 12 months. 7. What would make me wrong.",
    }),
  },
  {
    title: "Six-Quarter Financial Review",
    slug: "six-quarter-financial-review",
    description: "Financial trajectory review anchored on last 6-8 quarters and current narrative.",
    cadence: "AD_HOC",
    tags: ["financials", "quarters"],
    sourceAppHints: ["CLAUDE", "CHATGPT"],
    isArchived: true,
    body: oldPrompt({
      title: "Six-Quarter Financial Review",
      role: "Act as a forensic financial analyst who refuses to let narrative outrun the numbers.",
      task: "Use the local financial context as a starting point and verify the last 6-8 quarters for each selected ticker. Analyze revenue growth, gross margin, operating margin, FCF, capex intensity, guidance changes, and whether fundamentals support the AI thesis.",
      deliver: "1. Financial trend table. 2. Acceleration/deceleration calls. 3. Margin and FCF quality. 4. Valuation versus trajectory. 5. Claims that are unsupported by financials. 6. Watch metrics for next report.",
    }),
  },
  {
    title: "Analyst Target Tracker",
    slug: "analyst-target-tracker",
    description: "Extract institution targets, rating changes, target dispersion, and target-change rationale.",
    cadence: "WEEKLY",
    tags: ["analyst-targets", "ratings"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isArchived: true,
    body: oldPrompt({
      title: "Analyst Target Tracker",
      role: "Act as an analyst-note tracker focused on price target revisions and institutional narrative changes.",
      task: "Find recent target-price and rating changes for selected tickers from institutions such as UBS, Morgan Stanley, Goldman Sachs, JPMorgan, Citi, BofA, Barclays, Mizuho, Evercore, KeyBanc, Susquehanna, and others. Emphasize dates, prior targets, new targets, rationale, and disagreement among firms.",
      deliver: "1. Target revision table. 2. Highest/lowest targets and dispersion. 3. What changed in analyst rationale. 4. Which revisions look reactive versus thesis-changing. 5. Missing data caveats.",
    }),
  },
  {
    title: "Change Detection 30D / 90D",
    slug: "change-detection-30d-90d",
    description: "Find only meaningful changes from 30 and 90 days ago.",
    cadence: "WEEKLY",
    tags: ["change-detection", "narrative"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isArchived: true,
    body: oldPrompt({
      title: "Change Detection 30D / 90D",
      role: "Act as a narrative-change detector and ignore routine news.",
      task: "Compare the selected AI infrastructure landscape today versus 30 and 90 days ago. Focus only on changes that matter for stock selection, earnings expectations, valuation, target prices, or cycle timing.",
      deliver: "1. Narratives strengthening. 2. Narratives weakening. 3. Bottlenecks moving from theory to revenue. 4. Valuation outrunning fundamentals. 5. New names entering the conversation. 6. Names losing momentum.",
    }),
  },
  {
    title: "Anti-Confirmation-Bias Review",
    slug: "anti-confirmation-bias-review",
    description: "Blunt skeptical review that challenges current AI infra assumptions.",
    cadence: "WEEKLY",
    tags: ["risk", "skeptic", "debias"],
    sourceAppHints: ["CLAUDE", "CHATGPT"],
    isFavorite: false,
    isArchived: true,
    body: oldPrompt({
      title: "Anti-Confirmation-Bias Review",
      role: "Act as my anti-confirmation-bias analyst. Your job is not to validate my current views.",
      task: "Challenge the selected themes and tickers. Find ways the AI infrastructure thesis could be over-owned, cyclically fragile, margin-dilutive, capex constrained, overvalued, or already priced in. Identify better diversifiers if I am too concentrated in memory.",
      deliver: "1. Five ways the current thesis could be wrong. 2. Five adjacent themes to diversify. 3. Ten tickers that reduce concentration risk while keeping AI infra exposure. 4. What I should believe less strongly. 5. What would change your mind.",
    }),
  },
  {
    title: "Monthly $2,500 Allocation Research Framework",
    slug: "monthly-2500-allocation-research-framework",
    description: "Research framework for deciding where the next monthly capital tranche deserves attention.",
    cadence: "MONTHLY",
    tags: ["allocation", "monthly"],
    sourceAppHints: ["CLAUDE", "CHATGPT"],
    isArchived: true,
    body: oldPrompt({
      title: "Monthly $2,500 Allocation Research Framework",
      role: "Act as a portfolio research analyst framing choices for a monthly AI infrastructure allocation.",
      task: "Given selected themes and tickers, propose conservative, balanced, and aggressive research allocation frameworks for my next $2,500. This is not personalized financial advice; frame tradeoffs, concentration, timing, and research priority.",
      deliver: "1. Three frameworks with category weights. 2. Example tickers. 3. Why each mix works. 4. Main risks. 5. Which framework deserves study for the next 3 months and why.",
    }),
  },
  {
    title: "Earnings Prep",
    slug: "earnings-prep",
    description: "Prepare for upcoming earnings with questions, guideposts, and scenario expectations.",
    cadence: "AD_HOC",
    tags: ["earnings", "prep"],
    sourceAppHints: ["PERPLEXITY", "CLAUDE"],
    isArchived: true,
    body: oldPrompt({
      title: "Earnings Prep",
      role: "Act as an earnings-prep analyst focused on what matters before the report.",
      task: "For selected tickers with upcoming or recent earnings, identify consensus expectations, guideposts, key segment metrics, management commentary to watch, implied expectations, and likely upside/downside scenario triggers.",
      deliver: "1. Pre-earnings checklist. 2. Consensus and guideposts. 3. Key questions for management. 4. Bull/base/bear reactions. 5. Watch items to update after the call.",
    }),
  },
  {
    title: "Earnings Postmortem",
    slug: "earnings-postmortem",
    description: "Post-earnings review that separates real thesis changes from one-day price reaction.",
    cadence: "AD_HOC",
    tags: ["earnings", "postmortem"],
    sourceAppHints: ["PERPLEXITY", "CLAUDE"],
    isArchived: true,
    body: oldPrompt({
      title: "Earnings Postmortem",
      role: "Act as a post-earnings analyst separating signal from stock reaction.",
      task: "Analyze the selected ticker's latest earnings, call transcript, guidance, segment commentary, margin/FCF trajectory, analyst reactions, and price move. Identify what truly changed versus what was noise.",
      deliver: "1. What beat/missed. 2. What changed in thesis. 3. Guidance quality. 4. Management quotes that matter. 5. Analyst target/rating changes. 6. Updated risks and catalysts.",
    }),
  },
  {
    title: "Power / Cooling Watch",
    slug: "power-cooling-watch",
    description: "Focused tracker for data-center power scarcity, grid buildout, and liquid cooling.",
    cadence: "WEEKLY",
    tags: ["power", "cooling"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isArchived: true,
    body: oldPrompt({
      title: "Power / Cooling Watch",
      role: "Act as a data-center physical-infrastructure analyst focused on power and thermal bottlenecks.",
      task: "Research data-center power availability, grid interconnection delays, on-site generation, nuclear/gas commentary, electrical gear backlogs, liquid cooling adoption, and which selected companies are converting bottlenecks into revenue.",
      deliver: "1. Power/cooling bottleneck map. 2. Which companies have revenue proof. 3. Backlog/order commentary. 4. What is crowded. 5. What can still surprise over the next 12 months.",
    }),
  },
  {
    title: "Optics / Networking Watch",
    slug: "optics-networking-watch",
    description: "Focused tracker for AI cluster networking, optics, interconnect, and data movement.",
    cadence: "WEEKLY",
    tags: ["networking", "optics", "interconnect"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isArchived: true,
    body: oldPrompt({
      title: "Optics / Networking Watch",
      role: "Act as an AI data-movement analyst covering networking, optics, copper, CXL, and interconnect bottlenecks.",
      task: "Research the selected networking/optics names for product-cycle timing, hyperscaler adoption, Ethernet versus InfiniBand, optical module demand, silicon photonics, CXL/connectivity exposure, and margin risks.",
      deliver: "1. Data movement narrative. 2. Winners by layer. 3. Adoption milestones. 4. Target/rating changes. 5. Risks from competition, pricing, or customer concentration.",
    }),
  },
  {
    title: "Robotics / Drones / Physical AI Watch",
    slug: "robotics-drones-physical-ai-watch",
    description: "Watch applied AI, robotics, drones, autonomy, and defense themes without chasing demos.",
    cadence: "WEEKLY",
    tags: ["robotics", "drones", "physical-ai"],
    sourceAppHints: ["PERPLEXITY", "GEMINI"],
    isArchived: true,
    body: oldPrompt({
      title: "Robotics / Drones / Physical AI Watch",
      role: "Act as a physical-AI analyst who distinguishes demos from deployable revenue.",
      task: "Research robotics, drones, autonomy, and defense AI names. Focus on revenue proof, order flow, unit economics, deployment constraints, regulatory catalysts, and which public companies are real arms dealers versus hype trades.",
      deliver: "1. Physical AI state of cycle. 2. Names with revenue proof. 3. Names still mostly narrative. 4. Near-term catalysts. 5. Key thesis killers and valuation risks.",
    }),
  },
];
