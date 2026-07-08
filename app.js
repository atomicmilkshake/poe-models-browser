const $ = (id) => document.getElementById(id);

const BENCHMARK_CACHE_KEY = "poe-browser-benchmarks-v3";
const CHART_PANEL_STATE_KEY = "poe-browser-chart-open";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const BENCHMARK_PROXY_URL = "/api/benchmarks";

const CHART_Y_METRICS = [
  { key: "composite", label: "Composite Index (blended)", higherBetter: true },
  { key: "intelligence", label: "Intelligence Index", higherBetter: true },
  { key: "coding", label: "Coding Index", higherBetter: true },
  { key: "agentic", label: "Agentic Index", higherBetter: true },
  { key: "design_elo", label: "Design Arena ELO (max)", higherBetter: true },
  { key: "website_elo", label: "Website ELO", higherBetter: true },
  { key: "code_elo", label: "Code Categories ELO", higherBetter: true }
];

/** Fixed ELO anchors for normalizing arena scores onto a 0–100 scale. */
const COMPOSITE_ELO_MIN = 800;
const COMPOSITE_ELO_MAX = 1500;

const CHART_X_METRICS = [
  { key: "blended_cost", label: "Blended $/1M (Poe)", lowerBetter: true },
  { key: "prompt_cost", label: "Prompt $/1M", lowerBetter: true },
  { key: "completion_cost", label: "Completion $/1M", lowerBetter: true }
];

const state = {
  raw: [],
  filtered: [],
  page: 1,
  pageSize: 100,
  loading: false,
  benchmarks: new Map(),
  benchmarksLoaded: false,
  chartY: "intelligence",
  chartX: "blended_cost",
  facets: {
    owners: new Set(),
    inputs: new Set(),
    outputs: new Set(),
    endpoints: new Set(),
    features: new Set(),
    pricedOnly: false,
    benchmarkedOnly: false,
    toolsOnly: false,
    webSearchOnly: false,
    paretoOnly: false,
    blendedMin: null,
    blendedMax: null,
    promptMin: null,
    promptMax: null,
    completionMin: null,
    completionMax: null,
    contextMin: null,
    contextMax: null,
    intelMin: null,
    intelMax: null
  }
};

const els = {
  fetchForm: $("fetchForm"),
  endpointUrl: $("endpointUrl"),
  proxyUrl: $("proxyUrl"),
  refreshBenchmarksBtn: $("refreshBenchmarksBtn"),
  loadBtn: $("loadBtn"),
  demoBtn: $("demoBtn"),
  searchInput: $("searchInput"),
  ownerChips: $("ownerChips"),
  inputChips: $("inputChips"),
  outputChips: $("outputChips"),
  endpointChips: $("endpointChips"),
  featureChips: $("featureChips"),
  pricedOnlyChip: $("pricedOnlyChip"),
  benchmarkedOnlyChip: $("benchmarkedOnlyChip"),
  toolsOnlyChip: $("toolsOnlyChip"),
  webSearchOnlyChip: $("webSearchOnlyChip"),
  paretoOnlyChip: $("paretoOnlyChip"),
  blendedMin: $("blendedMin"),
  blendedMax: $("blendedMax"),
  blendedValue: $("blendedValue"),
  blendedTrack: $("blendedTrack"),
  promptMin: $("promptMin"),
  promptMax: $("promptMax"),
  promptValue: $("promptValue"),
  promptTrack: $("promptTrack"),
  completionMin: $("completionMin"),
  completionMax: $("completionMax"),
  completionValue: $("completionValue"),
  completionTrack: $("completionTrack"),
  contextMin: $("contextMin"),
  contextMax: $("contextMax"),
  contextValue: $("contextValue"),
  contextTrack: $("contextTrack"),
  intelMin: $("intelMin"),
  intelMax: $("intelMax"),
  intelValue: $("intelValue"),
  intelTrack: $("intelTrack"),
  sortBy: $("sortBy"),
  sortDir: $("sortDir"),
  groupBy: $("groupBy"),
  viewMode: $("viewMode"),
  clearFiltersBtn: $("clearFiltersBtn"),
  exportJsonBtn: $("exportJsonBtn"),
  exportCsvBtn: $("exportCsvBtn"),
  stats: $("stats"),
  status: $("status"),
  chartPanel: $("chartPanel"),
  chartYAxis: $("chartYAxis"),
  chartXAxis: $("chartXAxis"),
  benchmarkChart: $("benchmarkChart"),
  chartTooltip: $("chartTooltip"),
  results: $("results"),
  pageSize: $("pageSize"),
  pageLabel: $("pageLabel"),
  prevPageBtn: $("prevPageBtn"),
  nextPageBtn: $("nextPageBtn"),
  paginationWrap: $("paginationWrap")
};

const SEARCH_KEYS = [
  "id",
  "owned_by",
  "description",
  "root",
  "input_modalities_text",
  "output_modalities_text",
  "supported_features_text",
  "supported_endpoints_text",
  "display_name"
];

const TABLE_COLUMNS = [
  { key: "id", label: "Model Id", sortable: true, render: (r) => '<td class="mono">' + escapeHtml(r.id) + "</td>" },
  { key: "display_name", label: "Display Name", sortable: true, render: (r) => "<td>" + escapeHtml(r.display_name || "n/a") + "</td>" },
  { key: "owned_by", label: "Owner", sortable: true, render: (r) => "<td>" + escapeHtml(r.owned_by) + "</td>" },
  { key: "created", label: "Created", sortable: true, render: (r) => "<td>" + fmtDateHtml(r.created) + "</td>" },
  { key: "context_length", label: "Context", sortable: true, render: (r) => "<td>" + fmtNum(r.context_length) + "</td>" },
  { key: "price_prompt", label: "Prompt Price", sortable: true, render: (r) => "<td>" + fmtPrice(r.price_prompt) + "</td>" },
  { key: "price_completion", label: "Completion Price", sortable: true, render: (r) => "<td>" + fmtPrice(r.price_completion) + "</td>" },
  { key: "input_modalities", label: "Input", sortable: false, render: (r) => "<td>" + tagList(r.input_modalities) + "</td>" },
  { key: "output_modalities", label: "Output", sortable: false, render: (r) => "<td>" + tagList(r.output_modalities) + "</td>" },
  { key: "supported_endpoints", label: "Endpoints", sortable: false, render: (r) => "<td>" + tagList(r.supported_endpoints) + "</td>" },
  { key: "supported_features", label: "Features", sortable: false, render: (r) => "<td>" + tagList(r.supported_features) + "</td>" }
];

