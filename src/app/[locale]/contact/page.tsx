'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { trackContactForm } from '@/lib/ga4-events';

export default function ContactPage() {
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
      trackContactForm();
      setSubmitted(true);
    } catch {
      setError('We could not submit the form right now. You can still email hello@warrantee.io directly.');
      window.location.href = `mailto:hello@warrantee.io?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(formData.message)}`;
    } finally {
      setSubmitting(false);
    }
  }

  // const locale = 'en'; // hardcoded English only for now

  if (submitted) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-3xl font-bold text-navy mb-4">Message Sent!</h1>
          <p className="text-navy/60 mb-8">
            Thank you for reaching out. We&apos;ll get back to you within 24 business hours.
          </p>
          <a
            href="/en"
            className="px-8 py-3 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/90 transition-all inline-block"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-gold/5 to-transparent">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-navy tracking-tight mb-4">Contact Us</h1>
          <p className="text-xl text-navy/60">
            Have a question, need help, or want to learn more? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border-2 border-gold/20 p-8 text-center hover:border-gold/40 transition-colors">
            <Mail className="w-10 h-10 text-gold mx-auto mb-4" />
            <h3 className="font-bold text-lg text-navy mb-2">Email</h3>
            <p className="text-navy/60 text-sm mb-3">General inquiries and support</p>
            <a href="mailto:hello@warrantee.io" className="text-gold font-semibold hover:underline">
              hello@warrantee.io
            </a>
          </div>
          <div className="bg-white rounded-2xl border-2 border-navy/10 p-8 text-center hover:border-navy/20 transition-colors">
            <MessageCircle className="w-10 h-10 text-navy/40 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-navy mb-2">Live Chat</h3>
            <p className="text-navy/60 text-sm mb-3">Available during business hours</p>
            <span className="text-navy/40 font-semibold text-sm">Coming soon</span>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-navy mb-6">Send Us a Message</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-navy/5 p-8 space-y-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  placeholder="Company name (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Subject *</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                >
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="partnership">Partnership Inquiry</option>
                  <option value="enterprise">Enterprise / Demo Request</option>
                  <option value="api">White Label / API</option>
                  <option value="press">Press / Media</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Message *</label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-navy/10 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm resize-vertical"
                placeholder="Tell us how we can help..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/90 transition-all inline-flex items-center gap-2"
            >
              {submitting ? 'Sending...' : 'Send Message'}
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
