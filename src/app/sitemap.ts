import { MetadataRoute } from 'next'
import { INDEXED_LOCALES } from '@/lib/i18n'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://warrantee.io'

  // Only include publicly accessible pages (no auth required)
  const publicPages = [
    { path: '', changeFreq: 'weekly' as const, priority: 1 },
    { path: '/about', changeFreq: 'monthly' as const, priority: 0.8 },
    { path: '/blog', changeFreq: 'weekly' as const, priority: 0.8 },
    { path: '/features', changeFreq: 'monthly' as const, priority: 0.8 },
    { path: '/pricing', changeFreq: 'monthly' as const, priority: 0.8 },
    { path: '/contact', changeFreq: 'monthly' as const, priority: 0.7 },
    { path: '/faq', changeFreq: 'monthly' as const, priority: 0.7 },
    { path: '/guide', changeFreq: 'monthly' as const, priority: 0.7 },
    { path: '/api-docs', changeFreq: 'monthly' as const, priority: 0.7 },
    { path: '/support', changeFreq: 'monthly' as const, priority: 0.6 },
    { path: '/verify', changeFreq: 'monthly' as const, priority: 0.6 },
    { path: '/terms', changeFreq: 'yearly' as const, priority: 0.3 },
    { path: '/privacy', changeFreq: 'yearly' as const, priority: 0.3 },
    { path: '/cookies', changeFreq: 'yearly' as const, priority: 0.3 },
  ]

  // Auth-protected pages excluded from sitemap:
  // /dashboard, /warranties, /warranties/new, /seller, /admin, /settings, etc.
  // These redirect unauthenticated users to /auth, causing "Page with redirect" in GSC

  const entries: MetadataRoute.Sitemap = []

  for (const locale of INDEXED_LOCALES) {
    for (const page of publicPages) {
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        changeFrequency: page.changeFreq,
        priority: page.priority,
        alternates: {
          languages: {
            en: `${baseUrl}/en${page.path}`,
            'en-US': `${baseUrl}/en${page.path}`,
            ar: `${baseUrl}/ar${page.path}`,
            'ar-SA': `${baseUrl}/ar${page.path}`,
            'x-default': `${baseUrl}/en${page.path}`,
          },
        },
      })
    }
  }

  return entries
}
