'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { trackContactForm } from '@/lib/ga4-events';
import { PageViewTracker } from '@/components/PageViewTracker';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { getDictionary, normalizeLocale } from '@/lib/i18n';

export default function ContactPage() {
  const params = useParams() ?? {};
  const locale = normalizeLocale(String(params.locale || 'en'));
  const isRTL = locale === 'ar';
  const dictionary = getDictionary(locale);
  const copy = isRTL
    ? {
        sentTitle: 'تم إرسال الرسالة',
        sentBody: 'شكرًا لتواصلك معنا. سنعود إليك خلال 24 ساعة عمل.',
        home: 'العودة للرئيسية',
        error: 'تعذر إرسال النموذج الآن. يمكنك مراسلتنا مباشرة على hello@warrantee.io.',
        title: 'تواصل معنا',
        subtitle: 'لديك سؤال أو تحتاج مساعدة أو ترغب بمعرفة المزيد؟ يسعدنا التواصل معك.',
        email: 'البريد الإلكتروني',
        emailHint: 'للاستفسارات العامة والدعم',
        chat: 'المحادثة المباشرة',
        chatHint: 'متاحة خلال ساعات العمل',
        comingSoon: 'قريبًا',
        formTitle: 'أرسل لنا رسالة',
        name: 'الاسم الكامل *',
        namePlaceholder: 'اسمك',
        company: 'الشركة',
        companyPlaceholder: 'اسم الشركة (اختياري)',
        subject: 'الموضوع *',
        message: 'الرسالة *',
        messagePlaceholder: 'أخبرنا كيف يمكننا مساعدتك...',
        sending: 'جارٍ الإرسال...',
        submit: 'إرسال الرسالة',
        subjects: {
          general: 'استفسار عام',
          support: 'دعم فني',
          partnership: 'استفسار شراكة',
          enterprise: 'الشركات / طلب عرض توضيحي',
          api: 'العلامة البيضاء / API',
          press: 'الصحافة / الإعلام',
        },
      }
    : {
        sentTitle: 'Message Sent!',
        sentBody: "Thank you for reaching out. We'll get back to you within 24 business hours.",
        home: 'Back to Home',
        error: 'We could not submit the form right now. You can still email hello@warrantee.io directly.',
        title: 'Contact Us',
        subtitle: "Have a question, need help, or want to learn more? We'd love to hear from you.",
        email: 'Email',
        emailHint: 'General inquiries and support',
        chat: 'Live Chat',
        chatHint: 'Available during business hours',
        comingSoon: 'Coming soon',
        formTitle: 'Send Us a Message',
        name: 'Full Name *',
        namePlaceholder: 'Your name',
        company: 'Company',
        companyPlaceholder: 'Company name (optional)',
        subject: 'Subject *',
        message: 'Message *',
        messagePlaceholder: 'Tell us how we can help...',
        sending: 'Sending...',
        submit: 'Send Message',
        subjects: {
          general: 'General Inquiry',
          support: 'Technical Support',
          partnership: 'Partnership Inquiry',
          enterprise: 'Enterprise / Demo Request',
          api: 'White Label / API',
          press: 'Press / Media',
        },
      };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'general',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error('Unable to submit form');
      }
      trackContactForm(formData.subject);
      setSubmitted(true);
    } catch {
      setError(copy.error);
      window.location.href = `mailto:hello@warrantee.io?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(formData.message)}`;
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
        <Navbar locale={locale} dictionary={dictionary} />
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-20">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[#0071e3]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="w-8 h-8 text-[#0071e3]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1d1d1f] mb-4">{copy.sentTitle}</h1>
            <p className="text-[#6e6e73] mb-8">
              {copy.sentBody}
            </p>
            <a
              href={`/${locale}`}
              className="px-8 py-3 bg-[#0071e3] text-white font-semibold rounded-full hover:bg-[#0077ED] transition-all inline-block"
            >
              {copy.home}
            </a>
          </div>
        </main>
        <Footer locale={locale} dictionary={dictionary} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <Navbar locale={locale} dictionary={dictionary} />
      <PageViewTracker pageName="contact_page" pageType="marketing" locale={locale} />
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-center bg-[#fbfbfd]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-navy tracking-tight mb-4">{copy.title}</h1>
          <p className="text-xl text-navy/60">
            {copy.subtitle}
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border-2 border-[#0071e3]/20 p-8 text-center hover:border-[#0071e3]/40 transition-colors">
            <Mail className="w-10 h-10 text-[#0071e3] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-navy mb-2">{copy.email}</h3>
            <p className="text-navy/60 text-sm mb-3">{copy.emailHint}</p>
            <a href="mailto:hello@warrantee.io" className="text-[#0071e3] font-semibold hover:underline">
              hello@warrantee.io
            </a>
          </div>
          <div className="bg-white rounded-2xl border-2 border-navy/10 p-8 text-center hover:border-navy/20 transition-colors">
            <MessageCircle className="w-10 h-10 text-navy/40 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-navy mb-2">{copy.chat}</h3>
            <p className="text-navy/60 text-sm mb-3">{copy.chatHint}</p>
            <span className="text-navy/40 font-semibold text-sm">{copy.comingSoon}</span>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-navy mb-6">{copy.formTitle}</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-navy/5 p-8 space-y-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">{copy.name}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 text-sm"
                  placeholder={copy.namePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">{copy.email} *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 text-sm"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">{copy.company}</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 text-sm"
                  placeholder={copy.companyPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">{copy.subject}</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 text-sm"
                >
                  <option value="general">{copy.subjects.general}</option>
                  <option value="support">{copy.subjects.support}</option>
                  <option value="partnership">{copy.subjects.partnership}</option>
                  <option value="enterprise">{copy.subjects.enterprise}</option>
                  <option value="api">{copy.subjects.api}</option>
                  <option value="press">{copy.subjects.press}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">{copy.message}</label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 text-sm resize-vertical"
                placeholder={copy.messagePlaceholder}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-[#0071e3] text-white font-semibold rounded-full hover:bg-[#0077ED] transition-all inline-flex items-center gap-2"
            >
              {submitting ? copy.sending : copy.submit}
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
