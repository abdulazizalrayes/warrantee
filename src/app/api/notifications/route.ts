import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/validation";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") || 50);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 100);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }

  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; markAllRead?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("notifications")
    .update({ is_read: true, read: true })
    .eq("user_id", user.id);

  if (!body.markAllRead) {
    if (!body.id || !isValidUUID(body.id)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }
    query = query.eq("id", body.id);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id || !isValidUUID(body.id)) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
