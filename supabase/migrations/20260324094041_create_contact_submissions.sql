
CREATE TABLE public.contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  investment_range text,
  interest_area text,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts only (no read/update/delete)
CREATE POLICY "Allow anonymous inserts" ON public.contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users (you) to read all submissions
CREATE POLICY "Allow authenticated read" ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

