// @ts-nocheck
"use client";

import { use, useState } from "react";
import { getDictionary } from "@/lib/i18n";

export default function VerifyWarrantyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/v1/warranties/verify?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(isAr ? "ÙÙ ÙØªÙ Ø§ÙØ¹Ø«ÙØ± Ø¹ÙÙ Ø¶ÙØ§Ù Ø¨ÙØ°Ø§ Ø§ÙØ±ÙÙ" : "No warranty found with this ID or serial number");
      }
    } catch {
      setError(isAr ? "Ø­Ø¯Ø« Ø®Ø·Ø£Ø Ø­Ø§ÙÙ ÙØ±Ø© Ø£Ø®Ø±Ù" : "An error occurred, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAr ? "Ø§ÙØªØ­ÙÙ ÙÙ Ø§ÙØ¶ÙØ§Ù" : "Verify Warranty"}
          </h1>
          <p className="text-gray-600">
            {isAr ? "Ø£Ø¯Ø®Ù Ø±ÙÙ Ø§ÙØ¶ÙØ§Ù Ø£Ù Ø§ÙØ±ÙÙ Ø§ÙØªØ³ÙØ³ÙÙ ÙÙØªØ­ÙÙ" : "Enter a warranty ID or serial number to verify"}
          </p>
        </div>
        <form onSubmit={handleVerify} className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex gap-3">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? "Ø±ÙÙ Ø§ÙØ¶ÙØ§Ù Ø£Ù Ø§ÙØ±ÙÙ Ø§ÙØªØ³ÙØ³ÙÙ..." : "Warranty ID or serial number..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" required />
            <button type="submit" disabled={loading}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
              {loading ? (isAr ? "Ø¬Ø§Ø±Ù Ø§ÙØ¨Ø­Ø«..." : "Searching...") : (isAr ? "ØªØ­ÙÙ" : "Verify")}
            </button>
          </div>
        </form>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6">{error}</div>}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="bg-emerald-600 px-6 py-4 text-white font-semibold">{isAr ? "Ø¶ÙØ§Ù ÙØ¤ÙØ¯" : "Verified Warranty"}</div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">{isAr ? "Ø§ÙÙÙØªØ¬" : "Product"}</p><p className="font-medium">{result.product_name}</p></div>
              <div><p className="text-sm text-gray-500">{isAr ? "Ø§ÙØ±ÙÙ Ø§ÙØªØ³ÙØ³ÙÙ" : "Serial Number"}</p><p className="font-medium">{result.serial_number}</p></div>
              <div><p className="text-sm text-gray-500">{isAr ? "Ø§ÙØ­Ø§ÙØ©" : "Status"}</p><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${result.status === "active" ? "bg-green-100 text-green-800" : result.status === "expired" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{result.status}</span></div>
              <div><p className="text-sm text-gray-500">{isAr ? "ØªØ§Ø±ÙØ® Ø§ÙØ§ÙØªÙØ§Ø¡" : "Expiry Date"}</p><p className="font-medium">{new Date(result.warranty_end_date).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</p></div>
              <div><p className="text-sm text-gray-500">{isAr ? "ÙÙØ¹ Ø§ÙØªØºØ·ÙØ©" : "Coverage"}</p><p className="font-medium">{result.coverage_type}</p></div>
              <div><p className="text-sm text-gray-500">{isAr ? "Ø§Ø³Ù Ø§ÙØ¹ÙÙÙ" : "Customer"}</p><p className="font-medium">{result.customer_name}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
