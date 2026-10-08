import { getSupabase, isSupabaseConfigured, probeTableHealth, refreshPostgrestSchema } from '../lib/supabase';
import { databaseHealthService } from './databaseHealthService';
import {
  isValidUuid,
  sanitizeSafeUrl,
  sanitizeText,
  validatePrice,
  validateTrialDays,
  sanitizeErrorMessage,
} from '../lib/security';
import {
  UserRecord,
  BusinessRecord,
  PlanRecord,
  SubscriptionRecord,
  PaymentRequestRecord,
  RechargeRecord,
  InvoiceRecord,
  SupportTicketRecord,
  AdminActivityRecord,
  DashboardStats,
  AppSettings,
  LandingPageContent,
  LandingSectionConfig,
  BannerRecord,
} from '../types';

export const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  status: 'published',
  version: 1,
  announcement_enabled: true,
  announcement_text: '🎉 New: Multi-Counter POS Billing & Instant Mobile & DTH Recharge Commission now live on Hishab!',
  announcement_link: '#services',
  hero_headline: 'Smart Billing. Simple Business. Complete Khata & Invoicing.',
  hero_subtitle: 'The all-in-one business software built specifically for Indian retail shops, distributors, and service providers.',
  hero_description: 'Fast barcode billing, GST & non-GST thermal invoices, instant mobile & DTH recharge with high commission, automated stock tracking, and customer udhar khata with WhatsApp reminders.',
  hero_cta_primary_text: 'Start 15-Day Free Trial',
  hero_cta_primary_link: '/register',
  hero_cta_secondary_text: 'View Demo & Plans',
  hero_cta_secondary_link: '#pricing',
  features_heading: 'Everything Your Business Needs to Grow & Profit',
  features_subheading: 'Engineered for speed, simplicity, and zero paperwork headaches.',
  features_list: [
    {
      id: 'f1',
      title: 'Lightning Fast POS Billing',
      description: 'Create professional bills in less than 5 seconds with barcode scanning, custom discounts, and dual payment support.',
    },
    {
      id: 'f2',
      title: 'Mobile & DTH Recharge',
      description: 'Offer recharge services directly to your customers with Airtel, Jio, Vi, BSNL, Tata Play, and earn guaranteed commissions.',
    },
    {
      id: 'f3',
      title: 'Real-time Stock Management',
      description: 'Track item quantities, batch numbers, expiry dates, and receive automated alerts before products run out of stock.',
    },
    {
      id: 'f4',
      title: 'Customer & Supplier Khata',
      description: 'Digital udhar book with one-click WhatsApp balance reminders and automated UPI payment collection links.',
    },
  ],
  billing_pos_title: 'Point of Sale (POS) & Smart Invoicing',
  billing_pos_description: 'Generate beautiful GST or non-GST bills on thermal printers (2-inch & 3-inch) or regular A4 printers. Works online and offline.',
  billing_pos_bullets: [
    'Quick barcode and item search',
    'Supports cash, UPI, card, and credit payments',
    'Custom shop logo, terms, and bank details on bill',
    'Thermal Bluetooth & USB printer support',
  ],
  recharge_mobile_title: 'Mobile Recharge Service',
  recharge_mobile_description: 'Prepaid and postpaid recharge for all Indian operators (Jio, Airtel, Vi, BSNL) with high profit margins and instant confirmation.',
  recharge_dth_title: 'DTH TV Recharge Service',
  recharge_dth_description: 'Instant customer TV top-ups for Tata Play, Airtel Digital TV, Dish TV, Sun Direct, and Videocon D2H with real-time balance check.',
  inventory_stock_title: 'Product Catalog & Inventory Control',
  inventory_stock_description: 'Organize products with categories, barcodes, wholesale vs retail prices, low-stock threshold notifications, and purchase order tracking.',
  party_management_title: 'Customer & Supplier Khata Ledger',
  party_management_description: 'Never lose track of pending market credit. Complete transaction timeline, PDF statement generation, and free WhatsApp reminder alerts.',
  reports_invoices_title: 'Profit & Loss, GST, and Daily Sales Reports',
  reports_invoices_description: 'Actionable financial summaries, daily register closing, GSTR-1 & GSTR-3B ready reports, top-selling items analysis, and expense management.',
  benefits_heading: 'Why Over 10,000+ Indian Businesses Trust Hishab',
  benefits_subheading: 'Built with rock-solid security, lightning responsiveness, and zero hidden fees.',
  benefits_list: [
    {
      id: 'b1',
      title: '100% Safe & Auto Cloud Backup',
      description: 'Your business data is securely encrypted and backed up continuously on the cloud. Never lose a bill even if you lose your device.',
    },
    {
      id: 'b2',
      title: 'Works Seamlessly on Mobile & PC',
      description: 'Access your shop dashboard from Android mobile, tablet, laptop, or desktop computer with real-time multi-counter synchronization.',
    },
    {
      id: 'b3',
      title: 'Guaranteed 24/7 Dedicated Support',
      description: 'Get instant phone and WhatsApp assistance from our dedicated support team in Hindi, English, and regional languages.',
    },
    {
      id: 'b4',
      title: '15-Day Full-Featured Free Trial',
      description: 'Experience all premium capabilities without giving any credit card or upfront commitment. Start in less than 2 minutes.',
    },
  ],
  cta_heading: 'Ready to Upgrade Your Shop to Hishab?',
  cta_subheading: 'Join thousands of smart retailers simplifying their daily sales, inventory, and accounting.',
  cta_button_text: 'Start Free Trial Now',
  cta_button_link: '/register',
  footer_text: '© 2026 Hishab. All rights reserved. Smart Billing. Simple Business. Made with pride for Indian enterprises.',
  contact_email: 'support@hishab.app',
  contact_phone: '+91 98765 43210',
  contact_whatsapp: '+91 98765 43210',
  contact_address: 'Hishab Technologies Pvt. Ltd., Tech Hub, Bangalore, Karnataka, India - 560001',
  sections: [
    { id: 'announcement', name: 'Public Announcement Bar', enabled: true, order: 1 },
    { id: 'hero', name: 'Hero Section & Headline', enabled: true, order: 2 },
    { id: 'banners', name: 'Promotional Banners Carousel', enabled: true, order: 3 },
    { id: 'features', name: 'Feature Highlights', enabled: true, order: 4 },
    { id: 'services', name: 'Services & Facilities (POS, Recharge, Stock)', enabled: true, order: 5 },
    { id: 'benefits', name: 'Benefits & Why Choose Us', enabled: true, order: 6 },
    { id: 'pricing', name: 'Pricing & Premium Plans', enabled: true, order: 7 },
    { id: 'cta', name: 'Call To Action (CTA)', enabled: true, order: 8 },
    { id: 'footer', name: 'Footer & Contact Information', enabled: true, order: 9 },
  ],
};

export const DEFAULT_BANNERS: BannerRecord[] = [
  {
    id: 'b-hero-1',
    title: 'Festival Season Special Offer',
    description: 'Get extra 6 months validity on our 2-Year Business Plan + Free Thermal Printer setup guide!',
    image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1200&auto=format&fit=crop&q=80',
    cta_text: 'Claim Offer Now',
    cta_link: '#pricing',
    badge_text: 'LIMITED TIME',
    type: 'hero',
    is_active: true,
    display_order: 1,
  },
  {
    id: 'b-promo-2',
    title: 'Instant Recharge Commission Engine',
    description: 'Earn up to 4.5% instant cashback & commission on every Airtel, Jio, and DTH recharge.',
    image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&auto=format&fit=crop&q=80',
    cta_text: 'Start Recharging',
    cta_link: '#services',
    badge_text: 'HIGH MARGIN',
    type: 'promo',
    is_active: true,
    display_order: 2,
  },
];

export const APP_SETTINGS_SQL_MIGRATION = `-- ==============================================================================
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

-- 5. RLS Policies
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin write app_settings" ON public.app_settings;
DROP POLICY IF EXISTS admin_all_settings ON public.app_settings;

CREATE POLICY "Public read app_settings"
  ON public.app_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin write app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
`;

export const PLANS_SQL_MIGRATION = `-- ==============================================================================
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

-- 2. Insert Exactly 3 Required Standard Plans if not already present
-- Preserves existing plans and prevents duplicates
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

-- 4. RLS Policies:
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
`;



