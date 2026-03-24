import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface WarrantyInput {
  product_name: string;
  product_category?: string;
  brand?: string;
  model_number?: string;
  serial_number?: string;
  purchase_date: string;
  warranty_start_date: string;
  warranty_end_date: string;
  warranty_type?: string;
  warranty_provider?: string;
  purchase_price?: number;
  currency?: string;
  retailer?: string;
  notes?: string;
}

export async function getWarranties() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getWarranty(id: string) {
  const { data, error } = await supabase
    .from("warranties")
    .select("*, warranty_documents(*), warranty_claims(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createWarranty(input: WarrantyInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("warranties")
    .insert({
      ...input,
      user_id: user.id,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWarranty(id: string, updates: Partial<WarrantyInput>) {
  const { data, error } = await supabase
    .from("warranties")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWarranty(id: string) {
  const { error } = await supabase
    .from("warranties")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: warranties, error } = await supabase
    .from("warranties")
    .select("id, status, warranty_end_date, purchase_price, currency")
    .eq("user_id", user.id);

  if (error) throw error;

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const total = warranties?.length || 0;
  const active = warranties?.filter(w => w.status === "active" && new Date(w.warranty_end_date) > now).length || 0;
  const expiringSoon = warranties?.filter(w => {
    const end = new Date(w.warranty_end_date);
    return w.status === "active" && end > now && end <= thirtyDays;
  }).length || 0;
  const expired = warranties?.filter(w => new Date(w.warranty_end_date) <= now).length || 0;

  const totalValue = warranties?.reduce((sum, w) => sum + (w.purchase_price || 0), 0) || 0;

  return { total, active, expiringSoon, expired, totalValue };
}

export async function getExpiringWarranties(days: number = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const now = new Date().toISOString();
  const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gte("warranty_end_date", now)
    .lte("warranty_end_date", futureDate)
    .order("warranty_end_date", { ascending: true });

  if (error) throw error;
  return data;
}
