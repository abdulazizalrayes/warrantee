import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://warrantee.io'
  const locales = ['en', 'ar']

  // Only include publicly accessible pages (no auth required)
  const publicPages = [
    { path: '', changeFreq: 'weekly' as const, priority: 1 },
    { path: '/about', changeFreq: 'monthly' as const, priority: 0.8 },
    { path: '/features', changeFreq: 'monthly' as const, priority: 0.8 },
    { path: '/pricing', changeFreq: 'monthly' as const, priority: 0.8 },
    { path: '/contact', changeFreq: 'monthly' as const, priority: 0.7 },
    { path: '/faq', changeFreq: 'monthly' as const, priority: 0.7 },
    { path: '/guide', changeFreq: 'monthly' as const, priority: 0.7 },
    { path: '/verify', changeFreq: 'monthly' as const, priority: 0.6 },
    { path: '/auth', changeFreq: 'monthly' as const, priority: 0.5 },
    { path: '/terms', changeFreq: 'yearly' as const, priority: 0.3 },
    { path: '/privacy', changeFreq: 'yearly' as const, priority: 0.3 },
    { path: '/cookies', changeFreq: 'yearly' as const, priority: 0.3 },
  ]

  // Auth-protected pages excluded from sitemap:
  // /dashboard, /warranties, /warranties/new, /seller, /admin, /settings, etc.
  // These redirect unauthenticated users to /auth, causing "Page with redirect" in GSC

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const page of publicPages) {
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFreq,
        priority: page.priority,
        alternates: {
          languages: {
            en: `${baseUrl}/en${page.path}`,
            ar: `${baseUrl}/ar${page.path}`,
          },
        },
      })
    }
  }

  return entries
}
