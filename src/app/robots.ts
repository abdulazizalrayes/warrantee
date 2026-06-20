import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/api/mcp',
          '/api/health',
        ],
        disallow: [
          '/api/',
          '/en/admin',
          '/ar/admin',
          '/en/dashboard',
          '/ar/dashboard',
          '/en/settings',
          '/ar/settings',
          '/en/billing',
          '/ar/billing',
          '/en/documents',
          '/ar/documents',
          '/en/notifications',
          '/ar/notifications',
          '/en/warranties',
          '/ar/warranties',
          '/en/claims',
          '/ar/claims',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/api/mcp'],
        disallow: ['/api/', '/en/admin', '/ar/admin', '/en/dashboard', '/ar/dashboard'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/api/mcp'],
        disallow: ['/api/', '/en/admin', '/ar/admin', '/en/dashboard', '/ar/dashboard'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', '/api/mcp'],
        disallow: ['/api/', '/en/admin', '/ar/admin', '/en/dashboard', '/ar/dashboard'],
      },
    ],
    sitemap: 'https://warrantee.io/sitemap.xml',
  }
}
