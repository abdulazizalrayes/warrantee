// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Link from 'next/link';

const supabase = createSupabaseBrowserClient();

// âââ TYPES ââââââââââââââââââââââââââââââââââââââââââââââ
type TabId = 'overview' | 'users' | 'warranties' | 'companies' | 'claims' | 'support' | 'fraud' | 'ingestion' | 'billing' | 'config' | 'team' | 'audit';

interface Stats {
  totalUsers: number; totalWarranties: number; totalCompanies: number; totalClaims: number;
  activeWarranties: number; expiredWarranties: number; pendingClaims: number;
  consumerUsers: number; businessUsers: number;
  openTickets: number; fraudSignals: number;
  totalRevenue: number; activeSubscriptions: number;
  ingestionSuccess: number; ingestionTotal: number;
  recentActivity: any[];
  usersByMonth: { month: string; count: number }[];
  warrantiesByCategory: { category: string; count: number }[];
  claimsByStatus: { status: string; count: number }[];
  revenueByMonth: { month: string; amount: number }[];
}

// âââ TRANSLATIONS ââââââââââââââââââââââââââââââââââââââ
const rawTranslations = {
  en: {
    title: 'Warrantee Admin', subtitle: 'Operations, risk, and service control center', overview: 'Overview', usersTab: 'Users',
    warrantiesTab: 'Warranties', companiesTab: 'Companies', claimsTab: 'Claims', supportTab: 'Support',
    fraudTab: 'Fraud', ingestionTab: 'Ingestion', billingTab: 'Billing', configTab: 'Config',
    teamTab: 'Team', auditTab: 'Audit Trail',
    totalUsers: 'Total Users', totalWarranties: 'Total Warranties', totalCompanies: 'Companies',
    totalClaims: 'Claims', active: 'Active', expired: 'Expired', pending: 'Pending',
    consumers: 'Consumers', businesses: 'Businesses',
    openTickets: 'Open Tickets', fraudAlerts: 'Fraud Alerts', revenue: 'Revenue', subscriptions: 'Subscriptions',
    name: 'Name', email: 'Email', role: 'Role', joined: 'Joined', product: 'Product',
    status: 'Status', expiry: 'Expiry', company: 'Company', cr: 'CR Number', type: 'Type',
    date: 'Date', actions: 'Actions', category: 'Category', priority: 'Priority', severity: 'Severity',
    subject: 'Subject', description: 'Description', signalType: 'Signal', confidence: 'Confidence',
    amount: 'Amount', plan: 'Plan', source: 'Source',
    unauthorized: 'You do not have admin access.', backToDashboard: 'Back to Dashboard',
    noData: 'No data available', signOut: 'Sign Out', signingOut: 'Signing out...',
    recentActivity: 'Recent Activity', registrationTrend: 'Registration Trend',
    warrantiesByCategory: 'Warranties by Category', claimsBreakdown: 'Claims Breakdown',
    revenueOverview: 'Revenue Overview', platformHealth: 'Platform Health',
    ingestionRate: 'Ingestion Success', ocrConfidence: 'OCR Confidence',
    systemMetrics: 'System Metrics', quickActions: 'Quick Actions',
    exportData: 'Export CSV', refresh: 'Refresh', search: 'Search...',
    // Team
    teamTitle: 'Team Management', addAdmin: 'Add Team Member', emailPlaceholder: 'Enter email address',
    invite: 'Add', removeAccess: 'Remove', confirmRemove: 'Confirm Remove',
    confirmRemoveMsg: 'Remove admin access for', cancel: 'Cancel', confirm: 'Confirm',
    promoted: 'User promoted successfully', demoted: 'Admin access removed', inviteSent: 'Team member added',
    userNotFound: 'No account found with this email.', alreadyAdmin: 'Already an admin.',
    cannotRemoveSelf: 'Cannot remove yourself.', cannotRemoveSuper: 'Cannot modify super admin.',
    superAdmin: 'Super Admin', admin: 'Admin', support: 'Support', user: 'User',
    makeAdmin: 'Make Admin', makeSupport: 'Make Support', demoteToUser: 'Remove Access',
    // Audit
    auditTitle: 'Audit Trail', actor: 'Actor', action: 'Action', target: 'Target',
    details: 'Details', timestamp: 'Timestamp', riskLevel: 'Risk',
    noAuditLogs: 'No audit logs yet.', high: 'High', medium: 'Medium', low: 'Low',
    // Config
    configTitle: 'System Configuration', key: 'Key', value: 'Value', save: 'Save',
    saved: 'Saved!',
    // Ingestion
    ingestionTitle: 'Email Ingestion', sender: 'Sender', processed: 'Processed',
    // Fraud
    fraudTitle: 'Fraud & Abuse Monitoring', entity: 'Entity', evidence: 'Evidence',
    resolution: 'Resolution', investigate: 'Investigate', dismiss: 'Dismiss',
    // Support
    supportTitle: 'Support Tickets', ticket: 'Ticket', assignee: 'Assignee',
    // Billing
    billingTitle: 'Billing & Revenue', eventType: 'Event', currency: 'Currency',
    totalRevenueLabel: 'Total Revenue', activeSubsLabel: 'Active Subscriptions',
    mrrLabel: 'Monthly Recurring', extensionRevLabel: 'Extension Revenue',
    // Misc
    accountType: 'Account Type', phone: 'Phone', locale: 'Locale',
    sellerName: 'Seller', startDate: 'Start Date', endDate: 'End Date',
    claimNumber: 'Claim #', warrantyRef: 'Warranty', claimAmount: 'Amount',
    filedAt: 'Filed', resolvedAt: 'Resolved',
    ticketNumber: 'Ticket #', createdAt: 'Created',
    all: 'All', filter: 'Filter',
    legalHold: 'Legal Hold', archived: 'Archived',
  },
  ar: {
    title: 'Ø¥Ø¯Ø§Ø±Ø© ÙØ§Ø±ÙØªÙ', subtitle: 'Ø«Ù Ø¨Ø§ÙØ´Ø±ÙØ·â¢', overview: 'ÙØ¸Ø±Ø© Ø¹Ø§ÙØ©', usersTab: 'Ø§ÙÙØ³ØªØ®Ø¯ÙÙÙ',
    warrantiesTab: 'Ø§ÙØ¶ÙØ§ÙØ§Øª', companiesTab: 'Ø§ÙØ´Ø±ÙØ§Øª', claimsTab: 'Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª', supportTab: 'Ø§ÙØ¯Ø¹Ù',
    fraudTab: 'Ø§ÙØ§Ø­ØªÙØ§Ù', ingestionTab: 'Ø§ÙØ¨Ø±ÙØ¯', billingTab: 'Ø§ÙÙÙØªØ±Ø©', configTab: 'Ø§ÙØ¥Ø¹Ø¯Ø§Ø¯Ø§Øª',
    teamTab: 'Ø§ÙÙØ±ÙÙ', auditTab: 'Ø³Ø¬Ù Ø§ÙÙØ±Ø§Ø¬Ø¹Ø©',
    totalUsers: 'Ø§ÙÙØ³ØªØ®Ø¯ÙÙÙ', totalWarranties: 'Ø§ÙØ¶ÙØ§ÙØ§Øª', totalCompanies: 'Ø§ÙØ´Ø±ÙØ§Øª',
    totalClaims: 'Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª', active: 'ÙØ´Ø·', expired: 'ÙÙØªÙÙ', pending: 'ÙÙØ¯ Ø§ÙØ§ÙØªØ¸Ø§Ø±',
    consumers: 'Ø£ÙØ±Ø§Ø¯', businesses: 'Ø´Ø±ÙØ§Øª',
    openTickets: 'ØªØ°Ø§ÙØ± ÙÙØªÙØ­Ø©', fraudAlerts: 'ØªÙØ¨ÙÙØ§Øª Ø§Ø­ØªÙØ§Ù', revenue: 'Ø§ÙØ¥ÙØ±Ø§Ø¯Ø§Øª', subscriptions: 'Ø§ÙØ§Ø´ØªØ±Ø§ÙØ§Øª',
    name: 'Ø§ÙØ§Ø³Ù', email: 'Ø§ÙØ¨Ø±ÙØ¯', role: 'Ø§ÙØ¯ÙØ±', joined: 'Ø§ÙØ§ÙØ¶ÙØ§Ù', product: 'Ø§ÙÙÙØªØ¬',
    status: 'Ø§ÙØ­Ø§ÙØ©', expiry: 'Ø§ÙØ§ÙØªÙØ§Ø¡', company: 'Ø§ÙØ´Ø±ÙØ©', cr: 'Ø§ÙØ³Ø¬Ù', type: 'Ø§ÙÙÙØ¹',
    date: 'Ø§ÙØªØ§Ø±ÙØ®', actions: 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª', category: 'Ø§ÙÙØ¦Ø©', priority: 'Ø§ÙØ£ÙÙÙÙØ©', severity: 'Ø§ÙØ®Ø·ÙØ±Ø©',
    subject: 'Ø§ÙÙÙØ¶ÙØ¹', description: 'Ø§ÙÙØµÙ', signalType: 'Ø§ÙØ¥Ø´Ø§Ø±Ø©', confidence: 'Ø§ÙØ«ÙØ©',
    amount: 'Ø§ÙÙØ¨ÙØº', plan: 'Ø§ÙØ®Ø·Ø©', source: 'Ø§ÙÙØµØ¯Ø±',
    unauthorized: 'ÙÙØ³ ÙØ¯ÙÙ ØµÙØ§Ø­ÙØ© Ø§ÙÙØµÙÙ.', backToDashboard: 'Ø§ÙØ¹ÙØ¯Ø© ÙÙÙØ­Ø© Ø§ÙØªØ­ÙÙ',
    noData: 'ÙØ§ ØªÙØ¬Ø¯ Ø¨ÙØ§ÙØ§Øª', signOut: 'ØªØ³Ø¬ÙÙ Ø§ÙØ®Ø±ÙØ¬', signingOut: 'Ø¬Ø§Ø±Ù Ø§ÙØ®Ø±ÙØ¬...',
    recentActivity: 'Ø§ÙÙØ´Ø§Ø· Ø§ÙØ£Ø®ÙØ±', registrationTrend: 'Ø§ØªØ¬Ø§Ù Ø§ÙØªØ³Ø¬ÙÙ',
    warrantiesByCategory: 'Ø§ÙØ¶ÙØ§ÙØ§Øª Ø­Ø³Ø¨ Ø§ÙÙØ¦Ø©', claimsBreakdown: 'ØªÙØ²ÙØ¹ Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª',
    revenueOverview: 'ÙØ¸Ø±Ø© Ø¹ÙÙ Ø§ÙØ¥ÙØ±Ø§Ø¯Ø§Øª', platformHealth: 'ØµØ­Ø© Ø§ÙÙÙØµØ©',
    ingestionRate: 'ÙØ¬Ø§Ø­ Ø§ÙØ§Ø³ØªÙØ±Ø§Ø¯', ocrConfidence: 'Ø¯ÙØ© OCR',
    systemMetrics: 'ÙÙØ§ÙÙØ³ Ø§ÙÙØ¸Ø§Ù', quickActions: 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø³Ø±ÙØ¹Ø©',
    exportData: 'ØªØµØ¯ÙØ± CSV', refresh: 'ØªØ­Ø¯ÙØ«', search: 'Ø¨Ø­Ø«...',
    teamTitle: 'Ø¥Ø¯Ø§Ø±Ø© Ø§ÙÙØ±ÙÙ', addAdmin: 'Ø¥Ø¶Ø§ÙØ© Ø¹Ø¶Ù', emailPlaceholder: 'Ø£Ø¯Ø®Ù Ø§ÙØ¨Ø±ÙØ¯ Ø§ÙØ¥ÙÙØªØ±ÙÙÙ',
    invite: 'Ø¥Ø¶Ø§ÙØ©', removeAccess: 'Ø¥Ø²Ø§ÙØ©', confirmRemove: 'ØªØ£ÙÙØ¯ Ø§ÙØ¥Ø²Ø§ÙØ©',
    confirmRemoveMsg: 'Ø¥Ø²Ø§ÙØ© ØµÙØ§Ø­ÙØ© Ø§ÙØ¥Ø¯Ø§Ø±Ø© ÙÙ', cancel: 'Ø¥ÙØºØ§Ø¡', confirm: 'ØªØ£ÙÙØ¯',
    promoted: 'ØªÙ Ø§ÙØªØ±ÙÙØ© Ø¨ÙØ¬Ø§Ø­', demoted: 'ØªÙ Ø¥Ø²Ø§ÙØ© Ø§ÙØµÙØ§Ø­ÙØ©', inviteSent: 'ØªÙ Ø¥Ø¶Ø§ÙØ© Ø§ÙØ¹Ø¶Ù',
    userNotFound: 'ÙØ§ ÙÙØ¬Ø¯ Ø­Ø³Ø§Ø¨ Ø¨ÙØ°Ø§ Ø§ÙØ¨Ø±ÙØ¯.', alreadyAdmin: 'ÙØ´Ø±Ù Ø¨Ø§ÙÙØ¹Ù.',
    cannotRemoveSelf: 'ÙØ§ ÙÙÙÙÙ Ø¥Ø²Ø§ÙØ© ÙÙØ³Ù.', cannotRemoveSuper: 'ÙØ§ ÙÙÙÙ ØªØ¹Ø¯ÙÙ Ø§ÙÙØ¯ÙØ± Ø§ÙØ£Ø¹ÙÙ.',
    superAdmin: 'ÙØ¯ÙØ± Ø£Ø¹ÙÙ', admin: 'ÙØ´Ø±Ù', support: 'Ø¯Ø¹Ù', user: 'ÙØ³ØªØ®Ø¯Ù',
    makeAdmin: 'ØªØ±ÙÙØ© ÙÙØ´Ø±Ù', makeSupport: 'ØªØ¹ÙÙÙ Ø¯Ø¹Ù', demoteToUser: 'Ø¥Ø²Ø§ÙØ© Ø§ÙØµÙØ§Ø­ÙØ©',
    auditTitle: 'Ø³Ø¬Ù Ø§ÙÙØ±Ø§Ø¬Ø¹Ø©', actor: 'Ø§ÙÙÙÙØ°', action: 'Ø§ÙØ¥Ø¬Ø±Ø§Ø¡', target: 'Ø§ÙÙØ¯Ù',
    details: 'Ø§ÙØªÙØ§ØµÙÙ', timestamp: 'Ø§ÙÙÙØª', riskLevel: 'Ø§ÙØ®Ø·ÙØ±Ø©',
    noAuditLogs: 'ÙØ§ ØªÙØ¬Ø¯ Ø³Ø¬ÙØ§Øª Ø¨Ø¹Ø¯.', high: 'Ø¹Ø§ÙÙ', medium: 'ÙØªÙØ³Ø·', low: 'ÙÙØ®ÙØ¶',
    configTitle: 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§ÙÙØ¸Ø§Ù', key: 'Ø§ÙÙÙØªØ§Ø­', value: 'Ø§ÙÙÙÙØ©', save: 'Ø­ÙØ¸',
    saved: 'ØªÙ Ø§ÙØ­ÙØ¸!',
    ingestionTitle: 'Ø§Ø³ØªÙØ±Ø§Ø¯ Ø§ÙØ¨Ø±ÙØ¯', sender: 'Ø§ÙÙØ±Ø³Ù', processed: 'ÙØ¹Ø§ÙØ¬',
    fraudTitle: 'ÙØ±Ø§ÙØ¨Ø© Ø§ÙØ§Ø­ØªÙØ§Ù', entity: 'Ø§ÙÙÙØ§Ù', evidence: 'Ø§ÙØ¯ÙÙÙ',
    resolution: 'Ø§ÙØ­Ù', investigate: 'ØªØ­ÙÙÙ', dismiss: 'Ø±ÙØ¶',
    supportTitle: 'ØªØ°Ø§ÙØ± Ø§ÙØ¯Ø¹Ù', ticket: 'Ø§ÙØªØ°ÙØ±Ø©', assignee: 'Ø§ÙÙØ³Ø¤ÙÙ',
    billingTitle: 'Ø§ÙÙÙØªØ±Ø© ÙØ§ÙØ¥ÙØ±Ø§Ø¯Ø§Øª', eventType: 'Ø§ÙØ­Ø¯Ø«', currency: 'Ø§ÙØ¹ÙÙØ©',
    totalRevenueLabel: 'Ø¥Ø¬ÙØ§ÙÙ Ø§ÙØ¥ÙØ±Ø§Ø¯Ø§Øª', activeSubsLabel: 'Ø§Ø´ØªØ±Ø§ÙØ§Øª ÙØ´Ø·Ø©',
    mrrLabel: 'Ø§ÙØ¥ÙØ±Ø§Ø¯Ø§Øª Ø§ÙØ´ÙØ±ÙØ©', extensionRevLabel: 'Ø¥ÙØ±Ø§Ø¯Ø§Øª Ø§ÙØªÙØ¯ÙØ¯',
    accountType: 'ÙÙØ¹ Ø§ÙØ­Ø³Ø§Ø¨', phone: 'Ø§ÙÙØ§ØªÙ', locale: 'Ø§ÙÙØºØ©',
    sellerName: 'Ø§ÙØ¨Ø§Ø¦Ø¹', startDate: 'ØªØ§Ø±ÙØ® Ø§ÙØ¨Ø¯Ø§ÙØ©', endDate: 'ØªØ§Ø±ÙØ® Ø§ÙØ§ÙØªÙØ§Ø¡',
    claimNumber: 'Ø±ÙÙ Ø§ÙÙØ·Ø§ÙØ¨Ø©', warrantyRef: 'Ø§ÙØ¶ÙØ§Ù', claimAmount: 'Ø§ÙÙØ¨ÙØº',
    filedAt: 'ØªØ§Ø±ÙØ® Ø§ÙØªÙØ¯ÙÙ', resolvedAt: 'ØªØ§Ø±ÙØ® Ø§ÙØ­Ù',
    ticketNumber: 'Ø±ÙÙ Ø§ÙØªØ°ÙØ±Ø©', createdAt: 'ØªØ§Ø±ÙØ® Ø§ÙØ¥ÙØ´Ø§Ø¡',
    all: 'Ø§ÙÙÙ', filter: 'ØªØµÙÙØ©',
    legalHold: 'Ø­Ø¬Ø² ÙØ§ÙÙÙÙ', archived: 'ÙØ¤Ø±Ø´Ù',
  },
};

