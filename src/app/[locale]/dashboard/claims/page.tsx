// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const STATUSES = ['all','draft','submitted','under_review','awaiting_info','approved','rejected','resolved','closed'];
const statusCfg: Record<string,{l:string;a:string;bg:string;tx:string}> = {
  draft:{l:'Draft',a:'ÙØ³ÙØ¯Ø©',bg:'bg-gray-100',tx:'text-gray-700'},
  submitted:{l:'Submitted',a:'ÙÙØ¯Ù',bg:'bg-blue-100',tx:'text-blue-700'},
  under_review:{l:'Under Review',a:'ÙÙØ¯ Ø§ÙÙØ±Ø§Ø¬Ø¹Ø©',bg:'bg-yellow-100',tx:'text-yellow-700'},
  awaiting_info:{l:'Awaiting Info',a:'Ø¨Ø§ÙØªØ¸Ø§Ø± ÙØ¹ÙÙÙØ§Øª',bg:'bg-orange-100',tx:'text-orange-700'},
  approved:{l:'Approved',a:'ÙÙØ§ÙÙ Ø¹ÙÙÙ',bg:'bg-green-100',tx:'text-green-700'},
  rejected:{l:'Rejected',a:'ÙØ±ÙÙØ¶',bg:'bg-red-100',tx:'text-red-700'},
  resolved:{l:'Resolved',a:'ØªÙ Ø§ÙØ­Ù',bg:'bg-emerald-100',tx:'text-emerald-700'},
  closed:{l:'Closed',a:'ÙØºÙÙ',bg:'bg-slate-100',tx:'text-slate-700'},
  open:{l:'Open',a:'ÙÙØªÙØ­',bg:'bg-blue-100',tx:'text-blue-700'},
  in_progress:{l:'In Progress',a:'Ø¬Ø§Ø±Ù',bg:'bg-yellow-100',tx:'text-yellow-700'},
};
const sevCfg: Record<string,{l:string;c:string}> = {low:{l:'Low',c:'text-green-600'},medium:{l:'Medium',c:'text-yellow-600'},high:{l:'High',c:'text-orange-600'},critical:{l:'Critical',c:'text-red-600'}};