// Sample demo data (normalized shape) so the app works offline
const DEMO_MODELS = [
  {
    id: "Claude-Sonnet-5",
    owned_by: "anthropic",
    description: "Anthropic's Sonnet 5 — strong coding and agentic performance at mid-tier pricing.",
    root: "Claude-Sonnet-5",
    created: 1780000000,
    display_name: "Claude Sonnet 5",
    context_length: 200000,
    max_output_tokens: 64000,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_endpoints: ["chat_completions", "messages"],
    supported_features: ["tools", "vision"],
    price_prompt: 0.000003,
    price_completion: 0.000015,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: false,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text image",
    output_modalities_text: "text",
    supported_features_text: "tools vision",
    supported_endpoints_text: "chat_completions messages"
  },
  {
    id: "GPT-5.4",
    owned_by: "openai",
    description: "OpenAI GPT-5.4 — frontier multimodal model with strong reasoning.",
    root: "GPT-5.4",
    created: 1780000000,
    display_name: "GPT-5.4",
    context_length: 256000,
    max_output_tokens: 32768,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_endpoints: ["chat_completions", "responses"],
    supported_features: ["tools", "vision", "web_search"],
    price_prompt: 0.000005,
    price_completion: 0.000015,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: true,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text image",
    output_modalities_text: "text",
    supported_features_text: "tools vision web_search",
    supported_endpoints_text: "chat_completions responses"
  },
  {
    id: "Gemini-3.5-Flash",
    owned_by: "google",
    description: "Google Gemini 3.5 Flash — fast multimodal model with strong price/performance.",
    root: "Gemini-3.5-Flash",
    created: 1780000000,
    display_name: "Gemini 3.5 Flash",
    context_length: 1000000,
    max_output_tokens: 65536,
    input_modalities: ["text", "image", "audio", "video"],
    output_modalities: ["text"],
    supported_endpoints: ["chat_completions"],
    supported_features: ["tools", "vision", "web_search"],
    price_prompt: 0.0000003,
    price_completion: 0.0000025,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: true,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text image audio video",
    output_modalities_text: "text",
    supported_features_text: "tools vision web_search",
    supported_endpoints_text: "chat_completions"
  },
  {
    id: "DeepSeek-V4-Pro",
    owned_by: "deepseek",
    description: "DeepSeek V4 Pro — high intelligence at low cost.",
    root: "DeepSeek-V4-Pro",
    created: 1780000000,
    display_name: "DeepSeek V4 Pro",
    context_length: 128000,
    max_output_tokens: 8192,
    input_modalities: ["text"],
    output_modalities: ["text"],
    supported_endpoints: ["chat_completions"],
    supported_features: ["tools"],
    price_prompt: 0.000001,
    price_completion: 0.000006,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: false,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text",
    output_modalities_text: "text",
    supported_features_text: "tools",
    supported_endpoints_text: "chat_completions"
  },
  {
    id: "Claude-Haiku-4.5",
    owned_by: "anthropic",
    description: "Anthropic Claude Haiku 4.5 — fast and affordable.",
    root: "Claude-Haiku-4.5",
    created: 1760000000,
    display_name: "Claude Haiku 4.5",
    context_length: 200000,
    max_output_tokens: 8192,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_endpoints: ["chat_completions"],
    supported_features: ["tools", "vision"],
    price_prompt: 0.000001,
    price_completion: 0.000005,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: false,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text image",
    output_modalities_text: "text",
    supported_features_text: "tools vision",
    supported_endpoints_text: "chat_completions"
  },
  {
    id: "GPT-5.4-mini",
    owned_by: "openai",
    description: "OpenAI GPT-5.4 mini — compact frontier model.",
    root: "GPT-5.4-mini",
    created: 1780000000,
    display_name: "GPT-5.4 mini",
    context_length: 128000,
    max_output_tokens: 16384,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_endpoints: ["chat_completions"],
    supported_features: ["tools", "vision"],
    price_prompt: 0.0000005,
    price_completion: 0.000002,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: false,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text image",
    output_modalities_text: "text",
    supported_features_text: "tools vision",
    supported_endpoints_text: "chat_completions"
  },
  {
    id: "gpt-4o",
    owned_by: "openai",
    description: "GPT-4o multimodal model (legacy demo entry).",
    root: "gpt-4o",
    created: 1715366400,
    display_name: "GPT-4o",
    context_length: 128000,
    max_output_tokens: 4096,
    input_modalities: ["text", "image", "audio"],
    output_modalities: ["text", "audio"],
    supported_endpoints: ["chat_completions", "responses"],
    supported_features: ["tools", "web_search", "vision"],
    price_prompt: 0.000005,
    price_completion: 0.000015,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: true,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text image audio",
    output_modalities_text: "text audio",
    supported_features_text: "tools web_search vision",
    supported_endpoints_text: "chat_completions responses"
  },
  {
    id: "gpt-4o-mini",
    owned_by: "openai",
    description: "Affordable and intelligent small model for fast, lightweight tasks.",
    root: "gpt-4o-mini",
    created: 1721088000,
    display_name: "GPT-4o mini",
    context_length: 128000,
    max_output_tokens: 16384,
    input_modalities: ["text", "image", "audio"],
    output_modalities: ["text", "audio"],
    supported_endpoints: ["chat_completions"],
    supported_features: ["tools", "vision"],
    price_prompt: 0.00000015,
    price_completion: 0.0000006,
    price_image: null,
    price_request: null,
    has_pricing: true,
    supports_tools: true,
    supports_web_search: false,
    input_primary: "text",
    output_primary: "text",
    endpoint_primary: "chat_completions",
    input_modalities_text: "text image audio",
    output_modalities_text: "text audio",
    supported_features_text: "tools vision",
    supported_endpoints_text: "chat_completions"
  }
];

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeTimestamp(ts) {
  if (!Number.isFinite(ts)) return null;
  return ts > 1e12 ? Math.floor(ts / 1000) : ts;
}

function toDate(ts) {
  const norm = normalizeTimestamp(ts);
  if (!Number.isFinite(norm)) return null;
  const d = new Date(norm * 1000);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(ts) {
  const d = toDate(ts);
  if (!d) return "n/a";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function fmtDateHtml(ts) {
  const d = toDate(ts);
  if (!d) return '<span class="mono">n/a</span>';
  const iso = d.toISOString().slice(0, 10);
  return '<time class="date-cell" datetime="' + iso + '">' + escapeHtml(fmtDate(ts)) + "</time>";
}

function normalizeSlug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMatchKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/^(openai|anthropic|google|meta|mistral|cohere)[:\/\s-]+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Poe often appends a short host/provider code to the model id
 * (e.g. deepseek-v4-flash-el for EmpirioLabs). OpenRouter uses the bare id.
 * Strip known suffixes when the owner matches, so benchmarks can align.
 */
const POE_HOST_SUFFIXES = [
  { re: /-(?:turbo-)?di$/i, owners: /deepinfra/i },
  { re: /-fw$/i, owners: /fireworks/i },
  { re: /-el$/i, owners: /empirio/i },
  { re: /-e$/i, owners: /empirio/i },
  { re: /-cs$/i, owners: /cerebras/i },
  { re: /-tm$/i, owners: /novita/i },
  { re: /-n$/i, owners: /novita/i },
  { re: /-t$/i, owners: /together/i },
  { re: /-i$/i, owners: /novita/i }
];

function stripPoeHostSuffix(id, ownedBy) {
  let s = String(id || "");
  if (!s) return s;
  const owner = String(ownedBy || "");
  for (const { re, owners } of POE_HOST_SUFFIXES) {
    if (owners.test(owner) && re.test(s)) return s.replace(re, "");
  }
  // Fallback when owned_by is missing/odd but the suffix is unambiguous.
  if (/-(?:el|fw|di|cs)$/i.test(s)) return s.replace(/-(?:el|fw|di|cs)$/i, "");
  return s;
}

/** Extra Poe id → OpenRouter short-slug aliases for awkward renames. */
const POE_BENCHMARK_ALIASES = {
  "deepseek-v3.1-tm": "deepseek-v3.1-terminus",
  "deepseek-v3.1-n": "deepseek-chat-v3.1",
  "deepseek-r1-n": "deepseek-r1-0528"
};

function normalizeModel(m) {
  const input = m?.architecture?.input_modalities || m.input_modalities || [];
  const output = m?.architecture?.output_modalities || m.output_modalities || [];
  const endpoints = m?.supported_endpoints || [];
  const features = m?.supported_features || [];
  const pricing = m?.pricing || {};
  const metadata = m?.metadata || {};
  const contextLength = m?.context_length ?? m?.context_window?.context_length ?? null;

  const row = {
    id: m.id || "",
    owned_by: m.owned_by || "Unknown",
    description: m.description || "",
    root: m.root || "",
    created: normalizeTimestamp(toNumber(m.created)),
    display_name: metadata.display_name || m.display_name || "",
    context_length: toNumber(contextLength),
    max_output_tokens: toNumber(m?.context_window?.max_output_tokens),
    input_modalities: input,
    output_modalities: output,
    supported_endpoints: endpoints,
    supported_features: features,
    price_prompt: toNumber(pricing.prompt ?? m.price_prompt),
    price_completion: toNumber(pricing.completion ?? m.price_completion),
    price_image: toNumber(pricing.image ?? m.price_image),
    price_request: toNumber(pricing.request ?? m.price_request),
    has_pricing: [pricing.prompt, pricing.completion, pricing.image, pricing.request, m.price_prompt, m.price_completion].some(v => v != null),
    supports_tools: features.includes("tools") || m.supports_tools === true,
    supports_web_search: features.includes("web_search") || m.supports_web_search === true,
    input_primary: input[0] || "Unknown",
    output_primary: output[0] || "Unknown",
    endpoint_primary: endpoints[0] || "None",
    input_modalities_text: input.join(" "),
    output_modalities_text: output.join(" "),
    supported_features_text: features.join(" "),
    supported_endpoints_text: endpoints.join(" ")
  };

  enrichRowWithBenchmark(row);
  return row;
}

function designArenaElo(arenaList, category) {
  if (!Array.isArray(arenaList) || !arenaList.length) return null;
  const rows = category
    ? arenaList.filter(a => a.category === category)
    : arenaList.filter(a => a.arena === "models");
  if (!rows.length) return null;
  const max = rows.reduce((m, a) => {
    const elo = toNumber(a.elo);
    return Number.isFinite(elo) ? Math.max(m, elo) : m;
  }, -Infinity);
  return Number.isFinite(max) ? max : null;
}

/** Clamp AA-style indices (already ~0–100) onto a 0–100 scale. */
function normalizeIndexScore(v) {
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, v));
}

