// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { PageBackButton } from "@/components/PageBackButton";
import { PageViewTracker } from "@/components/PageViewTracker";
import { trackTeamInvite } from "@/lib/ga4-events";

const ROLES = ["superadmin", "manager", "viewer"] as const;

const dict = {
  en: {
    title: "Team Management",
    subtitle: "Manage your team members and their workspace roles.",
    invite: "Invite Member",
    email: "Email Address",
    role: "Role",
    actions: "Actions",
    name: "Name",
    save: "Save",
    cancel: "Cancel",
    remove: "Remove",
    inviteSent: "Invitation sent successfully",
    roleUpdated: "Role updated successfully",
    memberRemoved: "Member removed",
    error: "An error occurred",
    confirmRemove: "Are you sure you want to remove this member?",
    noMembers: "No team members yet. Invite someone to get started.",
    back: "Back to Settings",
    superadmin: "Superadmin",
    manager: "Manager",
    viewer: "Viewer",
    accessRequired: "Superadmin access required",
    accessDesc:
      "Team membership is restricted to company superadmins so employee emails, roles, and workspace access are not exposed to viewers or managers.",
    domainDesc:
      "Warrantee teammates must use the approved company email domain before they can be added here.",
    domainRule: "Only teammates with the approved domain can be invited here.",
    domain: "Domain",
    members: "Members",
    loading: "Loading...",
    inviteHint: "Only company superadmins can invite members",
  },
  ar: {
    title: "إدارة الفريق",
    subtitle: "إدارة أعضاء فريقك وأدوارهم داخل مساحة العمل.",
    invite: "دعوة عضو",
    email: "البريد الإلكتروني",
    role: "الدور",
    actions: "الإجراءات",
    name: "الاسم",
    save: "حفظ",
    cancel: "إلغاء",
    remove: "إزالة",
    inviteSent: "تم إرسال الدعوة بنجاح",
    roleUpdated: "تم تحديث الدور بنجاح",
    memberRemoved: "تمت إزالة العضو",
    error: "حدث خطأ",
    confirmRemove: "هل أنت متأكد من إزالة هذا العضو؟",
    noMembers: "لا يوجد أعضاء بعد. ادعُ شخصاً للبدء.",
    back: "العودة إلى الإعدادات",
    superadmin: "مدير أعلى",
    manager: "مدير",
    viewer: "مشاهد",
    accessRequired: "يتطلب صلاحية المدير الأعلى",
    accessDesc:
      "إدارة أعضاء الفريق محصورة بمديري الشركة الأعلى حتى لا تنكشف رسائل الموظفين أو الأدوار أو صلاحيات الوصول لغير المخولين.",
    domainDesc:
      "يجب أن يستخدم فريق Warrantee نطاق البريد المعتمد قبل إضافتهم هنا.",
    domainRule: "يمكن دعوة الزملاء من النطاق المعتمد فقط.",
    domain: "النطاق",
    members: "الأعضاء",
    loading: "جارٍ التحميل...",
    inviteHint: "فقط مدراء الشركة الأعلى يمكنهم دعوة الأعضاء",
  },
};

