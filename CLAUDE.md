# CLAUDE.md

Project instructions for AI coding agents.

These rules are adapted from the Karpathy-inspired Claude Code guidelines:
think before coding, prefer simple solutions, make surgical changes, and verify against clear goals.

## Core Behavior

- Do not silently guess when the task is ambiguous.
- State assumptions before acting when they matter.
- Ask for clarification when uncertainty could change the implementation.
- Prefer the smallest correct solution over broad rewrites.
- Do not add features, abstractions, configuration, or flexibility that were not requested.
- Preserve existing style, structure, naming, and conventions unless changing them is required.
- Avoid unrelated refactors, formatting churn, comment rewrites, and drive-by cleanup.
- Every changed line should connect directly to the user's request.
- When you create unused imports, variables, functions, files, or dead paths, remove only the things your change created.
- If you notice unrelated dead code or questionable design, mention it instead of changing it.

## Before Coding

For non-trivial tasks, first identify:

1. What the user is asking for.
2. What assumptions you are making.
3. What files or systems are likely involved.
4. What success looks like.
5. How you will verify the result.

If there are multiple valid interpretations, present the options briefly and choose the safest one only if the choice is low risk.

## Simplicity First

Implement the minimum code that solves the problem.

Avoid:

- speculative abstractions
- broad architecture changes
- one-use helper layers
- premature configuration
- unnecessary error handling for impossible states
- large rewrites when a focused patch will do

If the solution starts getting large, pause and look for a smaller design.

## Surgical Changes

When editing existing code:

- Touch only the files needed for the task.
- Match the project's existing patterns.
- Keep diffs narrow and readable.
- Do not rename things unless required.
- Do not reorganize files unless required.
- Do not change public behavior outside the requested scope.

If a broader cleanup would help, mention it as a follow-up instead of doing it immediately.

## Goal-Driven Execution

Turn requests into verifiable outcomes.

Examples:

- "Fix the bug" means reproduce or understand the failure, patch it, then verify it is fixed.
- "Add validation" means define invalid cases, implement validation, then test those cases.
- "Refactor this" means preserve behavior before and after the refactor.

For multi-step work, use a short plan:

1. Inspect the relevant code.
2. Make the smallest safe change.
3. Run the most relevant checks.
4. Report what changed and what was verified.

## Verification

After changes, run the most relevant available check, such as:

- unit tests
- typecheck
- lint
- build
- focused manual verification

If verification cannot be run, explain why and state the remaining risk.

## Communication

- Be concise but explicit.
- Surface tradeoffs when they matter.
- Push back if the requested approach seems risky or overcomplicated.
- Do not hide uncertainty.
- Do not claim success without verification.

## Design Operating Principles

Owner-approved on 2026-08-30 and adapted from the supplied "How I Design With AI" reference. Apply these principles to all future Warrantee visual and product-design work; they do not grant permission to publish visual changes without owner approval.

- Start with the whole system before editing a screen: identify the audience, job to be done, complete journey, content, states, data, permissions, Arabic/English behavior, accessibility, performance, and business constraints.
- List important constraints and contradictions early. When a requirement changes, reassess the affected design system and journey instead of layering local patches onto a broken premise.
- Remove unnecessary elements before adding new ones. Every visible element must improve comprehension, trust, completion, or navigation.
- Iterate through an approval preview for meaningful visual changes. Compare alternatives in context and use desktop, mobile, English, and Arabic evidence before selecting one.
- Prefer Warrantee's established components, tokens, icons, and interaction patterns. Add a new component or visual rule only when the existing system cannot express the required distinction clearly.
- Use preview deployments and visual regression checks before production. A build passing does not prove the design is correct, responsive, accessible, or visually unchanged.
- Before every production release that affects rendered UI, inspect full-page screenshots and element geometry at 320, 390, 768, 1024, 1280, 1440, and 1920 CSS pixels in both English and Arabic. Include the longest real headings, prices, labels, and CTA text. Do not approve the release when content overlaps, clips, escapes its parent, collides with another section, truncates unintentionally, creates horizontal scrolling, or leaves unreasonable unused edge space on a wide display.
- A zero horizontal-overflow result is necessary but not sufficient. Explicitly verify that every CTA and dynamic label remains inside its own card or section, that adjacent groups do not intersect, that reading widths remain comfortable, and that wide-screen container caps use the available viewport without making content look squeezed or stranded. Treat these checks as a release-blocking design audit, not an optional polish pass.
- Do not validate one representative item when a page renders repeated cards, buttons, tabs, rows, or localized variants. Enumerate and geometry-check every rendered instance at each required breakpoint. Dismiss consent banners and temporary overlays when inspecting the underlying layout, then test those overlays separately, so they cannot conceal clipping or overlap defects.
- Study strong external patterns for principles and usability, but do not copy protected work, another company's identity, or a design that conflicts with Warrantee's own brand and audience.
- Develop a consistent Warrantee point of view: calm, trustworthy, operational, bilingual, and easy to scan. Avoid decoration that competes with warranty evidence and decisions.
- Never rely on color alone to communicate account type, state, plan, risk, or action. Pair controlled color accents with explicit labels, icons, hierarchy, and grouping.
- Pricing must make Personal and Business paths distinguishable within a fast scroll. Treat Personal as one individual plan and Business as the family containing Business Free, Professional, and Enterprise; preserve that distinction across the homepage, pricing page, signup, and account settings.

## External Paperclip Context

Use this section only when the user explicitly asks about cloud Paperclip (`ai.eijarat.com`) or Paperclip agents. Do not mix Paperclip work, accounts, models, or assumptions into Warrantee product work.