/** Map arena ELO onto 0–100 using fixed anchors so the composite is stable. */
function normalizeEloScore(v) {
  if (!Number.isFinite(v)) return null;
  const span = COMPOSITE_ELO_MAX - COMPOSITE_ELO_MIN;
  if (span <= 0) return null;
  return Math.max(0, Math.min(100, ((v - COMPOSITE_ELO_MIN) / span) * 100));
}

/**
 * Equal-weight average of available benchmark components, each normalized to 0–100.
 * Uses intelligence / coding / agentic indices plus design / website / code ELOs.
 */
function computeCompositeIndex(scores) {
  const parts = [
    normalizeIndexScore(scores.intelligence),
    normalizeIndexScore(scores.coding),
    normalizeIndexScore(scores.agentic),
    normalizeEloScore(scores.design_elo),
    normalizeEloScore(scores.website_elo),
    normalizeEloScore(scores.code_elo)
  ].filter(Number.isFinite);
  if (!parts.length) return null;
  return parts.reduce((sum, n) => sum + n, 0) / parts.length;
}

function parseBenchmarkEntry(entry) {
  const aa = entry.benchmarks?.artificial_analysis || {};
  const arena = entry.benchmarks?.design_arena || [];
  const pr = entry.pricing || {};
  const prompt = toNumber(pr.prompt);
  const completion = toNumber(pr.completion);
  const slug = entry.id || entry.canonical_slug || entry.slug || "";
  const shortSlug = String(slug).includes("/") ? String(slug).split("/").pop() : slug;
  const displayName = String(entry.name || "").replace(/^[^:]+:\s*/, "");

  let priceBlended = null;
  if (Number.isFinite(prompt) && Number.isFinite(completion)) {
    priceBlended = ((prompt * 3) + completion) / 4 * 1_000_000;
  }

  const intelligence = toNumber(aa.intelligence_index);
  const coding = toNumber(aa.coding_index);
  const agentic = toNumber(aa.agentic_index);
  const design_elo = designArenaElo(arena);
  const website_elo = designArenaElo(arena, "website");
  const code_elo = designArenaElo(arena, "codecategories");

  return {
    slug,
    short_slug: shortSlug,
    name: entry.name || "",
    display_name: displayName,
    intelligence,
    coding,
    agentic,
    design_elo,
    website_elo,
    code_elo,
    composite: computeCompositeIndex({
      intelligence,
      coding,
      agentic,
      design_elo,
      website_elo,
      code_elo
    }),
    price_1m_blended: priceBlended,
    price_1m_input: Number.isFinite(prompt) ? prompt * 1_000_000 : null,
    price_1m_output: Number.isFinite(completion) ? completion * 1_000_000 : null
  };
}

function indexBenchmark(parsed) {
  const keys = [
    normalizeSlug(parsed.slug),
    normalizeSlug(parsed.short_slug),
    normalizeMatchKey(parsed.slug),
    normalizeMatchKey(parsed.short_slug),
    normalizeMatchKey(parsed.name),
    normalizeMatchKey(parsed.display_name)
  ];
  for (const key of keys) {
    if (!key) continue;
    const existing = state.benchmarks.get(key);
    if (!existing) {
      state.benchmarks.set(key, parsed);
      continue;
    }
    const isSlugKey = (entry) =>
      key === normalizeSlug(entry.slug) ||
      key === normalizeSlug(entry.short_slug) ||
      key === normalizeMatchKey(entry.slug) ||
      key === normalizeMatchKey(entry.short_slug);
    const existingIsSlug = isSlugKey(existing);
    const incomingIsSlug = isSlugKey(parsed);
    // Prefer real slug keys over generic display-name collisions (e.g. "DeepSeek V3.1").
    if (incomingIsSlug && !existingIsSlug) {
      state.benchmarks.set(key, parsed);
    } else if (incomingIsSlug === existingIsSlug) {
      if ((parsed.intelligence ?? -1) > (existing.intelligence ?? -1)) {
        state.benchmarks.set(key, parsed);
      }
    }
  }
}

function mergeBenchmarksIntoState(models) {
  state.benchmarks.clear();
  for (const entry of models) {
    const parsed = parseBenchmarkEntry(entry);
    if (!parsed.slug) continue;
    indexBenchmark(parsed);
  }
  state.benchmarksLoaded = true;
  reEnrichAllRows();
}

function matchBenchmark(poeModel) {
  if (!state.benchmarks.size) return null;

  const rawId = String(poeModel.id || "");
  const rawRoot = String(poeModel.root || "");
  const ownedBy = poeModel.owned_by || poeModel.owner || "";
  const strippedId = stripPoeHostSuffix(rawId, ownedBy);
  const strippedRoot = stripPoeHostSuffix(rawRoot, ownedBy);
  const aliasTarget = POE_BENCHMARK_ALIASES[rawId] || POE_BENCHMARK_ALIASES[strippedId];

  const candidates = [
    aliasTarget ? normalizeSlug(aliasTarget) : null,
    aliasTarget ? normalizeMatchKey(aliasTarget) : null,
    normalizeSlug(rawId),
    normalizeSlug(strippedId),
    normalizeSlug(rawRoot),
    normalizeSlug(strippedRoot),
    normalizeMatchKey(rawId),
    normalizeMatchKey(strippedId),
    normalizeMatchKey(rawRoot),
    normalizeMatchKey(strippedRoot),
    normalizeSlug(poeModel.display_name),
    normalizeMatchKey(poeModel.display_name),
    // Dots vs dashes (claude-3.5-sonnet <-> claude-3-5-sonnet)
    normalizeSlug(rawId.replace(/\./g, "-")),
    normalizeSlug(rawId.replace(/-/g, ".")),
    normalizeSlug(strippedId.replace(/\./g, "-")),
    normalizeSlug(strippedId.replace(/-/g, ".")),
    normalizeMatchKey(String(poeModel.display_name || "").replace(/\./g, "-"))
  ];

  for (const key of candidates) {
    if (key && state.benchmarks.has(key)) return state.benchmarks.get(key);
  }

  // Fuzzy: prefer an OpenRouter short slug that equals / ends with the Poe id
  // (after stripping Poe host suffixes like -el / -fw).
  const needles = [
    aliasTarget ? normalizeMatchKey(aliasTarget) : null,
    normalizeMatchKey(strippedId),
    normalizeMatchKey(rawId),
    normalizeMatchKey(strippedRoot)
  ].filter((n, i, arr) => n && n.length >= 6 && arr.indexOf(n) === i);

  if (!needles.length) return null;

  let best = null;
  let bestScore = -1;
  for (const [key, entry] of state.benchmarks) {
    if (key !== normalizeSlug(entry.short_slug) && key !== normalizeMatchKey(entry.short_slug)) continue;
    const hay = normalizeMatchKey(entry.short_slug);
    for (const needle of needles) {
      let score = -1;
      if (hay === needle) score = 100 + needle.length;
      // Only allow prefix/suffix when the remainder is a short host tag, not mid-string drift
      // (avoids deepseekv31 matching deepseekchatv31).
      else if (hay.startsWith(needle) && hay.length - needle.length <= 4) score = 50 + needle.length;
      else if (needle.startsWith(hay) && needle.length - hay.length <= 4) score = 40 + hay.length;
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      } else if (score === bestScore && best && (entry.intelligence ?? -1) > (best.intelligence ?? -1)) {
        best = entry;
      }
    }
  }
  return best;
}

function enrichRowWithBenchmark(row) {
  const match = matchBenchmark(row);
  row.benchmark_match = match?.slug || null;
  row.benchmark = match ? { ...match } : null;
}

function reEnrichAllRows() {
  for (const row of state.raw) enrichRowWithBenchmark(row);
}

function hasPerTokenPricing(row) {
  return Number.isFinite(row.price_prompt) && Number.isFinite(row.price_completion);
}

function blendedCostPer1M(row) {
  if (!hasPerTokenPricing(row)) return null;
  return ((row.price_prompt * 3) + row.price_completion) / 4 * 1_000_000;
}

function promptCostPer1M(row) {
  if (!Number.isFinite(row.price_prompt)) return null;
  return row.price_prompt * 1_000_000;
}

function completionCostPer1M(row) {
  if (!Number.isFinite(row.price_completion)) return null;
  return row.price_completion * 1_000_000;
}

function getChartYValue(row, metricKey) {
  const b = row.benchmark;
  if (!b) return null;
  return b[metricKey] ?? null;
}

function getChartXValue(row, metricKey) {
  const b = row.benchmark;
  switch (metricKey) {
    case "blended_cost": {
      const poe = blendedCostPer1M(row);
      if (Number.isFinite(poe)) return poe;
      return b?.price_1m_blended ?? null;
    }
    case "prompt_cost": {
      const poe = promptCostPer1M(row);
      if (Number.isFinite(poe)) return poe;
      return b?.price_1m_input ?? null;
    }
    case "completion_cost": {
      const poe = completionCostPer1M(row);
      if (Number.isFinite(poe)) return poe;
      return b?.price_1m_output ?? null;
    }
    default:
      return null;
  }
}

