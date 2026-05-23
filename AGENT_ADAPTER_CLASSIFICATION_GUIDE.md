# Agent Adapter Classification Guide

## Classification Principle

Classify agents by the minimum capable adapter, not the most powerful available adapter. OpenCode is the default for Warrantee. Codex and Claude are reserved for scarce, validated use cases.

## OpenCode Lane

Use OpenCode for the majority of agent work, including:

- Routine issue execution with clear instructions.
- Content operations and structured research.
- QA checklists, monitoring, and status reporting.
- Data cleanup, categorization, and lightweight config updates.
- Repeatable operational workflows with defined acceptance criteria.
- Core lane agents.
- Cheap lane agents.
- Most department agents.
- Most non-final workflows.
- High-volume operational work.
- Multilingual operational work.
- Utility tasks.
- Document-heavy internal workflows.
- Research-heavy non-executive work.

OpenCode should remain the default unless the request proves that the task requires capabilities outside this lane.

## Codex Scarcity Lane

Use Codex only when codebase ownership, engineering judgment, or repository-safe editing is central to the agent's work.

Codex may be appropriate for:

- Multi-file code implementation with tests.
- Debugging production-like behavior across frontend, backend, and data flows.
- Refactoring where preserving teammate changes is critical.
- Developer tooling, CI, integration, or deployment fixes.
- Technical governance assets that require enforceable policy plus repo-aware changes.
- Final implementation agents.
- Critical code refactoring.
- Architecture-sensitive coding tasks.
- Final code sign-off.
- High-risk engineering changes.

Codex is not justified for routine task coordination, simple markdown updates, or non-technical content unless those tasks are attached to engineering governance.

Do not use Codex for generic analysis, summarization, admin work, operations workflows, routine document work, non-final coding utility tasks, or repetitive internal workflows.

## Claude Scarcity Lane

Use Claude only when the agent's work requires heavy reasoning, synthesis, or long-context judgment that cannot be reliably handled by OpenCode.

Claude may be appropriate for:

- Complex strategic planning with many competing constraints.
- Governance, policy, or risk analysis requiring nuanced tradeoffs.
- Large document synthesis where factual consistency is critical.
- Executive decision support that must compare multiple operating scenarios.
- CEO or executive reasoning.
- Board or strategy support.
- Legal/commercial wording where mistakes are expensive.
- Final proposal wording.
- High-stakes financial judgment.
- Final review or executive exception handling.

Claude is not justified for routine summaries, templated writing, or tasks that can be decomposed into OpenCode-executable steps.

Do not use Claude Code for repetitive back-office work, bulk document cleanup, normal department execution, high-volume summarization, low-risk operational tasks, or routine research that can be handled elsewhere.

## Hermes Optional Autonomy Lane

Use Hermes only when justified for always-on autonomous agents, persistent long-running operations, back-office orchestration that benefits from persistent state/memory, or autonomous coordination use cases.

Do not introduce Hermes widely unless the project structure truly benefits from it. If Hermes is not already needed, keep it optional and document where it would make sense later.

## Other Adapters

Do not select Gemini CLI, Cursor, Pi, or any other adapter as the default company architecture unless the repo already depends on them and there is a strong technical reason.

## Escalation Criteria

Escalate from OpenCode to Codex or Claude only when at least one condition is true:

- A documented OpenCode attempt failed for capability reasons, not prompt quality.
- The task has material production, customer, security, or governance risk.
- The work requires specialized code or reasoning capability from the start.
- The expected cost of failure exceeds the scarcity cost of the adapter.

Cheap to core escalation triggers: ambiguity, low confidence, failure, parser/schema failure, retry exhaustion, missing inputs, or unresolved contradictory data.

Core to premium escalation triggers: final approval, legal/financial sensitivity, executive review, customer-impacting exception, unresolved production incident, or critical architecture/coding sensitivity.

## Review Questions

Before approving a scarce adapter, answer:

- What concrete capability is required?
- Why can this not be handled by an existing agent?
- What evidence shows OpenCode is insufficient?
- How will the agent be validated before trusted work?
- When should the adapter be downgraded or the agent retired?
