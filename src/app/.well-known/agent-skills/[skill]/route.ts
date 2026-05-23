import { NextRequest, NextResponse } from "next/server";

import { getAgentSkill, getAgentSkillArtifactUrl } from "@/lib/agent-skills";

export function GET(
  _request: NextRequest,
  context: { params: Promise<{ skill: string }> },
) {
  return context.params.then(({ skill }) => {
    const definition = getAgentSkill(skill);
    if (!definition) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: definition.slug,
      type: "skill-md",
      description: definition.description,
      url: getAgentSkillArtifactUrl(definition),
    });
  });
}
