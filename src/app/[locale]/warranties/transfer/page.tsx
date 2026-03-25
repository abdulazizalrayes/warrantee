// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { getDictionary } from "@/lib/i18n";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TransferWarrantyPage({ params }: { params: { locale: string } }) {
  const isAr = params.locale === "ar";
  const [warranties, setWarranties] = useState<any[]>([]);
  const [selectedWarranty, setSelectedWarranty] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWarranties() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("warranties")
          .select("id, product_name, serial_number, status")
          .eq("created_by", user.id)
          .eq("status", "active");
        setWarranties(data || []);
      }
    }
    loadWarranties();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Look up recipient
      const { data: recipient } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", recipientEmail)
        .single();

      if (!recipient) {
        setError(isAr ? "لم يتم العثور على المستخدم بهذا البريد" : "No user found with that email");
        setLoading(false);
        return;
      }

      // Create transfer record
      const { error: transferError } = await supabase
        .from("warranty_chain_assignments")
        .insert({
          warranty_id: selectedWarranty,
          from_user_id: user.id,
          to_user_id: recipient.id,
          transfer_date: new Date().toISOString(),
          reason: reason || null,
        });

      if (transferError) throw transferError;

      // Update warranty owner
      await supabase
        .from("warranties")
        .update({ created_by: recipient.id, customer_email: recipientEmail })
        .eq("id", selectedWarranty);

      setSuccess(true);
      setSelectedWarranty("");
      setRecipientEmail("");
      setReason("");
    } catch (err: any) {
      setError(err.message || (isAr ? "حدث خطأ" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          {isAr ? "نقل الضمان" : "Transfer Warranty"}
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {isAr ? "نقل ملكية الضمان إلى شخص آخر" : "Transfer warranty ownership to another person"}
        </p>

        <form onSubmit={handleTransfer} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAr ? "اختر الضمان" : "Select Warranty"}
            </label>
            <select value={selectedWarranty} onChange={(e) => setSelectedWarranty(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl" required>
              <option value="">{isAr ? "-- اختر --" : "-- Select --"}</option>
              {warranties.map((w) => (
                <option key={w.id} value={w.id}>{w.product_name} ({w.serial_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAr ? "البريد الإلكتروني للمستلم" : "Recipient Email"}
            </label>
            <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl" required
              placeholder={isAr ? "email@example.com" : "email@example.com"} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAr ? "سبب النقل (اختياري)" : "Transfer Reason (optional)"}
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl" rows={3}
              placeholder={isAr ? "سبب نقل الضمان..." : "Reason for transfer..."} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
            {loading ? (isAr ? "جاري النقل..." : "Transferring...") : (isAr ? "نقل الضمان" : "Transfer Warranty")}
          </button>
        </form>

        {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl">
          {isAr ? "تم نقل الضمان بنجاح!" : "Warranty transferred successfully!"}
        </div>}
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl">{error}</div>}
      </div>
    </div>
  );
  }
