import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  apiV1Json,
  authorizeApiV1StatusRequest,
  recordApiV1Usage,
} from "@/lib/api-v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authorizeApiV1StatusRequest(request);
  if ("response" in auth) return auth.response;

  const { requester } = auth;
  await recordApiV1Usage(createSupabaseAdminClient(), request, requester, {
    statusCode: 200,
    metadata: { operation: "integration_status" },
  });

  return apiV1Json(
    {
      ok: true,
      apiVersion: "v1",
      credential: {
        kind: requester.kind,
        scopes: requester.scopes,
        rateLimitPerMinute: requester.rateLimitPerMinute,
      },
      boundaries: {
        tenantDerivedFromCredential: true,
        usernameOrPasswordRequired: false,
        destructiveActionsRequireExplicitConfirmation: true,
      },
      documentation: "https://warrantee.io/en/api-docs",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
