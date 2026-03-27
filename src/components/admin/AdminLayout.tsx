'use client';

// Warrantee — Mobile-Responsive Admin Layout
// Wraps all admin pages with responsive sidebar and header
// Collapses sidebar to hamburger menu on mobile

import { useState, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
  tabs: Array<{
    id: string;
    label: string;
    labelAr: string;
    icon: string;
    href: string;
  }>;
}

export default function AdminLayout({ children, tabs }: AdminLayoutProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRtl = locale === 'ar';
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  const sidebarWidth = isMobile ? '280px' : '260px';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Overlay (mobile) */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 40, transition: 'opacity 0.2s',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth,
        background: '#0F172A',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 50,
        transform: isMobile && !sidebarOpen ? `translateX(${isRtl ? '100%' : '-100%'})` : 'translateX(0)',
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Warrantee</h1>
          <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>
            {isRtl ? 'لوحة الإدارة' : 'Admin Panel'}
          </p>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px' }}>
          {tabs.map((tab) => {
            const isActive = pathname?.includes(tab.href) ||
              (tab.id === 'dashboard' && pathname?.endsWith('/admin'));
            return (
              <a
                key={tab.id}
                href={`/${locale}/admin${tab.href}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '4px',
                  textDecoration: 'none', fontSize: '14px',
                  color: isActive ? 'white' : '#94A3B8',
                  background: isActive ? 'rgba(37,99,235,0.2)' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{tab.icon}</span>
                <span>{isRtl ? tab.labelAr : tab.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginInlineStart: isMobile ? 0 : undefined,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top Bar (mobile hamburger + breadcrumb) */}
        <header style={{
          background: 'white',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '24px', padding: '4px', lineHeight: 1,
                color: '#374151',
              }}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          )}
          <div style={{ fontSize: '14px', color: '#64748B' }}>
            {isRtl ? 'لوحة الإدارة' : 'Admin Panel'}
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: isMobile ? '16px' : '24px',
          overflowX: 'hidden',
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
