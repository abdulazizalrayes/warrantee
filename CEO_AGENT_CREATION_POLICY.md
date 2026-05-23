# CEO Agent Creation Policy

## Purpose

This policy governs future agent creation for Warrantee. It is intended to keep agent hiring enforceable, cost-aware, and aligned with company priorities before any new autonomous worker is introduced.

## Default Adapter Policy

OpenCode is the default adapter for existing and new Warrantee agents. New agent requests must assume OpenCode unless the request demonstrates a clear, job-specific reason that OpenCode cannot satisfy.

Codex and Claude Code adapters are scarce premium capacity. They may be approved only when the work requires capabilities that materially exceed the OpenCode lane, such as final implementation, repository-scale code changes, complex architecture judgment, high-risk debugging, legal/commercial wording, executive exception handling, or workflows where previous OpenCode attempts have failed with evidence.

Hermes Agent is optional and may be used only for persistent, always-on autonomous operations where long-running coordination or memory materially improves the workflow.

## Approval Requirements

Every new agent requires a completed request using `NEW_AGENT_REQUEST_TEMPLATE.md` before creation. The request must identify:

- Business owner.
- Business objective.
- Job-to-be-done.
- Error cost.
- Business risk.
- Reasoning depth.
- Coding intensity.
- Multilingual requirement.
- Document complexity.
- Throughput or workload volume.
- Data sensitivity.
- Lane.
- Adapter.
- Provider/model.
- Fallback.
- Escalation path.
- Required tools and skills.
- Approval requirement.
- The business outcome the agent owns.
- Why the work cannot be handled by an existing agent.
- The proposed adapter and lane.
- The expected task volume and review cadence.
- The validation plan for the first work cycle.
- The owner accountable for agent quality and retirement.

## Adapter Scarcity Rules

Codex and Claude allocations must be treated as exceptions, not defaults. Approval must include a written scarcity rationale and a planned downgrade path to OpenCode or retirement when the specialized need ends.

Requests for scarce adapters should be rejected or revised when:

- The agent performs routine content, data entry, monitoring, triage, or coordination work.
- The request does not cite concrete capabilities unavailable in OpenCode.
- The agent duplicates an existing lane without a measurable capacity gap.
- The requester cannot define validation criteria for early work.
- Executive seniority is the only justification.
- The work is summarization, extraction, translation, cleanup, routing, formatting, first-pass review, or repetitive departmental work.

## Lane Rules

Premium lane is restricted to final executive reasoning, legal/commercial high-risk output, final financial judgment, final architecture decisions, final code approval, and critical exceptions.

Core lane runs primarily on OpenCode for procurement, HR operations, finance operations, PMO/project controls, tendering, internal analysts, sales operations research, document control, first-pass contract review, implementation preparation, and multilingual operations workflows.

Cheap lane runs primarily on OpenCode with lower-cost provider/model choices for summarization, extraction, classification, translation, OCR cleanup, note cleanup, inbox triage, FAQ, formatting, CRM/admin cleanup, parsing, chunking, invoice field extraction, and first-pass cleanup.

Do not classify agents by job title alone. Classify every agent by error cost, business risk, reasoning depth, coding complexity, multilingual requirement, document complexity, throughput, and whether the task is final approval or preparation work.

If a requested agent mixes high-stakes strategy with repetitive utility execution, the CEO workflow must propose splitting it into two agents: one strategy/approval agent and one execution/utility/preparation agent.

## Future-Agent Validation Policy

New agents start in a probationary validation period. During this period, the owner must review outputs before they are treated as production-ready and must confirm that the agent:

- Follows Warrantee governance and task boundaries.
- Uses the approved adapter and lane.
- Produces auditable status updates and handoffs.
- Avoids touching systems, code, or customer-impacting assets outside its mandate.
- Has a clear stop, downgrade, or escalation path.

Agents that fail validation must be paused, corrected, downgraded, or retired before additional work is assigned.

## Escalation Rules

Cheap lane escalates to core lane on ambiguity, low confidence, parser/schema failure, failed retry exhaustion, or missing input quality.

Core lane escalates to premium lane only for final approval, legal/financial sensitivity, executive review, production-risk engineering, customer-impacting unresolved exceptions, or critical architecture/coding sensitivity.

No new agent may default to Codex or Claude Code without written premium justification tied to legal risk, financial risk, executive decision sensitivity, final approval responsibility, or critical architecture/coding sensitivity.

## Change Control

Changes to this policy, adapter classifications, or lane mappings require CEO-level approval or an explicitly delegated governance owner. Placeholder config files are not self-authorizing; the written policy remains the source of truth until registry entries are reviewed and approved.
