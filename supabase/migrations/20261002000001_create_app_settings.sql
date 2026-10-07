-- ==============================================================================
-- HISHAB DATABASE MIGRATION: public.app_settings
-- Free Trial Configuration & Global Platform Settings
-- ==============================================================================

-- 1. Create public.app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Global Settings (15 Days Free Trial for New Users)
-- NOTE: This setting applies only when registering NEW user accounts.
-- It does NOT modify or reset existing users' trial expiration dates.
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('free_trial_days', '15', 'Default trial duration in days granted to newly registered users'),
  ('free_trial_enabled', 'true', 'Global toggle: Whether free trial is enabled for new registrations'),
  ('free_trial_duration', '15', 'Configured trial duration quantity'),
  ('free_trial_unit', 'days', 'Configured trial duration unit (days, months, years)'),
  ('upi_id', 'Q164166564@ybl', 'Default manual UPI ID for subscription verification')
ON CONFLICT (key) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 4. Safe helper function to verify Admin / Super Admin status with MFA assurance
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Defense-in-depth: Require AAL2 session when MFA is enrolled
  IF (auth.jwt() ->> 'aal') IS NOT NULL AND (auth.jwt() ->> 'aal') <> 'aal2' THEN
    IF EXISTS (
      SELECT 1 FROM auth.mfa_factors 
      WHERE user_id = auth.uid() AND status = 'verified'
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if user is in admin_users or profiles table or has admin role in app_metadata
  RETURN (
    (to_regclass('public.admin_users') IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND (role = 'ADMIN' OR role = 'SUPER_ADMIN')
    )) OR
    (to_regclass('public.profiles') IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'SUPER_ADMIN')
    )) OR
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS Policies:
-- Drop existing policies if any to allow safe re-execution
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin write app_settings" ON public.app_settings;
DROP POLICY IF EXISTS admin_all_settings ON public.app_settings;

-- Public / Authenticated read access (so new registrations & client app can read trial settings)
CREATE POLICY "Public read app_settings"
  ON public.app_settings
  FOR SELECT
  TO public
  USING (true);

-- Admin-only write access (INSERT, UPDATE, DELETE restricted to verified Admins)
CREATE POLICY "Admin write app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
