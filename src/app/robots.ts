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
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/api/mcp'],
        disallow: ['/api/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/api/mcp'],
        disallow: ['/api/'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', '/api/mcp'],
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://warrantee.io/sitemap.xml',
  }
}
