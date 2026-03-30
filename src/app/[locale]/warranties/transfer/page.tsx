// @ts-nocheck
"use client";

import { use, useState, useEffect } from "react";
import { getDictionary } from "@/lib/i18n";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TransferWarrantyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === "ar";
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
        setError(isAr ? "ÙÙ ÙØªÙ Ø§ÙØ¹Ø«ÙØ± Ø¹ÙÙ Ø§ÙÙØ³ØªØ®Ø¯Ù Ø¨ÙØ°Ø§ Ø§ÙØ¨Ø±ÙØ¯" : "No user found with that email");
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
      setError(err.message || (isAr ? "Ø­Ø¯Ø« Ø®Ø·Ø£" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          {isAr ? "ÙÙÙ Ø§ÙØ¶ÙØ§Ù" : "Transfer Warranty"}
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {isAr ? "ÙÙÙ ÙÙÙÙØ© Ø§ÙØ¶ÙØ§Ù Ø¥ÙÙ Ø´Ø®Øµ Ø¢Ø®Ø±" : "Transfer warranty ownership to another person"}
        </p>

        <form onSubmit={handleTransfer} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAr ? "Ø§Ø®ØªØ± Ø§ÙØ¶ÙØ§Ù" : "Select Warranty"}
            </label>
            <select value={selectedWarranty} onChange={(e) => setSelectedWarranty(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl" required>
              <option value="">{isAr ? "-- Ø§Ø®ØªØ± --" : "-- Select --"}</option>
              {warranties.map((w) => (
                <option key={w.id} value={w.id}>{w.product_name} ({w.serial_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAr ? "Ø§ÙØ¨Ø±ÙØ¯ Ø§ÙØ¥ÙÙØªØ±ÙÙÙ ÙÙÙØ³ØªÙÙ" : "Recipient Email"}
            </label>
            <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl" required
              placeholder={isAr ? "email@example.com" : "email@example.com"} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAr ? "Ø³Ø¨Ø¨ Ø§ÙÙÙÙ (Ø§Ø®ØªÙØ§Ø±Ù)" : "Transfer Reason (optional)"}
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl" rows={3}
              placeholder={isAr ? "Ø³Ø¨Ø¨ ÙÙÙ Ø§ÙØ¶ÙØ§Ù..." : "Reason for transfer..."} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
            {loading ? (isAr ? "Ø¬Ø§Ø±Ù Ø§ÙÙÙÙ..." : "Transferring...") : (isAr ? "ÙÙÙ Ø§ÙØ¶ÙØ§Ù" : "Transfer Warranty")}
          </button>
        </form>

        {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl">
          {isAr ? "ØªÙ ÙÙÙ Ø§ÙØ¶ÙØ§Ù Ø¨ÙØ¬Ø§Ø­!" : "Warranty transferred successfully!"}
        </div>}
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl">{error}</div>}
      </div>
    </div>
  );
  }
