// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function WarrantyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const warrantyId = params.id as string;
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [warranty, setWarranty] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(searchParams.get("extension"));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: w } = await supabase.from("warranties").select("*").eq("id", warrantyId).single();
      if (w) setWarranty(w);
      const { data: docs } = await supabase.from("warranty_documents").select("id, file_name, file_type, file_size, file_url, created_at").eq("warranty_id", warrantyId).order("created_at", { ascending: false });
      if (docs) setDocuments(docs);
      const { data: cl } = await supabase.from("warranty_claims").select("id, claim_number, title, status, created_at").eq("warranty_id", warrantyId).order("created_at", { ascending: false });
      if (cl) setClaims(cl);
      setLoading(false);
    })();
  }, [warrantyId, supabase]);

  const handleStatusChange = async (newStatus: string) => {
    if (!warranty) return;
    const endpoint = newStatus === "active"
      ? `/api/warranties/${warranty.id}/approve`
      : `/api/warranties/${warranty.id}/reject`;

    const response = await fetch(endpoint, { method: "POST" });
    if (response.ok) {
      setWarranty({ ...warranty, status: newStatus });
      setFeedback(newStatus === "active" ? "approved" : "updated");
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" });
  const daysRemaining = warranty ? Math.ceil((new Date(warranty.end_date).getTime() - Date.now()) / 86400000) : 0;

  const statusColor: Record<string, string> = { active: "bg-green-100 text-green-800", expired: "bg-red-100 text-red-800", pending_approval: "bg-yellow-100 text-yellow-800", draft: "bg-gray-100 text-gray-800", claimed: "bg-blue-100 text-blue-800" };
  const statusLabel: Record<string, string> = isRTL ? { active: "\u0646\u0634\u0637", pending_approval: "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631", draft: "\u0645\u0633\u0648\u062f\u0629", expired: "\u0645\u0646\u062a\u0647\u064a", claimed: "\u0645\u0637\u0627\u0644\u0628" } : { active: "Active", pending_approval: "Pending", draft: "Draft", expired: "Expired", claimed: "Claimed" };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5C542]"></div></div>;
  if (!warranty) return <div className="text-center py-16"><p className="text-gray-600">{isRTL ? "\u0627\u0644\u0636\u0645\u0627\u0646 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f" : "Warranty not found"}</p></div>;

  return (
    <div dir={direction}>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">{isRTL ? "\u2192" : "\u2190"}</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">{isRTL && warranty.product_name_ar ? warranty.product_name_ar : warranty.product_name}</h1>
          <p className="text-sm text-gray-500 font-mono">{warranty.reference_number}</p>
        </div>
        <div className="flex items-center gap-2">
          {warranty.status === "pending_approval" && <button onClick={() => handleStatusChange("active")} className="bg-green-600 text-white font-medium py-2 px-4 rounded-lg text-sm">{dict.warranty.actions.approve}</button>}
          {warranty.status === "active" && <Link href={`/${locale}/warranties/${warranty.id}/claim`} className="bg-[#F5C542] text-[#1A1A2E] font-semibold py-2 px-4 rounded-lg text-sm">{dict.warranty.actions.claim}</Link>}
        </div>
      </div>

      {feedback ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback === "success"
            ? (isRTL ? "تم استلام الدفع وسيتم تطبيق التمديد تلقائيًا." : "Payment was received and the extension will be applied automatically.")
            : feedback === "cancelled"
              ? (isRTL ? "تم إلغاء الدفع ولم يتم تغيير الضمان." : "Payment was cancelled and the warranty was not changed.")
              : feedback === "approved"
                ? (isRTL ? "تمت الموافقة على الضمان بنجاح." : "Warranty approved successfully.")
                : (isRTL ? "تم تحديث الضمان." : "Warranty updated successfully.")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor[warranty.status] || "bg-gray-100"}`}>{statusLabel[warranty.status] || warranty.status}</span>
              {warranty.status === "active" && daysRemaining > 0 && <span className={`text-sm font-medium ${daysRemaining <= 30 ? "text-red-600" : "text-green-600"}`}>{daysRemaining} {isRTL ? "\u064a\u0648\u0645 \u0645\u062a\u0628\u0642\u064a" : "days remaining"}</span>}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-bold text-[#1A1A2E] mb-4">{isRTL ? "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0646\u062a\u062c" : "Product Details"}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {warranty.sku && <div><span className="text-gray-500">SKU:</span> <span className="font-medium">{warranty.sku}</span></div>}
              {warranty.serial_number && <div><span className="text-gray-500">{dict.warranty.fields.serial_number}:</span> <span className="font-medium">{warranty.serial_number}</span></div>}
              <div><span className="text-gray-500">{isRTL ? "\u0627\u0644\u0643\u0645\u064a\u0629" : "Quantity"}:</span> <span className="font-medium">{warranty.quantity}</span></div>
              {warranty.category && <div><span className="text-gray-500">{isRTL ? "\u0627\u0644\u0641\u0626\u0629" : "Category"}:</span> <span className="font-medium capitalize">{warranty.category}</span></div>}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-bold text-[#1A1A2E] mb-4">{isRTL ? "\u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e" : "Dates"}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">{dict.warranty.fields.start_date}</p><p className="font-medium">{formatDate(warranty.start_date)}</p></div>
              <div><p className="text-gray-500">{dict.warranty.fields.warranty_end_date}</p><p className="font-medium">{formatDate(warranty.end_date)}</p></div>
            </div>
          </div>

          {warranty.terms_and_conditions && <div className="bg-white rounded-lg border border-gray-200 p-5"><h2 className="font-bold text-[#1A1A2E] mb-3">{dict.warranty.fields.terms_conditions}</h2><p className="text-sm text-gray-700 whitespace-pre-wrap">{warranty.terms_and_conditions}</p></div>}

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-[#1A1A2E]">{isRTL ? "\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a" : "Claims"}</h2>
              {warranty.status === "active" && <Link href={`/${locale}/warranties/${warranty.id}/claim`} className="text-sm text-[#F5C542] hover:text-yellow-600 font-medium">+ {isRTL ? "\u0645\u0637\u0627\u0644\u0628\u0629 \u062c\u062f\u064a\u062f\u0629" : "New Claim"}</Link>}
            </div>
            <div className="divide-y divide-gray-100">
              {claims.length === 0 ? <div className="p-6 text-center text-sm text-gray-500">{isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0637\u0627\u0644\u0628\u0627\u062a" : "No claims filed"}</div> : claims.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div><p className="text-sm font-medium text-[#1A1A2E]">{c.title}</p><p className="text-xs text-gray-500">{c.claim_number}</p></div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[c.status] || "bg-gray-100"}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-bold text-[#1A1A2E] mb-3">{isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller"}</h2>
            {warranty.seller_name ? <div className="text-sm"><p className="font-medium">{warranty.seller_name}</p>{warranty.seller_email && <p className="text-gray-500">{warranty.seller_email}</p>}</div> : <p className="text-sm text-gray-500">{isRTL ? "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f" : "Not specified"}</p>}
          </div>

          {(warranty.po_reference || warranty.invoice_reference) && <div className="bg-white rounded-lg border border-gray-200 p-5"><h2 className="font-bold text-[#1A1A2E] mb-3">{isRTL ? "\u0627\u0644\u0645\u0631\u0627\u062c\u0639" : "References"}</h2><div className="text-sm space-y-2">{warranty.po_reference && <div><span className="text-gray-500">PO:</span> <span className="font-medium">{warranty.po_reference}</span></div>}{warranty.invoice_reference && <div><span className="text-gray-500">{isRTL ? "\u0641\u0627\u062a\u0648\u0631\u0629" : "Invoice"}:</span> <span className="font-medium">{warranty.invoice_reference}</span></div>}</div></div>}

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-bold text-[#1A1A2E] mb-3">{isRTL ? "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a" : "Documents"}</h2>
            {documents.length === 0 ? <p className="text-sm text-gray-500">{isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0633\u062a\u0646\u062f\u0627\u062a" : "No documents"}</p> : <div className="space-y-2">{documents.map(doc => (<a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm"><span className="font-medium truncate flex-1">{doc.file_name}</span><span className="text-xs text-gray-400">{(doc.file_size / 1024).toFixed(0)}KB</span></a>))}</div>}
          </div>

          {warranty.status === "active" && <div className="bg-white rounded-lg border border-gray-200 p-5"><h2 className="font-bold text-[#1A1A2E] mb-3">{isRTL ? "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0633\u0631\u064a\u0639\u0629" : "Quick Actions"}</h2><div className="space-y-2"><Link href={`/${locale}/warranties/${warranty.id}/extend`} className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">{dict.warranty.actions.extend}</Link><Link href={`/${locale}/warranties/${warranty.id}/claim`} className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">{dict.warranty.actions.claim}</Link></div></div>}
        </div>
      </div>
    </div>
  );
}
