import React, { useEffect, useState } from 'react';
import { Clock, Check, AlertCircle, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { adminService } from '../services/adminService';

export const FreeTrialPage: React.FC = () => {
  const [trialDays, setTrialDays] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await adminService.getAppSettings();
      setTrialDays(settings.free_trial_days || 15);
    } catch (err: any) {
      console.warn('Free trial settings query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
      setSuccessMessage(`Successfully updated Free Trial Days to ${trialDays} days in Supabase.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update settings in Supabase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>Free Trial Configuration</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Control the default trial period granted to new users registering on the Hishab platform.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Settings Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Free Trial Days
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
              Standard setting is <span className="font-semibold text-slate-700">15 days</span>. Value is securely stored in the <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">app_settings</code> table.
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
              Changing the global Free Trial Days value will <strong>NOT</strong> reset or modify existing users&apos; ongoing trial expiration dates. It applies automatically to newly registering accounts.
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Note: Recharge services remain accessible even after trial expiry according to the Hishab business requirement.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
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
          </div>
        </form>
      </div>
    </div>
  );
};