let detectedUserTable: 'profiles' | 'users' | null = null;
let detectedPaymentTable: 'payments' | 'payment_requests' | null = null;
let detectedRechargeTable: 'recharge_transactions' | 'recharges' | null = null;
let detectedSupportTable: 'support_tickets' | 'enquiries' | null = null;

function isTableMissingError(err: any): boolean {
  if (!err) return false;

  // 1. Explicitly ignore RLS and permission errors - table exists in PostgreSQL
  if (
    err.code === '42501' ||
    err.code === 'PGRST301' ||
    err.status === 401 ||
    err.status === 403 ||
    err.message?.toLowerCase()?.includes('permission denied') ||
    err.message?.toLowerCase()?.includes('row-level security') ||
    err.message?.toLowerCase()?.includes('jwt')
  ) {
    return false;
  }

  // 2. Explicitly ignore column missing errors (PGRST204) - table exists in PostgreSQL
  if (
    err.code === 'PGRST204' ||
    (err.message && err.message.includes('column') && err.message.includes('schema cache'))
  ) {
    return false;
  }

  // 3. Transient network or abort errors do NOT mean the table is missing
  if (
    err.name === 'AbortError' ||
    err.message?.includes('Failed to fetch') ||
    err.message?.includes('NetworkError')
  ) {
    return false;
  }

  // 4. Schema cache or PostgREST anon restrictions (PGRST205) do NOT mean the table is missing from PostgreSQL
  if (
    err.code === 'PGRST205' ||
    (err.message && err.message.includes('schema cache'))
  ) {
    return false;
  }

  // 5. Exact confirmed table missing indicators from PostgreSQL (42P01)
  return (
    err.code === '42P01' ||
    (Boolean(err.message) &&
      err.message.includes('relation') &&
      err.message.includes('does not exist'))
  );
}

async function checkTableExists(tableName: string, force = false): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }
  const health = await databaseHealthService.checkHealth(force);
  if (health.tables[tableName] !== undefined) {
    return health.tables[tableName].exists;
  }
  const supabase = getSupabase();
  const res = await probeTableHealth(supabase, tableName);
  return res.exists;
}

async function detectTables(force = false) {
  if (!isSupabaseConfigured()) return;

  const health = await databaseHealthService.checkHealth(force);

  if (health.tables['profiles']?.exists) detectedUserTable = 'profiles';
  else if (health.tables['users']?.exists) detectedUserTable = 'users';
  else detectedUserTable = 'profiles';

  if (health.tables['payments']?.exists) detectedPaymentTable = 'payments';
  else if (health.tables['payment_requests']?.exists) detectedPaymentTable = 'payment_requests';
  else detectedPaymentTable = 'payments';

  if (health.tables['recharge_transactions']?.exists) detectedRechargeTable = 'recharge_transactions';
  else if (health.tables['recharges']?.exists) detectedRechargeTable = 'recharges';
  else detectedRechargeTable = 'recharge_transactions';

  if (health.tables['support_tickets']?.exists) detectedSupportTable = 'support_tickets';
  else if (health.tables['enquiries']?.exists) detectedSupportTable = 'enquiries';
  else detectedSupportTable = 'support_tickets';
}

