
-- 1. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_warranties ON public.warranties;
CREATE TRIGGER set_updated_at_warranties BEFORE UPDATE ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_companies ON public.companies;
CREATE TRIGGER set_updated_at_companies BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_warranty_claims ON public.warranty_claims;
CREATE TRIGGER set_updated_at_warranty_claims BEFORE UPDATE ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Function to get warranties expiring in N days
CREATE OR REPLACE FUNCTION public.get_expiring_warranties(days_ahead integer DEFAULT 30)
RETURNS SETOF public.warranties AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.warranties
  WHERE status = 'active'
    AND end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
  ORDER BY end_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get dashboard stats for a user
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(user_uuid uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'active_warranties', (SELECT count(*) FROM warranties WHERE (recipient_user_id = user_uuid OR created_by = user_uuid) AND status = 'active'),
    'expiring_soon', (SELECT count(*) FROM warranties WHERE (recipient_user_id = user_uuid OR created_by = user_uuid) AND status = 'active' AND end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 30)),
    'pending_approval', (SELECT count(*) FROM warranties WHERE (recipient_user_id = user_uuid OR created_by = user_uuid) AND status = 'pending_approval'),
    'total_warranties', (SELECT count(*) FROM warranties WHERE recipient_user_id = user_uuid OR created_by = user_uuid),
    'open_claims', (SELECT count(*) FROM warranty_claims WHERE filed_by = user_uuid AND status IN ('open', 'in_progress')),
    'unread_notifications', (SELECT count(*) FROM notifications WHERE user_id = user_uuid AND is_read = false)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get seller dashboard stats
CREATE OR REPLACE FUNCTION public.get_seller_dashboard_stats(company_uuid uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'warranties_issued', (SELECT count(*) FROM warranties WHERE issuer_company_id = company_uuid),
    'active_warranties', (SELECT count(*) FROM warranties WHERE issuer_company_id = company_uuid AND status = 'active'),
    'open_claims', (SELECT count(*) FROM warranty_claims wc JOIN warranties w ON wc.warranty_id = w.id WHERE w.issuer_company_id = company_uuid AND wc.status IN ('open', 'in_progress')),
    'extensions_sold', (SELECT count(*) FROM warranty_extensions we JOIN warranties w ON we.warranty_id = w.id WHERE w.issuer_company_id = company_uuid AND we.is_purchased = true),
    'total_commission', (SELECT COALESCE(sum(commission_amount), 0) FROM warranty_extensions we JOIN warranties w ON we.warranty_id = w.id WHERE w.issuer_company_id = company_uuid AND we.is_purchased = true),
    'claims_rate', (
      SELECT CASE 
        WHEN (SELECT count(*) FROM warranties WHERE issuer_company_id = company_uuid) > 0 
        THEN round(((SELECT count(*) FROM warranty_claims wc JOIN warranties w ON wc.warranty_id = w.id WHERE w.issuer_company_id = company_uuid)::numeric / (SELECT count(*) FROM warranties WHERE issuer_company_id = company_uuid)::numeric) * 100, 1)
        ELSE 0 
      END
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create storage bucket for warranty documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('warranty-documents', 'warranty-documents', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLS policies
CREATE POLICY "Users can upload warranty docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'warranty-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own warranty docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'warranty-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own warranty docs" ON storage.objects
  FOR DELETE USING (bucket_id = 'warranty-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

