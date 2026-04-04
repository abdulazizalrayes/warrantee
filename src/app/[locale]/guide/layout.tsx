import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata('guide', locale);
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
