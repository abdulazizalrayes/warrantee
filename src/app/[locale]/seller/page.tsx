"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Package, AlertTriangle, Users, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import Link from "next/link";

const t = {
  en: {
    title: "Seller Dashboard",
    totalWarranties: "Total Warranties Issued",
    activeClaims: "Active Claims",
    pendingInvitations: "Pending Invitations",
    resolvedClaims: "Resolved Claims",
    recentClaims: "Recent Warranty Claims",
    claimId: "Claim ID",
    product: "Product",
    customer: "Customer",
    status: "Status",
    date: "Date",
    action: "Action",
    approve: "Approve",
    reject: "Reject",
    review: "Review",
    inviteSeller: "Invite Seller",
    inviteEmail: "Enter seller email",
    sendInvite: "Send Invitation",
    noData: "No claims yet",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    back: "Back to Dashboard",
  },
  ar: {
    title: "\u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0628\u0627\u0626\u0639",
    totalWarranties: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A \u0627\u0644\u0635\u0627\u062F\u0631\u0629",
    activeClaims: "\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0627\u0644\u0646\u0634\u0637\u0629",
    pendingInvitations: "\u0627\u0644\u062F\u0639\u0648\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
    resolvedClaims: "\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u0648\u0644\u0629",
    recentClaims: "\u0623\u062D\u062F\u062B \u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0627\u0644\u0636\u0645\u0627\u0646",
    claimId: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629",
    product: "\u0627\u0644\u0645\u0646\u062A\u062C",
    customer: "\u0627\u0644\u0639\u0645\u064A\u0644",
    status: "\u0627\u0644\u062D\u0627\u0644\u0629",
    date: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E",
    action: "\u0625\u062C\u0631\u0627\u0621",
    approve: "\u0645\u0648\u0627\u0641\u0642\u0629",
    reject: "\u0631\u0641\u0636",
    review: "\u0645\u0631\u0627\u062C\u0639\u0629",
    inviteSeller: "\u062F\u0639\u0648\u0629 \u0628\u0627\u0626\u0639",
    inviteEmail: "\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F \u0627\u0644\u0628\u0627\u0626\u0639",
    sendInvite: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062F\u0639\u0648\u0629",
    noData: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0628\u0639\u062F",
    pending: "\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631",
    approved: "\u0645\u0648\u0627\u0641\u0642 \u0639\u0644\u064A\u0647",
    rejected: "\u0645\u0631\u0641\u0648\u0636",
    back: "\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645",
  },
};

export default function SellerDashboard() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const labels = t[locale as keyof typeof t] || t.en;
  const supabase = createClient();

  const [claims, setClaims] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, resolved: 0 });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: claimsData } = await supabase
        .from("warranty_claims")
        .select("*, warranties(product_name, brand, user_id, profiles:user_id(full_name, email))")
        .order("created_at", { ascending: false })
        .limit(20);

      if (claimsData) {
        setClaims(claimsData);
        setStats({
          total: claimsData.length,
          active: claimsData.filter(c => c.status === "pending" || c.status === "in_review").length,
          pending: claimsData.filter(c => c.status === "pending").length,
          resolved: claimsData.filter(c => c.status === "approved" || c.status === "rejected").length,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimAction(claimId: string, action: "approved" | "rejected") {
    const { error } = await supabase
      .from("warranty_claims")
      .update({ status: action })
      .eq("id", claimId);

    if (!error) loadData();
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("seller_invitations").insert({
      inviter_id: user.id,
      email: inviteEmail,
      status: "pending",
    });

    if (error) {
      setInviteStatus("Error: " + error.message);
    } else {
      setInviteStatus("Invitation sent!");
      setInviteEmail("");
    }
  }

  const statCards = [
    { label: labels.totalWarranties, value: stats.total, icon: Package, color: "bg-blue-500" },
    { label: labels.activeClaims, value: stats.active, icon: AlertTriangle, color: "bg-orange-500" },
    { label: labels.pendingInvitations, value: stats.pending, icon: Clock, color: "bg-yellow-500" },
    { label: labels.resolvedClaims, value: stats.resolved, icon: CheckCircle, color: "bg-green-500" },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#4169E1]" />
            <h1 className="text-2xl font-bold text-[#1A1A2E]">{labels.title}</h1>
          </div>
          <Link href={"/" + locale + "/dashboard"} className="text-[#4169E1] hover:underline text-sm">
            {labels.back}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-[#1A1A2E] mt-1">{card.value}</p>
                </div>
                <div className={card.color + " p-3 rounded-xl"}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">{labels.recentClaims}</h2>
            {claims.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{labels.noData}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-start py-3 px-2">{labels.product}</th>
                      <th className="text-start py-3 px-2">{labels.status}</th>
                      <th className="text-start py-3 px-2">{labels.date}</th>
                      <th className="text-start py-3 px-2">{labels.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.id} className="border-b last:border-0">
                        <td className="py-3 px-2">{claim.warranties?.product_name || "-"}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            claim.status === "approved" ? "bg-green-100 text-green-700" :
                            claim.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {claim.status === "approved" ? labels.approved : claim.status === "rejected" ? labels.rejected : labels.pending}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-500">{new Date(claim.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-2">
                          {claim.status === "pending" && (
                            <div className="flex gap-2">
                              <button onClick={() => handleClaimAction(claim.id, "approved")} className="text-green-600 hover:underline text-xs">{labels.approve}</button>
                              <button onClick={() => handleClaimAction(claim.id, "rejected")} className="text-red-600 hover:underline text-xs">{labels.reject}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">{labels.inviteSeller}</h2>
            <div className="space-y-3">
              <input
                type="email"
                placeholder={labels.inviteEmail}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-transparent outline-none"
              />
              <button
                onClick={handleInvite}
                className="w-full py-3 bg-[#4169E1] text-white rounded-xl font-semibold hover:bg-[#3457b5] transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {labels.sendInvite}
              </button>
              {inviteStatus && <p className="text-sm text-center text-gray-600">{inviteStatus}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
