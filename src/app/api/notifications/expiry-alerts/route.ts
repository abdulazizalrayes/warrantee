import { NextResponse } from "next/server";
import { requireInternalBearer } from "@/lib/internal-auth";
import { sendExpiryReminders } from "@/lib/server/expiry-reminders";

export async function POST(request: Request) {
  try {
    const authError = requireInternalBearer(request, process.env.CRON_SECRET);
    if (authError) return authError;

    return NextResponse.json(await sendExpiryReminders());
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
