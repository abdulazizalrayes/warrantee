import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, "..")
const sourcePath = join(repoRoot, "docs", "warrantee-architecture-map.json")
const outputPath = join(repoRoot, "docs", "WARRANTEE_ARCHITECTURE_MAP.html")
const checkOnly = process.argv.includes("--check")

function fail(message) {
  throw new Error(`[architecture-map] ${message}`)
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch (error) {
    fail(`Cannot parse ${relative(repoRoot, path)}: ${error.message}`)
  }
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function assertUnique(values, label) {
  const seen = new Set()
  for (const value of values) {
    assert(value && typeof value === "string", `${label} contains an invalid identifier`)
    assert(!seen.has(value), `${label} contains duplicate identifier "${value}"`)
    seen.add(value)
  }
}

function walk(path, predicate) {
  const ignored = new Set([".git", ".next", "node_modules", "playwright-report", "test-results"])
  let count = 0
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const entryPath = join(path, entry.name)
    if (entry.isDirectory()) count += walk(entryPath, predicate)
    else if (predicate(entryPath)) count += 1
  }
  return count
}

function appRouteForFile(filePath, leafName) {
  const appRelative = relative(join(repoRoot, "src", "app"), filePath)
  const withoutLeaf = appRelative.replace(new RegExp(`/?${leafName.replace(".", "\\.")}$`), "")
  const routeSegments = withoutLeaf
    .split("/")
    .filter(Boolean)
    .filter((segment) => !/^\(.+\)$/.test(segment))
  return `/${routeSegments.join("/")}`
}

function collectAppRoutes(leafName) {
  const routes = []
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const entryPath = join(path, entry.name)
      if (entry.isDirectory()) visit(entryPath)
      else if (entry.name === leafName) routes.push(appRouteForFile(entryPath, leafName))
    }
  }
  visit(join(repoRoot, "src", "app"))
  return routes.sort()
}

function currentDatabaseTables() {
  const generatedTypes = readFileSync(join(repoRoot, "src", "types", "database.ts"), "utf8")
  const publicSchemaStart = generatedTypes.indexOf("  public: {")
  assert(publicSchemaStart >= 0, "Cannot locate public schema in generated database types")
  const tablesStart = generatedTypes.indexOf("    Tables: {", publicSchemaStart)
  const tablesEnd = generatedTypes.indexOf("    Views: {", tablesStart)
  assert(tablesStart >= 0 && tablesEnd > tablesStart, "Cannot locate Tables in generated database types")
  const tableSection = generatedTypes.slice(tablesStart, tablesEnd)
  return [...tableSection.matchAll(/^      ([a-z][a-z0-9_]*): \{$/gm)].map((match) => match[1])
}

function collectCodeRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectCodeRefs(item, refs)
    return refs
  }
  if (!value || typeof value !== "object") return refs
  for (const [key, child] of Object.entries(value)) {
    if (key === "code_refs" && Array.isArray(child)) refs.push(...child)
    else collectCodeRefs(child, refs)
  }
  return refs
}

