"use client";
// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, CheckCircle2, XCircle, Calendar, Package, Hash, Download } from "lucide-react";

const t = {
  en: { title: "Warranty Verification", loading: "Verifying...", verified: "Verified Warranty", expired: "Expired Warranty", notFound: "Warranty not found", product: "Product", reference: "Reference", serial: "Serial Number", category: "Category", startDate: "Start Date", endDate: "End Date", status: "Status", active: "Active", expiredLabel: "Expired", daysLeft: "days remaining", certificate: "Download Certificate", seller: "Seller", issuedBy: "Issued via Warrantee Platform", scan: "Scan QR code to verify this warranty" },
  ar: { title: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0636\u0645\u0627\u0646", loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0642\u0642...", verified: "\u0636\u0645\u0627\u0646 \u0645\u0648\u062b\u0642", expired: "\u0636\u0645\u0627\u0646 \u0645\u0646\u062a\u0647\u064a", notFound: "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646", product: "\u0627\u0644\u0645\u0646\u062a\u062c", reference: "\u0627\u0644\u0645\u0631\u062c\u0639\u064a", serial: "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062a\u0633\u0644\u0633\u0644\u064a", category: "\u0627\u0644\u0641\u0626\u0629", startDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629", endDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621", status: "\u0627\u0644\u062d\u0627\u0644\u0629", active: "\u0646\u0634\u0637", expiredLabel: "\u0645\u0646\u062a\u0647\u064a", daysLeft: "\u064a\u0648\u0645 \u0645\u062a\u0628\u0642\u064a", certificate: "\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0634\u0647\u0627\u062f\u0629", seller: "\u0627\u0644\u0628\u0627\u0626\u0639", issuedBy: "\u0635\u0627\u062f\u0631 \u0639\u0628\u0631 \u0645\u0646\u0635\u0629 \u0636\u0645\u0627\u0646\u062a\u064a", scan: "\u0627\u0645\u0633\u062d \u0631\u0645\u0632 QR \u0644\u0644\u062a\u062d\u0642\u0642" },
};

export default function VerifyPage() {
  const params = useParams() ?? {};
  const locale = (params.locale as string) || "en";
  const id = params.id as string;
  const l = t[locale as keyof typeof t] || t.en;
  const supabase = createClient();
  const [warranty, setWarranty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("warranties").select("*").eq("id", id).single();
      if (error || !data) { setNotFound(true); } else { setWarranty(data); }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" /></div>;
  if (notFound) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]"><XCircle className="w-16 h-16 text-red-400 mb-4" /><p className="text-xl text-gray-600">{l.notFound}</p></div>;

  const now = new Date();
  const endDate = new Date(warranty.end_date);
  const isActive = endDate > now && (warranty.status === "active" || warranty.status === "renewed");
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://warrantee.io";
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(baseUrl + "/" + locale + "/verify/" + id);

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <Shield className="w-10 h-10 text-[#4169E1] mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-[#1A1A2E]">{l.title}</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className={"px-6 py-5 text-center " + (isActive ? "bg-green-50" : "bg-red-50")}>
            {isActive ? <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" /> : <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />}
            <h2 className={"text-xl font-bold " + (isActive ? "text-green-700" : "text-red-700")}>{isActive ? l.verified : l.expired}</h2>
            {isActive && <p className="text-green-600 text-sm mt-1">{daysRemaining} {l.daysLeft}</p>}
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3"><Package className="w-5 h-5 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-400 uppercase">{l.product}</p><p className="font-medium">{warranty.product_name}</p></div></div>
            <div className="flex items-start gap-3"><Hash className="w-5 h-5 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-400 uppercase">{l.reference}</p><p className="font-medium font-mono">{warranty.reference_number}</p></div></div>
            {warranty.serial_number && <div className="flex items-start gap-3"><Hash className="w-5 h-5 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-400 uppercase">{l.serial}</p><p className="font-medium">{warranty.serial_number}</p></div></div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2"><Calendar className="w-4 h-4 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-400">{l.startDate}</p><p className="text-sm font-medium">{warranty.start_date}</p></div></div>
              <div className="flex items-start gap-2"><Calendar className="w-4 h-4 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-400">{l.endDate}</p><p className="text-sm font-medium">{warranty.end_date}</p></div></div>
            </div>
            {warranty.seller_name && <div><p className="text-xs text-gray-400 uppercase">{l.seller}</p><p className="text-sm">{warranty.seller_name}</p></div>}
          </div>
          <div className="border-t px-6 py-5 text-center bg-gray-50">
            <img src={qrUrl} alt="QR Code" className="w-36 h-36 mx-auto mb-2" />
            <p className="text-xs text-gray-400">{l.scan}</p>
          </div>
          <div className="px-6 pb-6">
            <a href={"/api/warranties/" + id + "/certificate"} target="_blank" className="flex items-center justify-center gap-2 w-full bg-[#4169E1] text-white py-3 rounded-xl font-medium hover:bg-[#3457b5] transition-colors">
              <Download className="w-4 h-4" /> {l.certificate}
            </a>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">{l.issuedBy}</p>
      </div>
    </div>
  );
}
