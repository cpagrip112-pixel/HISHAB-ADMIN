import React, { useEffect, useState } from 'react';
import {
  Clock,
  Check,
  AlertCircle,
  Save,
  ShieldAlert,
  Database,
  Copy,
  RefreshCw,
  Code,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminService, APP_SETTINGS_SQL_MIGRATION } from '../services/adminService';

export const FreeTrialPage: React.FC = () => {
  const [trialDays, setTrialDays] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTableAvailable, setIsTableAvailable] = useState<boolean | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  const fetchSettings = async (forceRecheck = false) => {
    setLoading(true);
    try {
      const tableReady = await adminService.isAppSettingsTableAvailable(forceRecheck);
      setIsTableAvailable(tableReady);

      const settings = await adminService.getAppSettings(forceRecheck);
      setTrialDays(settings.free_trial_days || 15);
    } catch (err: any) {
      console.warn('Free trial settings query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings(true);
  }, []);

  const handleRecheckSchema = async () => {
    setRechecking(true);
    setErrorMessage(null);
    try {
      const ready = await adminService.refreshTableAvailability('app_settings');
      setIsTableAvailable(ready);
      if (ready) {
        await fetchSettings(true);
        setSuccessMessage('Successfully connected to public.app_settings table in Supabase!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(
          'Table public.app_settings is still not detected in Supabase. Please execute the SQL migration in your Supabase SQL Editor and try again.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error checking table schema');
    } finally {
      setRechecking(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(APP_SETTINGS_SQL_MIGRATION);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (trialDays < 0 || isNaN(trialDays)) {
        throw new Error('Trial days must be a non-negative number');
      }

      await adminService.updateFreeTrialDays(Number(trialDays));
      setIsTableAvailable(true);
      setSuccessMessage(`Successfully updated Free Trial Days to ${trialDays} days in Supabase public.app_settings.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to update settings in Supabase';
      setErrorMessage(msg);
      if (msg.includes('schema cache') || msg.includes('public.app_settings')) {
        setIsTableAvailable(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Free Trial Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Control the default trial period granted to new users registering on the Hishab platform.
          </p>
        </div>

        {/* Live Schema Availability Badge */}
        <div className="flex items-center gap-2">
          {isTableAvailable === true && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Supabase public.app_settings Active
            </span>
          )}
          {isTableAvailable === false && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Table Setup Required
            </span>
          )}
        </div>
      </div>

      {/* Missing public.app_settings Warning Banner */}
      {isTableAvailable === false && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Database Migration Required: public.app_settings
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                The <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono font-semibold">public.app_settings</code> table is not yet detected in your Supabase schema cache. To persist the global free trial duration to the shared database, execute the migration script in your Supabase SQL Editor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copied!' : 'Copy Migration SQL'}</span>
            </button>

            <button
              type="button"
              onClick={handleRecheckSchema}
              disabled={rechecking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white hover:bg-amber-100/60 rounded-xl border border-amber-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin text-amber-600' : 'text-amber-700'}`} />
              <span>{rechecking ? 'Rechecking...' : 'Recheck Database Schema'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlCode(!showSqlCode)}
              className="flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 font-semibold px-2 py-1 cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showSqlCode ? 'Hide SQL' : 'View SQL'}</span>
              {showSqlCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible SQL Script View */}
          {showSqlCode && (
            <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-60 relative">
              <pre className="whitespace-pre">{APP_SETTINGS_SQL_MIGRATION}</pre>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {(errorMessage.includes('schema cache') || errorMessage.includes('public.app_settings')) && (
            <button
              type="button"
              onClick={handleCopySql}
              className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg shrink-0 cursor-pointer"
            >
              Copy SQL
            </button>
          )}
        </div>
      )}

      {/* Settings Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Default Free Trial Days (For New Users)
            </label>
            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="number"
                min="0"
                max="365"
                value={loading ? '' : trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 0)}
                disabled={loading || saving}
                className="w-full px-4 py-2.5 text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                placeholder="15"
              />
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                DAYS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Default standard is <span className="font-semibold text-slate-700">15 days</span>. Value is securely stored in the <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">public.app_settings</code> table.
            </p>
          </div>

          {/* Quick preset selector */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Quick presets
            </span>
            <div className="flex items-center gap-2">
              {[7, 14, 15, 30, 60].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTrialDays(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    trialDays === preset
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset} Days
                </button>
              ))}
            </div>
          </div>

          {/* Important Notice Callout */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Important Architecture &amp; Subscription Rule</span>
            </div>
            <p className="leading-relaxed">
              Changing the global Free Trial Days value applies exclusively when initializing <strong>NEW</strong> user accounts. It will <strong>NOT</strong> reset, extend, or modify any existing users&apos; active <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">trial_end_date</code>.
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Note: Recharge services remain accessible even after trial expiry according to the Hishab business requirement.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>SAVE SETTINGS</span>
            </button>

            <button
              type="button"
              onClick={() => fetchSettings(true)}
              disabled={loading || saving}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reload from Supabase</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

