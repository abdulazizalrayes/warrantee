export interface StoredCookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp?: string;
}

export const defaultCookieConsent: StoredCookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function readStoredCookieConsent(storageValue: string | null): StoredCookieConsent | null {
  if (!storageValue) return null;

  try {
    const parsed = JSON.parse(storageValue) as Partial<StoredCookieConsent>;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}