function isCostMetric(metricKey) {
  return metricKey === "blended_cost" || metricKey === "prompt_cost" || metricKey === "completion_cost";
}

function getChartPoint(row) {
  const y = getChartYValue(row, state.chartY);
  const x = getChartXValue(row, state.chartX);
  if (!Number.isFinite(y) || !Number.isFinite(x)) return null;
  // Cost axes require either Poe per-token pricing or OpenRouter fallback pricing.
  if (isCostMetric(state.chartX) && !hasPerTokenPricing(row) && !Number.isFinite(row.benchmark?.price_1m_blended)) {
    return null;
  }
  return { id: row.id, x, y, row };
}

function computeParetoFrontier(points, yHigherBetter = true, xLowerBetter = true) {
  const frontier = [];
  for (const p of points) {
    let dominated = false;
    for (const q of points) {
      if (q === p) continue;
      const yBetter = yHigherBetter ? q.y >= p.y : q.y <= p.y;
      const xBetter = xLowerBetter ? q.x <= p.x : q.x >= p.x;
      const yStrict = yHigherBetter ? q.y > p.y : q.y < p.y;
      const xStrict = xLowerBetter ? q.x < p.x : q.x > p.x;
      if (yBetter && xBetter && (yStrict || xStrict)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) frontier.push(p);
  }
  frontier.sort((a, b) => a.x - b.x);
  return frontier;
}

function getParetoEligibleRows(rows) {
  const yMeta = CHART_Y_METRICS.find(m => m.key === state.chartY);
  const xMeta = CHART_X_METRICS.find(m => m.key === state.chartX);
  const points = [];
  const pointById = new Map();

  for (const row of rows) {
    if (!row.benchmark_match) continue;
    const pt = getChartPoint(row);
    if (!pt) continue;
    points.push(pt);
    pointById.set(row.id, pt);
  }

  const frontier = computeParetoFrontier(
    points,
    yMeta?.higherBetter !== false,
    xMeta?.lowerBetter !== false
  );
  const frontierIds = new Set(frontier.map(p => p.id));
  return { points, frontierIds, frontier };
}

async function loadBundledBenchmarks() {
  try {
    const res = await fetch("benchmarks.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    mergeBenchmarksIntoState(data.models || []);
    return true;
  } catch (err) {
    console.warn("Failed to load bundled benchmarks:", err);
    return false;
  }
}

function loadCachedBenchmarks() {
  try {
    const raw = localStorage.getItem(BENCHMARK_CACHE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.models)) return false;
    mergeBenchmarksIntoState(data.models);
    return true;
  } catch {
    return false;
  }
}

async function refreshBenchmarks() {
  els.refreshBenchmarksBtn.disabled = true;
  setStatus("Refreshing benchmark data from OpenRouter...");

  try {
    // Prefer local proxy (avoids CORS); fall back to public OpenRouter URL.
    const candidates = [BENCHMARK_PROXY_URL, OPENROUTER_MODELS_URL];
    let models = null;
    let lastError = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("HTTP " + res.status + " from " + url);
        const data = await res.json();
        const list = data.data || data.models || (Array.isArray(data) ? data : []);
        if (!Array.isArray(list) || !list.length) throw new Error("Unexpected response shape from " + url);
        models = list;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!models) throw lastError || new Error("No benchmark source available");

    const payload = { fetchedAt: new Date().toISOString(), source: "openrouter", models };
    localStorage.setItem(BENCHMARK_CACHE_KEY, JSON.stringify(payload));
    mergeBenchmarksIntoState(models);
    renderAll();
    setStatus("Benchmarks refreshed (" + models.length + " OpenRouter models).");
  } catch (err) {
    setStatus("Benchmark refresh failed: " + (err.message || "Unknown error"), true);
  } finally {
    els.refreshBenchmarksBtn.disabled = false;
  }
}

function fmtNum(n) {
  return Number.isFinite(n) ? n.toLocaleString() : "n/a";
}

function fmtPrice(n) {
  return Number.isFinite(n) ? n.toFixed(10).replace(/0+$/, "").replace(/\.$/, "") : "n/a";
}

function fmtChartValue(n, metricKey) {
  if (!Number.isFinite(n)) return "n/a";
  if (isCostMetric(metricKey)) {
    if (n >= 100) return "$" + n.toFixed(0);
    if (n >= 10) return "$" + n.toFixed(1);
    if (n >= 1) return "$" + n.toFixed(2);
    if (n >= 0.01) return "$" + n.toFixed(2);
    return "$" + n.toFixed(3);
  }
  if (metricKey.endsWith("_elo") || metricKey === "design_elo") return n.toFixed(0);
  return n.toFixed(1);
}

/** Nice log-spaced tick values between x0 and x1 (inclusive-ish). */
function logCostTicks(x0, x1, maxTicks = 6) {
  if (!(x0 > 0) || !(x1 > x0)) return [x0, x1].filter(n => Number.isFinite(n) && n > 0);
  const logMin = Math.log10(x0);
  const logMax = Math.log10(x1);
  const span = logMax - logMin;
  const rawStep = span / Math.max(1, maxTicks - 1);
  // Snap step to 1, 0.5, or 0.25 decades
  const step = rawStep >= 0.75 ? 1 : rawStep >= 0.35 ? 0.5 : 0.25;
  const start = Math.ceil(logMin / step) * step;
  const ticks = [];
  for (let e = start; e <= logMax + 1e-9; e += step) {
    ticks.push(Math.pow(10, e));
  }
  if (!ticks.length || ticks[0] > x0 * 1.05) ticks.unshift(x0);
  if (ticks[ticks.length - 1] < x1 / 1.05) ticks.push(x1);
  return ticks;
}

function setStatus(msg, isWarn = false) {
  els.status.textContent = msg;
  els.status.className = isWarn ? "status-line warn" : "status-line";
}

function uniqueSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function setToggleChipState(chipEl, isActive) {
  chipEl.classList.toggle("is-active", isActive);
  chipEl.setAttribute("aria-pressed", String(isActive));
}

function toggleFacet(setObj, value) {
  if (setObj.has(value)) {
    setObj.delete(value);
  } else {
    setObj.add(value);
  }
}

function renderChipGroup(containerEl, values, selectedSet) {
  containerEl.innerHTML = "";
  if (!values.length) {
    const empty = document.createElement("span");
    empty.className = "mono";
    empty.style.color = "var(--muted)";
    empty.style.fontSize = "0.8rem";
    empty.textContent = "none available";
    containerEl.appendChild(empty);
    return;
  }
  for (const value of values) {
    const btn = document.createElement("button");
    const active = selectedSet.has(value);
    btn.type = "button";
    btn.className = "chip" + (active ? " is-active" : "");
    btn.textContent = value;
    btn.setAttribute("aria-pressed", String(active));
    btn.addEventListener("click", () => {
      toggleFacet(selectedSet, value);
      state.page = 1;
      renderAll();
    });
    containerEl.appendChild(btn);
  }
}

function rebuildFacetChips(rows) {
  const owners = uniqueSorted(rows.map(r => r.owned_by));
  const inputs = uniqueSorted(rows.flatMap(r => r.input_modalities));
  const outputs = uniqueSorted(rows.flatMap(r => r.output_modalities));
  const endpoints = uniqueSorted(rows.flatMap(r => r.supported_endpoints));
  const features = uniqueSorted(rows.flatMap(r => r.supported_features));

  state.facets.owners = new Set([...state.facets.owners].filter(v => owners.includes(v)));
  state.facets.inputs = new Set([...state.facets.inputs].filter(v => inputs.includes(v)));
  state.facets.outputs = new Set([...state.facets.outputs].filter(v => outputs.includes(v)));
  state.facets.endpoints = new Set([...state.facets.endpoints].filter(v => endpoints.includes(v)));
  state.facets.features = new Set([...state.facets.features].filter(v => features.includes(v)));

  renderChipGroup(els.ownerChips, owners, state.facets.owners);
  renderChipGroup(els.inputChips, inputs, state.facets.inputs);
  renderChipGroup(els.outputChips, outputs, state.facets.outputs);
  renderChipGroup(els.endpointChips, endpoints, state.facets.endpoints);
  renderChipGroup(els.featureChips, features, state.facets.features);

  setToggleChipState(els.pricedOnlyChip, state.facets.pricedOnly);
  setToggleChipState(els.benchmarkedOnlyChip, state.facets.benchmarkedOnly);
  setToggleChipState(els.toolsOnlyChip, state.facets.toolsOnly);
  setToggleChipState(els.webSearchOnlyChip, state.facets.webSearchOnly);
  setToggleChipState(els.paretoOnlyChip, state.facets.paretoOnly);
  configureSlidersFromRows(rows);
}