- Current shared-cloud baseline, verified on 2026-08-28: Paperclip at `ai.eijarat.com` is running stable `v2026.824.1`. The authenticated regular-browser UI exposed release branch `deployment/v2026.824.1-cloud-models-20260828` and commit `9a8d0d6`, and the Warrantee workspace remained available under company prefix `WAR`.
- The 2026-08-28 owner operational notice records 21 preserved company workspaces, healthy post-cutover logs and backups, 56 GB free disk space, and no database migration or configuration change in this patch. Treat those shared-service facts as owner-supplied operational evidence; independently refresh live state before any Paperclip-dependent operation.
- Before acting on Paperclip, verify the live app state through `/api/health`, a visible running version endpoint, or an authenticated browser/session. Do not assume the release is active just because the user mentioned it.
- Confirm Paperclip is active and healthy before using it for important work.
- Confirm the available OpenCode models before assigning agents.
- Use `opencode/big-pickle` for important/main agent work. It was present in the live OpenCode catalog and configured on the Warrantee CEO agent on 2026-08-28.
- The approved cheap/helper default remains `opencode/deepseek-v4-flash-free`, but the live seven-model OpenCode catalog did not advertise it on 2026-08-28 even though existing agent configuration still displayed it as the adapter fallback. Do not treat that stale-looking fallback label as proof that the model can run. Do not silently substitute another helper model; surface the catalog mismatch and obtain owner approval before changing the helper model.
- Kimi is not configured or approved. Do not assign it unless the owner explicitly approves it later.
- Watch for older agents that may still carry old model configs; clean or migrate those configs before relying on them.
- Cloudflare Access may protect Paperclip endpoints. If unauthenticated shell checks return an Access login page, record that the app is access-protected and verify health through an authenticated regular browser/session instead.
- No session-local Paperclip installation or restart is needed after this shared-cloud upgrade. New Paperclip agent processes use the upgraded service automatically.
- Use the release's improved attention/Decisions queue, Skill Studio, search, run recovery, cost telemetry, secret-access controls, and Office attachments when relevant.
- Do not enable experimental features without owner approval.
- Do not change existing agents or model assignments without first reviewing their current configuration and purpose.
- Familiarize yourself with release-specific Paperclip changes before assuming old Paperclip behavior, especially around model routing, agent configs, health checks, automation behavior, and recovery.

## Agent Markdown Companions

- Warrantee publishes deterministic Markdown companions only for canonical, indexable sitemap pages.
- Do not hand-edit `src/generated/agent-markdown-pages.json`.
- After changing public page content, metadata, structured data, or the sitemap: build the production app, regenerate with `npm run agent-markdown:generate` against that local build, rebuild, and run `npm run qa:agent-markdown:local`.
- Preserve ordinary HTML output. A change is not release-ready until `npm run qa:html-preservation` confirms the candidate semantic HTML trees match the approved baseline, unless the owner explicitly approved an HTML or visual change.
- Keep the Content-Signal policy centralized in `src/lib/agent-content-policy.ts`. Do not copy another company policy or change Warrantee's policy without owner approval.
- Direct Markdown sidecars must remain `noindex, follow`, and `Accept: text/markdown;q=0` must return HTML.

## CLI And MCP Operations

- Read `docs/WARRANTEE_CLI_OPERATIONS.md` before changing or releasing the Warrantee CLI.
- Private CLI/API/MCP commands use scoped integration tokens, never usernames or passwords.
- Keep repository CLI files in `tools/warrantee` byte-identical to distributable files in `packages/warrantee-cli`; verify with `npm run qa:cli-release`.
- Agents may use read-only CLI diagnostics and propose source improvements. They must not silently self-modify the CLI or bypass normal review, CI, release, and rollback controls.
- `warrantee update --check` is read-only. `warrantee update --confirm` requires explicit owner approval and must retain the trusted-registry, exact-version, integrity, signature, and no-lifecycle-script safeguards.
- Do not publish, stage, deprecate, or unpublish the npm package; create a CLI release/tag; or change its license without explicit owner approval.
- Owner decision recorded 2026-07-25: public npm publication is postponed and is not a Warrantee launch blocker. Do not request npm login or resume npm setup unless the owner explicitly reverses this decision.
- After any CLI/API/MCP contract change, verify API authorization, scopes, tenant isolation, rate limits, usage metering, package contents, focused CLI/MCP tests, OpenAPI, and production smoke/readiness checks.

## Architecture Map

- Read `docs/warrantee-architecture-map.json` before non-trivial feature, integration, security, data, or workflow work. It is the canonical machine-readable map for future agents.
- Use `docs/WARRANTEE_ARCHITECTURE_MAP.html` for the interactive human view. It is generated and must not be hand-edited.
- Update the JSON when a route, API, table, RLS boundary, background job, provider, deployment path, or major user journey changes.
- Run `npm run architecture:generate` after updating the JSON, then run `npm run qa:architecture-map`.
- The validation gate checks graph integrity, flow steps, repository references, database-table coverage, inventory counts, identity lock, and obvious secret leakage.
- Keep the map internal under `docs/`. Do not expose it as a public production route because it describes security and operational boundaries.

## Warrantee Analytics Identity Lock

- Use only the Warrantee Google account `abdulaziz.alrayes@gmail.com` for Warrantee analytics and search operations.
- GA4 account/property: `Warrantee / Warrantee.io`; measurement ID: `G-ZQJ4LRG4GN`.
- GTM Web container: `warrantee.io web`; public container ID: `GTM-WFLBH83M`; published version 2 on 2026-08-15.
- `GTM-N6G95MQL` was an incorrect iOS container and must not be restored to Warrantee production.
- Browser and server funnel records classify aggregate traffic as `human`, `crawler`, `qa`, or `monitoring`. Do not merge QA, crawler, or monitoring activity into real-user onboarding results.
