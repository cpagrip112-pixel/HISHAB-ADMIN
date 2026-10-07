import React, { useEffect, useState } from 'react';
import {
  Settings,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Server,
  Shield,
  KeyRound,
  FileCode,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  testSupabaseConnection,
  saveSupabaseCredentials,
  clearCustomSupabaseCredentials,
  isSupabaseConfigured,
} from '../lib/supabase';
import { databaseHealthService } from '../services/databaseHealthService';

export const SettingsPage: React.FC = () => {
  const [credentials, setCredentials] = useState(getSupabaseCredentials());
  const [inputUrl, setInputUrl] = useState(credentials.url);
  const [inputAnonKey, setInputAnonKey] = useState(credentials.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tables?: { [key: string]: boolean };
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const runTest = async (url?: string, key?: string) => {
    setTesting(true);
    try {
      const res = await testSupabaseConnection(url, key);
      setTestResult(res);
      // Synchronize unified databaseHealthService cache
      databaseHealthService.clearCache();
      await databaseHealthService.checkHealth(true);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured()) {
      runTest();
    }
  }, []);

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputAnonKey.trim()) return;

    saveSupabaseCredentials(inputUrl, inputAnonKey);
    setCredentials(getSupabaseCredentials());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    runTest(inputUrl, inputAnonKey);
  };

  const handleReset = () => {
    clearCustomSupabaseCredentials();
    const creds = getSupabaseCredentials();
    setCredentials(creds);
    setInputUrl(creds.url);
    setInputAnonKey(creds.anonKey);
    runTest(creds.url, creds.anonKey);
  };

  const sqlSchemaScript = `-- HISHAB DATABASE COMPATIBILITY SCRIPT
-- Execute in your Supabase SQL Editor if any core table is missing.
-- Note: Reuses existing tables if already created (CREATE TABLE IF NOT EXISTS).

-- 1. Profiles / Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  business_type TEXT,
  gst_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Plans Table (Exactly 3 standard plans)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'trial',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payments Table (Manual UPI)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  utr TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Recharge Transactions Table
CREATE TABLE IF NOT EXISTS public.recharge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mobile_number TEXT NOT NULL,
  operator TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT DEFAULT 'mobile',
  status TEXT DEFAULT 'pending',
  api_txn_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. App Settings Table (Free trial days, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Admin Users Table (Authoritative Super-Admin & Admin role mapping)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN', -- 'ADMIN' or 'SUPER_ADMIN'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('free_trial_days', '15', 'Default trial days granted to new Hishab users'),
  ('upi_id', 'Q164166564@ybl', 'Manual UPI ID for subscription verification')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin WITH MFA (AAL2)
-- Enforces Supabase Auth Multi-Factor Authentication at the database Row Level Security layer!
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

-- Public read policy for app_settings (allows new user signup to know default trial duration)
CREATE POLICY public_read_settings ON public.app_settings FOR SELECT TO public USING (true);

-- Admin access policy for all tables
CREATE POLICY admin_all_profiles ON public.profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_businesses ON public.businesses FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_plans ON public.plans FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_subscriptions ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_payments ON public.payments FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_recharges ON public.recharge_transactions FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_invoices ON public.invoices FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_tickets ON public.support_tickets FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_activity ON public.admin_activity_logs FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_settings ON public.app_settings FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY admin_all_admin_users ON public.admin_users FOR ALL TO authenticated USING (public.is_admin());
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchemaScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span>System &amp; Database Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage connection parameters, verify table schema health, and test live database responsiveness.
        </p>
      </div>

      {/* Supabase Connection Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Supabase Connection Parameters
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runTest()}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        {/* Live Test Diagnostic Output */}
        {testResult && (
          <div
            className={`p-4 border-b text-xs flex items-start gap-3 ${
              testResult.success
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{testResult.message}</div>
              <div className="text-[11px] text-slate-600 mt-1">
                Connected instance: <code className="font-mono text-slate-800">{credentials.url || 'Not set'}</code>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveConnection} className="p-6 space-y-4 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Supabase Project URL
              </label>
              {credentials.isFromEnv && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  From Environment (.env)
                </span>
              )}
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Supabase Anonymous Public Key (Anon Key)
            </label>
            <input
              type="password"
              value={inputAnonKey}
              onChange={(e) => setInputAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600 text-[11px]">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              <span>Security Policy: Service Role Key Protection</span>
            </div>
            <p>
              The Supabase Service Role Key must <strong>NEVER</strong> be configured or exposed in the frontend browser client. High-privilege tasks are executed server-side via Supabase Auth policies and database functions.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Reset to Defaults
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Save Connection
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">
              Connection credentials updated!
            </div>
          )}
        </form>
      </div>

      {/* Schema / Table Health Check */}
      {testResult?.tables && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Server className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Database Table Health &amp; Schema Inspector
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {Object.entries(testResult.tables).map(([table, exists]) => (
              <div
                key={table}
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  exists
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <span className="font-mono font-medium">{table}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    exists
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {exists ? 'Active' : 'Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Schema SQL Helper */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Supabase Schema SQL Script
              </h3>
              <p className="text-xs text-slate-500">
                Execute in your Supabase SQL Editor if any table needs bootstrapping.
              </p>
            </div>
          </div>

          <button
            onClick={copySql}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedSql ? 'COPIED!' : 'COPY SQL'}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-72">
          <pre>{sqlSchemaScript}</pre>
        </div>
      </div>
    </div>
  );
};
