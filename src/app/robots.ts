import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/dashboard/',
          '/*/dashboard',
          '/*/warranties/',
          '/*/warranties',
          '/*/seller/',
          '/*/seller',
          '/*/admin/',
          '/*/admin',
          '/*/settings/',
          '/*/settings',
          '/*/billing/',
          '/*/billing',
          '/*/notifications/',
          '/*/notifications',
          '/*/onboarding/',
          '/*/onboarding',
          '/*/approval/',
          '/*/approval',
          '/*/reports/',
          '/*/reports',
          '/*/analytics/',
          '/*/analytics',
          '/*/documents/',
          '/*/documents',
          '/*/reset-password/',
          '/*/reset-password',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
      },
    ],
    sitemap: 'https://warrantee.io/sitemap.xml',
  }
}
