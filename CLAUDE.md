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

## External Paperclip Context

Use this section only when the user explicitly asks about cloud Paperclip (`ai.eijarat.com`) or Paperclip agents. Do not mix Paperclip work, accounts, models, or assumptions into Warrantee product work.

- The user reports cloud Paperclip at `ai.eijarat.com` was upgraded to `v2026.707.0`.
- Before acting on Paperclip, verify the live app state through `/api/health`, a visible running version endpoint, or an authenticated browser/session. Do not assume the release is active just because the user mentioned it.
- Confirm Paperclip is active and healthy before using it for important work.
- Confirm the available OpenCode models before assigning agents.
- Prefer `opencode/big-pickle` for important/main agent work when available.
- Prefer `opencode/deepseek-v4-flash-free` for cheaper/helper work when available.
- Watch for older agents that may still carry old model configs; clean or migrate those configs before relying on them.
- Cloudflare Access may protect Paperclip endpoints. If unauthenticated shell checks return an Access login page, record that the app is access-protected and verify health through an authenticated regular browser/session instead.
- Familiarize yourself with release-specific Paperclip changes before assuming old Paperclip behavior, especially around model routing, agent configs, health checks, and automation behavior.

## Agent Markdown Companions

- Warrantee publishes deterministic Markdown companions only for canonical, indexable sitemap pages.
- Do not hand-edit `src/generated/agent-markdown-pages.json`.
- After changing public page content, metadata, structured data, or the sitemap: build the production app, regenerate with `npm run agent-markdown:generate` against that local build, rebuild, and run `npm run qa:agent-markdown:local`.
- Preserve ordinary HTML output. A change is not release-ready until `npm run qa:html-preservation` confirms the candidate semantic HTML trees match the approved baseline, unless the owner explicitly approved an HTML or visual change.
- Keep the Content-Signal policy centralized in `src/lib/agent-content-policy.ts`. Do not copy another company policy or change Warrantee's policy without owner approval.
- Direct Markdown sidecars must remain `noindex, follow`, and `Accept: text/markdown;q=0` must return HTML.
