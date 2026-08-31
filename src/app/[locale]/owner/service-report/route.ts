import type { NextRequest } from "next/server";

import { GET as getAgentConciergeQuestions } from "../../../api/admin/agent-concierge/questions/route";

export async function GET(request: NextRequest) {
  const response = await getAgentConciergeQuestions(request);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
