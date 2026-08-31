import type { NextRequest } from "next/server";

import { GET as getAgentConciergeQuestions } from "../../../api/admin/agent-concierge/questions/route";

export async function GET(request: NextRequest) {
  const response = await getAgentConciergeQuestions(request);
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("X-Robots-Tag", "noindex, nofollow");

  return new Response(await response.text(), {
    status: response.status,
    headers,
  });
}
