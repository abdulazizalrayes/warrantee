import QRCode from 'qrcode';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://warrantee.io';

export async function generateQRCode(warrantyId: string, locale: string = 'en'): Promise<string> {
  const verifyUrl = `${BASE_URL}/${locale}/verify/${warrantyId}`;
  
  const dataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 2,
    color: { dark: '#1A1A2E', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });
  
  return dataUrl;
}

export function getVerifyUrl(warrantyId: string, locale: string = 'en'): string {
  return `${BASE_URL}/${locale}/verify/${warrantyId}`;
}
