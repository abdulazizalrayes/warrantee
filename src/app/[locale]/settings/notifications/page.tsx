'use client';

// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell, MessageCircle, Mail, Smartphone, Save, CheckCircle2 } from 'lucide-react';

const translations = {
  en: {
    title: 'Notification Settings',
    subtitle: 'Configure how you receive warranty notifications',
    back: 'Back to Dashboard',
    emailNotifications: 'Email Notifications',
    emailDesc: 'Receive warranty alerts via email',
    whatsappNotifications: 'WhatsApp Notifications',
    whatsappDesc: 'Receive warranty alerts via WhatsApp',
    pushNotifications: 'Push Notifications',
    pushDesc: 'Receive browser push notifications',
    phoneNumber: 'WhatsApp Phone Number',
    phonePlaceholder: '+966XXXXXXXXX',
    expiryReminders: 'Expiry Reminders',
    expiryDays: 'Days before expiry',
    claimUpdates: 'Claim Updates',
    weeklyDigest: 'Weekly Digest',
    save: 'Save Settings',
    saved: 'Settings saved!',
    whatsappStatus: 'WhatsApp Status',
    configured: 'Configured',
    notConfigured: 'Not Configured - Contact admin to set up Twilio',
  },
  ar: {
    title: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',
    subtitle: '\u062a\u0643\u0648\u064a\u0646 \u0637\u0631\u064a\u0642\u0629 \u0627\u0633\u062a\u0644\u0627\u0645 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    emailNotifications: '\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0628\u0631\u064a\u062f',
    emailDesc: '\u0627\u0633\u062a\u0644\u0627\u0645 \u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f',
    whatsappNotifications: '\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0648\u0627\u062a\u0633\u0627\u0628',
    whatsappDesc: '\u0627\u0633\u062a\u0644\u0627\u0645 \u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628',
    pushNotifications: '\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u062f\u0641\u0639',
    pushDesc: '\u0627\u0633\u062a\u0644\u0627\u0645 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u062a\u0635\u0641\u062d',
    phoneNumber: '\u0631\u0642\u0645 \u0648\u0627\u062a\u0633\u0627\u0628',
    phonePlaceholder: '+966XXXXXXXXX',
    expiryReminders: '\u062a\u0630\u0643\u064a\u0631\u0627\u062a \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621',
    expiryDays: '\u0623\u064a\u0627\u0645 \u0642\u0628\u0644 \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621',
    claimUpdates: '\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
    weeklyDigest: '\u0645\u0644\u062e\u0635 \u0623\u0633\u0628\u0648\u0639\u064a',
    save: '\u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
    saved: '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a!',
    whatsappStatus: '\u062d\u0627\u0644\u0629 \u0648\u0627\u062a\u0633\u0627\u0628',
    configured: '\u0645\u0643\u0648\u0646',
    notConfigured: '\u063a\u064a\u0631 \u0645\u0643\u0648\u0646 - \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0633\u0624\u0648\u0644',
  }
};

export default function NotificationSettingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [claimUpdates, setClaimUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [saved, setSaved] = useState(false);
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/notifications/whatsapp')
      .then(r => r.json())
      .then(d => setWhatsappConfigured(d.configured))
      .catch(() => {});
  }, []);

  const handleSave = () => {
    // Save to localStorage for now (would be Supabase in production)
    const settings = { emailEnabled, whatsappEnabled, pushEnabled, phone, expiryDays, claimUpdates, weeklyDigest };
    try { window.localStorage?.setItem('notification_settings', JSON.stringify(settings)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!enabled)} className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[#4169E1]' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 ${enabled ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full shadow transition-all`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/${locale}/dashboard`} className="text-[#4169E1] hover:underline flex items-center gap-2 mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        <div className="space-y-6">
          {/* Notification Channels */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#4169E1]" />
                  <div>
                    <p className="font-medium text-gray-900">{t.emailNotifications}</p>
                    <p className="text-sm text-gray-500">{t.emailDesc}</p>
                  </div>
                </div>
                <Toggle enabled={emailEnabled} onChange={setEmailEnabled} />
              </div>

              <div className="border-t border-gray-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">{t.whatsappNotifications}</p>
                    <p className="text-sm text-gray-500">{t.whatsappDesc}</p>
                    <p className={`text-xs mt-1 ${whatsappConfigured ? 'text-green-600' : 'text-yellow-600'}`}>
                      {t.whatsappStatus}: {whatsappConfigured ? t.configured : t.notConfigured}
                    </p>
                  </div>
                </div>
                <Toggle enabled={whatsappEnabled} onChange={setWhatsappEnabled} />
              </div>

              {whatsappEnabled && (
                <div className="ml-8 mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phoneNumber}</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder={t.phonePlaceholder} dir="ltr"
                    className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]" />
                </div>
              )}

              <div className="border-t border-gray-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900">{t.pushNotifications}</p>
                    <p className="text-sm text-gray-500">{t.pushDesc}</p>
                  </div>
                </div>
                <Toggle enabled={pushEnabled} onChange={setPushEnabled} />
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t.expiryReminders}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-500">{t.expiryDays}:</span>
                    <input type="number" value={expiryDays} onChange={e => setExpiryDays(parseInt(e.target.value) || 7)}
                      min={1} max={90} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm" />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{t.claimUpdates}</p>
                <Toggle enabled={claimUpdates} onChange={setClaimUpdates} />
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{t.weeklyDigest}</p>
                <Toggle enabled={weeklyDigest} onChange={setWeeklyDigest} />
              </div>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave}
            className="w-full py-3 bg-[#4169E1] text-white rounded-xl hover:bg-[#3457c9] flex items-center justify-center gap-2 font-medium">
            {saved ? <><CheckCircle2 className="w-5 h-5" /> {t.saved}</> : <><Save className="w-5 h-5" /> {t.save}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
