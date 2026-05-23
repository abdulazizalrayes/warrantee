import { NextResponse } from "next/server";

import {
  AGENT_SKILLS,
  getAgentSkillArtifactUrl,
  getAgentSkillDigest,
} from "@/lib/agent-skills";

export function GET() {
  return NextResponse.json(
    {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: AGENT_SKILLS.map((skill) => ({
        name: skill.slug,
        type: "skill-md",
        description: skill.description,
        url: getAgentSkillArtifactUrl(skill),
        digest: getAgentSkillDigest(skill),
      })),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
