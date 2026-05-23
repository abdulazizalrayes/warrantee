import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata('blog', locale);
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
