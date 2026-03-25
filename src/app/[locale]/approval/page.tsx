"use client";
import { useState, useEffect } from "react";
import { useParams} from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
const t: Record<string, Record<string, string>> = {
  en: {
    title: "Approval Workflow",
    pending: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
    all: "All",
    approve: "Approve",
    reject: "Reject",
    product: "Product",
    submittedBy: "Submitted By",
    date: "Date",
    status: "Status",
    actions: "Actions",
    noItems: "No items pending approval",
    confirmApprove: "Are you sure you want to approve this warranty?",
    confirmReject: "Are you sure you want to reject this warranty?",
    loading: "Loading...",
    loginRequired: "Please log in to access approvals.",
    rejectReason: "Rejection reason (optional)",
  },
  ar: {
    title: "\u0633\u064a\u0631 \u0639\u0645\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629",
    pending: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629",
    approved: "\u0645\u0648\u0627\u0641\u0642 \u0639\u0644\u064a\u0647",
    rejected: "\u0645\u0631\u0641\u0648\u0636",
    all: "\u0627\u0644\u0643\u0644",
    approve: "\u0645\u0648\u0627\u0641\u0642\u0629",
    reject: "\u0631\u0641\u0636",
    product: "\u0627\u0644\u0645\u0646\u062a\u062c",
    submittedBy: "\u0645\u0642\u062f\u0645 \u0645\u0646",
    date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    status: "\u0627\u0644\u062d\u0627\u0644\u0629",
    actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
    noItems: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0646\u0627\u0635\u0631 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629",
    confirmApprove: "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0636\u0645\u0627\u0646\u061f",
    confirmReject: "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0631\u0641\u0636 \u0647\u0630\u0627 \u0627\u0644\u0636\u0645\u0627\u0646\u061f",
    loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
    loginRequired: "\u064a\u0631\u062c\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a.",
    rejectReason: "\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
  },
};

interface Warranty {
  id: string;
  product_name: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string; email: string } | null;
}

export default function ApprovalPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const tr = t[locale] || t.en;
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      setUser(u);
      const query = supabase.from("warranties").select("*, profiles(full_name, email)");
      if (filter === "pending") query.eq("status", "pending");
      else if (filter === "approved") query.eq("status", "active");
      else if (filter === "rejected") query.eq("status", "cancelled");
      const { data } = await query.order("created_at", { ascending: false });
      setWarranties((data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [filter]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    const msg = action === "approve" ? tr.confirmApprove : tr.confirmReject;
    if (!confirm(msg)) return;
    const supabase = createBrowserClient();
    const newStatus = action === "approve" ? "active" : "cancelled";
    await supabase.from("warranties").update({ status: newStatus }).eq("id", id);
    setWarranties(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
    // Create notification
    const warranty = warranties.find(w => w.id === id);
    if (warranty) {
      await supabase.from("notifications").insert({
        user_id: warranty.user_id,
        warranty_id: id,
        type: action === "approve" ? "warranty_approved" : "warranty_rejected",
        title: action === "approve" ? "Warranty Approved" : "Warranty Rejected",
        message: `Your warranty for ${warranty.product_name} has been ${action === "approve" ? "approved" : "rejected"}.`,
      });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">{tr.loginRequired}</div>;

  const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", active: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{tr.title}</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-[#4169E1] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {tr[f as keyof typeof tr]}
          </button>
        ))}
      </div>

      {warranties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">{tr.noItems}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tr.product}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tr.submittedBy}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tr.date}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tr.status}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tr.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {warranties.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{w.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{w.profiles?.full_name || w.profiles?.email || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(w.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[w.status] || "bg-gray-100 text-gray-600"}`}>{w.status}</span></td>
                    <td className="px-4 py-3">
                      {w.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(w.id, "approve")} className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600">{tr.approve}</button>
                          <button onClick={() => handleAction(w.id, "reject")} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600">{tr.reject}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
