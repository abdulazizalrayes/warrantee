import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata('faq', locale);
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
