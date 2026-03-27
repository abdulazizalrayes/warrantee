'use client';

// Warrantee — Seller Invitation Acceptance Page
// Validates token and lets seller accept the invitation

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface InvitationData {
  invitation_id: string;
  seller_email: string;
  seller_name: string | null;
  inviter_name: string;
  status: string;
}

function AcceptSellerInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRtl = locale === 'ar';

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
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
    fetch(`/api/invitations/seller/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Invalid invitation');
        }
        return res.json();
      })
      .then((data) => setInvitation(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, isRtl]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/invitations/seller/${token}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to accept');
      }
      setAccepted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          maxWidth: '440px', textAlign: 'center', padding: '48px',
          background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
            {isRtl ? 'خطأ في الدعوة' : 'Invitation Error'}
          </h2>
          <p style={{ color: '#64748B' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          maxWidth: '440px', textAlign: 'center', padding: '48px',
          background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
            {isRtl ? 'مرحباً بك في Warrantee!' : 'Welcome to Warrantee!'}
          </h2>
          <p style={{ color: '#64748B', marginBottom: '24px' }}>
            {isRtl
              ? 'تم قبول دعوتك بنجاح. يمكنك الآن إدارة ضمانات منتجاتك.'
              : 'Your invitation has been accepted. You can now manage your product warranties.'}
          </p>
          <a
            href={`/${locale}/dashboard`}
            style={{
              display: 'inline-block', padding: '12px 32px', borderRadius: '8px',
              background: '#2563EB', color: 'white', textDecoration: 'none',
              fontWeight: 600, fontSize: '14px',
            }}
          >
            {isRtl ? 'الذهاب إلى لوحة التحكم' : 'Go to Dashboard'}
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
          {isRtl ? 'دعوة بائع' : 'Seller Invitation'}
        </h2>

        <div style={{
          background: '#F0F9FF', borderRadius: '12px', padding: '20px', marginBottom: '24px',
          border: '1px solid #BAE6FD',
        }}>
          <p style={{ marginBottom: '12px', color: '#0369A1' }}>
            <strong>{invitation?.inviter_name}</strong>
            {isRtl
              ? ' دعاك للانضمام إلى Warrantee كبائع.'
              : ' has invited you to join Warrantee as a seller.'}
          </p>
          {invitation?.seller_name && (
            <p style={{ color: '#64748B', fontSize: '14px' }}>
              {isRtl ? 'الاسم: ' : 'Name: '}{invitation.seller_name}
            </p>
          )}
          <p style={{ color: '#64748B', fontSize: '14px' }}>
            {isRtl ? 'البريد: ' : 'Email: '}{invitation?.seller_email}
          </p>
        </div>

        {!user ? (
          <div>
            <p style={{ color: '#64748B', marginBottom: '16px' }}>
              {isRtl
                ? 'يرجى تسجيل الدخول أو إنشاء حساب لقبول الدعوة.'
                : 'Please sign in or create an account to accept this invitation.'}
            </p>
            <a
              href={`/${locale}/auth?redirect=/seller/accept-invite?token=${token}`}
              style={{
                display: 'block', textAlign: 'center', padding: '12px',
                borderRadius: '8px', background: '#2563EB', color: 'white',
                textDecoration: 'none', fontWeight: 600,
              }}
            >
              {isRtl ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}
            </a>
          </div>
        ) : (
          <div>
            <p style={{ color: '#64748B', marginBottom: '20px' }}>
              {isRtl
                ? 'بقبول هذه الدعوة، سيتم ترقية حسابك إلى حساب بائع ويمكنك إدارة ضمانات عملائك.'
                : 'By accepting this invitation, your account will be upgraded to a seller account and you can manage your customer warranties.'}
            </p>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptSellerInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>Loading...</div>
      </div>
    }>
      <AcceptSellerInviteContent />
    </Suspense>
  );
}
