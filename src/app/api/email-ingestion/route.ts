import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function extractWarrantyData(body: string) {
  const data: Record<string, string | null> = { product_name: null, serial_number: null, reference_number: null, start_date: null, end_date: null };
  
  const dateRegex = /\b(\d{4}[-/]\d{2}[-/]\d{2})\b/g;
  const dates = body.match(dateRegex) || [];
  if (dates.length >= 2) { data.start_date = dates[0]; data.end_date = dates[1]; }
  else if (dates.length === 1) { data.start_date = dates[0]; }

  const snMatch = body.match(/(?:serial\s*(?:number|no|#)?|s\/n)[:\s]*([A-Za-z0-9-]+)/i);
  if (snMatch) data.serial_number = snMatch[1];

  const refMatch = body.match(/(?:reference|ref|order|invoice)[:\s#]*([A-Za-z0-9-]+)/i);
  if (refMatch) data.reference_number = refMatch[1];

  const productPatterns = [/(?:product|item|model)[:\s]*(.+?)(?:\n|$)/i, /(?:warranty for|purchased|bought)[:\s]*(.+?)(?:\n|$)/i];
  for (const p of productPatterns) { const m = body.match(p); if (m) { data.product_name = m[1].trim().substring(0, 200); break; } }

  let confidence = 0;
  if (data.product_name) confidence += 0.3;
  if (data.start_date) confidence += 0.2;
  if (data.end_date) confidence += 0.2;
  if (data.serial_number) confidence += 0.15;
  if (data.reference_number) confidence += 0.15;

  return { extracted_data: data, confidence_score: Math.round(confidence * 100) / 100 };
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let payload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { from_email, subject, body, user_id } = payload;
  if (!from_email || !body) return NextResponse.json({ error: 'from_email and body are required' }, { status: 400 });

  const { extracted_data, confidence_score } = extractWarrantyData(body);
  const status = confidence_score >= 0.5 ? 'extracted' : 'received';

  const { data, error } = await supabase.from('email_ingestion').insert({
    from_email, subject: subject || null, user_id: user_id || null,
    extracted_data, confidence_score, status,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'email-ingestion' });
}
