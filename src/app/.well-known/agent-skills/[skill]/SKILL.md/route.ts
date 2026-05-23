import { NextRequest, NextResponse } from "next/server";

import { getAgentSkill, getAgentSkillMarkdown } from "@/lib/agent-skills";

export function GET(
  _request: NextRequest,
  context: { params: Promise<{ skill: string }> },
) {
  return context.params.then(({ skill }) => {
    const definition = getAgentSkill(skill);
    if (!definition) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return new NextResponse(getAgentSkillMarkdown(definition), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
