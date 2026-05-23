import { createHash } from "crypto";

const BASE_URL = "https://warrantee.io";

export type AgentSkillDefinition = {
  slug: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  examples: string[];
};

export const AGENT_SKILLS: AgentSkillDefinition[] = [
  {
    slug: "warranty-verification",
    name: "Warranty Verification",
    description:
      "Verify whether a public warranty record is valid and view its status.",
    inputs: ["warranty reference", "verification identifier"],
    outputs: ["verification status", "summary details", "next steps"],
    examples: ["Verify warranty WR-MN9D9MGCF-7BAV"],
  },
  {
    slug: "claims-intake",
    name: "Claims Intake",
    description: "Submit, document, and track warranty claims.",
    inputs: ["claim description", "evidence documents", "warranty reference"],
    outputs: ["claim record", "claim status", "submitted timestamp"],
    examples: ["Create a claim for compressor failure on warranty WR-MN9D9MGCF-7BAV"],
  },
  {
    slug: "seller-onboarding",
    name: "Seller Onboarding",
    description:
      "Invite sellers, onboard them into Warrantee, and establish warranty issuance workflows.",
    inputs: ["seller company details", "authorized users", "invitation email"],
    outputs: ["invitation record", "seller onboarding status"],
    examples: ["Invite a seller team at seller.example.com"],
  },
  {
    slug: "warranty-extensions",
    name: "Warranty Extensions",
    description: "Offer or request extension terms for eligible warranties.",
    inputs: ["warranty reference", "requested duration", "seller offer terms"],
    outputs: ["extension offer", "eligibility summary", "extension status"],
    examples: ["Create a 12-month extension offer for warranty WR-MN9D9MGCF-7BAV"],
  },
  {
    slug: "document-ingestion",
    name: "Document Ingestion",
    description:
      "Ingest warranty files, OCR documents, and extract metadata into platform workflows.",
    inputs: ["PDF or image document", "warranty attachment"],
    outputs: ["extracted fields", "OCR confidence", "document linkage"],
    examples: ["Extract warranty data from uploaded PDF"],
  },
  {
    slug: "paid-growth-ops",
    name: "Paid Growth Operations",
    description:
      "Plan, analyze, and govern paid acquisition workflows across Meta ads, campaign reporting, tracking QA, and founder-approved launch plans.",
    inputs: [
      "campaign brief",
      "target segment",
      "approved budget cap",
      "conversion events",
      "landing page URL",
    ],
    outputs: [
      "campaign draft",
      "tracking checklist",
      "risk review",
      "approval gate",
      "performance summary",
    ],
    examples: [
      "Draft a Meta campaign for seller onboarding without launching it",
      "Audit paid campaign tracking against GA4 and GTM events",
    ],
  },
];

export function getAgentSkill(slug: string) {
  return AGENT_SKILLS.find((skill) => skill.slug === slug);
}

export function getAgentSkillMarkdown(skill: AgentSkillDefinition) {
  return `---
name: ${skill.slug}
description: ${skill.description}
---

# ${skill.name}

Use this skill when an agent needs to help a user with ${skill.description.toLowerCase()}

## Inputs

${skill.inputs.map((input) => `- ${input}`).join("\n")}

## Outputs

${skill.outputs.map((output) => `- ${output}`).join("\n")}

## Examples

${skill.examples.map((example) => `- ${example}`).join("\n")}

## Endpoint Hints

- Public site: ${BASE_URL}/en
- API docs: ${BASE_URL}/en/api-docs
- Verification flow: ${BASE_URL}/verify
- Paid-growth guardrail: campaign analysis and drafts are allowed, but live ad account linking, audience uploads, campaign edits, and spend changes require founder approval.
`;
}

export function getAgentSkillDigest(skill: AgentSkillDefinition) {
  return `sha256:${createHash("sha256")
    .update(getAgentSkillMarkdown(skill), "utf8")
    .digest("hex")}`;
}

export function getAgentSkillArtifactUrl(skill: AgentSkillDefinition) {
  return `${BASE_URL}/.well-known/agent-skills/${skill.slug}/SKILL.md`;
}
