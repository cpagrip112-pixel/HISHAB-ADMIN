-- ==============================================================================
-- HISHAB DATABASE MIGRATION: public.plans
-- Subscription Plans & Pricing Configuration
-- ==============================================================================

-- 1. Create public.plans table with exact Hishab architecture specifications
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  duration_value INTEGER DEFAULT 1,
  duration_unit TEXT DEFAULT 'months',
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  button_label TEXT DEFAULT 'Get Started',
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert the Exactly 3 Required Standard Plans if not already present
-- Preserves existing plans and does NOT create duplicates
INSERT INTO public.plans (
  name,
  price,
  duration,
  duration_months,
  duration_value,
  duration_unit,
  description,
  features,
  button_label,
  is_active,
  is_popular,
  display_order
)
SELECT
  'Monthly',
  299,
  '1 Month',
  1,
  1,
  'months',
  'Flexible monthly billing plan for growing shops',
  '["Billing", "Invoices", "Products", "Customers", "Reports", "Stock"]'::jsonb,
  'Start 15-Day Free Trial',
  true,
  false,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Monthly');

INSERT INTO public.plans (
  name,
  price,
  duration,
  duration_months,
  duration_value,
  duration_unit,
  description,
  features,
  button_label,
  is_active,
  is_popular,
  display_order
)
SELECT
  '2 Years',
  3999,
  '2 Years',
  24,
  2,
  'years',
  'Best value for established businesses with long-term savings',
  '["Billing", "Invoices", "Products", "Customers", "Reports", "Stock", "Priority Support"]'::jsonb,
  'Get 2 Years Access',
  true,
  true,
  2
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = '2 Years');

INSERT INTO public.plans (
  name,
  price,
  duration,
  duration_months,
  duration_value,
  duration_unit,
  description,
  features,
  button_label,
  is_active,
  is_popular,
  display_order
)
SELECT
  '3 Years',
  4999,
  '3 Years',
  36,
  3,
  'years',
  'Maximum savings with complete uninterrupted access',
  '["Billing", "Invoices", "Products", "Customers", "Reports", "Stock", "Dedicated Manager"]'::jsonb,
  'Get 3 Years Access',
  true,
  false,
  3
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = '3 Years');

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Public read plans" ON public.plans;
DROP POLICY IF EXISTS "Admin write plans" ON public.plans;
DROP POLICY IF EXISTS admin_all_plans ON public.plans;

-- Public read access: Allows User Website to read active plans directly without hardcoded prices
CREATE POLICY "Public read plans"
  ON public.plans
  FOR SELECT
  TO public
  USING (true);

-- Admin-only write access: INSERT, UPDATE, DELETE restricted to verified Admin / Super Admin
CREATE POLICY "Admin write plans"
  ON public.plans
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant access to PostgREST roles
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO authenticated;
