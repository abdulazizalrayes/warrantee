'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const translations = {
  en: {
    title: 'Admin Portal',
    subtitle: 'Warrantee — Trust the Terms™',
    description: 'Sign in to access the admin dashboard',
    emailLabel: 'Admin Email',
    sendLink: 'Send Magic Link',
    sending: 'Sending...',
    sent: 'Magic link sent! Check your inbox.',
    error: 'Failed to send magic link. Please try again.',
    unauthorized: 'This email is not authorized for admin access.',
    footer: '© 2026 Warrantee. All rights reserved.',
    alreadyLoggedIn: 'You are already logged in.',
    goToAdmin: 'Go to Admin Dashboard',
  },
  ar: {
    title: 'بوابة المدير',
    subtitle: 'وارنتي — ثق بالشروط™',
    description: 'تسجيل الدخول للوصول إلى لوحة الإدارة',
    emailLabel: 'البريد الإلكتروني للمدير',
    sendLink: 'إرسال رابط الدخول',
    sending: 'جارٍ الإرسال...',
    sent: 'تم إرسال الرابط! تحقق من بريدك الإلكتروني.',
    error: 'فشل في إرسال الرابط. يرجى المحاولة مرة أخرى.',
    unauthorized: 'هذا البريد الإلكتروني غير مصرح له بالوصول.',
    footer: '© 2026 وارنتي. جميع الحقوق محفوظة.',
    alreadyLoggedIn: 'أنت مسجل الدخول بالفعل.',
    goToAdmin: 'الذهاب إلى لوحة الإدارة',
  },
};

export default function AdminLoginPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = translations[locale as keyof typeof translations] || translations.en;
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'unauthorized'>('idle');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          setIsLoggedIn(true);
        }
      }
      setChecking(false);
    };
    checkSession();
  }, []);

  const AUTHORIZED_ADMIN_EMAILS = ['abdulaziz.alrayes@gmail.com'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.toLowerCase().trim();

    if (!AUTHORIZED_ADMIN_EMAILS.includes(trimmed)) {
      setStatus('unauthorized');
      return;
    }

    setStatus('sending');

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/admin`,
      },
    });

    if (error) {
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(212, 175, 55, 0.3)',
          borderTopColor: '#D4AF37',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
      fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "'Inter', sans-serif",
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        padding: '48px 36px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Shield Icon */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37, #F5D76E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={{
            color: '#D4AF37',
            fontSize: '28px',
            fontWeight: '700',
            margin: '0 0 4px',
            letterSpacing: '-0.5px',
          }}>{t.title}</h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '13px',
            margin: '0 0 8px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>{t.subtitle}</p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '15px',
            margin: '0',
          }}>{t.description}</p>
        </div>

        {isLoggedIn ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#2ECC71', fontSize: '15px', marginBottom: '16px' }}>
              ✓ {t.alreadyLoggedIn}
            </p>
            <button
              onClick={() => router.push(`/${locale}/admin`)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #D4AF37, #C9A032)',
                color: '#1A1A2E',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                letterSpacing: '0.3px',
              }}
            >
              {t.goToAdmin}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
            }}>{t.emailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status !== 'idle') setStatus('idle'); }}
              placeholder="admin@example.com"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px',
                transition: 'border-color 0.2s',
              }}
            />

            <button
              type="submit"
              disabled={status === 'sending' || status === 'sent'}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: status === 'sent'
                  ? 'linear-gradient(135deg, #2ECC71, #27AE60)'
                  : 'linear-gradient(135deg, #D4AF37, #C9A032)',
                color: status === 'sent' ? '#FFFFFF' : '#1A1A2E',
                fontSize: '16px',
                fontWeight: '600',
                cursor: status === 'sending' || status === 'sent' ? 'not-allowed' : 'pointer',
                opacity: status === 'sending' ? 0.7 : 1,
                transition: 'all 0.2s',
                letterSpacing: '0.3px',
              }}
            >
              {status === 'sending' ? t.sending : status === 'sent' ? '✓ ' + t.sent : t.sendLink}
            </button>
          </form>
        )}

        {status === 'unauthorized' && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(231, 76, 60, 0.15)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            color: '#E74C3C',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            {t.unauthorized}
          </div>
        )}

        {status === 'error' && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(231, 76, 60, 0.15)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            color: '#E74C3C',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            {t.error}
          </div>
        )}
      </div>

      <p style={{
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: '12px',
        marginTop: '32px',
      }}>{t.footer}</p>
    </div>
  );
}
