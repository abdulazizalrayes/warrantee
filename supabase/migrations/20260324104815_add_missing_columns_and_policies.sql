
-- 1. Add onboarding_completed and role columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'seller'));

-- 2. Add missing columns to seller_invitations for registration form
ALTER TABLE public.seller_invitations
  ADD COLUMN IF NOT EXISTS cr_number text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS warranty_policy text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. Allow anonymous SELECT on warranties for QR verification page
CREATE POLICY "Anyone can verify warranties" ON public.warranties
  FOR SELECT USING (status IN ('active', 'expired'));

-- 4. Storage policies for warranty-documents bucket
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'warranty-documents');

CREATE POLICY "Users can view own uploaded documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'warranty-documents' AND auth.uid()::text = owner_id);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'warranty-documents' AND auth.uid()::text = owner_id);

-- 5. Auto-create profile on user signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Allow profiles INSERT for the trigger (service role)
CREATE POLICY "Service can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- 7. Admin policy: admins can view all data
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all warranties" ON public.warranties
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all claims" ON public.warranty_claims
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all companies" ON public.companies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8. Allow anonymous inserts to seller_invitations (registration form)
CREATE POLICY "Anyone can submit seller registration" ON public.seller_invitations
  FOR INSERT WITH CHECK (true);

