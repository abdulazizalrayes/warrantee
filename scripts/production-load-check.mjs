const baseUrl = (process.env.LOAD_BASE_URL || process.env.SMOKE_BASE_URL || "https://warrantee.io").replace(/\/$/, "");
const durationMs = Math.max(5, Number(process.env.LOAD_DURATION_SECONDS || 45)) * 1000;
const concurrency = Math.max(1, Number(process.env.LOAD_CONCURRENCY || 12));
const timeoutMs = Math.max(1000, Number(process.env.LOAD_TIMEOUT_MS || 15000));
const maxErrorRate = Number(process.env.LOAD_MAX_ERROR_RATE || 0.01);
const maxP95Ms = Number(process.env.LOAD_MAX_P95_MS || 2500);

const scenarios = [
  { name: "home", path: "/en", expect: [200], weight: 8 },
  { name: "features", path: "/en/features", expect: [200], weight: 5 },
  { name: "pricing", path: "/en/pricing", expect: [200], weight: 4 },
  { name: "api-docs", path: "/en/api-docs", expect: [200], weight: 3 },
  { name: "support", path: "/en/support", expect: [200], weight: 3 },
  { name: "robots", path: "/robots.txt", expect: [200], weight: 2 },
  { name: "sitemap", path: "/sitemap.xml", expect: [200], weight: 2 },
  { name: "agent-card", path: "/.well-known/agent-card.json", expect: [200], weight: 2 },
  { name: "agent-routing", path: "/data/agent-routing.json", expect: [200], weight: 2 },
  { name: "llms-full", path: "/llms-full.txt", expect: [200], weight: 2 },
  { name: "health", path: "/api/health", expect: [200], weight: 4 },
  { name: "protected-dashboard", path: "/en/dashboard", expect: [307], redirect: "manual", weight: 2 },
  { name: "protected-api", path: "/api/warranties", expect: [401, 429], redirect: "manual", weight: 2 },
];

const weighted = scenarios.flatMap((scenario) => Array.from({ length: scenario.weight }, () => scenario));
let cursor = 0;

const results = [];
const startedAt = Date.now();
const deadline = startedAt + durationMs;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function nextScenario() {
  const scenario = weighted[cursor % weighted.length];
  cursor += 1;
  return scenario;
}

async function worker(workerId) {
  while (Date.now() < deadline) {
    const scenario = nextScenario();
    const started = performance.now();
    try {
      const response = await fetchWithTimeout(`${baseUrl}${scenario.path}`, {
        redirect: scenario.redirect || "follow",
        headers: {
          "user-agent": `warrantee-production-load-check/1.0 worker-${workerId}`,
          accept: "text/html,application/json,text/plain,*/*",
        },
      });
      const duration = performance.now() - started;
      const ok = scenario.expect.includes(response.status);
      results.push({
        name: scenario.name,
        status: response.status,
        duration,
        ok,
      });
    } catch (error) {
      results.push({
        name: scenario.name,
        status: "network_error",
        duration: performance.now() - started,
        ok: false,
        error: error instanceof Error ? error.name : "unknown",
      });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));

const durations = results.map((result) => result.duration);
const failures = results.filter((result) => !result.ok);
const byScenario = {};
for (const result of results) {
  byScenario[result.name] ||= { total: 0, failed: 0, statuses: {} };
  byScenario[result.name].total += 1;
  if (!result.ok) byScenario[result.name].failed += 1;
  byScenario[result.name].statuses[result.status] = (byScenario[result.name].statuses[result.status] || 0) + 1;
}

const elapsedSeconds = (Date.now() - startedAt) / 1000;
const summary = {
  status: "checked",
  baseUrl,
  duration_seconds: Number(elapsedSeconds.toFixed(1)),
  concurrency,
  requests: results.length,
  requests_per_second: Number((results.length / elapsedSeconds).toFixed(2)),
  failures: failures.length,
  error_rate: Number((failures.length / Math.max(1, results.length)).toFixed(4)),
  latency_ms: {
    min: Number(Math.min(...durations).toFixed(1)),
    p50: Number(percentile(durations, 50).toFixed(1)),
    p95: Number(percentile(durations, 95).toFixed(1)),
    p99: Number(percentile(durations, 99).toFixed(1)),
    max: Number(Math.max(...durations).toFixed(1)),
  },
  byScenario,
};

const pass = summary.error_rate <= maxErrorRate && summary.latency_ms.p95 <= maxP95Ms;
console.log(JSON.stringify({ ...summary, pass }, null, 2));

if (!pass) process.exit(1);
