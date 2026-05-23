import { NextRequest, NextResponse } from "next/server";
import {
  confirmProvisionalWarranty,
  rejectProvisionalWarranty,
  verifyBuyerConfirmationToken,
} from "@/lib/provisional-warranties";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://warrantee.io";
}

function renderResultPage({
  title,
  message,
  actionHref,
  actionLabel,
  accent = "#059669",
}: {
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
  accent?: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
    <div style="max-width:680px;margin:48px auto;padding:24px;">
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(17,24,39,0.08);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#111827,${accent});color:#fff;">
          <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.8;">Warrantee</div>
          <h1 style="margin:12px 0 0;font-size:32px;line-height:1.15;">${title}</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5563;">${message}</p>
          <a href="${actionHref}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;">${actionLabel}</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const payload = verifyBuyerConfirmationToken(token);
  const dashboardUrl = `${getAppUrl()}/en/dashboard/provisional`;

  if (!payload) {
    return new NextResponse(
      renderResultPage({
        title: "Confirmation link expired",
        message: "This warranty confirmation link is no longer valid. Please go to your Warrantee dashboard and review the item there.",
        actionHref: dashboardUrl,
        actionLabel: "Open dashboard",
        accent: "#b91c1c",
      }),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (payload.action === "confirm") {
    const result = await confirmProvisionalWarranty(payload.provisionalId, {
      actor: `buyer-email:${payload.email}`,
      auditAction: "buyer_confirmed",
    });

    if (!result.ok) {
      return new NextResponse(
        renderResultPage({
          title: "Warranty could not be confirmed",
          message: result.error || "We could not confirm this warranty from the email link. Please review it in your dashboard.",
          actionHref: dashboardUrl,
          actionLabel: "Review in dashboard",
          accent: "#b91c1c",
        }),
        { status: result.status, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    return new NextResponse(
      renderResultPage({
        title: "Warranty confirmed",
        message: "Your warranty details have been confirmed and the warranty has been registered in Warrantee.",
        actionHref: `${getAppUrl()}/en/warranties`,
        actionLabel: "View warranties",
      }),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const result = await rejectProvisionalWarranty(payload.provisionalId, {
    reason: "reject",
    actor: `buyer-email:${payload.email}`,
    auditAction: "buyer_rejected",
  });

  if (!result.ok) {
    return new NextResponse(
      renderResultPage({
        title: "Warranty needs review",
        message: result.error || "We could not process this review link. Please review the provisional item from your dashboard.",
        actionHref: dashboardUrl,
        actionLabel: "Open dashboard",
        accent: "#b91c1c",
      }),
      { status: result.status, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  return new NextResponse(
    renderResultPage({
      title: "Review requested",
      message: "We marked this warranty for buyer review so it will not be registered automatically until it is checked again.",
      actionHref: dashboardUrl,
      actionLabel: "Review in dashboard",
      accent: "#9a3412",
    }),
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