function rowMatchesSearch(row, q) {
  if (!q) return true;
  return SEARCH_KEYS.some(k => String(row[k] || "").toLowerCase().includes(q));
}

function setMatches(setObj, valueOrArray) {
  if (!setObj.size) return true;
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.some(v => setObj.has(v));
  }
  return setObj.has(valueOrArray);
}

function parseOptionalNumber(el) {
  if (!el) return null;
  const raw = String(el.value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const SLIDER_DEFS = [
  {
    key: "blended",
    minEl: () => els.blendedMin,
    maxEl: () => els.blendedMax,
    valueEl: () => els.blendedValue,
    trackEl: () => els.blendedTrack,
    facetMin: "blendedMin",
    facetMax: "blendedMax",
    defaultMax: 100,
    step: 0.1,
    /** Cap domain at this percentile so a few ultra-expensive models don't crush the slider. */
    capPercentile: 0.95,
    format: (n) => "$" + (n < 10 ? n.toFixed(2) : n.toFixed(1)),
    valuesFromRows: (rows) => rows.map(rowBlendedCost).filter(v => Number.isFinite(v) && v >= 0)
  },
  {
    key: "prompt",
    minEl: () => els.promptMin,
    maxEl: () => els.promptMax,
    valueEl: () => els.promptValue,
    trackEl: () => els.promptTrack,
    facetMin: "promptMin",
    facetMax: "promptMax",
    defaultMax: 100,
    step: 0.1,
    capPercentile: 0.95,
    format: (n) => "$" + (n < 10 ? n.toFixed(2) : n.toFixed(1)),
    valuesFromRows: (rows) => rows.map(rowPromptCost).filter(v => Number.isFinite(v) && v >= 0)
  },
  {
    key: "completion",
    minEl: () => els.completionMin,
    maxEl: () => els.completionMax,
    valueEl: () => els.completionValue,
    trackEl: () => els.completionTrack,
    facetMin: "completionMin",
    facetMax: "completionMax",
    defaultMax: 100,
    step: 0.1,
    capPercentile: 0.95,
    format: (n) => "$" + (n < 10 ? n.toFixed(2) : n.toFixed(1)),
    valuesFromRows: (rows) => rows.map(rowCompletionCost).filter(v => Number.isFinite(v) && v >= 0)
  },
  {
    key: "context",
    minEl: () => els.contextMin,
    maxEl: () => els.contextMax,
    valueEl: () => els.contextValue,
    trackEl: () => els.contextTrack,
    facetMin: "contextMin",
    facetMax: "contextMax",
    defaultMax: 2000000,
    step: 1000,
    format: (n) => n >= 1000000 ? (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M" : n.toLocaleString(),
    valuesFromRows: (rows) => rows.map(r => r.context_length).filter(Number.isFinite)
  },
  {
    key: "intel",
    minEl: () => els.intelMin,
    maxEl: () => els.intelMax,
    valueEl: () => els.intelValue,
    trackEl: () => els.intelTrack,
    facetMin: "intelMin",
    facetMax: "intelMax",
    defaultMax: 100,
    step: 0.1,
    format: (n) => n.toFixed(1),
    valuesFromRows: (rows) => rows.map(r => r.benchmark?.intelligence).filter(Number.isFinite)
  }
];

function niceCeil(n, step) {
  if (!Number.isFinite(n) || n <= 0) return step;
  return Math.ceil(n / step) * step;
}

function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const clamped = Math.max(0, Math.min(1, p));
  const idx = (sortedAsc.length - 1) * clamped;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const t = idx - lo;
  return sortedAsc[lo] * (1 - t) + sortedAsc[hi] * t;
}

/**
 * Slider domain max. For skewed cost data, use a high percentile so outliers
 * don't squash the useful range. "Any" (thumb at max) still means no filter,
 * so models above the cap remain visible.
 */
function sliderDomainMax(values, def) {
  if (!values.length) return Math.max(def.step, niceCeil(def.defaultMax, def.step));
  const sorted = [...values].sort((a, b) => a - b);
  const rawMax = sorted[sorted.length - 1];
  let domain = rawMax;
  if (Number.isFinite(def.capPercentile)) {
    const capped = percentile(sorted, def.capPercentile);
    // Only shrink when the tail is extreme (cap well below the absolute max).
    if (Number.isFinite(capped) && capped > 0 && capped < rawMax * 0.5) {
      domain = capped;
    }
  }
  return Math.max(def.step, niceCeil(domain * 1.05, def.step));
}

function updateDualSliderTrack(def) {
  const minEl = def.minEl();
  const maxEl = def.maxEl();
  const trackEl = def.trackEl();
  if (!minEl || !maxEl || !trackEl) return;
  const lo = Number(minEl.min);
  const hi = Number(minEl.max);
  const span = hi - lo || 1;
  const left = ((Number(minEl.value) - lo) / span) * 100;
  const right = ((Number(maxEl.value) - lo) / span) * 100;
  trackEl.style.left = left + "%";
  trackEl.style.width = Math.max(0, right - left) + "%";
}

function updateSliderValueLabel(def) {
  const minEl = def.minEl();
  const maxEl = def.maxEl();
  const valueEl = def.valueEl();
  if (!minEl || !maxEl || !valueEl) return;
  const lo = Number(minEl.min);
  const hi = Number(minEl.max);
  const minV = Number(minEl.value);
  const maxV = Number(maxEl.value);
  const atFull = minV <= lo && maxV >= hi;
  valueEl.textContent = atFull
    ? "Any"
    : def.format(minV) + " – " + def.format(maxV);
  updateDualSliderTrack(def);
}

function syncRangeFacetsFromInputs() {
  for (const def of SLIDER_DEFS) {
    const minEl = def.minEl();
    const maxEl = def.maxEl();
    if (!minEl || !maxEl) continue;
    const lo = Number(minEl.min);
    const hi = Number(minEl.max);
    const minV = Number(minEl.value);
    const maxV = Number(maxEl.value);
    state.facets[def.facetMin] = minV > lo ? minV : null;
    state.facets[def.facetMax] = maxV < hi ? maxV : null;
  }
}

function configureSlidersFromRows(rows) {
  for (const def of SLIDER_DEFS) {
    const minEl = def.minEl();
    const maxEl = def.maxEl();
    if (!minEl || !maxEl) continue;

    const values = def.valuesFromRows(rows);
    const hi = sliderDomainMax(values, def);
    const prevMin = Number(minEl.value);
    const prevMax = Number(maxEl.value);
    const prevHi = Number(minEl.max) || def.defaultMax;
    const wasFull = prevMin <= Number(minEl.min) && prevMax >= prevHi;

    minEl.min = "0";
    maxEl.min = "0";
    minEl.max = String(hi);
    maxEl.max = String(hi);
    minEl.step = String(def.step);
    maxEl.step = String(def.step);

    if (wasFull || !Number.isFinite(prevMin)) {
      minEl.value = "0";
      maxEl.value = String(hi);
    } else {
      minEl.value = String(Math.min(Math.max(0, prevMin), hi));
      maxEl.value = String(Math.min(Math.max(Number(minEl.value), prevMax), hi));
    }
    updateSliderValueLabel(def);
  }
  syncChartPricePresetActive();
}

function resetSlidersToFull() {
  for (const def of SLIDER_DEFS) {
    const minEl = def.minEl();
    const maxEl = def.maxEl();
    if (!minEl || !maxEl) continue;
    minEl.value = minEl.min;
    maxEl.value = maxEl.max;
    state.facets[def.facetMin] = null;
    state.facets[def.facetMax] = null;
    updateSliderValueLabel(def);
  }
}

function clampDualSlider(def, changed) {
  const minEl = def.minEl();
  const maxEl = def.maxEl();
  if (!minEl || !maxEl) return;
  let minV = Number(minEl.value);
  let maxV = Number(maxEl.value);
  if (minV > maxV) {
    if (changed === "min") maxEl.value = String(minV);
    else minEl.value = String(maxV);
  }
  updateSliderValueLabel(def);
}

function syncChartPricePresetActive() {
  const max = state.facets.blendedMax;
  document.querySelectorAll(".chart-price-preset").forEach(btn => {
    const raw = btn.dataset.blendedMax;
    const active = raw === "" ? max == null : Number(raw) === max && state.facets.blendedMin == null;
    setToggleChipState(btn, active);
  });
}

function applyChartPricePreset(maxRaw) {
  const minEl = els.blendedMin;
  const maxEl = els.blendedMax;
  if (!minEl || !maxEl) return;
  minEl.value = minEl.min;
  if (maxRaw === "" || maxRaw == null) {
    maxEl.value = maxEl.max;
  } else {
    const n = Number(maxRaw);
    const hi = Number(maxEl.max);
    maxEl.value = String(Math.min(n, hi));
  }
  updateSliderValueLabel(SLIDER_DEFS.find(d => d.key === "blended"));
  syncRangeFacetsFromInputs();
  syncChartPricePresetActive();
  state.page = 1;
  renderAll();
}

function inRange(value, min, max) {
  if (min == null && max == null) return true;
  if (!Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function rowBlendedCost(row) {
  const poe = blendedCostPer1M(row);
  if (Number.isFinite(poe)) return poe;
  return row.benchmark?.price_1m_blended ?? null;
}

function rowPromptCost(row) {
  const poe = promptCostPer1M(row);
  if (Number.isFinite(poe)) return poe;
  return row.benchmark?.price_1m_input ?? null;
}

function rowCompletionCost(row) {
  const poe = completionCostPer1M(row);
  if (Number.isFinite(poe)) return poe;
  return row.benchmark?.price_1m_output ?? null;
}

function applyFilters() {
  syncRangeFacetsFromInputs();
  const q = els.searchInput.value.trim().toLowerCase();

  let rows = state.raw.filter(row => {
    if (!rowMatchesSearch(row, q)) return false;
    if (!setMatches(state.facets.owners, row.owned_by)) return false;
    if (!setMatches(state.facets.inputs, row.input_modalities)) return false;
    if (!setMatches(state.facets.outputs, row.output_modalities)) return false;
    if (!setMatches(state.facets.endpoints, row.supported_endpoints)) return false;
    if (!setMatches(state.facets.features, row.supported_features)) return false;
    if (state.facets.pricedOnly && !row.has_pricing) return false;
    if (state.facets.benchmarkedOnly && !row.benchmark_match) return false;
    if (state.facets.toolsOnly && !row.supports_tools) return false;
    if (state.facets.webSearchOnly && !row.supports_web_search) return false;
    if (!inRange(rowBlendedCost(row), state.facets.blendedMin, state.facets.blendedMax)) return false;
    if (!inRange(rowPromptCost(row), state.facets.promptMin, state.facets.promptMax)) return false;
    if (!inRange(rowCompletionCost(row), state.facets.completionMin, state.facets.completionMax)) return false;
    if (!inRange(row.context_length, state.facets.contextMin, state.facets.contextMax)) return false;
    if (!inRange(row.benchmark?.intelligence ?? null, state.facets.intelMin, state.facets.intelMax)) return false;
    return true;
  });

  if (state.facets.paretoOnly) {
    const { frontierIds } = getParetoEligibleRows(rows);
    rows = rows.filter(r => frontierIds.has(r.id));
  }

  const sortKey = els.sortBy.value;
  const dir = els.sortDir.value === "asc" ? 1 : -1;

  rows.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];

    if (Number.isFinite(av) && Number.isFinite(bv)) return (av - bv) * dir;
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });

  state.filtered = rows;
}

function setSort(sortKey) {
  const col = TABLE_COLUMNS.find(c => c.key === sortKey);
  if (!col?.sortable) return;

  if (els.sortBy.value === sortKey) {
    els.sortDir.value = els.sortDir.value === "asc" ? "desc" : "asc";
  } else {
    els.sortBy.value = sortKey;
    const numericKeys = new Set(["created", "context_length", "price_prompt", "price_completion"]);
    els.sortDir.value = numericKeys.has(sortKey) ? "desc" : "asc";
  }
  state.page = 1;
  renderAll();
}

function renderStats() {
  const rows = state.filtered;
  const total = rows.length;
  const priced = rows.filter(r => r.has_pricing).length;
  const tools = rows.filter(r => r.supports_tools).length;
  const web = rows.filter(r => r.supports_web_search).length;
  const maxCtx = rows.reduce((m, r) => Number.isFinite(r.context_length) ? Math.max(m, r.context_length) : m, 0);

  const allEligible = getParetoEligibleRows(state.raw.filter(r => {
    const q = els.searchInput.value.trim().toLowerCase();
    return rowMatchesSearch(r, q);
  }));
  const frontierCount = allEligible.frontierIds.size;

  els.stats.innerHTML = [
    statTile(total, "Visible Models"),
    statTile(priced, "With Pricing"),
    statTile(tools, "Supports Tools"),
    statTile(web, "Supports Web Search"),
    statTile(frontierCount, "On Frontier"),
    statTile(maxCtx ? fmtNum(maxCtx) : "n/a", "Max Context Length")
  ].join("");
}

function statTile(value, label) {
  return '<div class="stat"><strong>' + value + '</strong><span>' + label + '</span></div>';
}

function tagList(items) {
  if (!items.length) return '<span class="mono">none</span>';
  return '<div class="tag-list">' + items.map(x => '<span class="tag">' + escapeHtml(x) + '</span>').join("") + "</div>";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function emptyState(message) {
  return '<div class="empty-state"><strong>No models to show</strong><span>' + escapeHtml(message) + '</span></div>';
}

function renderTableHeader() {
  const sortKey = els.sortBy.value;
  const dir = els.sortDir.value;

  return TABLE_COLUMNS.map(col => {
    if (!col.sortable) return "<th>" + escapeHtml(col.label) + "</th>";
    const active = col.key === sortKey;
    const ariaSort = active ? (dir === "asc" ? "ascending" : "descending") : "none";
    const indicator = active ? (dir === "asc" ? " ▲" : " ▼") : "";
    return '<th class="sortable' + (active ? " is-sorted" : "") + '" data-sort-key="' + escapeHtml(col.key) + '" aria-sort="' + ariaSort + '" tabindex="0" role="columnheader">' + escapeHtml(col.label) + '<span class="sort-indicator" aria-hidden="true">' + indicator + "</span></th>";
  }).join("");
}

function renderTable(rows) {
  const body = rows.map(r => {
    return "<tr data-model-id=\"" + escapeHtml(r.id) + "\">" + TABLE_COLUMNS.map(col => col.render(r)).join("") + "</tr>";
  }).join("");

  return [
    '<div class="table-wrap">',
    "<table>",
    "<thead><tr>",
    renderTableHeader(),
    "</tr></thead>",
    "<tbody>",
    body,
    "</tbody>",
    "</table>",
    "</div>"
  ].join("");
}

function renderCards(rows) {
  return '<div class="cards">' + rows.map(r => {
    return [
      "<article class=\"card\">",
      "<h3>" + escapeHtml(r.id) + "</h3>",
      "<p>" + escapeHtml(r.description.slice(0, 280) || "No description.") + "</p>",
      "<p><strong>Owner:</strong> " + escapeHtml(r.owned_by) + "</p>",
      "<p><strong>Display:</strong> " + escapeHtml(r.display_name || "n/a") + "</p>",
      "<p><strong>Created:</strong> " + fmtDateHtml(r.created) + "</p>",
      "<p><strong>Context:</strong> " + fmtNum(r.context_length) + "</p>",
      "<p><strong>Prompt/Completion:</strong> " + fmtPrice(r.price_prompt) + " / " + fmtPrice(r.price_completion) + "</p>",
      tagList(r.input_modalities),
      tagList(r.output_modalities),
      tagList(r.supported_endpoints),
      tagList(r.supported_features),
      "</article>"
    ].join("");
  }).join("") + "</div>";
}

function renderChart() {
  if (!els.benchmarkChart) return;

  const yMeta = CHART_Y_METRICS.find(m => m.key === state.chartY);
  const xMeta = CHART_X_METRICS.find(m => m.key === state.chartX);
  const { points, frontierIds, frontier } = getParetoEligibleRows(state.filtered);

  const width = 720;
  const height = 360;
  const margin = { top: 24, right: 24, bottom: 52, left: 64 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  if (!points.length) {
    els.benchmarkChart.innerHTML = '<text x="50%" y="50%" text-anchor="middle" class="chart-empty">No plottable models with matched benchmarks and valid metrics.</text>';
    return;
  }

  const useLogX = isCostMetric(state.chartX);
  const xs = points.map(p => p.x).filter(x => Number.isFinite(x) && (!useLogX || x > 0));
  const ys = points.map(p => p.y).filter(Number.isFinite);
  if (!xs.length || !ys.length) {
    els.benchmarkChart.innerHTML = '<text x="50%" y="50%" text-anchor="middle" class="chart-empty">No plottable models with matched benchmarks and valid metrics.</text>';
    return;
  }

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yPad = (yMax - yMin) * 0.08 || 1;
  const y0 = yMin - yPad;
  const y1 = yMax + yPad;

  let x0;
  let x1;
  let sx;
  if (useLogX) {
    // Log scale spreads cheap models; pad ~half a decade on each side.
    const logMin = Math.log10(Math.max(xMin, 1e-6));
    const logMax = Math.log10(Math.max(xMax, xMin * 1.01));
    const logPad = Math.max(0.15, (logMax - logMin) * 0.08);
    x0 = Math.pow(10, logMin - logPad);
    x1 = Math.pow(10, logMax + logPad);
    const lx0 = Math.log10(x0);
    const lx1 = Math.log10(x1);
    sx = (x) => margin.left + ((Math.log10(Math.max(x, x0)) - lx0) / (lx1 - lx0)) * plotW;
  } else {
    const xPad = (xMax - xMin) * 0.08 || 1;
    x0 = xMin - xPad;
    x1 = xMax + xPad;
    sx = (x) => margin.left + ((x - x0) / (x1 - x0)) * plotW;
  }
  const sy = (y) => margin.top + plotH - ((y - y0) / (y1 - y0)) * plotH;

  const yTicks = 5;
  let svg = "";

  svg += '<rect x="0" y="0" width="' + width + '" height="' + height + '" class="chart-bg"/>';

  const xTickVals = useLogX
    ? logCostTicks(x0, x1, 6)
    : Array.from({ length: 6 }, (_, i) => x0 + (x1 - x0) * (i / 5));

  for (const val of xTickVals) {
    const x = sx(val);
    svg += '<line x1="' + x + '" y1="' + margin.top + '" x2="' + x + '" y2="' + (margin.top + plotH) + '" class="chart-grid"/>';
    svg += '<text x="' + x + '" y="' + (height - 16) + '" text-anchor="middle" class="chart-tick">' + escapeHtml(fmtChartValue(val, state.chartX)) + "</text>";
  }

  for (let i = 0; i <= yTicks; i++) {
    const t = i / yTicks;
    const val = y0 + (y1 - y0) * t;
    const y = sy(val);
    svg += '<line x1="' + margin.left + '" y1="' + y + '" x2="' + (margin.left + plotW) + '" y2="' + y + '" class="chart-grid"/>';
    svg += '<text x="' + (margin.left - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="chart-tick">' + escapeHtml(fmtChartValue(val, state.chartY)) + "</text>";
  }

  svg += '<line x1="' + margin.left + '" y1="' + (margin.top + plotH) + '" x2="' + (margin.left + plotW) + '" y2="' + (margin.top + plotH) + '" class="chart-axis"/>';
  svg += '<line x1="' + margin.left + '" y1="' + margin.top + '" x2="' + margin.left + '" y2="' + (margin.top + plotH) + '" class="chart-axis"/>';

  const xAxisLabel = (xMeta?.label || "X") + (useLogX ? " (log)" : "");
  svg += '<text x="' + (margin.left + plotW / 2) + '" y="' + (height - 2) + '" text-anchor="middle" class="chart-axis-label">' + escapeHtml(xAxisLabel) + "</text>";
  svg += '<text transform="rotate(-90)" x="' + (-(margin.top + plotH / 2)) + '" y="16" text-anchor="middle" class="chart-axis-label">' + escapeHtml(yMeta?.label || "Y") + "</text>";

  if (frontier.length > 1 && yMeta?.higherBetter && xMeta?.lowerBetter) {
    const steps = [];
    for (let i = 0; i < frontier.length; i++) {
      const pt = frontier[i];
      if (useLogX && !(pt.x > 0)) continue;
      steps.push({ x: sx(pt.x), y: sy(pt.y) });
      if (i < frontier.length - 1) {
        const next = frontier[i + 1];
        if (useLogX && !(next.x > 0)) continue;
        steps.push({ x: sx(next.x), y: sy(pt.y) });
      }
    }
    if (steps.length > 1) {
      const pathD = steps.map((p, i) => (i === 0 ? "M" : "L") + p.x + " " + p.y).join(" ");
      svg += '<path d="' + pathD + '" class="chart-frontier" fill="none"/>';
    }
  }

  for (const pt of points) {
    if (useLogX && !(pt.x > 0)) continue;
    const cx = sx(pt.x);
    const cy = sy(pt.y);
    const onFrontier = frontierIds.has(pt.id);
    const title = pt.id + ": " + (yMeta?.label || "Y") + " " + fmtChartValue(pt.y, state.chartY) + ", " + (xMeta?.label || "X") + " " + fmtChartValue(pt.x, state.chartX);
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="6" class="chart-point' + (onFrontier ? " is-frontier" : "") + '" data-model-id="' + escapeHtml(pt.id) + '" data-tooltip="' + escapeHtml(title) + '"><title>' + escapeHtml(title) + "</title></circle>";
  }

  els.benchmarkChart.setAttribute("viewBox", "0 0 " + width + " " + height);
  els.benchmarkChart.innerHTML = svg;
}

function highlightTableRow(modelId) {
  const prev = document.querySelector("tr.is-highlighted");
  if (prev) prev.classList.remove("is-highlighted");
  const row = document.querySelector('tr[data-model-id="' + CSS.escape(modelId) + '"]');
  if (row) {
    row.classList.add("is-highlighted");
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function paginateRows(rows) {
  const groupBy = els.groupBy.value;
  if (groupBy !== "none") return rows;

  const start = (state.page - 1) * state.pageSize;
  return rows.slice(start, start + state.pageSize);
}

function renderPagination(totalRows) {
  const grouped = els.groupBy.value !== "none";
  els.paginationWrap.style.display = grouped || totalRows === 0 ? "none" : "flex";
  if (grouped) return;

  const maxPage = Math.max(1, Math.ceil(totalRows / state.pageSize));
  if (state.page > maxPage) state.page = maxPage;
  els.pageLabel.textContent = "Page " + state.page + " of " + maxPage;
  els.prevPageBtn.disabled = state.page <= 1;
  els.nextPageBtn.disabled = state.page >= maxPage;
}

function renderGrouped(rows) {
  const key = els.groupBy.value;
  if (key === "none") return renderUngrouped(rows);

  const buckets = new Map();
  for (const r of rows) {
    const g = r[key] || "Unknown";
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g).push(r);
  }

  const sortedKeys = [...buckets.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const view = els.viewMode.value;

  return sortedKeys.map((g, i) => {
    const groupRows = buckets.get(g);
    const inner = view === "cards" ? renderCards(groupRows) : renderTable(groupRows);
    return [
      "<details class=\"group\" " + (i < 2 ? "open" : "") + ">",
      "<summary>" + escapeHtml(g) + " (" + groupRows.length + ")</summary>",
      "<div class=\"group-content\">",
      inner,
      "</div>",
      "</details>"
    ].join("");
  }).join("");
}

function renderUngrouped(rows) {
  const view = els.viewMode.value;
  return view === "cards" ? renderCards(rows) : renderTable(rows);
}

function renderAll() {
  if (!state.raw.length) {
    els.stats.innerHTML = "";
    els.results.innerHTML = emptyState('No data loaded yet. Click "Load Models" or "Load Demo Data" above.');
    renderPagination(0);
    renderChart();
    return;
  }

  applyFilters();
  renderStats();
  renderPagination(state.filtered.length);
  renderChart();

  if (!state.filtered.length) {
    els.results.innerHTML = emptyState("No models match the current search and filters. Try clearing some filters.");
  } else {
    const renderRows = paginateRows(state.filtered);
    els.results.innerHTML = renderGrouped(renderRows);
  }

  setStatus("Showing " + state.filtered.length + " of " + state.raw.length + " models.");
}

function setLoading(isLoading) {
  state.loading = isLoading;
  els.loadBtn.disabled = isLoading;
  els.demoBtn.disabled = isLoading;

  if (isLoading) {
    els.loadBtn.classList.add("loading");
    els.loadBtn.textContent = "Loading...";
  } else {
    els.loadBtn.classList.remove("loading");
    els.loadBtn.textContent = "Load Models";
  }
}

async function fetchModels() {
  if (state.loading) return;

  const directUrl = els.endpointUrl.value.trim();
  const proxyUrl = els.proxyUrl.value.trim();
  const candidates = [directUrl, proxyUrl].filter(Boolean);

  if (!candidates.length) {
    setStatus("No endpoint URL provided.", true);
    return;
  }

  setLoading(true);
  setStatus("Loading models from Poe API...");

  let lastError = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error("HTTP " + res.status + " from " + url);
      const data = await res.json();
      if (!Array.isArray(data?.data)) throw new Error("Unexpected response shape from " + url);

      state.raw = data.data.map(normalizeModel);
      state.page = 1;
      rebuildFacetChips(state.raw);
      renderAll();
      setLoading(false);
      setStatus("Loaded " + state.raw.length + " models successfully.");
      return;
    } catch (err) {
      lastError = err;
    }
  }

  setLoading(false);
  const hint = lastError?.message?.includes("Failed to fetch")
    ? " This is likely a CORS restriction — try running a local proxy and entering its URL above."
    : "";
  setStatus("Load failed: " + (lastError?.message || "Unknown error") + "." + hint, true);
}

function loadDemoData() {
  if (state.loading) return;

  setLoading(true);
  setStatus("Loading demo data...");

  setTimeout(() => {
    state.raw = DEMO_MODELS.map(m => normalizeModel({ ...m }));
    state.page = 1;
    rebuildFacetChips(state.raw);
    renderAll();
    setLoading(false);
    setStatus("Loaded demo data with " + state.raw.length + " models. (Real data requires a working proxy or CORS-enabled endpoint)");
  }, 120);
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function clearFilters() {
  els.searchInput.value = "";
  state.facets.owners.clear();
  state.facets.inputs.clear();
  state.facets.outputs.clear();
  state.facets.endpoints.clear();
  state.facets.features.clear();
  state.facets.pricedOnly = false;
  state.facets.benchmarkedOnly = false;
  state.facets.toolsOnly = false;
  state.facets.webSearchOnly = false;
  state.facets.paretoOnly = false;
  state.facets.blendedMin = null;
  state.facets.blendedMax = null;
  state.facets.promptMin = null;
  state.facets.promptMax = null;
  state.facets.completionMin = null;
  state.facets.completionMax = null;
  state.facets.contextMin = null;
  state.facets.contextMax = null;
  state.facets.intelMin = null;
  state.facets.intelMax = null;
  resetSlidersToFull();
  syncChartPricePresetActive();
  els.sortBy.value = "id";
  els.sortDir.value = "asc";
  els.groupBy.value = "none";
  els.viewMode.value = "table";
  state.page = 1;
  rebuildFacetChips(state.raw);
  renderAll();
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function exportJson() {
  if (!state.filtered.length) return;
  const payload = {
    exported_at: new Date().toISOString(),
    total: state.filtered.length,
    models: state.filtered
  };
  downloadText("poe-models-filtered.json", JSON.stringify(payload, null, 2), "application/json");
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
  return s;
}

function exportCsv() {
  if (!state.filtered.length) return;
  const cols = [
    "id", "display_name", "owned_by", "created", "context_length",
    "price_prompt", "price_completion", "price_image", "price_request",
    "input_modalities", "output_modalities", "supported_endpoints", "supported_features"
  ];

  const lines = [cols.join(",")];
  for (const r of state.filtered) {
    lines.push(cols.map(c => {
      let v = r[c];
      if (Array.isArray(v)) v = v.join("|");
      if (c === "created") v = fmtDate(v);
      return csvEscape(v);
    }).join(","));
  }

  downloadText("poe-models-filtered.csv", lines.join("\n"), "text/csv;charset=utf-8;");
}

function populateChartSelectors() {
  if (!els.chartYAxis || !els.chartXAxis) return;
  els.chartYAxis.innerHTML = CHART_Y_METRICS.map(m =>
    '<option value="' + m.key + '"' + (m.key === state.chartY ? " selected" : "") + ">" + escapeHtml(m.label) + "</option>"
  ).join("");
  els.chartXAxis.innerHTML = CHART_X_METRICS.map(m =>
    '<option value="' + m.key + '"' + (m.key === state.chartX ? " selected" : "") + ">" + escapeHtml(m.label) + "</option>"
  ).join("");
}

function restoreChartPanelState() {
  if (!els.chartPanel) return;
  const open = sessionStorage.getItem(CHART_PANEL_STATE_KEY);
  if (open === "true") els.chartPanel.open = true;
  els.chartPanel.addEventListener("toggle", () => {
    sessionStorage.setItem(CHART_PANEL_STATE_KEY, String(els.chartPanel.open));
  });
}

function wireEvents() {
  els.fetchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    fetchModels();
  });

  els.demoBtn.addEventListener("click", loadDemoData);
  els.refreshBenchmarksBtn?.addEventListener("click", refreshBenchmarks);

  const rerender = () => { state.page = 1; renderAll(); };
  const rerenderDebounced = debounce(rerender, 120);

  els.searchInput.addEventListener("input", rerenderDebounced);
  [els.sortBy, els.sortDir, els.groupBy, els.viewMode].forEach(el => el.addEventListener("change", rerender));

  els.chartYAxis?.addEventListener("change", () => {
    state.chartY = els.chartYAxis.value;
    renderAll();
  });
  els.chartXAxis?.addEventListener("change", () => {
    state.chartX = els.chartXAxis.value;
    renderAll();
  });

  els.pricedOnlyChip.addEventListener("click", () => {
    state.facets.pricedOnly = !state.facets.pricedOnly;
    setToggleChipState(els.pricedOnlyChip, state.facets.pricedOnly);
    rerender();
  });

  els.benchmarkedOnlyChip?.addEventListener("click", () => {
    state.facets.benchmarkedOnly = !state.facets.benchmarkedOnly;
    setToggleChipState(els.benchmarkedOnlyChip, state.facets.benchmarkedOnly);
    rerender();
  });

  els.toolsOnlyChip.addEventListener("click", () => {
    state.facets.toolsOnly = !state.facets.toolsOnly;
    setToggleChipState(els.toolsOnlyChip, state.facets.toolsOnly);
    rerender();
  });

  els.webSearchOnlyChip.addEventListener("click", () => {
    state.facets.webSearchOnly = !state.facets.webSearchOnly;
    setToggleChipState(els.webSearchOnlyChip, state.facets.webSearchOnly);
    rerender();
  });

  els.paretoOnlyChip.addEventListener("click", () => {
    state.facets.paretoOnly = !state.facets.paretoOnly;
    setToggleChipState(els.paretoOnlyChip, state.facets.paretoOnly);
    rerender();
  });

  for (const def of SLIDER_DEFS) {
    const minEl = def.minEl();
    const maxEl = def.maxEl();
    if (!minEl || !maxEl) continue;
    const onMin = () => { clampDualSlider(def, "min"); syncRangeFacetsFromInputs(); syncChartPricePresetActive(); rerenderDebounced(); };
    const onMax = () => { clampDualSlider(def, "max"); syncRangeFacetsFromInputs(); syncChartPricePresetActive(); rerenderDebounced(); };
    minEl.addEventListener("input", onMin);
    maxEl.addEventListener("input", onMax);
  }

  document.querySelectorAll(".chart-price-preset").forEach(btn => {
    btn.addEventListener("click", () => applyChartPricePreset(btn.dataset.blendedMax));
  });

  els.results.addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort-key]");
    if (th) {
      setSort(th.dataset.sortKey);
      return;
    }
  });

  els.results.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const th = e.target.closest("th[data-sort-key]");
    if (!th) return;
    e.preventDefault();
    setSort(th.dataset.sortKey);
  });

  els.benchmarkChart?.addEventListener("click", (e) => {
    const pt = e.target.closest(".chart-point");
    if (pt?.dataset.modelId) highlightTableRow(pt.dataset.modelId);
  });

  els.benchmarkChart?.addEventListener("mousemove", (e) => {
    const pt = e.target.closest(".chart-point");
    if (!pt || !els.chartTooltip) {
      els.chartTooltip?.classList.remove("is-visible");
      return;
    }
    els.chartTooltip.textContent = pt.dataset.tooltip || "";
    els.chartTooltip.classList.add("is-visible");
    const wrap = els.benchmarkChart.closest(".chart-wrap");
    const rect = wrap.getBoundingClientRect();
    els.chartTooltip.style.left = (e.clientX - rect.left + 12) + "px";
    els.chartTooltip.style.top = (e.clientY - rect.top - 28) + "px";
  });

  els.benchmarkChart?.addEventListener("mouseleave", () => {
    els.chartTooltip?.classList.remove("is-visible");
  });

  els.pageSize.addEventListener("change", () => {
    state.pageSize = Number(els.pageSize.value) || 100;
    state.page = 1;
    renderAll();
  });

  els.prevPageBtn.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderAll();
  });

  els.nextPageBtn.addEventListener("click", () => {
    const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(maxPage, state.page + 1);
    renderAll();
  });

  els.clearFiltersBtn.addEventListener("click", clearFilters);
  els.exportJsonBtn.addEventListener("click", exportJson);
  els.exportCsvBtn.addEventListener("click", exportCsv);
}

async function init() {
  populateChartSelectors();
  restoreChartPanelState();
  wireEvents();

  await loadBundledBenchmarks();
  loadCachedBenchmarks();
  renderAll();
}

init();
