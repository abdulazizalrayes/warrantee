'use client';\n\n// Warrantee — Mobile-Responsive Admin Layout\n// Wraps all admin pages with responsive sidebar and header\n// Collapses sidebar to hamburger menu on mobile\n\nimport { useState, useEffect } from 'react';\nimport { usePathname } from 'next/navigation';\nimport { useI18n } from '@/lib/i18n';\n\ninterface AdminLayoutProps {\n  children: React.ReactNode;\n  tabs: Array<{\n    id: string;\n    label: string;\n    labelAr: string;\n    icon: string;\n    href: string;\n  }>;\n}\n\nexport default function AdminLayout({ children, tabs }: AdminLayoutProps) {\n  const { locale } = useI18n();\n  const isRtl = locale === 'ar';\n  const pathname = usePathname();\n  const [sidebarOpen, setSidebarOpen] = useState(false);\n  const [isMobile, setIsMobile] = useState(false);\n\n  useEffect(() => {\n    const checkMobile = () => setIsMobile(window.innerWidth < 768);\n    checkMobile();\n    window.addEventListener('resize', checkMobile);\n    return () => window.removeEventListener('resize', checkMobile);\n  }, []);\n\n  // Close sidebar when navigating on mobile\n  useEffect(() => {\n    if (isMobile) setSidebarOpen(false);\n  }, [pathname, isMobile]);\n\n  const sidebarWidth = isMobile ? '280px' : '260px';\n\n  return (\n    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>\n      {/* Overlay (mobile) */}\n      {isMobile && sidebarOpen && (\n        <div\n          onClick={() => setSidebarOpen(false)}\n          style={{\n            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',\n            zIndex: 40, transition: 'opacity 0.2s',\n          }}\n        />\n      )}\n\n      {/* Sidebar */}\n      <aside style={{\n        width: sidebarWidth,\n        background: '#0F172A',\n        color: 'white',\n        display: 'flex',\n        flexDirection: 'column',\n        position: isMobile ? 'fixed' : 'sticky',\n        top: 0,\n        height: '100vh',\n        zIndex: 50,\n        transform: isMobile && !sidebarOpen ? `translateX(${isRtl ? '100%' : '-100%'})` : 'translateX(0)',\n        transition: 'transform 0.3s ease',\n        overflowY: 'auto',\n      }}>\n        {/* Logo */}\n        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>\n          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Warrantee</h1>\n          <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>\n            {isRtl ? 'لوحة الإدارة' : 'Admin Panel'}\n          </p>\n        </div>\n\n        {/* Nav Items */}\n        <nav style={{ flex: 1, padding: '12px' }}>\n          {tabs.map((tab) => {\n            const isActive = pathname?.includes(tab.href) ||\n              (tab.id === 'dashboard' && pathname?.endsWith('/admin'));\n            return (\n              <a\n                key={tab.id}\n                href={`/${locale}/admin${tab.href}`}\n                style={{\n                  display: 'flex', alignItems: 'center', gap: '12px',\n                  padding: '10px 14px', borderRadius: '8px', marginBottom: '4px',\n                  textDecoration: 'none', fontSize: '14px',\n                  color: isActive ? 'white' : '#94A3B8',\n                  background: isActive ? 'rgba(37,99,235,0.2)' : 'transparent',\n                  transition: 'background 0.15s, color 0.15s',\n                }}\n              >\n                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{tab.icon}</span>\n                <span>{isRtl ? tab.labelAr : tab.label}</span>\n              </a>\n            );\n          })}\n        </nav>\n      </aside>\n\n      {/* Main Content */}\n      <main style={{\n        flex: 1,\n        marginInlineStart: isMobile ? 0 : undefined,\n        minWidth: 0,\n        display: 'flex',\n        flexDirection: 'column',\n      }}>\n        {/* Top Bar (mobile hamburger + breadcrumb) */}\n        <header style={{\n          background: 'white',\n          borderBottom: '1px solid #E2E8F0',\n          padding: '12px 20px',\n          display: 'flex',\n          alignItems: 'center',\n          gap: '12px',\n          position: 'sticky',\n          top: 0,\n          zIndex: 30,\n        }}>\n          {isMobile && (\n            <button\n              onClick={() => setSidebarOpen(!sidebarOpen)}\n              style={{\n                background: 'none', border: 'none', cursor: 'pointer',\n                fontSize: '24px', padding: '4px', lineHeight: 1,\n                color: '#374151',\n              }}\n              aria-label="Toggle menu"\n            >\n              ☰\n            </button>\n          )}\n          <div style={{ fontSize: '14px', color: '#64748B' }}>\n            {isRtl ? 'لوحة الإدارة' : 'Admin Panel'}\n          </div>\n        </header>\n\n        {/* Page Content */}\n        <div style={{\n          flex: 1,\n          padding: isMobile ? '16px' : '24px',\n          overflowX: 'hidden',\n        }}>\n          {children}\n        </div>\n      </main>\n    </div>\n  );\n}\n
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
                                      <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Warrantee</h1>h1>
                                      <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>
                                        {isRtl ? 'لوحة الإدارة' : 'Admin Panel'}
                                      </p>p>
                          </div>div>

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
                                                      <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{tab.icon}</span>span>
                                                      <span>{isRtl ? tab.labelAr : tab.label}</span>span>
                                      </a>a>
                                    );
        })}
                          </nav>nav>
                </aside>aside>
        
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
                      </button>button>
                                )}
                                <div style={{ fontSize: '14px', color: '#64748B' }}>
                                  {isRtl ? 'لوحة الإدارة' : 'Admin Panel'}
                                </div>div>
                      </header>header>
              
                {/* Page Content */}
                      <div style={{
                    flex: 1,
                    padding: isMobile ? '16px' : '24px',
                    overflowX: 'hidden',
        }}>
                        {children}
                      </div>div>
              </main>main>
        </div>div>
      );
}</a>