export default function TeamManagementPage() {
  const params = useParams() ?? {};
  const locale = (params?.locale as string) || "en";
  const isRTL = locale === "ar";
  const t = dict[locale as keyof typeof dict] || dict.en;

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [showInvite, setShowInvite] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [canManage, setCanManage] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    const res = await fetch("/api/team/members", { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMembers([]);
      setCanManage(false);
      setAllowedDomain("");
      setAccessDenied(res.status === 403);
      setMessage({ type: "error", text: payload?.error || t.error });
      setLoading(false);
      return;
    }

    setMembers(payload?.members || []);
    setCanManage(Boolean(payload?.canManage));
    setAllowedDomain(payload?.allowedDomain || "");
    setAccessDenied(false);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        trackTeamInvite({
          locale,
          role: inviteRole,
          allowed_domain: allowedDomain || null,
        });
        setMessage({ type: "success", text: t.inviteSent });
        setInviteEmail("");
        setShowInvite(false);
        await loadMembers();
      } else {
        setMessage({ type: "error", text: payload?.error || t.error });
      }
    } catch {
      setMessage({ type: "error", text: t.error });
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const res = await fetch("/api/team/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role: newRole }),
    });
    const payload = await res.json().catch(() => ({}));

    if (res.ok) {
      setMessage({ type: "success", text: t.roleUpdated });
      await loadMembers();
    } else {
      setMessage({ type: "error", text: payload?.error || t.error });
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm(t.confirmRemove)) return;

    const res = await fetch("/api/team/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const payload = await res.json().catch(() => ({}));

    if (res.ok) {
      setMessage({ type: "success", text: t.memberRemoved });
      await loadMembers();
    } else {
      setMessage({ type: "error", text: payload?.error || t.error });
    }
  }

  const roleLabel = (role: string) => t[role as keyof typeof t] || role;

  return (
    <div className="min-h-[80vh]">
      <PageViewTracker
        pageName="team_management"
        pageType="account"
        locale={locale}
        extra={{
          can_manage: canManage,
          access_denied: accessDenied,
          allowed_domain: allowedDomain || null,
          member_count: members.length,
        }}
      />

      <DashboardPageShell
        eyebrow={isRTL ? "إدارة الشركة" : "Company administration"}
        title={t.title}
        subtitle={t.subtitle}
        crumbs={[
          { label: "Dashboard", href: `/${locale}/dashboard` },
          { label: isRTL ? "الإعدادات" : "Settings", href: `/${locale}/settings` },
          { label: t.title },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <PageBackButton fallbackHref={`/${locale}/settings`} isRTL={isRTL} />
            {!loading && !accessDenied ? (
              <button
                onClick={() => setShowInvite((current) => !current)}
                disabled={!canManage}
                className="rounded-full bg-[#1A1A2E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d2d44] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                title={!canManage ? t.inviteHint : undefined}
              >
                + {t.invite}
              </button>
            ) : null}
          </div>
        }
        stats={[
          { label: t.domain, value: allowedDomain || "—" },
          { label: t.members, value: members.length },
        ]}
        auditNote={t.domainRule}
      >
        {message.text && !accessDenied ? (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
              message.type === "success"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {accessDenied ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-[#1A1A2E] shadow-sm">
            <h2 className="text-lg font-semibold">{t.accessRequired}</h2>
            <p className="mt-2 text-sm text-gray-600">{t.accessDesc}</p>
            <p className="mt-3 text-sm text-gray-600">{t.domainDesc}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {showInvite ? (
              <form onSubmit={handleInvite} className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                {allowedDomain ? (
                  <p className="mb-4 text-sm text-gray-500">
                    {t.domainRule}{" "}
                    <span className="font-medium text-[#1A1A2E]">{allowedDomain}</span>
                  </p>
                ) : null}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t.email}</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                      required
                    />
                  </div>
                  <div className="lg:w-48">
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t.role}</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="submit" className="rounded-full bg-[#1A1A2E] px-6 py-2 text-white transition hover:bg-[#16213E]">
                      {t.invite}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInvite(false)}
                      className="rounded-full px-4 py-2 text-gray-500 transition hover:text-gray-700"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}

            <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
              {loading ? (
                <div className="p-8 text-center text-gray-400">{t.loading}</div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-gray-400">{t.noMembers}</div>
              ) : (
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500">{t.name}</th>
                      <th className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500">{t.email}</th>
                      <th className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500">{t.role}</th>
                      <th className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-[#1A1A2E]">{member.full_name || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                        <td className="px-6 py-4">
                          <select
                            value={member.role || "viewer"}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
                            disabled={!canManage}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleRemove(member.id)}
                            className="text-sm text-red-500 transition hover:text-red-700"
                            disabled={!canManage}
                          >
                            {t.remove}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </DashboardPageShell>
    </div>
  );
}
