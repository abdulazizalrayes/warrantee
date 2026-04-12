"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Filter,
  XCircle,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

const t: Record<string, Record<string, string>> = {
  en: {
    title: "Approval Workflow",
    subtitle: "Review warranty submissions with a complete operational view, clear status signals, and safer approval decisions.",
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
    loading: "Loading...",
    rejectReason: "Rejection reason (optional)",
    backToDashboard: "Back to dashboard",
    reviewQueue: "Review queue",
    overview: "Overview",
    totalItems: "Total items",
    queueHealth: "Queue health",
    reviewedItems: "Reviewed items",
    emptyTitle: "No approval items found",
    emptyBody: "There are currently no warranties in this review state. When new submissions arrive, they will appear here with their status and next actions.",
    openWarranty: "Open warranty",
    pendingFocus: "Needs your attention",
    approvedState: "Approved",
    rejectedState: "Rejected",
    confirmApprove: "Approve this warranty?",
    confirmReject: "Reject this warranty?",
    cancel: "Cancel",
    confirm: "Confirm",
    processing: "Processing...",
    unauthorised: "You do not have permission to access approvals.",
  },
  ar: {
    title: "سير عمل الموافقة",
    subtitle: "راجع طلبات الضمان برؤية تشغيلية مكتملة وإشارات حالة واضحة وقرارات موافقة أكثر أمانًا.",
    pending: "بانتظار الموافقة",
    approved: "موافق عليه",
    rejected: "مرفوض",
    all: "الكل",
    approve: "موافقة",
    reject: "رفض",
    product: "المنتج",
    submittedBy: "مقدم من",
    date: "التاريخ",
    status: "الحالة",
    actions: "الإجراءات",
    loading: "جاري التحميل...",
    rejectReason: "سبب الرفض (اختياري)",
    backToDashboard: "العودة إلى لوحة التحكم",
    reviewQueue: "قائمة المراجعة",
    overview: "نظرة عامة",
    totalItems: "إجمالي العناصر",
    queueHealth: "صحة القائمة",
    reviewedItems: "العناصر المراجعة",
    emptyTitle: "لا توجد عناصر موافقة",
    emptyBody: "لا توجد حاليًا ضمانات في حالة المراجعة هذه. عند وصول طلبات جديدة ستظهر هنا مع حالتها والخطوات التالية.",
    openWarranty: "فتح الضمان",
    pendingFocus: "تحتاج اهتمامك",
    approvedState: "تمت الموافقة",
    rejectedState: "تم الرفض",
    confirmApprove: "الموافقة على هذا الضمان؟",
    confirmReject: "رفض هذا الضمان؟",
    cancel: "إلغاء",
    confirm: "تأكيد",
    processing: "جاري المعالجة...",
    unauthorised: "ليس لديك إذن للوصول إلى الموافقات.",
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

interface ConfirmDialog {
  warrantyId: string;
  action: "approve" | "reject";
  reason: string;
}

const PAGE_SIZE = 20;

export default function ApprovalPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const tr = t[locale] || t.en;

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialog, setDialog] = useState<ConfirmDialog | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !["admin", "super_admin"].includes(profile.role as string)) {
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      let query = supabase
        .from("warranties")
        .select("*, profiles(full_name, email)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filter === "pending") {
        query = query.in("status", ["pending_approval", "pending"]);
      } else if (filter === "approved") {
        query = query.eq("status", "active");
      } else if (filter === "rejected") {
        query = query.eq("status", "cancelled");
      }

      const { data, count } = await query;
      setWarranties((data as Warranty[]) || []);
      setTotalCount(count ?? 0);
      setLoading(false);
    };
    load();
  }, [filter, page]);

  const handleAction = async () => {
    if (!dialog) return;
    setActionLoading(true);
    try {
      const endpoint = `/api/warranties/${dialog.warrantyId}/${dialog.action}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: dialog.action === "reject" ? JSON.stringify({ reason: dialog.reason }) : undefined,
      });
      if (res.ok) {
        const newStatus = dialog.action === "approve" ? "active" : "cancelled";
        setWarranties((prev) =>
          prev.map((w) => (w.id === dialog.warrantyId ? { ...w, status: newStatus } : w))
        );
      }
    } finally {
      setActionLoading(false);
      setDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#1A1A2E] border-t-transparent" />
          <p className="text-[15px] text-[#86868b]">{tr.loading}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-[#d2d2d7]/40">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-[#ff9f0a]" />
          <p className="text-[15px] text-[#86868b]">{tr.unauthorised}</p>
          <Link
            href={`/${locale}/dashboard`}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1A1A2E] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#2d2d5e]"
          >
            {tr.backToDashboard}
          </Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending_approval: "bg-[#ff9f0a]/10 text-[#c93400]",
    pending: "bg-[#ff9f0a]/10 text-[#c93400]",
    active: "bg-[#30d158]/10 text-[#248a3d]",
    cancelled: "bg-[#ff3b30]/10 text-[#d70015]",
  };

  const pendingCount = warranties.filter((w) => ["pending_approval", "pending"].includes(w.status)).length;
  const approvedCount = warranties.filter((w) => w.status === "active").length;
  const rejectedCount = warranties.filter((w) => w.status === "cancelled").length;
  const reviewedCount = approvedCount + rejectedCount;
  const queueHealthTone =
    pendingCount === 0 ? "text-[#248a3d]" : pendingCount <= 5 ? "text-[#c93400]" : "text-[#d70015]";
  const queueHealthLabel =
    pendingCount === 0 ? tr.approvedState : pendingCount <= 5 ? tr.pendingFocus : tr.rejectedState;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-8">
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-[18px] font-semibold text-[#1d1d1f]">
              {dialog.action === "approve" ? tr.confirmApprove : tr.confirmReject}
            </h3>
            {dialog.action === "reject" && (
              <textarea
                value={dialog.reason}
                onChange={(e) => setDialog({ ...dialog, reason: e.target.value })}
                placeholder={tr.rejectReason}
                rows={3}
                className="mt-3 w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/20"
              />
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setDialog(null)}
                className="flex-1 rounded-full border border-[#d2d2d7] px-4 py-2 text-[14px] font-medium text-[#4a4a4f] transition hover:bg-[#f5f5f7]"
              >
                {tr.cancel}
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 rounded-full px-4 py-2 text-[14px] font-medium text-white transition disabled:opacity-50 ${
                  dialog.action === "approve" ? "bg-[#1A1A2E] hover:bg-[#2d2d5e]" : "bg-[#ff3b30] hover:bg-[#d70015]"
                }`}
              >
                {actionLoading ? tr.processing : tr.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[32px] bg-white px-6 py-7 shadow-sm ring-1 ring-[#d2d2d7]/40 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href={`/${locale}/dashboard`}
              className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium text-[#0071e3] transition hover:text-[#0077ED]"
            >
              <ArrowUpRight className="h-4 w-4" />
              {tr.backToDashboard}
            </Link>
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">
              {tr.reviewQueue}
            </p>
            <h1 className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[40px]">
              {tr.title}
            </h1>
            <p className="mt-2 max-w-3xl text-[16px] leading-7 text-[#86868b]">{tr.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5f5f7] px-4 py-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#86868b]">{tr.totalItems}</p>
              <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">{totalCount}</p>
            </div>
            <div className="rounded-2xl bg-[#f5f5f7] px-4 py-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#86868b]">{tr.queueHealth}</p>
              <p className={`mt-2 text-[16px] font-semibold ${queueHealthTone}`}>{queueHealthLabel}</p>
              <p className="mt-1 text-[12px] text-[#86868b]">{pendingCount} {tr.pending.toLowerCase()}</p>
            </div>
            <div className="rounded-2xl bg-[#f5f5f7] px-4 py-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#86868b]">{tr.reviewedItems}</p>
              <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">{reviewedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#d2d2d7]/40 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.16em] text-[#86868b]">
          <Filter className="h-4 w-4" />
          {tr.overview}
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filter === f ? "bg-[#1A1A2E] text-white shadow-sm" : "bg-[#f5f5f7] text-[#4a4a4f] hover:bg-[#ebebf0]"
              }`}
            >
              {tr[f as keyof typeof tr]}
            </button>
          ))}
        </div>
      </div>

      {warranties.length === 0 ? (
        <div className="rounded-[28px] bg-white p-12 text-center shadow-sm ring-1 ring-[#d2d2d7]/40">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5f5f7]">
            <Clock3 className="h-8 w-8 text-[#86868b]" />
          </div>
          <h2 className="mb-2 text-[24px] font-semibold tracking-tight text-[#1d1d1f]">{tr.emptyTitle}</h2>
          <p className="mx-auto max-w-2xl text-[15px] leading-6 text-[#86868b]">{tr.emptyBody}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-[#d2d2d7]/40">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f7]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{tr.product}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{tr.submittedBy}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{tr.date}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{tr.status}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{tr.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d2d2d7]/20">
                  {warranties.map((w) => {
                    const isPending = ["pending_approval", "pending"].includes(w.status);
                    return (
                      <tr key={w.id} className="hover:bg-[#fafafc]">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7]">
                              {isPending ? (
                                <Clock3 className="h-5 w-5 text-[#ff9f0a]" />
                              ) : w.status === "active" ? (
                                <CheckCircle2 className="h-5 w-5 text-[#30d158]" />
                              ) : (
                                <XCircle className="h-5 w-5 text-[#ff3b30]" />
                              )}
                            </div>
                            <div>
                              <p className="text-[15px] font-medium text-[#1d1d1f]">{w.product_name}</p>
                              <p className="mt-0.5 text-[13px] text-[#86868b]">#{w.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[14px] text-[#4a4a4f]">
                          {w.profiles?.full_name || w.profiles?.email || "-"}
                        </td>
                        <td className="px-6 py-4 text-[14px] text-[#86868b]">
                          {new Date(w.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${statusColors[w.status] || "bg-[#f5f5f7] text-[#86868b]"}`}>
                            {isPending ? tr.pending : w.status === "active" ? tr.approved : tr.rejected}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isPending ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setDialog({ warrantyId: w.id, action: "approve", reason: "" })}
                                className="rounded-full bg-[#1A1A2E] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#2d2d5e]"
                              >
                                {tr.approve}
                              </button>
                              <button
                                onClick={() => setDialog({ warrantyId: w.id, action: "reject", reason: "" })}
                                className="rounded-full bg-[#ff3b30]/10 px-4 py-2 text-[12px] font-medium text-[#d70015] transition hover:bg-[#ff3b30]/15"
                              >
                                {tr.reject}
                              </button>
                              <Link
                                href={`/${locale}/warranties/${w.id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f7] px-4 py-2 text-[12px] font-medium text-[#1d1d1f] transition hover:bg-[#ebebf0]"
                              >
                                {tr.openWarranty}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          ) : (
                            <Link
                              href={`/${locale}/warranties/${w.id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f7] px-4 py-2 text-[12px] font-medium text-[#1d1d1f] transition hover:bg-[#ebebf0]"
                            >
                              {tr.openWarranty}
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-full border border-[#d2d2d7] px-4 py-2 text-[13px] font-medium text-[#4a4a4f] transition hover:bg-[#f5f5f7] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[13px] text-[#86868b]">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-full border border-[#d2d2d7] px-4 py-2 text-[13px] font-medium text-[#4a4a4f] transition hover:bg-[#f5f5f7] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