const EM_DASH = '\u2014';

function decodeMojibake(value: string) {
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

function decodeTranslationMap<T extends Record<string, string>>(translations: T): T {
  return Object.fromEntries(
    Object.entries(translations).map(([key, value]) => [key, decodeMojibake(value)])
  ) as T;
}

const t = {
  en: rawTranslations.en,
  ar: decodeTranslationMap(rawTranslations.ar),
};

// âââ MINI CHART COMPONENTS âââââââââââââââââââââââââââââ
function BarChart({ data, labelKey, valueKey, color = '#D4AF37', height = 160 }: any) {
  if (!data?.length) return <div className="text-xs text-gray-400 py-8 text-center">No data</div>;
  const max = Math.max(...data.map((d: any) => d[valueKey] || 0), 1);
  return (
    <div className="flex items-end gap-1 justify-between" style={{ height }}>
      {data.slice(-12).map((d: any, i: number) => (
        <div key={i} className="flex flex-col items-center flex-1 min-w-0">
          <div className="w-full rounded-t-sm transition-all duration-500" style={{
            height: `${Math.max((d[valueKey] / max) * (height - 24), 2)}px`,
            backgroundColor: color, opacity: 0.7 + (i / data.length) * 0.3,
          }} />
          <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, colors, height = 140 }: any) {
  if (!data?.length) return <div className="text-xs text-gray-400 py-8 text-center">No data</div>;
  const total = data.reduce((s: number, d: any) => s + d.count, 0) || 1;
  let offset = 0;
  const segments = data.map((d: any, i: number) => {
    const pct = (d.count / total) * 100;
    const seg = { ...d, pct, offset, color: colors[i % colors.length] };
    offset += pct;
    return seg;
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 36 36" style={{ width: height, height }}>
        {segments.map((s: any, i: number) => (
          <circle key={i} cx="18" cy="18" r="14" fill="none" stroke={s.color} strokeWidth="5"
            strokeDasharray={`${s.pct * 0.88} ${48 - s.pct * 0.88}`}
            strokeDashoffset={`${-s.offset * 0.88 + 22}`} className="transition-all duration-500" />
        ))}
        <text x="18" y="19" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">{total}</text>
      </svg>
      <div className="flex flex-col gap-1">
        {segments.map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-gray-300">{s.status || s.category}</span>
            <span className="text-gray-500 font-mono">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SparkNumber({ label, value, sub, icon, color = '#D4AF37' }: any) {
  return (
    <div className="bg-[#12122a] rounded-xl p-4 border border-[#2a2a4a] hover:border-[#D4AF37]/30 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        {sub && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a3a] text-gray-400 border border-[#2a2a4a]">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// âââ MAIN COMPONENT ââââââââââââââââââââââââââââââââââââ
export default function AdminPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const router = useRouter();
  const isRTL = locale === 'ar';
  const text = t[locale as keyof typeof t] || t.en;

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [signingOut, setSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalWarranties: 0, totalCompanies: 0, totalClaims: 0,
    activeWarranties: 0, expiredWarranties: 0, pendingClaims: 0,
    consumerUsers: 0, businessUsers: 0,
    openTickets: 0, fraudSignals: 0,
    totalRevenue: 0, activeSubscriptions: 0,
    ingestionSuccess: 0, ingestionTotal: 0,
    recentActivity: [], usersByMonth: [], warrantiesByCategory: [], claimsByStatus: [],
    revenueByMonth: [],
  });

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [fraudSignals, setFraudSignals] = useState<any[]>([]);
  const [ingestions, setIngestions] = useState<any[]>([]);
  const [revenueEvents, setRevenueEvents] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any[]>([]);

  // Team state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'support'>('admin');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamMsg, setTeamMsg] = useState('');
  const [teamError, setTeamError] = useState('');
  const [confirmAction, setConfirmAction] = useState<any>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Filter states
  const [userFilter, setUserFilter] = useState('all');
  const [warrantyFilter, setWarrantyFilter] = useState('all');
  const [claimFilter, setClaimFilter] = useState('all');
  const [ticketFilter, setTicketFilter] = useState('all');

  const isSuperAdmin = currentUserRole === 'super_admin';

  // âââ AUTH CHECK âââââââââââââââââââââââââââââââââââââââ
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/admin/login`); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        setAuthorized(true);
        setCurrentUserRole(profile.role);
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email || '');
        await loadAllData();
      }
      setLoading(false);
    };
    check();
  }, []);

  // âââ SIGN OUT âââââââââââââââââââââââââââââââââââââââââ
  const handleSignOut = async () => {
    setSigningOut(true);
    await logAudit('sign_out', 'session', currentUserId, { email: currentUserEmail }, null, null, 'low');
    await supabase.auth.signOut();
    router.push(`/${locale}/admin/login`);
  };

  // âââ DATA LOADING âââââââââââââââââââââââââââââââââââââ
  const loadAllData = async () => {
    const now = new Date().toISOString();
    const [usersR, warranR, compR, claimR, actR, tickR, fraudR, ingR, revR, subsR] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('warranties').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(200),
      supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('warranty_claims').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(200),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('fraud_signals').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('email_ingestion').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('revenue_events').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    const u = usersR.data || []; const w = warranR.data || []; const co = compR.data || [];
    const cl = claimR.data || []; const tk = tickR.data || []; const fr = fraudR.data || [];
    const ig = ingR.data || []; const rv = revR.data || []; const sb = subsR.data || [];

    setUsers(u); setWarranties(w); setCompanies(co); setClaims(cl);
    setTickets(tk); setFraudSignals(fr); setIngestions(ig); setRevenueEvents(rv); setSubscriptions(sb);

    // Compute monthly registrations
    const monthMap: Record<string, number> = {};
    u.forEach((p: any) => {
      const m = p.created_at?.substring(0, 7); if (m) monthMap[m] = (monthMap[m] || 0) + 1;
    });
    const usersByMonth = Object.entries(monthMap).sort().map(([month, count]) => ({ month: month.substring(5), count }));

    // Category breakdown
    const catMap: Record<string, number> = {};
    w.forEach((wr: any) => { const c = wr.category || 'Other'; catMap[c] = (catMap[c] || 0) + 1; });
    const warrantiesByCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([category, count]) => ({ category, count }));

    // Claims by status
    const claimStatusMap: Record<string, number> = {};
    cl.forEach((c: any) => { const s = c.status || 'unknown'; claimStatusMap[s] = (claimStatusMap[s] || 0) + 1; });
    const claimsByStatus = Object.entries(claimStatusMap).map(([status, count]) => ({ status, count }));

    // Revenue by month
    const revMap: Record<string, number> = {};
    rv.forEach((r: any) => {
      const m = r.created_at?.substring(0, 7); if (m) revMap[m] = (revMap[m] || 0) + (r.amount || 0);
    });
    const revenueByMonth = Object.entries(revMap).sort().map(([month, amount]) => ({ month: month.substring(5), amount }));

    setStats({
      totalUsers: u.length, totalWarranties: w.length, totalCompanies: co.length, totalClaims: cl.length,
      activeWarranties: w.filter(x => x.end_date > now.substring(0, 10) && x.status === 'active').length,
      expiredWarranties: w.filter(x => x.end_date <= now.substring(0, 10) || x.status === 'expired').length,
      pendingClaims: cl.filter(x => x.status === 'pending' || x.status === 'filed').length,
      consumerUsers: u.filter(x => x.account_type === 'personal' || x.account_type === 'consumer').length,
      businessUsers: u.filter(x => x.account_type === 'business').length,
      openTickets: tk.filter(x => x.status === 'open' || x.status === 'in_progress').length,
      fraudSignals: fr.filter(x => x.status === 'open' || x.status === 'investigating').length,
      totalRevenue: rv.reduce((s, r) => s + (r.amount || 0), 0),
      activeSubscriptions: sb.filter(x => x.status === 'active' || x.status === 'trialing').length,
      ingestionSuccess: ig.filter(x => x.status === 'completed' || x.status === 'processed').length,
      ingestionTotal: ig.length,
      recentActivity: actR.data || [],
      usersByMonth, warrantiesByCategory, claimsByStatus, revenueByMonth,
    });
  };

  // âââ TEAM MANAGEMENT ââââââââââââââââââââââââââââââââââ
  const loadTeam = async () => {
    const { data } = await supabase.from('profiles')
      .select('id, email, full_name, role, created_at')
      .in('role', ['admin', 'super_admin', 'support'])
      .order('created_at', { ascending: true });
    setTeamMembers(data || []);
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    const { data } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
    setAuditLogs(data || []);
    setAuditLoading(false);
  };

  const loadConfig = async () => {
    const { data } = await supabase.from('system_config').select('*').order('key');
    setSystemConfig(data || []);
  };

  useEffect(() => {
    if (activeTab === 'team' && isSuperAdmin) loadTeam();
    if (activeTab === 'audit' && isSuperAdmin) loadAudit();
    if (activeTab === 'config' && isSuperAdmin) loadConfig();
  }, [activeTab]);

  const logAudit = async (action: string, entityType: string, entityId: string, details: any, prev?: any, next?: any, risk?: string) => {
    await supabase.from('admin_audit_log').insert({
      admin_id: currentUserId, action, entity_type: entityType, entity_id: entityId,
      details, previous_state: prev, new_state: next, risk_level: risk || 'medium',
    });
  };

  const handleAddMember = async () => {
    if (!inviteEmail.trim()) return;
    setTeamLoading(true); setTeamMsg(''); setTeamError('');
    const { data: target } = await supabase.from('profiles').select('id, email, full_name, role').eq('email', inviteEmail.trim().toLowerCase()).single();
    if (!target) { setTeamError(text.userNotFound); setTeamLoading(false); return; }
    if (['admin', 'super_admin'].includes(target.role)) { setTeamError(text.alreadyAdmin); setTeamLoading(false); return; }
    const prev = target.role;
    const { error } = await supabase.from('profiles').update({ role: inviteRole }).eq('id', target.id);
    if (error) { setTeamError(error.message); } else {
      await logAudit('role_change', 'profile', target.id, { email: target.email, changed_by: currentUserId }, { role: prev }, { role: inviteRole }, 'high');
      setTeamMsg(text.inviteSent); setInviteEmail(''); await loadTeam();
    }
    setTeamLoading(false);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (userId === currentUserId) { setTeamError(text.cannotRemoveSelf); return; }
    const m = teamMembers.find(x => x.id === userId);
    if (m?.role === 'super_admin') { setTeamError(text.cannotRemoveSuper); return; }
    setTeamLoading(true); setTeamMsg(''); setTeamError('');
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { setTeamError(error.message); } else {
      await logAudit('role_change', 'profile', userId, { email: m?.email, new_role: newRole }, { role: m?.role }, { role: newRole }, newRole === 'user' ? 'high' : 'medium');
      setTeamMsg(newRole === 'user' ? text.demoted : text.promoted);
      setConfirmAction(null); await loadTeam();
    }
    setTeamLoading(false);
  };

  // âââ HELPERS ââââââââââââââââââââââââââââââââââââââââââ
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : EM_DASH;
  const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : EM_DASH;
  const fmtMoney = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const roleLabel = (r: string) => ({ super_admin: text.superAdmin, admin: text.admin, support: text.support, user: text.user }[r] || r);
  const roleBadge = (r: string) => ({
    super_admin: 'bg-red-500/15 text-red-400 border-red-500/20',
    admin: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    support: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    user: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  }[r] || 'bg-gray-500/15 text-gray-400 border-gray-500/20');

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-400', expired: 'bg-red-500/15 text-red-400',
      pending: 'bg-yellow-500/15 text-yellow-400', filed: 'bg-yellow-500/15 text-yellow-400',
      approved: 'bg-emerald-500/15 text-emerald-400', rejected: 'bg-red-500/15 text-red-400',
      resolved: 'bg-blue-500/15 text-blue-400', open: 'bg-orange-500/15 text-orange-400',
      in_progress: 'bg-blue-500/15 text-blue-400', closed: 'bg-gray-500/15 text-gray-400',
      investigating: 'bg-purple-500/15 text-purple-400', dismissed: 'bg-gray-500/15 text-gray-400',
      completed: 'bg-emerald-500/15 text-emerald-400', processed: 'bg-emerald-500/15 text-emerald-400',
      failed: 'bg-red-500/15 text-red-400', trialing: 'bg-purple-500/15 text-purple-400',
      canceled: 'bg-red-500/15 text-red-400',
    };
    return map[s] || 'bg-gray-500/15 text-gray-400';
  };

  // Filter helper
  const applySearch = (items: any[], keys: string[]) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => keys.some(k => item[k]?.toString().toLowerCase().includes(q)));
  };

  // âââ TABS CONFIG ââââââââââââââââââââââââââââââââââââââ
  const baseTabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: text.overview, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'users', label: text.usersTab, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'warranties', label: text.warrantiesTab, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'companies', label: text.companiesTab, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'claims', label: text.claimsTab, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'support', label: text.supportTab, icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'fraud', label: text.fraudTab, icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'ingestion', label: text.ingestionTab, icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'billing', label: text.billingTab, icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  ];
  const superTabs: typeof baseTabs = [
    { id: 'config', label: text.configTab, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'team', label: text.teamTab, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'audit', label: text.auditTab, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ];
  const tabs = isSuperAdmin ? [...baseTabs, ...superTabs] : baseTabs;
  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || text.overview;
  const activeTabDescription = ({
    overview: locale === 'ar' ? 'عرض سريع لصحة المنصة والنشاط والمخاطر المفتوحة.' : 'High-level view of platform health, activity, and open risk.',
    users: locale === 'ar' ? 'مراجعة المستخدمين والادوار والهواتف وحالة الحسابات.' : 'Review users, roles, phones, and account mix.',
    warranties: locale === 'ar' ? 'متابعة الضمانات والحالة والمصدر والتنبيهات القانونية.' : 'Track warranty status, source, and legal holds.',
    companies: locale === 'ar' ? 'مراجعة الشركات المسجلة وبيانات التواصل والسجل التجاري.' : 'Review registered companies and contact details.',
    claims: locale === 'ar' ? 'مراقبة المطالبات والشدة والحالة والقرارات المفتوحة.' : 'Monitor claims, severity, status, and unresolved decisions.',
    support: locale === 'ar' ? 'متابعة تذاكر الدعم والاولوية وسرعة الاستجابة.' : 'Track support queues, priority, and response flow.',
    fraud: locale === 'ar' ? 'متابعة اشارات الاحتيال والعناصر التي تحتاج تدقيقا عاجلا.' : 'Watch fraud signals and investigate urgent cases.',
    ingestion: locale === 'ar' ? 'مراقبة ادخال البريد وجودة الاستخراج ونسب النجاح.' : 'Monitor email ingestion, extraction quality, and success rates.',
    billing: locale === 'ar' ? 'مراجعة الايرادات والاحداث المالية والاشتراكات.' : 'Review revenue events, subscriptions, and billing health.',
    config: locale === 'ar' ? 'ادارة مفاتيح النظام والاعدادات الحساسة بعناية.' : 'Manage sensitive system settings and operational config.',
    team: locale === 'ar' ? 'التحكم في صلاحيات الفريق والادوار التشغيلية.' : 'Control admin team access and operating roles.',
    audit: locale === 'ar' ? 'فحص سجل التدقيق والعمليات عالية المخاطر.' : 'Inspect the audit trail and high-risk operations.',
  } as Record<TabId, string>)[activeTab];

  // âââ LOADING / UNAUTHORIZED âââââââââââââââââââââââââââ
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading admin portal...</p>
      </div>
    </div>
  );

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <p className="text-gray-400 mb-4">{text.unauthorized}</p>
        <Link href={`/${locale}/dashboard`} className="text-[#D4AF37] hover:underline">{text.backToDashboard}</Link>
      </div>
    </div>
  );

  // âââ RENDER âââââââââââââââââââââââââââââââââââââââââââ
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* âââ HEADER âââ */}
      <header className="bg-[#0e0e20] border-b border-[#1a1a3a] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#F5D76E] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-none">{text.title}</h1>
                <p className="text-[10px] text-[#D4AF37]/60 tracking-widest uppercase">{text.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center bg-[#12122a] border border-[#2a2a4a] rounded-lg px-3 py-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={text.search}
                  className="bg-transparent text-xs text-gray-300 outline-none w-48 placeholder-gray-600" />
              </div>

              {/* Role badge */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleBadge(currentUserRole)}`}>
                {roleLabel(currentUserRole)}
              </span>

              {/* User info */}
              <span className="text-xs text-gray-500 hidden lg:inline">{currentUserEmail}</span>

              {/* Sign Out */}
              <button onClick={handleSignOut} disabled={signingOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition disabled:opacity-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                {signingOut ? text.signingOut : text.signOut}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex">
        {/* âââ SIDEBAR NAV âââ */}
        <nav className="hidden lg:flex flex-col w-56 min-h-[calc(100vh-56px)] bg-[#0e0e20] border-r border-[#1a1a3a] py-4 px-2 sticky top-14 self-start">
          {tabs.map((tab, i) => (
            <div key={tab.id}>
              {i === baseTabs.length && isSuperAdmin && (
                <div className="my-2 px-3"><div className="border-t border-[#1a1a3a]" /><p className="text-[9px] text-gray-600 uppercase tracking-wider mt-2">{text.superAdmin}</p></div>
              )}
              <button onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition mb-0.5 ${
                  activeTab === tab.id ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20' : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a3a]/50 border border-transparent'
                }`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon}/></svg>
                {tab.label}
                {tab.id === 'fraud' && stats.fraudSignals > 0 && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">{stats.fraudSignals}</span>
                )}
                {tab.id === 'support' && stats.openTickets > 0 && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{stats.openTickets}</span>
                )}
              </button>
            </div>
          ))}
        </nav>

        {/* âââ MOBILE NAV âââ */}
        <div className="lg:hidden w-full overflow-x-auto border-b border-[#1a1a3a] bg-[#0e0e20] sticky top-14 z-40">
          <div className="flex gap-0.5 p-1.5 min-w-max">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md whitespace-nowrap transition ${
                  activeTab === tab.id ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
                }`}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* âââ CONTENT AREA âââ */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <section className="mb-6 rounded-2xl border border-[#1a1a3a] bg-gradient-to-br from-[#0e0e20] via-[#12122a] to-[#171733] p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-2 text-xs font-medium text-[#D4AF37] hover:text-[#f5d76e] transition">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={isRTL ? 'M13 5l7 7-7 7M5 12h15' : 'M11 19l-7-7 7-7m-7 7h16'} />
                  </svg>
                  {text.backToDashboard}
                </Link>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]/70">
                    {locale === 'ar' ? 'مركز قيادة الادمن' : 'Admin Command Center'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{activeTabLabel}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-gray-400">{activeTabDescription}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={loadAllData}
                  className="inline-flex items-center gap-2 rounded-full border border-[#2a2a4a] bg-[#12122a] px-4 py-2 text-xs font-medium text-gray-200 transition hover:border-[#D4AF37]/30 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m14.836 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {text.refresh}
                </button>
                <button
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-[#1A1A2E] transition hover:bg-[#f5d76e]"
                >
                  {locale === 'ar' ? 'فتح تجربة العميل' : 'Open customer app'}
                </button>
              </div>
            </div>
          </section>

          {/* âââ OVERVIEW TAB âââ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                <SparkNumber label={text.totalUsers} value={stats.totalUsers} sub={`${stats.consumerUsers}C / ${stats.businessUsers}B`} icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" color="#3B82F6" />
                <SparkNumber label={text.totalWarranties} value={stats.totalWarranties} sub={`${stats.activeWarranties} ${text.active}`} icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" color="#D4AF37" />
                <SparkNumber label={text.totalCompanies} value={stats.totalCompanies} icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" color="#8B5CF6" />
                <SparkNumber label={text.totalClaims} value={stats.totalClaims} sub={`${stats.pendingClaims} ${text.pending}`} icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" color="#F59E0B" />
                <SparkNumber label={text.openTickets} value={stats.openTickets} icon="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" color="#F97316" />
                <SparkNumber label={text.fraudAlerts} value={stats.fraudSignals} icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" color="#EF4444" />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-5">
                  <h3 className="text-sm font-semibold text-gray-200 mb-4">{text.registrationTrend}</h3>
                  <BarChart data={stats.usersByMonth} labelKey="month" valueKey="count" color="#3B82F6" />
                </div>
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-5">
                  <h3 className="text-sm font-semibold text-gray-200 mb-4">{text.claimsBreakdown}</h3>
                  <DonutChart data={stats.claimsByStatus} colors={['#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#6B7280']} />
                </div>
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-5">
                  <h3 className="text-sm font-semibold text-gray-200 mb-4">{text.revenueOverview}</h3>
                  <BarChart data={stats.revenueByMonth} labelKey="month" valueKey="amount" color="#10B981" />
                </div>
              </div>

              {/* Second charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-5">
                  <h3 className="text-sm font-semibold text-gray-200 mb-4">{text.warrantiesByCategory}</h3>
                  <BarChart data={stats.warrantiesByCategory} labelKey="category" valueKey="count" color="#D4AF37" />
                </div>
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-5">
                  <h3 className="text-sm font-semibold text-gray-200 mb-4">{text.platformHealth}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{text.ingestionRate}</span><span className="text-emerald-400">{stats.ingestionTotal > 0 ? Math.round((stats.ingestionSuccess / stats.ingestionTotal) * 100) : 0}%</span></div>
                      <div className="h-2 bg-[#1a1a3a] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.ingestionTotal > 0 ? (stats.ingestionSuccess / stats.ingestionTotal) * 100 : 0}%` }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{text.subscriptions}</span><span className="text-blue-400">{stats.activeSubscriptions}</span></div>
                      <div className="h-2 bg-[#1a1a3a] rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(stats.activeSubscriptions * 10, 100)}%` }} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-[#12122a] rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-[#D4AF37]">{fmtMoney(stats.totalRevenue)}</p>
                        <p className="text-[10px] text-gray-500">{text.revenue}</p>
                      </div>
                      <div className="bg-[#12122a] rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-emerald-400">{stats.activeWarranties}</p>
                        <p className="text-[10px] text-gray-500">{text.active} {text.warrantiesTab}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-200">{text.recentActivity}</h3>
                    <button onClick={loadAllData} className="text-[10px] text-[#D4AF37] hover:underline">{text.refresh}</button>
                  </div>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {stats.recentActivity.length === 0 ? <p className="text-xs text-gray-600">{text.noData}</p> : stats.recentActivity.slice(0, 15).map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#12122a] transition">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-300 truncate">{a.action}</p>
                          <p className="text-[10px] text-gray-600">{fmtDateTime(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* âââ USERS TAB âââ */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{text.usersTab} <span className="text-sm font-normal text-gray-500">({users.length})</span></h2>
                <div className="flex gap-2">
                  {['all', 'personal', 'business'].map(f => (
                    <button key={f} onClick={() => setUserFilter(f)} className={`text-[11px] px-3 py-1 rounded-md border transition ${userFilter === f ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a4a] text-gray-500 hover:text-gray-300'}`}>
                      {f === 'all' ? text.all : f === 'personal' ? text.consumers : text.businesses}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.name, text.email, text.accountType, text.role, text.phone, text.joined].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {applySearch(users.filter(u => userFilter === 'all' || u.account_type === userFilter), ['full_name', 'email', 'phone']).slice(0, 100).map(u => (
                        <tr key={u.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-medium text-gray-200">{u.full_name || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-400" dir="ltr">{u.email || EM_DASH}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${u.account_type === 'business' ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/15 text-blue-400'}`}>{u.account_type || 'personal'}</span></td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] border ${roleBadge(u.role || 'user')}`}>{roleLabel(u.role || 'user')}</span></td>
                          <td className="px-4 py-3 text-gray-500 font-mono" dir="ltr">{u.phone || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ WARRANTIES TAB âââ */}
          {activeTab === 'warranties' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{text.warrantiesTab} <span className="text-sm font-normal text-gray-500">({warranties.length})</span></h2>
                <div className="flex gap-2">
                  {['all', 'active', 'expired'].map(f => (
                    <button key={f} onClick={() => setWarrantyFilter(f)} className={`text-[11px] px-3 py-1 rounded-md border transition ${warrantyFilter === f ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a4a] text-gray-500 hover:text-gray-300'}`}>
                      {f === 'all' ? text.all : f === 'active' ? text.active : text.expired}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.product, text.category, text.sellerName, text.status, text.startDate, text.endDate, text.source, text.legalHold].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {applySearch(warranties.filter(w => {
                        if (warrantyFilter === 'active') return w.status === 'active';
                        if (warrantyFilter === 'expired') return w.status === 'expired';
                        return true;
                      }), ['product_name', 'seller_name', 'category', 'reference_number']).slice(0, 100).map(w => (
                        <tr key={w.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-medium text-gray-200">{w.product_name || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-400">{w.category || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-400">{w.seller_name || EM_DASH}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${statusBadge(w.status)}`}>{w.status}</span></td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(w.start_date)}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(w.end_date)}</td>
                          <td className="px-4 py-3 text-gray-500">{w.source || 'manual'}</td>
                          <td className="px-4 py-3">{w.legal_hold ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/15 text-red-400">{text.legalHold}</span> : EM_DASH}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ COMPANIES TAB âââ */}
          {activeTab === 'companies' && (
            <div>
              <h2 className="text-lg font-bold mb-4">{text.companiesTab} <span className="text-sm font-normal text-gray-500">({companies.length})</span></h2>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.company, text.cr, text.email, text.phone, text.date].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {applySearch(companies, ['name', 'cr_number', 'email']).slice(0, 100).map(c => (
                        <tr key={c.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-medium text-gray-200">{c.name}</td>
                          <td className="px-4 py-3 text-gray-400 font-mono">{c.cr_number || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-400" dir="ltr">{c.email || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono" dir="ltr">{c.phone || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(c.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ CLAIMS TAB âââ */}
          {activeTab === 'claims' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{text.claimsTab} <span className="text-sm font-normal text-gray-500">({claims.length})</span></h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <button key={f} onClick={() => setClaimFilter(f)} className={`text-[11px] px-3 py-1 rounded-md border transition ${claimFilter === f ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a4a] text-gray-500 hover:text-gray-300'}`}>
                      {f === 'all' ? text.all : f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.claimNumber, text.subject, text.status, text.severity, text.claimAmount, text.filedAt, text.resolvedAt, text.legalHold].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {applySearch(claims.filter(c => claimFilter === 'all' || c.status === claimFilter || (claimFilter === 'pending' && c.status === 'filed')), ['claim_number', 'title', 'description']).slice(0, 100).map(c => (
                        <tr key={c.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-mono text-gray-300">{c.claim_number || c.id?.substring(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">{c.title || EM_DASH}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${statusBadge(c.status)}`}>{c.status}</span></td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${c.severity === 'high' ? 'bg-red-500/15 text-red-400' : c.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-500/15 text-gray-400'}`}>{c.severity || EM_DASH}</span></td>
                          <td className="px-4 py-3 text-gray-400">{c.claim_amount ? fmtMoney(c.claim_amount) : EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(c.filed_at || c.created_at)}</td>
                          <td className="px-4 py-3 text-gray-500">{c.resolved_at ? fmtDate(c.resolved_at) : EM_DASH}</td>
                          <td className="px-4 py-3">{c.legal_hold ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/15 text-red-400">{text.legalHold}</span> : EM_DASH}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ SUPPORT TAB âââ */}
          {activeTab === 'support' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{text.supportTitle} <span className="text-sm font-normal text-gray-500">({tickets.length})</span></h2>
                <div className="flex gap-2">
                  {['all', 'open', 'in_progress', 'closed'].map(f => (
                    <button key={f} onClick={() => setTicketFilter(f)} className={`text-[11px] px-3 py-1 rounded-md border transition ${ticketFilter === f ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a4a] text-gray-500 hover:text-gray-300'}`}>
                      {f === 'all' ? text.all : f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.ticketNumber, text.subject, text.category, text.priority, text.status, text.createdAt].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {applySearch(tickets.filter(t => ticketFilter === 'all' || t.status === ticketFilter), ['ticket_number', 'subject', 'category']).slice(0, 100).map(tk => (
                        <tr key={tk.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-mono text-gray-300">{tk.ticket_number || tk.id?.substring(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-200 max-w-[250px] truncate">{tk.subject || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-400">{tk.category || EM_DASH}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${tk.priority === 'high' || tk.priority === 'urgent' ? 'bg-red-500/15 text-red-400' : tk.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-500/15 text-gray-400'}`}>{tk.priority || EM_DASH}</span></td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${statusBadge(tk.status)}`}>{tk.status}</span></td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(tk.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ FRAUD TAB âââ */}
          {activeTab === 'fraud' && (
            <div>
              <h2 className="text-lg font-bold mb-4">{text.fraudTitle} <span className="text-sm font-normal text-gray-500">({fraudSignals.length})</span></h2>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.signalType, text.severity, text.entity, text.description, text.status, text.date].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {applySearch(fraudSignals, ['signal_type', 'description', 'entity_type']).slice(0, 100).map(f => (
                        <tr key={f.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-medium text-gray-200">{f.signal_type || EM_DASH}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${f.severity === 'critical' || f.severity === 'high' ? 'bg-red-500/15 text-red-400' : f.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-500/15 text-gray-400'}`}>{f.severity || EM_DASH}</span></td>
                          <td className="px-4 py-3 text-gray-400">{f.entity_type}: {f.entity_id?.substring(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-300 max-w-[300px] truncate">{f.description || EM_DASH}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${statusBadge(f.status)}`}>{f.status}</span></td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(f.created_at)}</td>
                        </tr>
                      ))}
                      {fraudSignals.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">{text.noData}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ INGESTION TAB âââ */}
          {activeTab === 'ingestion' && (
            <div>
              <h2 className="text-lg font-bold mb-4">{text.ingestionTitle} <span className="text-sm font-normal text-gray-500">({ingestions.length})</span></h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{stats.ingestionSuccess}</p>
                  <p className="text-[10px] text-gray-500">{locale === 'ar' ? 'ناجح' : 'Successful'}</p>
                </div>
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{stats.ingestionTotal - stats.ingestionSuccess}</p>
                  <p className="text-[10px] text-gray-500">{locale === 'ar' ? 'فشل' : 'Failed'}</p>
                </div>
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-4 text-center">
                  <p className="text-2xl font-bold text-[#D4AF37]">{stats.ingestionTotal > 0 ? Math.round((stats.ingestionSuccess / stats.ingestionTotal) * 100) : 0}%</p>
                  <p className="text-[10px] text-gray-500">{locale === 'ar' ? 'نسبة النجاح' : 'Success Rate'}</p>
                </div>
              </div>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.sender, text.subject, text.status, text.confidence, text.date].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {applySearch(ingestions, ['from_email', 'subject']).slice(0, 100).map(ig => (
                        <tr key={ig.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 text-gray-300" dir="ltr">{ig.from_email || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-200 max-w-[250px] truncate">{ig.subject || EM_DASH}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${statusBadge(ig.status)}`}>{ig.status}</span></td>
                          <td className="px-4 py-3 text-gray-400">{ig.confidence_score != null ? `${(ig.confidence_score * 100).toFixed(0)}%` : EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(ig.created_at)}</td>
                        </tr>
                      ))}
                      {ingestions.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">{text.noData}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ BILLING TAB âââ */}
          {activeTab === 'billing' && (
            <div>
              <h2 className="text-lg font-bold mb-4">{text.billingTitle}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <SparkNumber label={text.totalRevenueLabel} value={fmtMoney(stats.totalRevenue)} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="#10B981" />
                <SparkNumber label={text.activeSubsLabel} value={stats.activeSubscriptions} icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" color="#3B82F6" />
                <SparkNumber label={text.mrrLabel} value={fmtMoney(subscriptions.filter(s => s.status === 'active').length * 1)} icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" color="#D4AF37" />
                <SparkNumber label={text.extensionRevLabel} value={fmtMoney(revenueEvents.filter(r => r.event_type === 'extension').reduce((s, r) => s + (r.amount || 0), 0))} icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" color="#8B5CF6" />
              </div>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.eventType, text.amount, text.currency, text.date].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {revenueEvents.slice(0, 100).map(r => (
                        <tr key={r.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 text-gray-200">{r.event_type || EM_DASH}</td>
                          <td className="px-4 py-3 text-emerald-400 font-medium">{fmtMoney(r.amount)}</td>
                          <td className="px-4 py-3 text-gray-400">{r.currency || 'USD'}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(r.created_at)}</td>
                        </tr>
                      ))}
                      {revenueEvents.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600">{text.noData}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ CONFIG TAB âââ */}
          {activeTab === 'config' && isSuperAdmin && (
            <div>
              <h2 className="text-lg font-bold mb-4">{text.configTitle}</h2>
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.key, text.value, text.description, locale === 'ar' ? 'آخر تحديث' : 'Updated'].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {systemConfig.map(c => (
                        <tr key={c.id || c.key} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-mono text-[#D4AF37]">{c.key}</td>
                          <td className="px-4 py-3 text-gray-200 font-mono">{typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value)}</td>
                          <td className="px-4 py-3 text-gray-500">{c.description || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(c.updated_at)}</td>
                        </tr>
                      ))}
                      {systemConfig.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600">{text.noData}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ TEAM TAB âââ */}
          {activeTab === 'team' && isSuperAdmin && (
            <div>
              <h2 className="text-lg font-bold mb-4">{text.teamTitle}</h2>
              {/* Add member */}
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] p-4 mb-4">
                <p className="text-xs font-medium text-gray-400 mb-3">{text.addAdmin}</p>
                <div className="flex gap-3 flex-wrap">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder={text.emailPlaceholder}
                    className="flex-1 min-w-[250px] px-4 py-2.5 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-xs text-gray-200 outline-none focus:border-[#D4AF37]/50" dir="ltr" />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                    className="px-4 py-2.5 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-xs text-gray-200 outline-none">
                    <option value="admin">{text.admin}</option>
                    <option value="support">{text.support}</option>
                  </select>
                  <button onClick={handleAddMember} disabled={teamLoading || !inviteEmail.trim()}
                    className="px-6 py-2.5 bg-[#D4AF37] hover:bg-yellow-500 text-[#1A1A2E] font-semibold rounded-lg text-xs disabled:opacity-50 transition">
                    {text.invite}
                  </button>
                </div>
                {teamMsg && <p className="mt-2 text-xs text-emerald-400">{teamMsg}</p>}
                {teamError && <p className="mt-2 text-xs text-red-400">{teamError}</p>}
              </div>
              {/* Confirm dialog */}
              {confirmAction && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                  <p className="text-xs text-red-300">{text.confirmRemoveMsg} <strong>{confirmAction.name}</strong>?</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setConfirmAction(null)} className="px-4 py-2 border border-[#2a2a4a] rounded-lg text-xs text-gray-400 hover:bg-[#1a1a3a]">{text.cancel}</button>
                    <button onClick={() => handleChangeRole(confirmAction.userId, 'user')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">{text.confirm}</button>
                  </div>
                </div>
              )}
              {/* Members table */}
              <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                      {[text.name, text.email, text.role, text.joined, text.actions].map(h => (
                        <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a1a3a]">
                      {teamMembers.map(m => (
                        <tr key={m.id} className="hover:bg-[#12122a]/50 transition">
                          <td className="px-4 py-3 font-medium text-gray-200">{m.full_name || EM_DASH}</td>
                          <td className="px-4 py-3 text-gray-400" dir="ltr">{m.email}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] border ${roleBadge(m.role)}`}>{roleLabel(m.role)}</span></td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(m.created_at)}</td>
                          <td className="px-4 py-3">
                            {m.role === 'super_admin' ? <span className="text-[10px] text-gray-600">{EM_DASH}</span>
                            : m.id === currentUserId ? <span className="text-[10px] text-gray-600">{locale === 'ar' ? 'أنت' : 'You'}</span>
                            : (
                              <div className="flex gap-1.5 flex-wrap">
                                {m.role !== 'admin' && <button onClick={() => handleChangeRole(m.id, 'admin')} className="px-2.5 py-1 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition">{text.makeAdmin}</button>}
                                {m.role !== 'support' && <button onClick={() => handleChangeRole(m.id, 'support')} className="px-2.5 py-1 text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md hover:bg-yellow-500/20 transition">{text.makeSupport}</button>}
                                <button onClick={() => setConfirmAction({ type: 'remove', userId: m.id, name: m.full_name || m.email })} className="px-2.5 py-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition">{text.demoteToUser}</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* âââ AUDIT TAB âââ */}
          {activeTab === 'audit' && isSuperAdmin && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{text.auditTitle}</h2>
                <button onClick={loadAudit} className="text-xs text-[#D4AF37] hover:underline">{text.refresh}</button>
              </div>
              {auditLoading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="bg-[#0e0e20] rounded-xl border border-[#1a1a3a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#12122a] border-b border-[#1a1a3a]"><tr>
                        {[text.timestamp, text.action, text.target, text.details, text.riskLevel].map(h => (
                          <th key={h} className="px-4 py-3 text-start font-medium text-gray-500">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-[#1a1a3a]">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-[#12122a]/50 transition">
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDateTime(log.created_at)}</td>
                            <td className="px-4 py-3 font-medium text-gray-200">{log.action?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 text-gray-400">{log.entity_type}: {log.entity_id?.substring(0, 8)}...</td>
                            <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.details ? (log.details.email || log.details.reason || JSON.stringify(log.details).substring(0, 80)) : EM_DASH}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${log.risk_level === 'high' ? 'bg-red-500/15 text-red-400' : log.risk_level === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{log.risk_level === 'high' ? text.high : log.risk_level === 'medium' ? text.medium : text.low}</span></td>
                          </tr>
                        ))}
                        {auditLogs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">{text.noAuditLogs}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