function validate(data) {
  assert(data.schema_version === "1.0.0", "Unsupported schema_version")
  assert(data.map_id === "warrantee-system-architecture", "Unexpected map_id")
  assert(data.meta?.company === "Warrantee", "Identity lock must remain Warrantee")
  assert(data.meta?.domain === "https://warrantee.io", "Canonical domain must remain warrantee.io")
  assert(Array.isArray(data.layers) && data.layers.length > 0, "layers must be populated")
  assert(Array.isArray(data.components) && data.components.length > 0, "components must be populated")
  assert(Array.isArray(data.edges) && data.edges.length > 0, "edges must be populated")
  assert(Array.isArray(data.flows) && data.flows.length > 0, "flows must be populated")

  assertUnique(data.layers.map((layer) => layer.id), "layers")
  assertUnique(data.components.map((component) => component.id), "components")
  assertUnique(data.flows.map((flow) => flow.id), "flows")

  const layerIds = new Set(data.layers.map((layer) => layer.id))
  const componentIds = new Set(data.components.map((component) => component.id))
  for (const component of data.components) {
    assert(layerIds.has(component.layer), `Component "${component.id}" references unknown layer "${component.layer}"`)
    assert(component.name && component.responsibility, `Component "${component.id}" is missing human context`)
  }
  for (const edge of data.edges) {
    assert(componentIds.has(edge.from), `Edge references unknown source "${edge.from}"`)
    assert(componentIds.has(edge.to), `Edge references unknown target "${edge.to}"`)
  }
  for (const flow of data.flows) {
    assert(Array.isArray(flow.steps) && flow.steps.length > 0, `Flow "${flow.id}" has no steps`)
    flow.steps.forEach((step, index) => {
      assert(step.order === index + 1, `Flow "${flow.id}" has non-contiguous step ordering`)
      assert(componentIds.has(step.component), `Flow "${flow.id}" references unknown component "${step.component}"`)
      assert(step.action && step.control, `Flow "${flow.id}" step ${step.order} lacks action or control`)
    })
  }

  const mappedTables = data.data_domains.flatMap((domain) => domain.tables).sort()
  const actualTables = currentDatabaseTables().sort()
  assertUnique(mappedTables, "database tables")
  assert(
    JSON.stringify(mappedTables) === JSON.stringify(actualTables),
    `Database map differs from generated types.\nMapped: ${mappedTables.join(", ")}\nActual: ${actualTables.join(", ")}`
  )

  const codeRefs = [...new Set(collectCodeRefs(data))].sort()
  for (const codeRef of codeRefs) {
    const resolvedRef = resolve(repoRoot, codeRef)
    assert(!codeRef.startsWith("/") && resolvedRef.startsWith(`${repoRoot}${sep}`), `Unsafe code reference "${codeRef}"`)
    assert(existsSync(resolvedRef), `Missing code reference "${codeRef}"`)
  }

  const counts = data.system.inventory_counts
  const actualCounts = {
    page_files: walk(join(repoRoot, "src"), (path) => path.endsWith("/page.tsx")),
    route_handlers: walk(join(repoRoot, "src"), (path) => path.endsWith("/route.ts")),
    layouts: walk(join(repoRoot, "src"), (path) => path.endsWith("/layout.tsx")),
    database_tables: actualTables.length,
    migration_files: walk(join(repoRoot, "supabase", "migrations"), (path) => path.endsWith(".sql")),
    scheduled_jobs: data.scheduled_jobs.length,
    github_workflows: walk(join(repoRoot, ".github", "workflows"), (path) => path.endsWith(".yml") || path.endsWith(".yaml")),
    e2e_spec_files: walk(join(repoRoot, "tests", "e2e"), (path) => path.endsWith(".spec.ts")),
  }
  for (const [key, value] of Object.entries(actualCounts)) {
    assert(counts[key] === value, `Inventory "${key}" is stale: mapped ${counts[key]}, actual ${value}`)
  }

  const actualPages = collectAppRoutes("page.tsx")
  const mappedPages = [
    ...data.route_inventory.public_pages,
    ...data.route_inventory.protected_pages,
    ...data.route_inventory.approval_and_admin_pages,
  ].sort()
  assertUnique(mappedPages, "page route inventory")
  assert(
    JSON.stringify(mappedPages) === JSON.stringify(actualPages),
    `Page route inventory is incomplete.\nMapped only: ${mappedPages.filter((route) => !actualPages.includes(route)).join(", ") || "none"}\nUnmapped: ${actualPages.filter((route) => !mappedPages.includes(route)).join(", ") || "none"}`
  )

  const actualRouteHandlers = collectAppRoutes("route.ts")
  const mappedRouteHandlers = [
    ...data.route_inventory.browser_api_groups.flatMap((group) => group.paths),
    ...data.route_inventory.integration_api.map((route) => route.path),
    ...data.route_inventory.agent_discovery,
    ...data.route_inventory.platform_routes.map((route) => route.path),
  ].sort()
  assertUnique(mappedRouteHandlers, "route handler inventory")
  assert(
    JSON.stringify(mappedRouteHandlers) === JSON.stringify(actualRouteHandlers),
    `Route handler inventory is incomplete.\nMapped only: ${mappedRouteHandlers.filter((route) => !actualRouteHandlers.includes(route)).join(", ") || "none"}\nUnmapped: ${actualRouteHandlers.filter((route) => !mappedRouteHandlers.includes(route)).join(", ") || "none"}`
  )

  const serialized = JSON.stringify(data)
  const secretPatterns = [
    /\bsk_(?:live|test)_[A-Za-z0-9]{12,}\b/,
    /\bwhsec_[A-Za-z0-9]{12,}\b/,
    /\bsb_secret_[A-Za-z0-9_-]{12,}\b/,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ]
  for (const pattern of secretPatterns) {
    assert(!pattern.test(serialized), `Architecture map appears to contain a secret matching ${pattern}`)
  }

  return { actualCounts, codeRefCount: codeRefs.length }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function render(data) {
  const embeddedData = JSON.stringify(data).replaceAll("<", "\\u003c")
  const title = escapeHtml(data.meta.title)
  const generatedAt = escapeHtml(data.meta.generated_at)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #080b12;
      --panel: #0f1420;
      --panel-strong: #151b28;
      --panel-soft: #0b1019;
      --line: #2a3344;
      --line-strong: #475569;
      --text: #f8fafc;
      --muted: #9aa7ba;
      --quiet: #667085;
      --accent: #22d3ee;
      --focus: #fbbf24;
      --danger: #f87171;
      --ok: #34d399;
      --radius: 8px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body {
      margin: 0;
      min-width: 320px;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      letter-spacing: 0;
    }
    button, input { font: inherit; letter-spacing: 0; }
    button { color: inherit; }
    a { color: #7dd3fc; }
    .shell {
      width: min(1800px, 100%);
      min-height: 100vh;
      margin: 0 auto;
      padding: 20px;
    }
    .topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 20px;
      align-items: start;
      padding: 18px 20px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
    }
    .eyebrow, .section-label {
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-size: clamp(24px, 3vw, 38px);
      line-height: 1.1;
      font-weight: 760;
    }
    .subtitle {
      max-width: 900px;
      margin: 10px 0 0;
      color: var(--muted);
      line-height: 1.55;
    }
    .identity {
      min-width: 220px;
      padding-left: 20px;
      border-left: 1px solid var(--line);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }
    .identity strong { display: block; color: var(--text); }
    .stats {
      display: grid;
      grid-template-columns: repeat(8, minmax(100px, 1fr));
      gap: 8px;
      margin: 12px 0;
    }
    .stat {
      min-height: 74px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel-soft);
    }
    .stat strong {
      display: block;
      margin-bottom: 4px;
      font-size: 21px;
    }
    .stat span { color: var(--muted); font-size: 12px; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
    }
    .tabs, .view-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .view-actions { margin-left: auto; }
    .tab, .small-action, .layer-toggle {
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-soft);
      cursor: pointer;
    }
    .tab { padding: 8px 13px; font-weight: 650; }
    .small-action { width: 38px; padding: 0; font-size: 17px; }
    .tab:hover, .small-action:hover, .layer-toggle:hover, .flow-button:hover, .node:hover {
      border-color: var(--line-strong);
      background: var(--panel-strong);
    }
    .tab[aria-selected="true"] {
      border-color: var(--accent);
      color: var(--accent);
      background: #10222a;
    }
    .search {
      min-width: min(360px, 100%);
      min-height: 38px;
      padding: 8px 11px;
      border: 1px solid var(--line);
      border-radius: 6px;
      outline: none;
      background: var(--panel-soft);
      color: var(--text);
    }
    .search:focus, button:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    .workspace {
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr) 330px;
      gap: 12px;
      min-height: 650px;
    }
    .side-panel, .details-panel, .view-panel {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
    }
    .side-panel, .details-panel {
      max-height: calc(100vh - 245px);
      min-height: 650px;
      overflow: auto;
      padding: 12px;
      position: sticky;
      top: 12px;
    }
    .side-panel h2, .details-panel h2, .view-panel h2 {
      margin: 0 0 10px;
      font-size: 16px;
    }
    .flow-list { display: grid; gap: 6px; }
    .flow-button {
      width: 100%;
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-soft);
      text-align: left;
      cursor: pointer;
    }
    .flow-button strong { display: block; font-size: 13px; line-height: 1.35; }
    .flow-button span { color: var(--muted); font-size: 11px; }
    .flow-button[aria-pressed="true"] {
      border-color: var(--focus);
      color: #fde68a;
      background: #261d0a;
    }
    .layer-filter { display: grid; gap: 5px; margin-top: 16px; }
    .layer-toggle {
      display: grid;
      grid-template-columns: 10px 1fr auto;
      align-items: center;
      gap: 8px;
      padding: 7px 8px;
      text-align: left;
    }
    .layer-toggle[aria-pressed="false"] { opacity: .45; }
    .layer-dot { width: 9px; height: 9px; border-radius: 50%; }
    .layer-toggle span:last-child { color: var(--muted); font-size: 11px; }
    .view-panel {
      min-width: 0;
      min-height: 650px;
      overflow: hidden;
    }
    .map-scroll {
      position: relative;
      min-height: 650px;
      overflow: auto;
      padding: 12px;
    }
    .map {
      position: relative;
      display: grid;
      grid-template-columns: repeat(9, minmax(172px, 1fr));
      gap: 8px;
      min-width: 1630px;
      min-height: 620px;
      isolation: isolate;
    }
    .connectors {
      position: absolute;
      inset: 0;
      z-index: 1;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    }
    .connector {
      fill: none;
      stroke: #475569;
      stroke-width: 1.25;
      opacity: .4;
    }
    .connector.active { stroke: var(--focus); stroke-width: 2; opacity: .9; }
    .column {
      position: relative;
      z-index: 2;
      min-width: 0;
      padding: 8px;
      border-left: 1px solid #1c2534;
    }
    .column:first-of-type { border-left: 0; }
    .column-header {
      min-height: 55px;
      padding: 4px;
      border-bottom: 2px solid var(--layer-color);
    }
    .column-header strong { display: block; font-size: 13px; }
    .column-header span { color: var(--muted); font-size: 10px; line-height: 1.3; }
    .nodes { display: grid; gap: 7px; padding-top: 9px; }
    .node {
      position: relative;
      width: 100%;
      min-height: 72px;
      padding: 9px 9px 9px 12px;
      border: 1px solid var(--line);
      border-left: 3px solid var(--layer-color);
      border-radius: 6px;
      background: #111827;
      text-align: left;
      cursor: pointer;
    }
    .node strong { display: block; font-size: 12px; line-height: 1.25; }
    .node small {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.3;
    }
    .node .status {
      display: block;
      margin-top: 5px;
      color: var(--quiet);
      font-size: 9px;
      overflow-wrap: anywhere;
    }
    .node.selected, .node.related {
      border-color: var(--focus);
      box-shadow: 0 0 0 1px var(--focus);
    }
    .node.related { border-color: #7dd3fc; box-shadow: 0 0 0 1px #7dd3fc; }
    .node.dimmed { opacity: .19; }
    .step-badge {
      position: absolute;
      top: -7px;
      right: -5px;
      display: none;
      width: 21px;
      height: 21px;
      place-items: center;
      border: 2px solid var(--bg);
      border-radius: 50%;
      background: var(--focus);
      color: #111827;
      font-size: 10px;
      font-weight: 800;
    }
    .node.flow-node .step-badge { display: grid; }
    .details-empty { color: var(--muted); line-height: 1.6; }
    .detail-block { margin: 0 0 16px; }
    .detail-block h3 { margin: 0 0 7px; font-size: 12px; color: var(--accent); text-transform: uppercase; }
    .detail-block p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55; overflow-wrap: anywhere; }
    .detail-list { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
    .detail-list li {
      padding: 8px;
      border-left: 2px solid var(--line-strong);
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .detail-list strong { color: var(--text); }
    .detail-link { display: block; margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
    .content-view { display: none; padding: 18px; }
    .content-view.active { display: block; }
    .inventory-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .inventory-section { min-width: 0; }
    .inventory-section h3 { margin: 0 0 8px; color: var(--accent); font-size: 14px; }
    .token-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .token {
      max-width: 100%;
      padding: 5px 7px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--panel-soft);
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      overflow-wrap: anywhere;
    }
    .table-wrap { overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 9px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    th { color: var(--accent); font-weight: 700; }
    td { color: var(--muted); line-height: 1.4; }
    .handoff { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .footer-note {
      margin: 12px 0 0;
      color: var(--quiet);
      font-size: 11px;
      text-align: center;
    }
    .hidden { display: none !important; }
    @media (max-width: 1180px) {
      .stats { grid-template-columns: repeat(4, minmax(100px, 1fr)); }
      .workspace { grid-template-columns: 220px minmax(0, 1fr); }
      .details-panel { position: static; grid-column: 1 / -1; min-height: auto; max-height: none; }
      .side-panel { max-height: calc(100vh - 250px); }
    }
    @media (max-width: 760px) {
      .shell { padding: 10px; }
      .topbar { grid-template-columns: 1fr; }
      .identity { padding: 12px 0 0; border-left: 0; border-top: 1px solid var(--line); }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .toolbar { align-items: stretch; }
      .tabs { display: grid; grid-template-columns: repeat(2, 1fr); width: 100%; }
      .search { width: 100%; min-width: 0; }
      .view-actions { margin-left: 0; }
      .workspace { display: block; }
      .side-panel, .details-panel { position: static; min-height: auto; max-height: none; margin-bottom: 10px; }
      .flow-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .layer-filter { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .view-panel { min-height: 560px; }
      .inventory-grid, .handoff { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Internal system map</p>
        <h1>${title}</h1>
        <p class="subtitle">${escapeHtml(data.system.purpose)} This human view is generated from the agent-readable JSON and contains no secrets or customer records.</p>
      </div>
      <div class="identity">
        <strong>Identity locked</strong>
        ${escapeHtml(data.meta.domain)}<br>
        ${escapeHtml(data.meta.branch)} @ ${escapeHtml(data.meta.mapped_from_commit.slice(0, 12))}<br>
        Mapped ${generatedAt}
      </div>
    </header>

    <section class="stats" id="stats" aria-label="Architecture inventory"></section>

    <nav class="toolbar" aria-label="Architecture views">
      <div class="tabs" role="tablist">
        <button class="tab" role="tab" aria-selected="true" data-view="map">System map</button>
        <button class="tab" role="tab" aria-selected="false" data-view="flows">Flow catalogue</button>
        <button class="tab" role="tab" aria-selected="false" data-view="data">Data &amp; routes</button>
        <button class="tab" role="tab" aria-selected="false" data-view="handoff">Agent handoff</button>
      </div>
      <input class="search" id="search" type="search" placeholder="Search components, flows, routes, tables..." aria-label="Search architecture">
      <div class="view-actions">
        <button class="small-action" id="fitMap" type="button" title="Scroll map to start" aria-label="Scroll map to start">↤</button>
        <button class="small-action" id="clearSelection" type="button" title="Clear selection" aria-label="Clear selection">×</button>
      </div>
    </nav>

    <section class="workspace">
      <aside class="side-panel">
        <h2>End-to-end flows</h2>
        <div class="flow-list" id="flowList"></div>
        <div class="layer-filter" id="layerFilter"></div>
      </aside>

      <section class="view-panel" aria-live="polite">
        <div class="map-scroll" id="mapView">
          <div class="map" id="map">
            <svg class="connectors" id="connectors" aria-hidden="true"></svg>
          </div>
        </div>
        <div class="content-view" id="flowsView"></div>
        <div class="content-view" id="dataView"></div>
        <div class="content-view" id="handoffView"></div>
      </section>

      <aside class="details-panel">
        <h2>Selection details</h2>
        <div id="details" class="details-empty">Select a component or flow to inspect its responsibility, controls, source references, and verification path.</div>
      </aside>
    </section>

    <p class="footer-note">Generated by <code>${escapeHtml(data.meta.generator)}</code>. Edit the JSON source, then run <code>${escapeHtml(data.meta.validation_command)}</code>.</p>
  </main>

  <script id="architecture-data" type="application/json">${embeddedData}</script>
  <script>
    (() => {
      const data = JSON.parse(document.getElementById("architecture-data").textContent)
      const byId = new Map(data.components.map((component) => [component.id, component]))
      const layerById = new Map(data.layers.map((layer) => [layer.id, layer]))
      const state = {
        flowId: null,
        componentId: null,
        query: "",
        activeLayers: new Set(data.layers.map((layer) => layer.id)),
        view: "map",
      }

      const escapeHtml = (value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
      const humanize = (value) => String(value).replaceAll("_", " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase())
      const codeLink = (path) => '<a class="detail-link" href="../' + encodeURI(path) + '">' + escapeHtml(path) + '</a>'
      const textMatches = (value, query) => JSON.stringify(value).toLowerCase().includes(query)

      function renderStats() {
        const counts = data.system.inventory_counts
        const stats = [
          [data.components.length, "Components"],
          [data.flows.length, "End-to-end flows"],
          [data.edges.length, "Dependencies"],
          [counts.route_handlers, "API handlers"],
          [counts.page_files, "Pages"],
          [counts.database_tables, "Database tables"],
          [counts.migration_files, "Migrations"],
          [counts.e2e_spec_files, "E2E specs"],
        ]
        document.getElementById("stats").innerHTML = stats.map(([value, label]) =>
          '<div class="stat"><strong>' + value + '</strong><span>' + escapeHtml(label) + '</span></div>'
        ).join("")
      }

      function renderFlows() {
        document.getElementById("flowList").innerHTML = data.flows.map((flow) =>
          '<button class="flow-button" type="button" data-flow="' + flow.id + '" aria-pressed="' + (state.flowId === flow.id) + '">' +
            '<strong>' + escapeHtml(flow.name) + '</strong>' +
            '<span>' + flow.steps.length + ' steps · ' + escapeHtml(flow.status) + '</span>' +
          '</button>'
        ).join("")
        document.querySelectorAll("[data-flow]").forEach((button) => {
          button.addEventListener("click", () => selectFlow(button.dataset.flow))
        })
      }

      function renderLayerFilter() {
        document.getElementById("layerFilter").innerHTML =
          '<p class="section-label">Layers</p>' +
          data.layers.map((layer) => {
            const count = data.components.filter((component) => component.layer === layer.id).length
            return '<button class="layer-toggle" type="button" data-layer="' + layer.id + '" aria-pressed="' + state.activeLayers.has(layer.id) + '">' +
              '<span class="layer-dot" style="background:' + layer.color + '"></span>' +
              '<span>' + escapeHtml(layer.label) + '</span><span>' + count + '</span>' +
            '</button>'
          }).join("")
        document.querySelectorAll("[data-layer]").forEach((button) => {
          button.addEventListener("click", () => {
            const id = button.dataset.layer
            if (state.activeLayers.has(id)) state.activeLayers.delete(id)
            else state.activeLayers.add(id)
            renderLayerFilter()
            applyHighlights()
          })
        })
      }

      function renderMap() {
        const map = document.getElementById("map")
        map.querySelectorAll(".column").forEach((column) => column.remove())
        for (const layer of data.layers.sort((a, b) => a.order - b.order)) {
          const column = document.createElement("section")
          column.className = "column"
          column.dataset.layerColumn = layer.id
          column.style.setProperty("--layer-color", layer.color)
          const components = data.components.filter((component) => component.layer === layer.id)
          column.innerHTML =
            '<div class="column-header"><strong>' + escapeHtml(layer.label) + '</strong><span>' + escapeHtml(layer.description) + '</span></div>' +
            '<div class="nodes">' +
              components.map((component) =>
                '<button class="node" type="button" data-component="' + component.id + '" style="--layer-color:' + layer.color + '">' +
                  '<span class="step-badge"></span>' +
                  '<strong>' + escapeHtml(component.name) + '</strong>' +
                  '<small>' + escapeHtml(component.kind) + '</small>' +
                  '<span class="status">' + escapeHtml(component.status) + '</span>' +
                '</button>'
              ).join("") +
            '</div>'
          map.appendChild(column)
        }
        document.querySelectorAll("[data-component]").forEach((button) => {
          button.addEventListener("click", () => selectComponent(button.dataset.component))
        })
        applyHighlights()
      }

      function relevantEdges() {
        if (state.flowId) {
          const flow = data.flows.find((item) => item.id === state.flowId)
          return flow.steps.slice(0, -1).map((step, index) => ({
            from: step.component,
            to: flow.steps[index + 1].component,
            active: true,
          }))
        }
        if (state.componentId) {
          return data.edges
            .filter((edge) => edge.from === state.componentId || edge.to === state.componentId)
            .map((edge) => ({ ...edge, active: true }))
        }
        return []
      }

      function drawConnectors() {
        const svg = document.getElementById("connectors")
        const map = document.getElementById("map")
        const mapRect = map.getBoundingClientRect()
        svg.setAttribute("viewBox", "0 0 " + mapRect.width + " " + mapRect.height)
        svg.innerHTML = relevantEdges().map((edge) => {
          const source = document.querySelector('[data-component="' + CSS.escape(edge.from) + '"]')
          const target = document.querySelector('[data-component="' + CSS.escape(edge.to) + '"]')
          if (!source || !target || source.classList.contains("hidden") || target.classList.contains("hidden")) return ""
          const sourceRect = source.getBoundingClientRect()
          const targetRect = target.getBoundingClientRect()
          const x1 = sourceRect.right - mapRect.left
          const y1 = sourceRect.top + sourceRect.height / 2 - mapRect.top
          const x2 = targetRect.left - mapRect.left
          const y2 = targetRect.top + targetRect.height / 2 - mapRect.top
          const bend = Math.max(28, Math.abs(x2 - x1) * .42)
          return '<path class="connector active" d="M ' + x1 + ' ' + y1 + ' C ' + (x1 + bend) + ' ' + y1 + ', ' + (x2 - bend) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '"></path>'
        }).join("")
      }

      function applyHighlights() {
        const query = state.query.trim().toLowerCase()
        const selectedFlow = data.flows.find((flow) => flow.id === state.flowId)
        const stepLookup = new Map(selectedFlow?.steps.map((step) => [step.component, step.order]) ?? [])
        const selectedNeighbors = new Set()
        if (state.componentId) {
          for (const edge of data.edges) {
            if (edge.from === state.componentId) selectedNeighbors.add(edge.to)
            if (edge.to === state.componentId) selectedNeighbors.add(edge.from)
          }
        }
        document.querySelectorAll("[data-layer-column]").forEach((column) => {
          column.classList.toggle("hidden", !state.activeLayers.has(column.dataset.layerColumn))
        })
        document.querySelectorAll("[data-component]").forEach((node) => {
          const component = byId.get(node.dataset.component)
          const inFlow = stepLookup.has(component.id)
          const matches = !query || textMatches(component, query)
          const dimmed = (state.flowId && !inFlow) || (state.componentId && component.id !== state.componentId && !selectedNeighbors.has(component.id)) || !matches
          node.classList.toggle("flow-node", inFlow)
          node.classList.toggle("selected", component.id === state.componentId)
          node.classList.toggle("related", selectedNeighbors.has(component.id))
          node.classList.toggle("dimmed", Boolean(dimmed))
          node.querySelector(".step-badge").textContent = stepLookup.get(component.id) ?? ""
        })
        requestAnimationFrame(drawConnectors)
      }

      function selectFlow(id) {
        state.flowId = state.flowId === id ? null : id
        state.componentId = null
        renderFlows()
        applyHighlights()
        renderDetails()
      }

      function selectComponent(id) {
        state.componentId = state.componentId === id ? null : id
        state.flowId = null
        renderFlows()
        applyHighlights()
        renderDetails()
      }

      function renderDetails() {
        const details = document.getElementById("details")
        if (state.flowId) {
          const flow = data.flows.find((item) => item.id === state.flowId)
          details.className = ""
          details.innerHTML =
            '<div class="detail-block"><h3>' + escapeHtml(flow.name) + '</h3><p><strong>Actor:</strong> ' + escapeHtml(flow.actor) + '<br><strong>Entry:</strong> ' + escapeHtml(flow.entry) + '<br><strong>Outcome:</strong> ' + escapeHtml(flow.terminal_outcome) + '<br><strong>Status:</strong> ' + escapeHtml(flow.status) + '</p></div>' +
            '<div class="detail-block"><h3>Steps</h3><ol class="detail-list">' +
              flow.steps.map((step) => '<li><strong>' + step.order + '. ' + escapeHtml(byId.get(step.component).name) + '</strong><br>' + escapeHtml(step.action) + '<br><em>Control: ' + escapeHtml(step.control) + '</em></li>').join("") +
            '</ol></div>' +
            '<div class="detail-block"><h3>Verification</h3><ul class="detail-list">' +
              flow.verification.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") +
            '</ul></div>'
          return
        }
        if (state.componentId) {
          const component = byId.get(state.componentId)
          const layer = layerById.get(component.layer)
          const incoming = data.edges.filter((edge) => edge.to === component.id)
          const outgoing = data.edges.filter((edge) => edge.from === component.id)
          details.className = ""
          details.innerHTML =
            '<div class="detail-block"><h3>' + escapeHtml(layer.label) + '</h3><p><strong>' + escapeHtml(component.name) + '</strong><br>' + escapeHtml(component.responsibility) + '<br><br><strong>Kind:</strong> ' + escapeHtml(component.kind) + '<br><strong>Status:</strong> ' + escapeHtml(component.status) + '</p></div>' +
            '<div class="detail-block"><h3>Source references</h3>' +
              (component.code_refs.length ? component.code_refs.map(codeLink).join("") : '<p>No repository file applies to this external actor.</p>') +
            '</div>' +
            '<div class="detail-block"><h3>Dependencies</h3><ul class="detail-list">' +
              [...incoming.map((edge) => ({ direction: "From", edge, other: byId.get(edge.from) })), ...outgoing.map((edge) => ({ direction: "To", edge, other: byId.get(edge.to) }))]
                .map((item) => '<li><strong>' + item.direction + ' ' + escapeHtml(item.other.name) + '</strong><br>' + escapeHtml(item.edge.type) + (item.edge.label ? ' · ' + escapeHtml(item.edge.label) : '') + '</li>').join("") +
            '</ul></div>'
          return
        }
        details.className = "details-empty"
        details.textContent = "Select a component or flow to inspect its responsibility, controls, source references, and verification path."
      }

      function renderFlowCatalogue() {
        document.getElementById("flowsView").innerHTML =
          '<h2>Flow catalogue</h2><div class="table-wrap"><table><thead><tr><th>Journey</th><th>Actor / entry</th><th>Terminal outcome</th><th>Status</th><th>Proof</th></tr></thead><tbody>' +
          data.flows.map((flow) =>
            '<tr><td><strong>' + escapeHtml(flow.name) + '</strong><br>' + flow.steps.length + ' steps</td>' +
            '<td>' + escapeHtml(flow.actor) + '<br><code>' + escapeHtml(flow.entry) + '</code></td>' +
            '<td>' + escapeHtml(flow.terminal_outcome) + '</td><td>' + escapeHtml(flow.status) + '</td>' +
            '<td>' + flow.verification.map((item) => '<div>' + escapeHtml(item) + '</div>').join("") + '</td></tr>'
          ).join("") +
          '</tbody></table></div>'
      }

      function routeTokens(items) {
        return items.map((item) => '<span class="token">' + escapeHtml(typeof item === "string" ? item : item.path) + '</span>').join("")
      }

      function renderDataView() {
        const routeSections = [
          ["Public pages", data.route_inventory.public_pages],
          ["Protected pages", data.route_inventory.protected_pages],
          ["Approval and admin", data.route_inventory.approval_and_admin_pages],
          ["Integration API", data.route_inventory.integration_api],
          ["Agent discovery", data.route_inventory.agent_discovery],
          ["Platform routes", data.route_inventory.platform_routes],
        ]
        document.getElementById("dataView").innerHTML =
          '<h2>Data domains, trust boundaries, and routes</h2>' +
          '<div class="inventory-grid">' +
            data.data_domains.map((domain) =>
              '<section class="inventory-section"><h3>' + escapeHtml(domain.name) + '</h3><p class="subtitle">' + escapeHtml(domain.owner) + ' · ' + escapeHtml(domain.sensitivity) + '</p><div class="token-list">' + routeTokens(domain.tables) + '</div></section>'
            ).join("") +
          '</div><br>' +
          '<div class="table-wrap"><table><thead><tr><th>Boundary</th><th>From / to</th><th>Controls</th></tr></thead><tbody>' +
            data.trust_boundaries.map((boundary) =>
              '<tr><td><strong>' + escapeHtml(boundary.name) + '</strong></td><td>' + escapeHtml(boundary.from) + ' → ' + escapeHtml(boundary.to) + '</td><td>' + escapeHtml(boundary.controls.join("; ")) + '</td></tr>'
            ).join("") +
          '</tbody></table></div><br>' +
          '<div class="inventory-grid">' +
            routeSections.map(([name, items]) => '<section class="inventory-section"><h3>' + name + '</h3><div class="token-list">' + routeTokens(items) + '</div></section>').join("") +
          '</div>'
      }

      function renderHandoff() {
        document.getElementById("handoffView").innerHTML =
          '<h2>Agent handoff contract</h2><div class="handoff">' +
            '<section><h3>Read first</h3><ul class="detail-list">' + data.agent_handoff.read_first.map((item) => '<li>' + codeLink(item) + '</li>').join("") + '</ul></section>' +
            '<section><h3>Non-negotiable invariants</h3><ol class="detail-list">' + data.agent_handoff.non_negotiable_invariants.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ol></section>' +
            '<section><h3>Known constraints</h3><ul class="detail-list">' + data.known_constraints.map((item) => '<li><strong>' + escapeHtml(humanize(item.id)) + '</strong><br>' + escapeHtml(item.classification) + '<br>' + escapeHtml(item.detail) + '<br><em>' + escapeHtml(item.impact) + '</em></li>').join("") + '</ul></section>' +
            '<section><h3>Minimum verification</h3><ul class="detail-list">' + data.agent_handoff.minimum_verification.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></section>' +
          '</div><br><div class="table-wrap"><table><thead><tr><th>Change boundary</th><th>Inspect</th><th>Verify</th></tr></thead><tbody>' +
            data.agent_handoff.change_impact_rules.map((rule) =>
              '<tr><td><strong>' + escapeHtml(rule.when) + '</strong></td><td>' + rule.inspect.map((item) => '<div>' + escapeHtml(item) + '</div>').join("") + '</td><td>' + rule.verify.map((item) => '<div>' + escapeHtml(item) + '</div>').join("") + '</td></tr>'
            ).join("") +
          '</tbody></table></div>'
      }

      function setView(view) {
        state.view = view
        document.querySelectorAll("[data-view]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.view === view)))
        document.getElementById("mapView").classList.toggle("hidden", view !== "map")
        for (const id of ["flows", "data", "handoff"]) {
          document.getElementById(id + "View").classList.toggle("active", view === id)
        }
        requestAnimationFrame(drawConnectors)
      }

      document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)))
      document.getElementById("search").addEventListener("input", (event) => {
        state.query = event.target.value
        if (state.view !== "map") {
          const query = state.query.trim().toLowerCase()
          document.querySelectorAll("#" + state.view + "View tr, #" + state.view + "View .inventory-section, #" + state.view + "View .detail-list li").forEach((item) => {
            item.classList.toggle("hidden", Boolean(query) && !item.textContent.toLowerCase().includes(query))
          })
        }
        applyHighlights()
      })
      document.getElementById("fitMap").addEventListener("click", () => document.getElementById("mapView").scrollTo({ left: 0, top: 0, behavior: "smooth" }))
      document.getElementById("clearSelection").addEventListener("click", () => {
        state.flowId = null
        state.componentId = null
        state.query = ""
        document.getElementById("search").value = ""
        state.activeLayers = new Set(data.layers.map((layer) => layer.id))
        renderFlows()
        renderLayerFilter()
        renderDetails()
        applyHighlights()
      })
      window.addEventListener("resize", () => requestAnimationFrame(drawConnectors))

      renderStats()
      renderFlows()
      renderLayerFilter()
      renderMap()
      renderFlowCatalogue()
      renderDataView()
      renderHandoff()
      renderDetails()
    })()
  </script>
</body>
</html>
`
}

const data = readJson(sourcePath)
const evidence = validate(data)
const output = render(data)

if (checkOnly) {
  assert(existsSync(outputPath), "Generated HTML does not exist; run npm run architecture:generate")
  const current = readFileSync(outputPath, "utf8")
  assert(current === output, "Generated HTML is stale; run npm run architecture:generate")
  console.log(
    `[architecture-map] valid: ${data.components.length} components, ${data.edges.length} dependencies, ` +
    `${data.flows.length} flows, ${evidence.actualCounts.database_tables} tables, ${evidence.codeRefCount} source references`
  )
} else {
  writeFileSync(outputPath, output)
  console.log(`[architecture-map] wrote ${relative(repoRoot, outputPath)}`)
}
