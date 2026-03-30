import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE = 250 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: warrantyId } = await params;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 250MB)' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'bin';
  const filePath = warrantyId + '/' + Date.now() + '-' + Math.random().toString(36).substring(7) + '.' + ext;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from('warranty-documents').upload(filePath, buffer, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from('warranty-documents').getPublicUrl(filePath);

  const { data, error } = await supabase.from('warranty_documents').insert({
    warranty_id: warrantyId, file_name: file.name, file_type: file.type,
    file_size: file.size, file_url: urlData.publicUrl || filePath,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: warrantyId } = await params;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from('warranty_documents').select('*').eq('warranty_id', warrantyId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
