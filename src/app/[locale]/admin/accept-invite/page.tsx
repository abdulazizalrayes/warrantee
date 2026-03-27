'use client';

// Warrantee — Admin Invitation Acceptance Page
// Allows invited users to accept admin role

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

function AdminAcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRtl = locale === 'ar';
  const supabase = createSupabaseBrowserClient();

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(isRtl ? 'رابط دعوة غير صالح' : 'Invalid invitation link');
      setLoading(false);
      return;
    }

    async function loadInvitation() {
      const { data, error: fetchError } = await supabase
        .from('admin_invitations')
        .select('id, email, role, status, expires_at, invited_by_name')
        .eq('token', token)
        .single();

      if (fetchError || !data) {
        setError(isRtl ? 'الدعوة غير موجودة' : 'Invitation not found');
      } else if (data.status === 'accepted') {
        setError(isRtl ? 'تم قبول الدعوة مسبقاً' : 'Invitation already accepted');
      } else if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
        setError(isRtl ? 'انتهت صلاحية الدعوة' : 'Invitation has expired');
      } else {
        setInvitation(data);
      }
      setLoading(false);
    }

    loadInvitation();
  }, [token, isRtl, supabase]);

  const handleAccept = async () => {
    if (!invitation || !user) return;
    setAccepting(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: invitation.role })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await supabase
        .from('admin_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('id', invitation.id);

      setAccepted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAccepting(false);
    }
  };

  const roleLabels: Record<string, { en: string; ar: string }> = {
    admin: { en: 'Administrator', ar: 'مدير' },
    support: { en: 'Support Agent', ar: 'وكيل دعم' },
    super_admin: { en: 'Super Administrator', ar: 'مدير أعلى' },
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC' }}>
        <div style={{
          maxWidth: '440px', textAlign: 'center', padding: '48px',
          background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
            {isRtl ? 'خطأ' : 'Error'}
          </h2>
          <p style={{ color: '#64748B' }}>{error}</p>
          <a
            href={`/${locale}/auth`}
            style={{
              display: 'inline-block', marginTop: '20px', padding: '10px 24px',
              borderRadius: '8px', background: '#2563EB', color: 'white',
              textDecoration: 'none', fontWeight: 600, fontSize: '14px',
            }}
          >
            {isRtl ? 'تسجيل الدخول' : 'Sign In'}
          </a>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC' }}>
        <div style={{
          maxWidth: '440px', textAlign: 'center', padding: '48px',
          background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
            {isRtl ? 'تم القبول!' : 'Accepted!'}
          </h2>
          <p style={{ color: '#64748B', marginBottom: '24px' }}>
            {isRtl
              ? `تم ترقية حسابك إلى ${roleLabels[invitation?.role]?.ar || invitation?.role}. يمكنك الآن الوصول إلى لوحة الإدارة.`
              : `Your account has been upgraded to ${roleLabels[invitation?.role]?.en || invitation?.role}. You now have access to the admin panel.`}
          </p>
          <a
            href={`/${locale}/admin`}
            style={{
              display: 'inline-block', padding: '12px 32px', borderRadius: '8px',
              background: '#2563EB', color: 'white', textDecoration: 'none',
              fontWeight: 600, fontSize: '14px',
            }}
          >
            {isRtl ? 'الذهاب إلى لوحة الإدارة' : 'Go to Admin Panel'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: '#F8FAFC', padding: '24px',
    }}>
      <div style={{
        maxWidth: '480px', width: '100%', background: 'white',
        borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>Warrantee</h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>Trust the Terms™</p>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#0F172A' }}>
          {isRtl ? 'دعوة إدارية' : 'Admin Invitation'}
        </h2>

        <div style={{
          background: '#F0FDF4', borderRadius: '12px', padding: '20px', marginBottom: '24px',
          border: '1px solid #BBF7D0',
        }}>
          <p style={{ marginBottom: '8px' }}>
            {isRtl ? 'تمت دعوتك من قبل ' : 'You have been invited by '}
            <strong>{invitation?.invited_by_name || (isRtl ? 'مدير' : 'an administrator')}</strong>
            {isRtl
              ? ` للانضمام كـ ${roleLabels[invitation?.role]?.ar || invitation?.role}`
              : ` to join as ${roleLabels[invitation?.role]?.en || invitation?.role}`}
          </p>
          <p style={{ color: '#64748B', fontSize: '14px' }}>
            {isRtl ? 'البريد: ' : 'Email: '}{invitation?.email}
          </p>
        </div>

        {!user ? (
          <div>
            <p style={{ color: '#64748B', marginBottom: '16px' }}>
              {isRtl
                ? 'يرجى تسجيل الدخول لقبول الدعوة.'
                : 'Please sign in to accept this invitation.'}
            </p>
            <a
              href={`/${locale}/auth?redirect=/admin/accept-invite?token=${token}`}
              style={{
                display: 'block', textAlign: 'center', padding: '12px',
                borderRadius: '8px', background: '#2563EB', color: 'white',
                textDecoration: 'none', fontWeight: 600,
              }}
            >
              {isRtl ? 'تسجيل الدخول' : 'Sign In'}
            </a>
          </div>
        ) : (
          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{
              width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
              background: '#2563EB', color: 'white', fontSize: '16px',
              fontWeight: 600, cursor: accepting ? 'not-allowed' : 'pointer',
              opacity: accepting ? 0.7 : 1,
            }}
          >
            {accepting
              ? (isRtl ? 'جارٍ القبول...' : 'Accepting...')
              : (isRtl ? 'قبول الدعوة' : 'Accept Invitation')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminAcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>Loading...</div>
      </div>
    }>
      <AdminAcceptInviteContent />
    </Suspense>
  );
}
