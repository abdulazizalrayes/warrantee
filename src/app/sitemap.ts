import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://warrantee.io'
  const locales = ['en', 'ar']
  const pages = [
    '',
    '/dashboard',
    '/warranties',
    '/warranties/new',
    '/auth',
    '/terms',
    '/privacy',
  ]

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const page of pages) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'weekly' : 'monthly',
        priority: page === '' ? 1 : page === '/dashboard' ? 0.9 : 0.7,
        alternates: {
          languages: {
            en: `${baseUrl}/en${page}`,
            ar: `${baseUrl}/ar${page}`,
          },
        },
      })
    }
  }

  return entries
}
