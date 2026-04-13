// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const ROLES = ["owner", "admin", "manager", "viewer"] as const;
const supabase = createSupabaseBrowserClient();

const dict = {
  en: {
    title: "Team Management",
    subtitle: "Manage your team members and their roles",
    invite: "Invite Member",
    email: "Email Address",
    role: "Role",
    actions: "Actions",
    name: "Name",
    status: "Status",
    active: "Active",
    pending: "Pending",
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
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    viewer: "Viewer",
  },
  ar: {
    title: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0641\u0631\u064A\u0642",
    subtitle: "\u0625\u062F\u0627\u0631\u0629 \u0623\u0639\u0636\u0627\u0621 \u0641\u0631\u064A\u0642\u0643 \u0648\u0623\u062F\u0648\u0627\u0631\u0647\u0645",
    invite: "\u062F\u0639\u0648\u0629 \u0639\u0636\u0648",
    email: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
    role: "\u0627\u0644\u062F\u0648\u0631",
    actions: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A",
    name: "\u0627\u0644\u0627\u0633\u0645",
    status: "\u0627\u0644\u062D\u0627\u0644\u0629",
    active: "\u0646\u0634\u0637",
    pending: "\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631",
    save: "\u062D\u0641\u0638",
    cancel: "\u0625\u0644\u063A\u0627\u0621",
    remove: "\u0625\u0632\u0627\u0644\u0629",
    inviteSent: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062F\u0639\u0648\u0629 \u0628\u0646\u062C\u0627\u062D",
    roleUpdated: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062F\u0648\u0631 \u0628\u0646\u062C\u0627\u062D",
    memberRemoved: "\u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0639\u0636\u0648",
    error: "\u062D\u062F\u062B \u062E\u0637\u0623",
    confirmRemove: "\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0632\u0627\u0644\u0629 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648\u061F",
    noMembers: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0623\u0639\u0636\u0627\u0621 \u0628\u0639\u062F. \u0627\u062F\u0639\u064F \u0634\u062E\u0635\u0627\u064B \u0644\u0644\u0628\u062F\u0621.",
    back: "\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
    owner: "\u0645\u0627\u0644\u0643",
    admin: "\u0645\u0633\u0624\u0648\u0644",
    manager: "\u0645\u062F\u064A\u0631",
    viewer: "\u0645\u0634\u0627\u0647\u062F",
  },
};

export default function TeamManagementPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const t = dict[locale as keyof typeof dict] || dict.en;

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [showInvite, setShowInvite] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: true });
      setMembers(data || []);
    }
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "team_invite",
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: t.inviteSent });
        setInviteEmail("");
        setShowInvite(false);
      } else {
        setMessage({ type: "error", text: t.error });
      }
    } catch {
      setMessage({ type: "error", text: t.error });
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", memberId);

    if (!error) {
      setMessage({ type: "success", text: t.roleUpdated });
      loadMembers();
    } else {
      setMessage({ type: "error", text: t.error });
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm(t.confirmRemove)) return;

    const { error } = await supabase
      .from("profiles")
      .update({ company_id: null, role: "viewer" })
      .eq("id", memberId);

    if (!error) {
      setMessage({ type: "success", text: t.memberRemoved });
      loadMembers();
    } else {
      setMessage({ type: "error", text: t.error });
    }
  }

  const roleLabel = (role: string) => t[role as keyof typeof t] || role;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => router.push("/" + locale + "/settings")} className="text-[#E94560] hover:underline mb-4 text-sm">
          &larr; {t.back}
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">{t.title}</h1>
            <p className="text-gray-500 mt-1">{t.subtitle}</p>
          </div>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2 bg-[#E94560] text-white rounded-lg hover:bg-[#d63d56] font-medium transition-colors"
          >
            + {t.invite}
          </button>
        </div>

        {message.text && (
          <div className={"px-4 py-3 rounded-lg mb-4 " + (message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700")}>
            {message.text}
          </div>
        )}

        {showInvite && (
          <form onSubmit={handleInvite} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E94560]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.role}</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E94560]"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="px-6 py-2 bg-[#1A1A2E] text-white rounded-lg hover:bg-[#16213E]">
                {t.invite}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">
                {t.cancel}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{t.noMembers}</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t.name}</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t.email}</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t.role}</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t.actions}</th>
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
                        className="text-sm px-3 py-1 border border-gray-200 rounded-lg"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-sm text-red-500 hover:text-red-700"
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
    </div>
  );
}
