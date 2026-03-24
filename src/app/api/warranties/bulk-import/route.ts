import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const authHeader = request.headers.get('authorization');
  
  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const text = await file.text();
  const { data: rows, errors: parseErrors } = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (parseErrors.length > 0) {
    return NextResponse.json({ error: 'CSV parse errors', details: parseErrors }, { status: 400 });
  }

  const results = { imported: 0, errors: [] as { row: number; message: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any;
    if (!row.product_name || !row.start_date || !row.end_date) {
      results.errors.push({ row: i + 2, message: 'Missing required fields: product_name, start_date, end_date' });
      continue;
    }

    const { error } = await supabase.from('warranties').insert({
      product_name: row.product_name,
      product_name_ar: row.product_name_ar || null,
      serial_number: row.serial_number || null,
      sku: row.sku || null,
      category: row.category || null,
      start_date: row.start_date,
      end_date: row.end_date,
      seller_name: row.seller_name || null,
      seller_email: row.seller_email || null,
      status: 'active',
      language: row.language || 'en',
    });

    if (error) {
      results.errors.push({ row: i + 2, message: error.message });
    } else {
      results.imported++;
    }
  }

  return NextResponse.json(results);
}
