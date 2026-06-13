"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Key, RefreshCw, Trash2 } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type IntegrationToken = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  locale: Locale;
};

function formatDate(value: string | null, locale: Locale) {
  if (!value) return locale === "ar" ? "لم يستخدم بعد" : "Not used yet";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function IntegrationTokensPanel({ locale }: Props) {
  const isRTL = locale === "ar";
  const [tokens, setTokens] = useState<IntegrationToken[]>([]);
  const [name, setName] = useState("Production integration");
  const [readScope, setReadScope] = useState(true);
  const [writeScope, setWriteScope] = useState(true);
  const [rateLimit, setRateLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createdSecret, setCreatedSecret] = useState("");
  const [copied, setCopied] = useState(false);

  const copySecret = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadTokens = async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/integration-tokens", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || (isRTL ? "تعذر تحميل رموز التكامل." : "Could not load integration tokens."));
      setLoading(false);
      return;
    }

    setTokens(Array.isArray(body.data) ? body.data : []);
    setLoading(false);
  };

  useEffect(() => {
    void loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createToken = async () => {
    const scopes = [
      ...(readScope ? ["warranties:read"] : []),
      ...(writeScope ? ["warranties:write"] : []),
    ];

    if (!name.trim() || scopes.length === 0) {
      setError(isRTL ? "أضف اسماً وصلاحية واحدة على الأقل." : "Add a name and at least one scope.");
      return;
    }

    setCreating(true);
    setError("");
    setCreatedSecret("");

    const response = await fetch("/api/integration-tokens", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        scopes,
        rate_limit_per_minute: rateLimit,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || (isRTL ? "تعذر إنشاء الرمز." : "Could not create token."));
      setCreating(false);
      return;
    }

    setCreatedSecret(String(body.token || ""));
    await loadTokens();
    setCreating(false);
  };

  const revokeToken = async (id: string) => {
    setRevokingId(id);
    setError("");

    const response = await fetch(`/api/integration-tokens/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || (isRTL ? "تعذر إلغاء الرمز." : "Could not revoke token."));
      setRevokingId(null);
      return;
    }

    await loadTokens();
    setRevokingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1A1A2E]">
              <Key className="h-6 w-6" />
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">
              {isRTL ? "API / CLI / MCP" : "API / CLI / MCP"}
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#6e6e73]">
              {isRTL
                ? "أنشئ رموز تكامل مخصصة للأنظمة الخارجية والسكريبتات والوكلاء. لا تشارك كلمة مرورك أبداً؛ استخدم رمزاً محدود الصلاحيات وقابلاً للإلغاء."
                : "Create dedicated integration tokens for external systems, scripts, and agents. Never share your password; use a scoped, revocable token instead."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadTokens()}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#d2d2d7] px-4 py-2.5 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isRTL ? "تحديث" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-[#ff3b30]/10 px-4 py-3 text-sm font-medium text-[#d70015]">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <div>
            <label className="mb-2 block text-[15px] font-medium text-[#1d1d1f]">
              {isRTL ? "اسم الرمز" : "Token name"}
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border-0 bg-[#f5f5f7] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#0071e3]/40"
              placeholder={isRTL ? "مثال: تكامل ERP" : "Example: ERP production"}
            />
          </div>
          <div>
            <label className="mb-2 block text-[15px] font-medium text-[#1d1d1f]">
              {isRTL ? "حد الطلبات/دقيقة" : "Requests/min"}
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={rateLimit}
              onChange={(event) => setRateLimit(Number(event.target.value))}
              className="w-full rounded-xl border-0 bg-[#f5f5f7] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#0071e3]/40"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              checked: readScope,
              setChecked: setReadScope,
              label: "warranties:read",
              desc: isRTL ? "قراءة القوائم والتفاصيل فقط" : "Read lists and details",
            },
            {
              checked: writeScope,
              setChecked: setWriteScope,
              label: "warranties:write",
              desc: isRTL ? "إنشاء وتحديث وإلغاء الضمانات" : "Create, update, and delete warranties",
            },
          ].map((scope) => (
            <button
              key={scope.label}
              type="button"
              onClick={() => scope.setChecked(!scope.checked)}
              className={`rounded-xl border p-4 text-left transition rtl:text-right ${
                scope.checked
                  ? "border-[#0071e3] bg-[#0071e3]/5"
                  : "border-[#d2d2d7]/50 bg-white hover:bg-[#f5f5f7]"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-semibold text-[#1d1d1f]">{scope.label}</span>
                {scope.checked && <Check className="h-5 w-5 text-[#0071e3]" />}
              </span>
              <span className="mt-1 block text-sm text-[#6e6e73]">{scope.desc}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void createToken()}
          disabled={creating}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[#1A1A2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2d2d5e] disabled:opacity-50"
        >
          {creating ? (isRTL ? "جاري الإنشاء..." : "Creating...") : isRTL ? "إنشاء رمز" : "Create token"}
        </button>

        {createdSecret && (
          <div className="mt-5 rounded-2xl border border-[#30d158]/30 bg-[#30d158]/10 p-4">
            <p className="text-sm font-semibold text-[#1d1d1f]">
              {isRTL ? "انسخ الرمز الآن. لن يظهر مرة أخرى." : "Copy this token now. It will not be shown again."}
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#1d1d1f] p-3">
              <code className="min-w-0 flex-1 overflow-x-auto text-sm text-[#30d158]" dir="ltr">
                {createdSecret}
              </code>
              <button
                type="button"
                onClick={() => void copySecret(createdSecret)}
                className="shrink-0 text-white/70 hover:text-white"
                aria-label={isRTL ? "نسخ الرمز" : "Copy token"}
              >
                {copied ? <Check className="h-4 w-4 text-[#30d158]" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#86868b]">
          {isRTL ? "الرموز النشطة" : "Active tokens"}
        </h3>
        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-[15px] text-[#6e6e73]">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
          ) : tokens.filter((token) => !token.revoked_at).length === 0 ? (
            <p className="text-[15px] text-[#6e6e73]">
              {isRTL ? "لا توجد رموز نشطة بعد." : "No active tokens yet."}
            </p>
          ) : (
            tokens
              .filter((token) => !token.revoked_at)
              .map((token) => (
                <div
                  key={token.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#d2d2d7]/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">{token.name}</p>
                    <p className="mt-1 font-mono text-xs text-[#6e6e73]" dir="ltr">
                      wrt_{token.token_prefix}_••••••••
                    </p>
                    <p className="mt-2 text-xs text-[#6e6e73]">
                      {token.scopes.join(", ")} · {token.rate_limit_per_minute}/min ·{" "}
                      {isRTL ? "آخر استخدام: " : "Last used: "}
                      {formatDate(token.last_used_at, locale)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revokeToken(token.id)}
                    disabled={revokingId === token.id}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#ff3b30]/30 px-4 py-2 text-sm font-semibold text-[#d70015] transition hover:bg-[#ff3b30]/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {revokingId === token.id ? "..." : isRTL ? "إلغاء" : "Revoke"}
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
