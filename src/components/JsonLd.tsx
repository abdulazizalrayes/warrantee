export default function JsonLd({ locale }: { locale: string }) {
  const isArabic = locale === 'ar'
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Warrantee',
    alternateName: isArabic ? '\u0636\u0645\u0627\u0646\u062A\u064A' : 'Warrantee - Trust the Terms',
    description: isArabic
      ? '\u0645\u0646\u0635\u0629 \u0631\u0642\u0645\u064A\u0629 \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A \u0641\u064A \u0627\u0644\u0634\u0631\u0642 \u0627\u0644\u0623\u0648\u0633\u0637'
      : 'Digital warranty management platform for the Middle East',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SAR',
    },
    author: {
      '@type': 'Organization',
      name: 'Warrantee',
      url: 'https://warrantee.sa',
    },
    inLanguage: [locale],
    availableLanguage: ['en', 'ar'],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