export default function ClaimsListPage() {
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'en';
  const isRTL = locale === 'ar';
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pg, setPg] = useState(0);
  const PS = 20;
  const t = isRTL
    ? {title:'Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª',search:'Ø¨Ø­Ø«...',none:'ÙØ§ ØªÙØ¬Ø¯ ÙØ·Ø§ÙØ¨Ø§Øª',noneD:'ÙÙ ÙØªÙ Ø§ÙØ¹Ø«ÙØ± Ø¹ÙÙ ÙØ·Ø§ÙØ¨Ø§Øª',empty:'ÙØ§ ØªÙØ¬Ø¯ ÙØ·Ø§ÙØ¨Ø§Øª Ø¨Ø¹Ø¯',emptyD:'Ø³ØªØ¸ÙØ± ÙØ·Ø§ÙØ¨Ø§ØªÙ ÙÙØ§',war:'Ø§ÙØ¶ÙØ§Ù',sev:'Ø§ÙØ®Ø·ÙØ±Ø©',filed:'ØªØ§Ø±ÙØ®',stat:'Ø§ÙØ­Ø§ÙØ©',prev:'Ø§ÙØ³Ø§Ø¨Ù',next:'Ø§ÙØªØ§ÙÙ',back:'Ø§ÙØ¹ÙØ¯Ø©',all:'Ø§ÙÙÙ',err:'Ø­Ø¯Ø« Ø®Ø·Ø£',retry:'Ø¥Ø¹Ø§Ø¯Ø©'}
    : {title:t.claims.title,search:'Search claims...',none:t.claims.no_claims,noneD:'No claims match your filters.',empty:t.claims.no_claims,emptyD:'File a claim from a warranty to see it here.',war:'Warranty',sev:'Severity',filed:'Filed',stat:'Status',prev:t.common.previous,next:t.common.next,back:t.common.back,all:t.common.all,err:t.common.error,retry:t.common.retry};
  const load = async () => {
    setLoading(true); setError('');
    try {
      let q = supabase.from('warranty_claims').select('*, warranty:warranties(id,product_name,product_name_ar,reference_number)').order('created_at',{ascending:false}).range(pg*PS,(pg+1)*PS-1);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (search.trim()) q = q.or('title.ilike.%'+search+'%,claim_number.ilike.%'+search+'%');
      const { data, error: e } = await q;
      if (e) throw e;
      setClaims(data || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusFilter, pg]);
  useEffect(() => { const tm = setTimeout(() => { setPg(0); load(); }, 300); return () => clearTimeout(tm); }, [search]);
  const fmtD = (d: string) => d ? new Date(d).toLocaleDateString(isRTL?'ar-SA':'en-US',{year:'numeric',month:'short',day:'numeric'}) : '-';
  const Badge = ({s}: {s:string}) => { const c = statusCfg[s]||statusCfg.draft; return <span className={'px-2.5 py-1 rounded-full text-xs font-medium '+c.bg+' '+c.tx}>{isRTL?c.a:c.l}</span>; };
  if (error) return (<div className="min-h-[60vh] flex items-center justify-center" dir={isRTL?'rtl':'ltr'}><div className="text-center"><p className="text-red-600 mb-2">{t.err}</p><p className="text-sm text-gray-500 mb-4">{error}</p><button onClick={load} className="px-4 py-2 bg-[#4169E1] text-white rounded-lg text-sm">{t.retry}</button></div></div>);
  return (
    <div className="max-w-6xl mx-auto px-4 py-6" dir={isRTL?'rtl':'ltr'}>
      <div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-bold text-[#1A1A2E]">{t.title}</h1><Link href={'/'+locale+'/dashboard'} className="text-sm text-[#4169E1] hover:underline">{t.back}</Link></div></div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="text" placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4169E1]/20 focus:border-[#4169E1]" />
        <div className="flex gap-1.5 overflow-x-auto pb-1">{STATUSES.map(s=>(<button key={s} onClick={()=>{setStatusFilter(s);setPg(0);}} className={'px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition '+(statusFilter===s?'bg-[#4169E1] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{s==='all'?t.all:(isRTL?statusCfg[s]?.a:statusCfg[s]?.l)||s}</button>))}</div>
      </div>
      {loading?(<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full"/></div>):claims.length===0?(<div className="text-center py-20 bg-white rounded-2xl border border-gray-100"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div><p className="text-gray-900 font-medium mb-1">{search||statusFilter!=='all'?t.none:t.empty}</p><p className="text-sm text-gray-500 max-w-md mx-auto">{search||statusFilter!=='all'?t.noneD:t.emptyD}</p></div>):(<><div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"><div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider"><div className="col-span-4">{t.title}</div><div className="col-span-3">{t.war}</div><div className="col-span-1">{t.sev}</div><div className="col-span-2">{t.stat}</div><div className="col-span-2">{t.filed}</div></div>{claims.map((c:any)=>(<Link key={c.id} href={'/'+locale+'/dashboard/claims/'+c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition items-center"><div className="col-span-4"><p className="font-medium text-[#1A1A2E] text-sm">{c.title}</p><p className="text-xs text-gray-400 font-mono">{c.claim_number}</p></div><div className="col-span-3 text-sm text-gray-600 truncate">{isRTL?c.warranty?.product_name_ar:c.warranty?.product_name||c.warranty?.product_name_ar||'-'}</div><div className="col-span-1">{c.severity&&<span className={'text-xs font-medium '+(sevCfg[c.severity]?.c||'text-gray-500')}>{sevCfg[c.severity]?.l||c.severity}</span>}</div><div className="col-span-2"><Badge s={c.status}/></div><div className="col-span-2 text-sm text-gray-500">{fmtD(c.created_at)}</div></Link>))}</div><div className="flex items-center justify-between mt-4"><button onClick={()=>setPg(p=>Math.max(0,p-1))} disabled={pg===0} className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-40">{t.prev}</button><span className="text-sm text-gray-500">{pg+1}</span><button onClick={()=>setPg(p=>p+1)} disabled={claims.length<PS} className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-40">{t.next}</button></div></>)}
    </div>);
}