export const adminService = {
  /**
   * Defense-in-depth: verifies that the current Supabase session has satisfied MFA (AAL2).
   */
  async assertMfaAal2(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!error && data) {
        if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
          throw new Error('MFA verification required: Authenticator assurance level AAL2 is required for sensitive administrative operations.');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('AAL2') || err.message?.includes('MFA verification required')) {
        throw err;
      }
    }
  },

  /**
   * Resets table detection cache, useful when user runs migrations or clicks Refresh Data
   */
  clearTableCache() {
    databaseHealthService.clearCache();
    detectedUserTable = null;
    detectedPaymentTable = null;
    detectedRechargeTable = null;
    detectedSupportTable = null;
    refreshPostgrestSchema();
  },

  /**
   * Returns authoritative availability of all monitored tables in the Supabase schema.
   * Leverages the unified databaseHealthService single-source-of-truth.
   */
  async getTableStatus(force = false): Promise<{ [tableName: string]: boolean }> {
    const health = await databaseHealthService.checkHealth(force);
    const result: { [key: string]: boolean } = {};
    Object.entries(health.tables).forEach(([table, info]) => {
      result[table] = info.exists;
    });
    return result;
  },

  /**
   * Evaluates whether any REQUIRED core functional table is missing from the Supabase database.
   * Utilizes the authoritative databaseHealthService to ensure Dashboard and Schema Inspector never disagree.
   */
  async getMissingRequiredTables(force = false): Promise<string[]> {
    const health = await databaseHealthService.checkHealth(force);
    return health.missingRequiredTables;
  },

  // ----------------------------------------------------
  // LOGGING ADMINISTRATIVE ACTIONS
  // ----------------------------------------------------
  async logActivity(action: string, targetUserId?: string | null, metadata: Record<string, any> = {}): Promise<void> {
    try {
      if (!isSupabaseConfigured()) return;
      const exists = await checkTableExists('admin_activity_logs');
      if (!exists) return;

      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('admin_activity_logs').insert({
        admin_user_id: user?.id || 'admin',
        admin_email: user?.email || 'admin@hishab.app',
        action,
        target_user_id: targetUserId || null,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  },

  async getActivityLogs(limit: number = 50): Promise<AdminActivityRecord[]> {
    if (!isSupabaseConfigured()) return [];
    const exists = await checkTableExists('admin_activity_logs');
    if (!exists) return [];

    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  },

  // ----------------------------------------------------
  // DASHBOARD STATISTICS (REAL DATA ONLY)
  // ----------------------------------------------------
  async getDashboardStats(): Promise<DashboardStats> {
    const emptyStats: DashboardStats = {
      totalUsers: 0,
      activeUsers: 0,
      freeTrialUsers: 0,
      premiumUsers: 0,
      expiredUsers: 0,
      pendingPayments: 0,
      verifiedPayments: 0,
      totalBusinesses: 0,
      newUsersToday: 0,
      newUsers7Days: 0,
      newUsers30Days: 0,
      subscriptionOverview: { monthly: 0, twoYears: 0, threeYears: 0 },
    };

    if (!isSupabaseConfigured()) return emptyStats;

    await detectTables();
    const supabase = getSupabase();
    const userTable = detectedUserTable || 'profiles';
    const paymentTable = detectedPaymentTable || 'payments';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let totalUsers = 0;
    let activeUsers = 0;
    let newUsersToday = 0;
    let newUsers7Days = 0;
    let newUsers30Days = 0;

    if (await checkTableExists(userTable)) {
      try {
        const { count } = await supabase.from(userTable).select('id', { count: 'exact', head: true });
        totalUsers = count || 0;
        activeUsers = totalUsers;

        const { count: countToday } = await supabase.from(userTable).select('id', { count: 'exact', head: true }).gte('created_at', startOfToday);
        newUsersToday = countToday || 0;

        const { count: count7 } = await supabase.from(userTable).select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo);
        newUsers7Days = count7 || 0;

        const { count: count30 } = await supabase.from(userTable).select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo);
        newUsers30Days = count30 || 0;
      } catch {
        // ignore
      }
    }

    let freeTrialUsers = 0;
    let premiumUsers = 0;
    let expiredUsers = 0;
    let monthlyCount = 0;
    let twoYearsCount = 0;
    let threeYearsCount = 0;

    if (await checkTableExists('subscriptions')) {
      try {
        const { data: subs, error: sErr } = await supabase.from('subscriptions').select('id, status, plan_id, expiry_date');
        if (!sErr && subs) {
          subs.forEach((s) => {
            if (s.status === 'trial') {
              freeTrialUsers++;
            } else if (s.status === 'active') {
              if (s.expiry_date && new Date(s.expiry_date) < now) {
                expiredUsers++;
              } else {
                premiumUsers++;
              }
            } else if (s.status === 'expired') {
              expiredUsers++;
            }
          });

          if (await checkTableExists('plans')) {
            const { data: plansData } = await supabase.from('plans').select('id, name');
            const planMap = new Map<string, string>();
            plansData?.forEach((p) => planMap.set(p.id, p.name?.toLowerCase() || ''));

            subs.forEach((s) => {
              if (s.status === 'active' && s.plan_id) {
                const planName = planMap.get(s.plan_id) || '';
                if (planName.includes('month') || planName.includes('1')) monthlyCount++;
                else if (planName.includes('2 year') || planName.includes('24')) twoYearsCount++;
                else if (planName.includes('3 year') || planName.includes('36')) threeYearsCount++;
              }
            });
          }
        }
      } catch {
        // ignore
      }
    }

    let pendingPayments = 0;
    let verifiedPayments = 0;

    if (await checkTableExists(paymentTable)) {
      try {
        const { count: pCount, error: pErr } = await supabase.from(paymentTable).select('id', { count: 'exact', head: true }).eq('status', 'pending');
        if (!pErr) pendingPayments = pCount || 0;

        const { count: vCount, error: vErr } = await supabase.from(paymentTable).select('id', { count: 'exact', head: true }).eq('status', 'verified');
        if (!vErr) verifiedPayments = vCount || 0;
      } catch {
        // ignore
      }
    }

    let totalBusinesses = 0;
    if (await checkTableExists('businesses')) {
      try {
        const { count: bCount, error: bErr } = await supabase.from('businesses').select('id', { count: 'exact', head: true });
        if (!bErr) totalBusinesses = bCount || 0;
      } catch {
        // ignore
      }
    }

    return {
      totalUsers,
      activeUsers,
      freeTrialUsers,
      premiumUsers,
      expiredUsers,
      pendingPayments,
      verifiedPayments,
      totalBusinesses,
      newUsersToday,
      newUsers7Days,
      newUsers30Days,
      subscriptionOverview: {
        monthly: monthlyCount,
        twoYears: twoYearsCount,
        threeYears: threeYearsCount,
      },
    };
  },

  // ----------------------------------------------------
  // USERS MANAGEMENT
  // ----------------------------------------------------
  async getUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    statusFilter?: string;
  }): Promise<{ users: UserRecord[]; totalCount: number }> {
    if (!isSupabaseConfigured()) return { users: [], totalCount: 0 };
    await detectTables();
    const supabase = getSupabase();
    const userTable = detectedUserTable || 'profiles';

    if (!(await checkTableExists(userTable))) {
      return { users: [], totalCount: 0 };
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from(userTable).select('*', { count: 'exact' });

      if (params.search && params.search.trim()) {
        const s = sanitizeText(params.search.trim(), 100);
        if (isValidUuid(s)) {
          query = query.or(`id.eq.${s},full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
        } else {
          query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
        }
      }

      if (params.statusFilter && params.statusFilter !== 'all') {
        const sf = params.statusFilter.toLowerCase();
        if (['active', 'inactive', 'suspended', 'pending'].includes(sf)) {
          query = query.eq('status', sf);
        }
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        return { users: [], totalCount: 0 };
      }

      const rawUsers = data || [];
      const userIds = rawUsers.map((u) => u.id);

      const businessMap = new Map<string, BusinessRecord>();
      const subscriptionMap = new Map<string, SubscriptionRecord>();

      if (userIds.length > 0) {
        if (await checkTableExists('businesses')) {
          try {
            const { data: businesses } = await supabase.from('businesses').select('*').in('user_id', userIds);
            businesses?.forEach((b) => businessMap.set(b.user_id, b));
          } catch {
            // ignore
          }
        }

        if (await checkTableExists('subscriptions')) {
          try {
            const { data: subscriptions } = await supabase.from('subscriptions').select('*').in('user_id', userIds);
            subscriptions?.forEach((s) => subscriptionMap.set(s.user_id, s));
          } catch {
            // ignore
          }
        }
      }

      const users: UserRecord[] = rawUsers.map((row) => {
        const sub = subscriptionMap.get(row.id) || null;
        const biz = businessMap.get(row.id) || null;

        return {
          id: row.id,
          email: row.email || row.user_email || null,
          phone: row.phone || row.mobile || row.mobile_number || row.phone_number || null,
          full_name: row.full_name || row.name || row.display_name || null,
          role: row.role || 'user',
          status: row.status || 'active',
          created_at: row.created_at || new Date().toISOString(),
          last_sign_in_at: row.last_sign_in_at || row.last_login || null,
          business: biz,
          subscription: sub,
        };
      });

      let filteredUsers = users;
      if (params.statusFilter) {
        const sf = params.statusFilter.toLowerCase();
        if (sf === 'freetrial' || sf === 'free trial') {
          filteredUsers = users.filter((u) => u.subscription?.status === 'trial');
        } else if (sf === 'premium') {
          filteredUsers = users.filter((u) => u.subscription?.status === 'active');
        } else if (sf === 'expired') {
          filteredUsers = users.filter((u) => u.subscription?.status === 'expired');
        }
      }

      return {
        users: filteredUsers,
        totalCount: count || rawUsers.length,
      };
    } catch {
      return { users: [], totalCount: 0 };
    }
  },

  // ----------------------------------------------------
  // SINGLE USER DETAILS
  // ----------------------------------------------------
  async getUserDetails(userId: string): Promise<{
    user: UserRecord | null;
    business: BusinessRecord | null;
    subscription: SubscriptionRecord | null;
    payments: PaymentRequestRecord[];
    recharges: RechargeRecord[];
    invoices: InvoiceRecord[];
  }> {
    if (!isSupabaseConfigured() || !userId || !isValidUuid(userId)) {
      return { user: null, business: null, subscription: null, payments: [], recharges: [], invoices: [] };
    }

    await detectTables();
    const supabase = getSupabase();
    const userTable = detectedUserTable || 'profiles';
    const paymentTable = detectedPaymentTable || 'payments';
    const rechargeTable = detectedRechargeTable || 'recharge_transactions';

    try {
      let user: UserRecord | null = null;
      if (await checkTableExists(userTable)) {
        const { data: userData } = await supabase.from(userTable).select('*').eq('id', userId).maybeSingle();
        if (userData) {
          user = {
            id: userData.id,
            email: userData.email || userData.user_email || null,
            phone: userData.phone || userData.mobile || userData.mobile_number || null,
            full_name: userData.full_name || userData.name || null,
            role: userData.role || 'user',
            status: userData.status || 'active',
            created_at: userData.created_at,
            last_sign_in_at: userData.last_sign_in_at || userData.last_login || null,
          };
        }
      }

      let business: BusinessRecord | null = null;
      if (await checkTableExists('businesses')) {
        const { data: bData } = await supabase.from('businesses').select('*').eq('user_id', userId).maybeSingle();
        if (bData) business = bData;
      }

      let subscription: SubscriptionRecord | null = null;
      if (await checkTableExists('subscriptions')) {
        const { data: sData } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
        if (sData) {
          if (sData.plan_id && (await checkTableExists('plans'))) {
            const { data: pData } = await supabase.from('plans').select('name').eq('id', sData.plan_id).maybeSingle();
            sData.plan_name = pData?.name || null;
          }
          subscription = sData;
        }
      }

      let payments: PaymentRequestRecord[] = [];
      if (await checkTableExists(paymentTable)) {
        const { data: pData } = await supabase
          .from(paymentTable)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (pData) payments = pData;
      }

      let recharges: RechargeRecord[] = [];
      if (await checkTableExists(rechargeTable)) {
        const { data: rData } = await supabase
          .from(rechargeTable)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (rData) recharges = rData;
      }

      let invoices: InvoiceRecord[] = [];
      if (await checkTableExists('invoices')) {
        const { data: iData } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (iData) invoices = iData;
      }

      return { user, business, subscription, payments, recharges, invoices };
    } catch {
      return { user: null, business: null, subscription: null, payments: [], recharges: [], invoices: [] };
    }
  },

  // ----------------------------------------------------
  // PLANS & PRICING (EXACTLY 3 SLOTS: MONTHLY, 2 YEARS, 3 YEARS)
  // ----------------------------------------------------
  async isPlansTableAvailable(force = false): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = getSupabase();
    try {
      const { error, status } = await supabase.from('plans').select('id').limit(1);
      if (!error && (status === 200 || status === 204 || status === 206)) {
        return true;
      }
      if (status === 401 || status === 403 || error?.code === '42501' || error?.code === 'PGRST301') {
        return true;
      }
      if (error?.code === 'PGRST205' || error?.code === '42P01' || status === 404) {
        return false;
      }
      return !error;
    } catch {
      return false;
    }
  },

  async getPlans(forceRecheck = false): Promise<PlanRecord[]> {
    if (!isSupabaseConfigured()) return [];
    const isAvailable = await this.isPlansTableAvailable(forceRecheck);
    if (!isAvailable) return [];

    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false });

      if (error) {
        return [];
      }
      if (!data || data.length === 0) return [];

      return data.map((p, idx) => {
        let durationVal = p.duration_value;
        let durationUnit: 'days' | 'months' | 'years' = (p.duration_unit as any) || 'months';

        if (!durationVal || isNaN(Number(durationVal))) {
          const m = Number(p.duration_months) || 1;
          if (m >= 12 && m % 12 === 0) {
            durationVal = m / 12;
            durationUnit = 'years';
          } else {
            durationVal = m;
            durationUnit = 'months';
          }
        }

        const unitText = durationVal === 1 ? durationUnit.replace(/s$/, '') : durationUnit;
        const formattedDuration =
          p.duration || `${durationVal} ${unitText.charAt(0).toUpperCase() + unitText.slice(1)}`;

        return {
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          duration: formattedDuration,
          duration_months: Number(p.duration_months) || (durationUnit === 'years' ? durationVal * 12 : durationVal),
          duration_value: Number(durationVal) || 1,
          duration_unit: durationUnit,
          description: p.description || '',
          features: Array.isArray(p.features)
            ? p.features
            : typeof p.features === 'string'
            ? JSON.parse(p.features || '[]')
            : [],
          button_label: p.button_label || 'Get Started',
          is_active: Boolean(p.is_active ?? true),
          is_popular: Boolean(p.is_popular ?? false),
          display_order: Number(p.display_order) || (idx + 1),
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at,
        };
      });
    } catch {
      return [];
    }
  },

  async seedDefaultPlans(): Promise<PlanRecord[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    const isAvailable = await this.isPlansTableAvailable(true);
    if (!isAvailable) {
      throw new Error(
        'Table public.plans is not ready in Supabase. Please execute the SQL migration script in your Supabase SQL Editor first.'
      );
    }

    const supabase = getSupabase();

    // Check whether plans already exist before INSERT to prevent duplicates
    const { data: existingPlans, error: checkError } = await supabase.from('plans').select('*');
    if (!checkError && existingPlans && existingPlans.length > 0) {
      return this.getPlans(true);
    }

    const defaultPlans = [
      {
        name: 'Monthly',
        price: 299,
        duration: '1 Month',
        duration_months: 1,
        duration_value: 1,
        duration_unit: 'months',
        description: 'Flexible monthly billing plan for growing shops',
        features: ['Billing', 'Invoices', 'Products', 'Customers', 'Reports', 'Stock'],
        button_label: 'Start 15-Day Free Trial',
        is_active: true,
        is_popular: false,
        display_order: 1,
      },
      {
        name: '2 Years',
        price: 3999,
        duration: '2 Years',
        duration_months: 24,
        duration_value: 2,
        duration_unit: 'years',
        description: 'Best value for established businesses with long-term savings',
        features: ['Billing', 'Invoices', 'Products', 'Customers', 'Reports', 'Stock', 'Priority Support'],
        button_label: 'Get 2 Years Access',
        is_active: true,
        is_popular: true,
        display_order: 2,
      },
      {
        name: '3 Years',
        price: 4999,
        duration: '3 Years',
        duration_months: 36,
        duration_value: 3,
        duration_unit: 'years',
        description: 'Maximum savings with complete uninterrupted access',
        features: ['Billing', 'Invoices', 'Products', 'Customers', 'Reports', 'Stock', 'Dedicated Manager'],
        button_label: 'Get 3 Years Access',
        is_active: true,
        is_popular: false,
        display_order: 3,
      },
    ];

    const { error: insertError } = await supabase.from('plans').insert(defaultPlans);
    if (insertError) throw insertError;

    databaseHealthService.clearCache();
    await this.logActivity('Seeded 3 standard plans: Monthly, 2 Years, 3 Years');
    return this.getPlans(true);
  },

  async updatePlan(plan: Partial<PlanRecord> & { id: string }): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();
    const supabase = getSupabase();

    // Enforce: only ONE plan marked popular at a time
    if (plan.is_popular === true) {
      await supabase.from('plans').update({ is_popular: false }).neq('id', plan.id);
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (plan.name !== undefined) updatePayload.name = sanitizeText(plan.name, 100);
    if (plan.price !== undefined) {
      const priceVal = validatePrice(plan.price);
      if (!priceVal.valid) throw new Error(priceVal.error || 'Invalid price value. Price must not be negative.');
      updatePayload.price = priceVal.price;
    }

    // Handle duration value and unit
    if (plan.duration_value !== undefined || plan.duration_unit !== undefined) {
      const val = Math.max(1, Number(plan.duration_value) || 1);
      const unit = plan.duration_unit || 'months';

      updatePayload.duration_value = val;
      updatePayload.duration_unit = unit;

      let calcMonths = val;
      if (unit === 'years') calcMonths = val * 12;
      else if (unit === 'days') calcMonths = Math.max(1, Math.round(val / 30));
      updatePayload.duration_months = calcMonths;

      const unitText = val === 1 ? unit.replace(/s$/, '') : unit;
      updatePayload.duration = `${val} ${unitText.charAt(0).toUpperCase() + unitText.slice(1)}`;
    } else if (plan.duration !== undefined) {
      updatePayload.duration = sanitizeText(plan.duration, 50);
    }

    if (plan.description !== undefined) updatePayload.description = sanitizeText(plan.description, 500);
    if (plan.features !== undefined) updatePayload.features = plan.features;
    if (plan.button_label !== undefined) updatePayload.button_label = sanitizeText(plan.button_label, 50);
    if (plan.is_active !== undefined) updatePayload.is_active = Boolean(plan.is_active);
    if (plan.is_popular !== undefined) updatePayload.is_popular = Boolean(plan.is_popular);
    if (plan.display_order !== undefined) updatePayload.display_order = Number(plan.display_order) || 1;

    const { error } = await supabase.from('plans').update(updatePayload).eq('id', plan.id);
    if (error) throw error;

    databaseHealthService.clearCache();
    await this.logActivity(`Updated plan: ${plan.name || plan.id}`, null, {
      plan_id: plan.id,
      price: plan.price,
      duration: updatePayload.duration,
      is_popular: plan.is_popular,
    });
  },

  // ----------------------------------------------------
  // FREE TRIAL SETTINGS
  // ----------------------------------------------------
  async isAppSettingsTableAvailable(force = false): Promise<boolean> {
    return checkTableExists('app_settings', force);
  },

  async refreshTableAvailability(tableName = 'app_settings'): Promise<boolean> {
    databaseHealthService.clearCache();
    return checkTableExists(tableName, true);
  },

  async getAppSettings(forceRecheck = false): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      free_trial_enabled: true,
      free_trial_days: 15,
      free_trial_duration: 15,
      free_trial_unit: 'days',
      free_trial_features: [
        'Billing & Invoicing',
        'Mobile & DTH Recharge',
        'Product & Stock Tracking',
        'Customer Khata Ledger',
        'Financial & GST Reports',
      ],
      upi_id: 'Q164166564@ybl',
    };

    if (!isSupabaseConfigured()) {
      return defaultSettings;
    }

    const available = await checkTableExists('app_settings', forceRecheck);
    if (!available) {
      return defaultSettings;
    }

    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) {
        return defaultSettings;
      }
      if (!data || data.length === 0) {
        return defaultSettings;
      }

      const settings = { ...defaultSettings };

      data.forEach((row) => {
        if (row.key === 'free_trial_days') {
          settings.free_trial_days = parseInt(row.value, 10) || 15;
        } else if (row.key === 'free_trial_enabled') {
          settings.free_trial_enabled = row.value === 'true' || row.value === true;
        } else if (row.key === 'free_trial_duration') {
          settings.free_trial_duration = parseInt(row.value, 10) || 15;
        } else if (row.key === 'free_trial_unit') {
          settings.free_trial_unit = (row.value as any) || 'days';
        } else if (row.key === 'free_trial_features') {
          try {
            settings.free_trial_features = Array.isArray(row.value)
              ? row.value
              : JSON.parse(row.value);
          } catch {
            // ignore parse error
          }
        } else if (row.key === 'upi_id') {
          settings.upi_id = row.value || settings.upi_id;
        }
      });

      return settings;
    } catch {
      return defaultSettings;
    }
  },

  async updateFreeTrialSettings(settings: Partial<AppSettings>): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();

    const duration = Math.max(1, Number(settings.free_trial_duration) || 15);
    const unit = settings.free_trial_unit || 'days';
    let calculatedDays = duration;
    if (unit === 'months') calculatedDays = duration * 30;
    else if (unit === 'years') calculatedDays = duration * 365;

    const supabase = getSupabase();
    const rowsToUpsert = [
      {
        key: 'free_trial_enabled',
        value: settings.free_trial_enabled !== undefined ? String(settings.free_trial_enabled) : 'true',
        description: 'Enable or disable free trial for new Hishab users',
        updated_at: new Date().toISOString(),
      },
      {
        key: 'free_trial_duration',
        value: String(duration),
        description: 'Configured trial duration number',
        updated_at: new Date().toISOString(),
      },
      {
        key: 'free_trial_unit',
        value: unit,
        description: 'Configured trial duration unit (days, months, years)',
        updated_at: new Date().toISOString(),
      },
      {
        key: 'free_trial_days',
        value: String(calculatedDays),
        description: 'Calculated free trial days for new registrations',
        updated_at: new Date().toISOString(),
      },
    ];

    if (settings.free_trial_features) {
      rowsToUpsert.push({
        key: 'free_trial_features',
        value: JSON.stringify(settings.free_trial_features),
        description: 'List of features accessible during free trial',
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await supabase.from('app_settings').upsert(rowsToUpsert, { onConflict: 'key' });
    if (error) {
      if (isTableMissingError(error)) {
        throw new Error(
          `Could not find the table public.app_settings in the schema cache. Please execute the SQL migration script in your Supabase SQL Editor.`
        );
      }
      throw error;
    }

    await this.logActivity(`Updated free trial settings: ${duration} ${unit} (${calculatedDays} days total)`, null, {
      enabled: settings.free_trial_enabled,
      duration,
      unit,
      calculated_days: calculatedDays,
    });
  },

  async updateFreeTrialDays(days: number): Promise<void> {
    await this.updateFreeTrialSettings({
      free_trial_duration: days,
      free_trial_unit: 'days',
    });
  },

  // ----------------------------------------------------
  // LANDING PAGE MANAGEMENT (HEADLINE, HERO, SECTIONS, PUBLISH)
  // ----------------------------------------------------
  async getLandingPageContent(status: 'draft' | 'published' = 'published'): Promise<LandingPageContent> {
    if (!isSupabaseConfigured()) {
      return { ...DEFAULT_LANDING_CONTENT, status };
    }

    const supabase = getSupabase();

    // 1. Try dedicated landing_page_content table
    try {
      if (await checkTableExists('landing_page_content')) {
        const { data, error } = await supabase
          .from('landing_page_content')
          .select('*')
          .eq('status', status)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          // If stored as structured JSON or payload column
          const content = data.content_json || data;
          return {
            ...DEFAULT_LANDING_CONTENT,
            ...content,
            id: data.id,
            status: data.status || status,
            published_at: data.published_at,
            updated_at: data.updated_at,
          };
        }
      }
    } catch {
      // ignore
    }

    // 2. Fallback to app_settings key-value store
    try {
      if (await checkTableExists('app_settings')) {
        const key = `landing_page_${status}`;
        const { data, error } = await supabase
          .from('app_settings')
          .select('value, updated_at')
          .eq('key', key)
          .maybeSingle();

        if (!error && data?.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          return {
            ...DEFAULT_LANDING_CONTENT,
            ...parsed,
            status,
            updated_at: data.updated_at,
          };
        }

        // If draft was requested but only published exists, return published as base
        if (status === 'draft') {
          const { data: pubData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'landing_page_published')
            .maybeSingle();
          if (pubData?.value) {
            const parsed = typeof pubData.value === 'string' ? JSON.parse(pubData.value) : pubData.value;
            return {
              ...DEFAULT_LANDING_CONTENT,
              ...parsed,
              status: 'draft',
            };
          }
        }
      }
    } catch {
      // ignore
    }

    return { ...DEFAULT_LANDING_CONTENT, status };
  },

  async saveLandingPageDraft(content: LandingPageContent): Promise<LandingPageContent> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();

    const supabase = getSupabase();
    const now = new Date().toISOString();
    const draftPayload: LandingPageContent = {
      ...content,
      status: 'draft',
      updated_at: now,
    };

    // Save to app_settings key
    try {
      await supabase.from('app_settings').upsert({
        key: 'landing_page_draft',
        value: JSON.stringify(draftPayload),
        description: 'Draft content for Hishab Landing Page',
        updated_at: now,
      });
    } catch {
      // ignore
    }

    // Also save to landing_page_content table if it exists
    try {
      if (await checkTableExists('landing_page_content')) {
        await supabase.from('landing_page_content').upsert(
          {
            status: 'draft',
            content_json: draftPayload,
            updated_at: now,
          },
          { onConflict: 'status' }
        );
      }
    } catch {
      // ignore
    }

    await this.logActivity('Saved Landing Page Draft');
    return draftPayload;
  },

  async publishLandingPage(content: LandingPageContent): Promise<LandingPageContent> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();

    const supabase = getSupabase();
    const now = new Date().toISOString();
    const publishedPayload: LandingPageContent = {
      ...content,
      status: 'published',
      published_at: now,
      updated_at: now,
      version: (content.version || 1) + 1,
    };

    // 1. Save to app_settings (key: landing_page_published)
    try {
      await supabase.from('app_settings').upsert({
        key: 'landing_page_published',
        value: JSON.stringify(publishedPayload),
        description: 'Published authoritative content for Hishab Landing Page',
        updated_at: now,
      });
    } catch (err: any) {
      throw err;
    }

    // 2. Also save to landing_page_content table if it exists
    try {
      if (await checkTableExists('landing_page_content')) {
        await supabase.from('landing_page_content').upsert(
          {
            status: 'published',
            content_json: publishedPayload,
            published_at: now,
            updated_at: now,
          },
          { onConflict: 'status' }
        );
      }
    } catch {
      // ignore
    }

    await this.logActivity(`Published Landing Page (version ${publishedPayload.version})`, null, {
      headline: publishedPayload.hero_headline,
      version: publishedPayload.version,
    });

    return publishedPayload;
  },

  // ----------------------------------------------------
  // LANDING PAGE BANNERS & BRANDING
  // ----------------------------------------------------
  async getBanners(): Promise<BannerRecord[]> {
    if (!isSupabaseConfigured()) return DEFAULT_BANNERS;
    const supabase = getSupabase();

    // 1. Try landing_page_banners table
    try {
      if (await checkTableExists('landing_page_banners')) {
        const { data, error } = await supabase
          .from('landing_page_banners')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((b) => ({
            id: b.id,
            title: b.title || '',
            description: b.description || '',
            image_url: b.image_url || '',
            cta_text: b.cta_text || 'Learn More',
            cta_link: b.cta_link || '#',
            badge_text: b.badge_text || '',
            type: b.type || 'hero',
            is_active: Boolean(b.is_active ?? true),
            display_order: Number(b.display_order) || 1,
            created_at: b.created_at,
            updated_at: b.updated_at,
          }));
        }
      }
    } catch {
      // ignore
    }

    // 2. Try app_settings key
    try {
      if (await checkTableExists('app_settings')) {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'landing_page_banners')
          .maybeSingle();

        if (!error && data?.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // ignore
    }

    return DEFAULT_BANNERS;
  },

  async saveBanner(banner: Partial<BannerRecord>): Promise<BannerRecord> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();

    const supabase = getSupabase();
    const id = banner.id || `banner_${Date.now()}`;
    const now = new Date().toISOString();

    const bannerRecord: BannerRecord = {
      id,
      title: sanitizeText(banner.title || 'Promotional Banner', 150),
      description: sanitizeText(banner.description || '', 500),
      image_url: sanitizeSafeUrl(banner.image_url || '') || '',
      cta_text: sanitizeText(banner.cta_text || 'View Offer', 50),
      cta_link: sanitizeSafeUrl(banner.cta_link || '#') || '#',
      badge_text: sanitizeText(banner.badge_text || '', 50),
      type: (banner.type as any) || 'hero',
      is_active: Boolean(banner.is_active ?? true),
      display_order: Number(banner.display_order) || 1,
      updated_at: now,
      created_at: banner.created_at || now,
    };

    // Save to landing_page_banners table if available
    let savedInTable = false;
    try {
      if (await checkTableExists('landing_page_banners')) {
        const { error } = await supabase.from('landing_page_banners').upsert(bannerRecord);
        if (!error) savedInTable = true;
      }
    } catch {
      // ignore
    }

    // Always maintain in app_settings banners list as well
    try {
      const currentBanners = await this.getBanners();
      const existingIdx = currentBanners.findIndex((b) => b.id === id);
      let updatedList: BannerRecord[];
      if (existingIdx >= 0) {
        updatedList = [...currentBanners];
        updatedList[existingIdx] = bannerRecord;
      } else {
        updatedList = [...currentBanners, bannerRecord];
      }

      await supabase.from('app_settings').upsert({
        key: 'landing_page_banners',
        value: JSON.stringify(updatedList),
        description: 'Published promotional and hero banners for landing page',
        updated_at: now,
      });
    } catch {
      // ignore
    }

    await this.logActivity(`Saved banner: ${bannerRecord.title}`, null, {
      banner_id: bannerRecord.id,
      type: bannerRecord.type,
      is_active: bannerRecord.is_active,
    });

    return bannerRecord;
  },

  async deleteBanner(bannerId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();

    const supabase = getSupabase();

    try {
      if (await checkTableExists('landing_page_banners')) {
        await supabase.from('landing_page_banners').delete().eq('id', bannerId);
      }
    } catch {
      // ignore
    }

    try {
      const currentBanners = await this.getBanners();
      const updatedList = currentBanners.filter((b) => b.id !== bannerId);
      await supabase.from('app_settings').upsert({
        key: 'landing_page_banners',
        value: JSON.stringify(updatedList),
        description: 'Published promotional and hero banners for landing page',
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    await this.logActivity(`Deleted banner ${bannerId}`);
  },

  async uploadBannerImage(file: File): Promise<{ url: string }> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();

    // Validate type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid image format. Allowed formats: PNG, JPG, WEBP, SVG.');
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Image file size must be less than 5MB.');
    }

    const supabase = getSupabase();
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `banners/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    try {
      const { data, error } = await supabase.storage.from('landing-banners').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        throw new Error(
          `Supabase Storage upload failed: ${error.message}. You can also enter a direct image URL.`
        );
      }

      const { data: publicUrlData } = supabase.storage.from('landing-banners').getPublicUrl(data.path);
      return { url: publicUrlData.publicUrl };
    } catch (err: any) {
      throw new Error(
        err.message || 'Storage bucket "landing-banners" is not yet created. You can paste an image URL directly.'
      );
    }
  },

  // ----------------------------------------------------
  // PAYMENT REQUESTS & MANUAL VERIFICATION
  // ----------------------------------------------------
  async getPaymentRequests(params: {
    status?: 'all' | 'pending' | 'verified' | 'rejected';
    page?: number;
    pageSize?: number;
  }): Promise<{ payments: PaymentRequestRecord[]; totalCount: number }> {
    if (!isSupabaseConfigured()) return { payments: [], totalCount: 0 };
    await detectTables();
    const supabase = getSupabase();
    const paymentTable = detectedPaymentTable || 'payments';
    const userTable = detectedUserTable || 'profiles';

    // Check if payment table exists in schema cache
    if (!(await checkTableExists(paymentTable))) {
      return { payments: [], totalCount: 0 };
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from(paymentTable).select('*', { count: 'exact' });

      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        return { payments: [], totalCount: 0 };
      }

      const rows = data || [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

      const userMap = new Map<string, UserRecord>();
      if (userIds.length > 0 && (await checkTableExists(userTable))) {
        try {
          const { data: users } = await supabase.from(userTable).select('id, full_name, name, email, phone, mobile').in('id', userIds);
          users?.forEach((u) => {
            userMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || u.name || null,
              email: u.email || null,
              phone: u.phone || u.mobile || null,
              role: 'user',
              status: 'active',
              created_at: '',
              last_sign_in_at: null,
            });
          });
        } catch {
          // ignore
        }
      }

      const planIds = Array.from(new Set(rows.map((r) => r.plan_id).filter(Boolean)));
      const planMap = new Map<string, string>();
      if (planIds.length > 0 && (await checkTableExists('plans'))) {
        try {
          const { data: plans } = await supabase.from('plans').select('id, name').in('id', planIds);
          plans?.forEach((p) => planMap.set(p.id, p.name));
        } catch {
          // ignore
        }
      }

      const payments: PaymentRequestRecord[] = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        plan_id: r.plan_id,
        plan_name: r.plan_name || planMap.get(r.plan_id) || (r.plan_id ? 'Plan' : 'Subscription'),
        amount: Number(r.amount) || 0,
        utr: r.utr || r.transaction_id || 'N/A',
        screenshot_url: r.screenshot_url || r.screenshot || null,
        status: r.status || 'pending',
        rejection_reason: r.rejection_reason || null,
        verified_by: r.verified_by || null,
        verified_at: r.verified_at || null,
        created_at: r.created_at || new Date().toISOString(),
        user: userMap.get(r.user_id),
      }));

      return { payments, totalCount: count || payments.length };
    } catch {
      return { payments: [], totalCount: 0 };
    }
  },

  async verifyPayment(paymentId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    if (!isValidUuid(paymentId)) throw new Error('Invalid payment ID format');
    await this.assertMfaAal2();
    await detectTables();
    const supabase = getSupabase();
    const paymentTable = detectedPaymentTable || 'payments';

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const adminId = adminUser?.id || 'admin';
    const now = new Date();
    const verifiedAt = now.toISOString();

    const { data: payment, error: pErr } = await supabase.from(paymentTable).select('*').eq('id', paymentId).single();
    if (pErr || !payment) {
      throw new Error(`Payment request ${paymentId} not found`);
    }

    let durationMonths = 1;
    let planName = payment.plan_name || 'Monthly';

    if (payment.plan_id && (await checkTableExists('plans'))) {
      const { data: planData } = await supabase.from('plans').select('*').eq('id', payment.plan_id).maybeSingle();
      if (planData) {
        durationMonths = planData.duration_months || 1;
        planName = planData.name;
      }
    } else if (payment.plan_name) {
      if (payment.plan_name.toLowerCase().includes('3 year')) durationMonths = 36;
      else if (payment.plan_name.toLowerCase().includes('2 year')) durationMonths = 24;
      else durationMonths = 1;
    }

    const startDate = now.toISOString();
    const expiryDateObj = new Date(now);
    expiryDateObj.setMonth(expiryDateObj.getMonth() + durationMonths);
    const expiryDate = expiryDateObj.toISOString();

    const { error: updatePayErr } = await supabase
      .from(paymentTable)
      .update({
        status: 'verified',
        verified_by: adminId,
        verified_at: verifiedAt,
      })
      .eq('id', paymentId);

    if (updatePayErr) throw updatePayErr;

    if (await checkTableExists('subscriptions')) {
      const { data: existingSub } = await supabase.from('subscriptions').select('id').eq('user_id', payment.user_id).maybeSingle();

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            plan_id: payment.plan_id || null,
            status: 'active',
            start_date: startDate,
            expiry_date: expiryDate,
            updated_at: verifiedAt,
          })
          .eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert({
          user_id: payment.user_id,
          plan_id: payment.plan_id || null,
          status: 'active',
          start_date: startDate,
          expiry_date: expiryDate,
          created_at: verifiedAt,
        });
      }
    }

    await this.logActivity(`Verified manual payment ${payment.utr || paymentId} for plan: ${planName}`, payment.user_id, {
      payment_id: paymentId,
      utr: payment.utr,
      amount: payment.amount,
      plan_name: planName,
      expiry_date: expiryDate,
    });
  },

  async rejectPayment(paymentId: string, rejectionReason: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    if (!isValidUuid(paymentId)) throw new Error('Invalid payment ID format');
    await this.assertMfaAal2();
    const sanitizedReason = sanitizeText(rejectionReason, 500) || 'Payment rejected by administrator.';
    await detectTables();
    const supabase = getSupabase();
    const paymentTable = detectedPaymentTable || 'payments';

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const adminId = adminUser?.id || 'admin';

    const { error } = await supabase
      .from(paymentTable)
      .update({
        status: 'rejected',
        rejection_reason: sanitizedReason,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) throw error;

    await this.logActivity(`Rejected payment ${paymentId}`, null, {
      payment_id: paymentId,
      reason: rejectionReason,
    });
  },

  // ----------------------------------------------------
  // SUBSCRIPTIONS
  // ----------------------------------------------------
  async getSubscriptions(params: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ subscriptions: SubscriptionRecord[]; totalCount: number }> {
    if (!isSupabaseConfigured() || !(await checkTableExists('subscriptions'))) {
      return { subscriptions: [], totalCount: 0 };
    }
    await detectTables();
    const supabase = getSupabase();
    const userTable = detectedUserTable || 'profiles';

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from('subscriptions').select('*', { count: 'exact' });

      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status.toLowerCase());
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        return { subscriptions: [], totalCount: 0 };
      }

      const rows = data || [];
      const userIds = rows.map((r) => r.user_id).filter(Boolean);
      const planIds = rows.map((r) => r.plan_id).filter(Boolean);

      const userMap = new Map<string, UserRecord>();
      if (userIds.length > 0 && (await checkTableExists(userTable))) {
        try {
          const { data: users } = await supabase.from(userTable).select('id, full_name, name, email, phone, mobile').in('id', userIds);
          users?.forEach((u) => {
            userMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || u.name || null,
              email: u.email || null,
              phone: u.phone || u.mobile || null,
              role: 'user',
              status: 'active',
              created_at: '',
              last_sign_in_at: null,
            });
          });
        } catch {
          // ignore
        }
      }

      const planMap = new Map<string, string>();
      if (planIds.length > 0 && (await checkTableExists('plans'))) {
        try {
          const { data: plans } = await supabase.from('plans').select('id, name').in('id', planIds);
          plans?.forEach((p) => planMap.set(p.id, p.name));
        } catch {
          // ignore
        }
      }

      // Check payment verification status for each user
      const paymentStatusMap = new Map<string, { verified: boolean; lastStatus: string }>();
      const paymentTable = detectedPaymentTable || 'payments';
      if (userIds.length > 0 && (await checkTableExists(paymentTable))) {
        try {
          const { data: payments } = await supabase
            .from(paymentTable)
            .select('user_id, status, created_at')
            .in('user_id', userIds)
            .order('created_at', { ascending: false });

          payments?.forEach((p) => {
            if (!paymentStatusMap.has(p.user_id)) {
              paymentStatusMap.set(p.user_id, {
                verified: p.status === 'verified',
                lastStatus: p.status,
              });
            } else if (p.status === 'verified') {
              paymentStatusMap.set(p.user_id, {
                verified: true,
                lastStatus: 'verified',
              });
            }
          });
        } catch {
          // ignore
        }
      }

      const subscriptions: SubscriptionRecord[] = rows.map((r) => {
        const payInfo = paymentStatusMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          plan_id: r.plan_id,
          plan_name: planMap.get(r.plan_id) || 'Standard',
          status: r.status,
          start_date: r.start_date,
          expiry_date: r.expiry_date,
          trial_end_date: r.trial_end_date,
          created_at: r.created_at,
          user: userMap.get(r.user_id),
          payment_verified: payInfo?.verified ?? false,
          last_payment_status: payInfo?.lastStatus ?? null,
        };
      });

      return { subscriptions, totalCount: count || subscriptions.length };
    } catch {
      return { subscriptions: [], totalCount: 0 };
    }
  },

  async updateSubscription(
    subscriptionId: string,
    payload: {
      status?: 'trial' | 'active' | 'expired' | 'cancelled';
      plan_id?: string | null;
      expiry_date?: string | null;
      start_date?: string | null;
      notes?: string;
    }
  ): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();
    const supabase = getSupabase();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.status) updatePayload.status = payload.status;
    if (payload.plan_id !== undefined) updatePayload.plan_id = payload.plan_id;
    if (payload.expiry_date !== undefined) updatePayload.expiry_date = payload.expiry_date;
    if (payload.start_date !== undefined) updatePayload.start_date = payload.start_date;

    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('user_id, status, plan_id')
      .eq('id', subscriptionId)
      .maybeSingle();

    const { error } = await supabase.from('subscriptions').update(updatePayload).eq('id', subscriptionId);
    if (error) throw error;

    await this.logActivity(
      `Updated user subscription ${subscriptionId} to status: ${payload.status || 'modified'}`,
      currentSub?.user_id,
      {
        subscription_id: subscriptionId,
        previous_status: currentSub?.status,
        new_status: payload.status,
        plan_id: payload.plan_id,
        expiry_date: payload.expiry_date,
        notes: payload.notes,
      }
    );
  },

  // ----------------------------------------------------
  // BUSINESSES
  // ----------------------------------------------------
  async getBusinesses(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ businesses: BusinessRecord[]; totalCount: number }> {
    if (!isSupabaseConfigured() || !(await checkTableExists('businesses'))) {
      return { businesses: [], totalCount: 0 };
    }
    await detectTables();
    const supabase = getSupabase();
    const userTable = detectedUserTable || 'profiles';

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from('businesses').select('*', { count: 'exact' });

      if (params.search && params.search.trim()) {
        const s = params.search.trim();
        query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,gst_number.ilike.%${s}%`);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        return { businesses: [], totalCount: 0 };
      }

      const rows = data || [];
      const userIds = rows.map((r) => r.user_id).filter(Boolean);

      const userMap = new Map<string, { name: string; email: string }>();
      if (userIds.length > 0 && (await checkTableExists(userTable))) {
        try {
          const { data: users } = await supabase.from(userTable).select('id, full_name, name, email').in('id', userIds);
          users?.forEach((u) => {
            userMap.set(u.id, {
              name: u.full_name || u.name || 'User',
              email: u.email || '',
            });
          });
        } catch {
          // ignore
        }
      }

      const businesses: BusinessRecord[] = rows.map((b) => {
        const owner = userMap.get(b.user_id);
        return {
          id: b.id,
          user_id: b.user_id,
          name: b.name,
          address: b.address || null,
          phone: b.phone || null,
          business_type: b.business_type || b.type || null,
          gst_number: b.gst_number || b.gst || null,
          status: b.status || 'active',
          created_at: b.created_at || new Date().toISOString(),
          owner_name: owner?.name || null,
          owner_email: owner?.email || null,
        };
      });

      return { businesses, totalCount: count || businesses.length };
    } catch {
      return { businesses: [], totalCount: 0 };
    }
  },

  // ----------------------------------------------------
  // RECHARGE TRANSACTIONS
  // ----------------------------------------------------
  async getRechargeTransactions(params: {
    type?: 'all' | 'mobile' | 'dth';
    status?: 'all' | 'pending' | 'success' | 'failed';
    page?: number;
    pageSize?: number;
  }): Promise<{ recharges: RechargeRecord[]; totalCount: number }> {
    if (!isSupabaseConfigured()) return { recharges: [], totalCount: 0 };
    await detectTables();
    const supabase = getSupabase();
    const rechargeTable = detectedRechargeTable || 'recharge_transactions';
    const userTable = detectedUserTable || 'profiles';

    if (!(await checkTableExists(rechargeTable))) {
      return { recharges: [], totalCount: 0 };
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from(rechargeTable).select('*', { count: 'exact' });

      if (params.type && params.type !== 'all') {
        query = query.eq('type', params.type);
      }
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        return { recharges: [], totalCount: 0 };
      }

      const rows = data || [];
      const userIds = rows.map((r) => r.user_id).filter(Boolean);

      const userMap = new Map<string, UserRecord>();
      if (userIds.length > 0 && (await checkTableExists(userTable))) {
        try {
          const { data: users } = await supabase.from(userTable).select('id, full_name, name, email, phone').in('id', userIds);
          users?.forEach((u) => {
            userMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || u.name || null,
              email: u.email || null,
              phone: u.phone || null,
              role: 'user',
              status: 'active',
              created_at: '',
              last_sign_in_at: null,
            });
          });
        } catch {
          // ignore
        }
      }

      const recharges: RechargeRecord[] = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        mobile_number: r.mobile_number || r.customer_id || r.phone || 'N/A',
        operator: r.operator || 'General',
        amount: Number(r.amount) || 0,
        type: r.type || 'mobile',
        status: r.status || 'pending',
        api_txn_id: r.api_txn_id || r.reference_id || null,
        created_at: r.created_at || new Date().toISOString(),
        user: userMap.get(r.user_id),
      }));

      return { recharges, totalCount: count || recharges.length };
    } catch {
      return { recharges: [], totalCount: 0 };
    }
  },

  // ----------------------------------------------------
  // INVOICES
  // ----------------------------------------------------
  async getInvoices(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ invoices: InvoiceRecord[]; totalCount: number }> {
    if (!isSupabaseConfigured() || !(await checkTableExists('invoices'))) {
      return { invoices: [], totalCount: 0 };
    }
    await detectTables();
    const supabase = getSupabase();
    const userTable = detectedUserTable || 'profiles';

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from('invoices').select('*', { count: 'exact' });

      if (params.search && params.search.trim()) {
        const s = params.search.trim();
        query = query.or(`invoice_number.ilike.%${s}%,customer_name.ilike.%${s}%`);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        return { invoices: [], totalCount: 0 };
      }

      const rows = data || [];
      const userIds = rows.map((r) => r.user_id).filter(Boolean);

      const userMap = new Map<string, UserRecord>();
      if (userIds.length > 0 && (await checkTableExists(userTable))) {
        try {
          const { data: users } = await supabase.from(userTable).select('id, full_name, name, email').in('id', userIds);
          users?.forEach((u) => {
            userMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || u.name || null,
              email: u.email || null,
              phone: null,
              role: 'user',
              status: 'active',
              created_at: '',
              last_sign_in_at: null,
            });
          });
        } catch {
          // ignore
        }
      }

      const invoices: InvoiceRecord[] = rows.map((r) => ({
        id: r.id,
        invoice_number: r.invoice_number || `INV-${r.id.slice(0, 6)}`,
        user_id: r.user_id,
        business_id: r.business_id,
        business_name: r.business_name || null,
        customer_name: r.customer_name || 'Walk-in Customer',
        customer_phone: r.customer_phone || null,
        amount: Number(r.amount || r.total_amount) || 0,
        status: r.status || 'paid',
        created_at: r.created_at || new Date().toISOString(),
        user: userMap.get(r.user_id),
      }));

      return { invoices, totalCount: count || invoices.length };
    } catch {
      return { invoices: [], totalCount: 0 };
    }
  },

  // ----------------------------------------------------
  // SUPPORT / ENQUIRIES
  // ----------------------------------------------------
  async getSupportTickets(params: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ tickets: SupportTicketRecord[]; totalCount: number }> {
    if (!isSupabaseConfigured()) return { tickets: [], totalCount: 0 };
    await detectTables();
    const supabase = getSupabase();
    const supportTable = detectedSupportTable || 'support_tickets';
    const userTable = detectedUserTable || 'profiles';

    if (!(await checkTableExists(supportTable))) {
      return { tickets: [], totalCount: 0 };
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from(supportTable).select('*', { count: 'exact' });

      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        return { tickets: [], totalCount: 0 };
      }

      const rows = data || [];
      const userIds = rows.map((r) => r.user_id).filter(Boolean);

      const userMap = new Map<string, UserRecord>();
      if (userIds.length > 0 && (await checkTableExists(userTable))) {
        try {
          const { data: users } = await supabase.from(userTable).select('id, full_name, name, email, phone').in('id', userIds);
          users?.forEach((u) => {
            userMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || u.name || null,
              email: u.email || null,
              phone: u.phone || null,
              role: 'user',
              status: 'active',
              created_at: '',
              last_sign_in_at: null,
            });
          });
        } catch {
          // ignore
        }
      }

      const tickets: SupportTicketRecord[] = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        subject: r.subject || r.title || 'Inquiry',
        message: r.message || r.description || '',
        status: r.status || 'open',
        admin_notes: r.admin_notes || null,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || r.created_at || new Date().toISOString(),
        user: userMap.get(r.user_id),
      }));

      return { tickets, totalCount: count || tickets.length };
    } catch {
      return { tickets: [], totalCount: 0 };
    }
  },

  async updateTicketStatus(ticketId: string, status: string, adminNotes?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await detectTables();
    const supabase = getSupabase();
    const supportTable = detectedSupportTable || 'support_tickets';

    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (adminNotes !== undefined) {
      updatePayload.admin_notes = sanitizeText(adminNotes, 2000);
    }

    const { error } = await supabase.from(supportTable).update(updatePayload).eq('id', ticketId);
    if (error) throw error;

    await this.logActivity(`Updated support ticket ${ticketId} status to ${status}`, null, {
      ticket_id: ticketId,
      status,
      admin_notes: adminNotes,
    });
  },

  // ----------------------------------------------------
  // GLOBAL SEARCH
  // ----------------------------------------------------
  async globalSearch(query: string): Promise<{
    users: UserRecord[];
    businesses: BusinessRecord[];
    payments: PaymentRequestRecord[];
    invoices: InvoiceRecord[];
  }> {
    if (!isSupabaseConfigured() || !query || query.trim().length < 2) {
      return { users: [], businesses: [], payments: [], invoices: [] };
    }

    await detectTables();
    const supabase = getSupabase();
    const userTable = detectedUserTable || 'profiles';
    const paymentTable = detectedPaymentTable || 'payments';
    const q = query.trim();

    const [hasUser, hasBiz, hasPay, hasInv] = await Promise.all([
      checkTableExists(userTable),
      checkTableExists('businesses'),
      checkTableExists(paymentTable),
      checkTableExists('invoices'),
    ]);

    const promises: Promise<any>[] = [
      hasUser
        ? Promise.resolve(
            supabase
              .from(userTable)
              .select('*')
              .or(
                isValidUuid(q)
                  ? `id.eq.${q},full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
                  : `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
              )
              .limit(5)
          )
        : Promise.resolve({ data: [] }),
      hasBiz
        ? Promise.resolve(supabase.from('businesses').select('*').or(`name.ilike.%${q}%,phone.ilike.%${q}%,gst_number.ilike.%${q}%`).limit(5))
        : Promise.resolve({ data: [] }),
      hasPay
        ? Promise.resolve(
            supabase
              .from(paymentTable)
              .select('*')
              .or(
                isValidUuid(q)
                  ? `id.eq.${q},utr.ilike.%${q}%`
                  : `utr.ilike.%${q}%`
              )
              .limit(5)
          )
        : Promise.resolve({ data: [] }),
      hasInv
        ? Promise.resolve(supabase.from('invoices').select('*').or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%`).limit(5))
        : Promise.resolve({ data: [] }),
    ];

    const [usersRes, bizRes, payRes, invRes] = await Promise.allSettled(promises);

    const users: UserRecord[] =
      usersRes.status === 'fulfilled' && usersRes.value.data
        ? usersRes.value.data.map((u: any) => ({
            id: u.id,
            email: u.email || null,
            phone: u.phone || u.mobile || null,
            full_name: u.full_name || u.name || null,
            role: u.role || 'user',
            status: u.status || 'active',
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at || null,
          }))
        : [];

    const businesses: BusinessRecord[] =
      bizRes.status === 'fulfilled' && bizRes.value.data
        ? bizRes.value.data.map((b: any) => ({
            id: b.id,
            user_id: b.user_id,
            name: b.name,
            address: b.address,
            phone: b.phone,
            business_type: b.business_type,
            gst_number: b.gst_number,
            status: b.status,
            created_at: b.created_at,
          }))
        : [];

    const payments: PaymentRequestRecord[] =
      payRes.status === 'fulfilled' && payRes.value.data
        ? payRes.value.data.map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            plan_id: p.plan_id,
            amount: Number(p.amount) || 0,
            utr: p.utr || 'N/A',
            status: p.status,
            created_at: p.created_at,
          }))
        : [];

    const invoices: InvoiceRecord[] =
      invRes.status === 'fulfilled' && invRes.value.data
        ? invRes.value.data.map((i: any) => ({
            id: i.id,
            invoice_number: i.invoice_number,
            user_id: i.user_id,
            customer_name: i.customer_name,
            amount: Number(i.amount) || 0,
            status: i.status,
            created_at: i.created_at,
          }))
        : [];

    return { users, businesses, payments, invoices };
  },
};
