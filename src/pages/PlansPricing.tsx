import React, { useEffect, useState } from 'react';
import {
  Tag,
  Check,
  Star,
  RefreshCw,
  AlertCircle,
  Save,
  Plus,
  Database,
  Copy,
  Code,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminService, PLANS_SQL_MIGRATION } from '../services/adminService';
import { PlanRecord } from '../types';

export const PlansPricingPage: React.FC = () => {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTableAvailable, setIsTableAvailable] = useState<boolean | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  // Editable local state per plan
  const [editedPlans, setEditedPlans] = useState<{ [id: string]: Partial<PlanRecord> }>({});

  const availableFeatures = [
    'Billing',
    'Invoices',
    'Products',
    'Customers',
    'Reports',
    'Stock',
    'Priority Support',
    'Dedicated Manager',
    'Multiple Counter Billing',
    'Unlimited Staff Accounts',
  ];

  const fetchPlans = async (forceRecheck = false) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const tableReady = await adminService.isPlansTableAvailable(forceRecheck);
      setIsTableAvailable(tableReady);

      if (tableReady) {
        const data = await adminService.getPlans(forceRecheck);
        setPlans(data);
        // Initialize edit states
        const stateMap: { [id: string]: Partial<PlanRecord> } = {};
        data.forEach((p) => {
          stateMap[p.id] = { ...p };
        });
        setEditedPlans(stateMap);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to check plans schema in Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans(true);
  }, []);

  const handleRecheckSchema = async () => {
    setRechecking(true);
    setErrorMessage(null);
    try {
      const ready = await adminService.isPlansTableAvailable(true);
      setIsTableAvailable(ready);
      if (ready) {
        await fetchPlans(true);
        setSuccessMessage('Successfully connected to public.plans table in Supabase!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(
          'Table public.plans is still not detected in Supabase. Please execute the SQL migration in your Supabase SQL Editor and try again.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error checking table schema');
    } finally {
      setRechecking(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(PLANS_SQL_MIGRATION);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSeedDefaults = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await adminService.seedDefaultPlans();
      await fetchPlans(true);
      setSuccessMessage('Created the 3 required plans in Supabase: Monthly, 2 Years, 3 Years.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create default plans');
      setLoading(false);
    }
  };

  const handleFieldChange = (planId: string, field: keyof PlanRecord, value: any) => {
    setEditedPlans((prev) => {
      const current = prev[planId] || {};
      const updated = { ...current, [field]: value };

      // Enforce: ONLY ONE plan can be marked Popular at a time
      if (field === 'is_popular' && value === true) {
        const nextMap = { ...prev, [planId]: updated };
        Object.keys(nextMap).forEach((id) => {
          if (id !== planId) {
            nextMap[id] = { ...nextMap[id], is_popular: false };
          }
        });
        return nextMap;
      }

      return { ...prev, [planId]: updated };
    });
  };

  const handleFeatureToggle = (planId: string, feature: string) => {
    setEditedPlans((prev) => {
      const current = prev[planId] || {};
      const currentFeatures: string[] = current.features || [];
      const newFeatures = currentFeatures.includes(feature)
        ? currentFeatures.filter((f) => f !== feature)
        : [...currentFeatures, feature];

      return {
        ...prev,
        [planId]: {
          ...current,
          features: newFeatures,
        },
      };
    });
  };

  const handleSavePlan = async (planId: string) => {
    const planToSave = editedPlans[planId];
    if (!planToSave) return;

    setSavingId(planId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminService.updatePlan({
        id: planId,
        ...planToSave,
      });
      setSuccessMessage(`Successfully updated ${planToSave.name || 'plan'} in Supabase.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchPlans();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save plan to Supabase');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Plans &amp; Pricing Management
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
              EXACTLY 3 PLANS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure live plans in Supabase. Values saved here update the Hishab User Website in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTableAvailable === true && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Supabase public.plans Active
            </span>
          )}
          {isTableAvailable === false && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Table Setup Required
            </span>
          )}

          <button
            onClick={() => fetchPlans(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Missing public.plans Warning Banner */}
      {isTableAvailable === false && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Database Migration Required: public.plans
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                The <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-semibold">public.plans</code> table has not been created yet in your connected Supabase project. To manage subscription tiers and feed dynamic pricing to the Hishab User Website, execute the SQL migration below in your Supabase SQL Editor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL COPIED TO CLIPBOARD!' : 'COPY SQL MIGRATION SCRIPT'}</span>
            </button>

            <button
              onClick={handleRecheckSchema}
              disabled={rechecking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs border border-amber-300 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>{rechecking ? 'Checking Supabase...' : 'Recheck Schema'}</span>
            </button>

            <button
              onClick={() => setShowSqlCode(!showSqlCode)}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950 ml-auto cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showSqlCode ? 'Hide SQL' : 'View SQL Code'}</span>
              {showSqlCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showSqlCode && (
            <div className="mt-3 bg-slate-950 text-slate-300 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-64 border border-slate-800">
              <pre>{PLANS_SQL_MIGRATION}</pre>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
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

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Fetching real plans from Supabase...</span>
        </div>
      ) : isTableAvailable === false ? null : plans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
          <Tag className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">
            No plans configured in Supabase yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Hishab requires exactly 3 standard plans: Monthly, 2 Years, and 3 Years. Click below to initialize these rows in your Supabase database.
          </p>
          <button
            onClick={handleSeedDefaults}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Initialize 3 Plans in Supabase</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((p, idx) => {
            const edit = editedPlans[p.id] || p;
            const isSaving = savingId === p.id;
            const isPopular = Boolean(edit.is_popular);

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border ${
                  isPopular
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 shadow-2xs'
                } flex flex-col overflow-hidden transition-all`}
              >
                {/* Plan Header */}
                <div className={`p-5 border-b ${isPopular ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50/70 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      PLAN #{idx + 1}
                    </span>
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
                        <Star className="w-3 h-3 fill-current" />
                        POPULAR
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={edit.name || ''}
                    onChange={(e) => handleFieldChange(p.id, 'name', e.target.value)}
                    className="mt-2 text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                    placeholder="Plan Name"
                  />
                  <input
                    type="text"
                    value={edit.description || ''}
                    onChange={(e) => handleFieldChange(p.id, 'description', e.target.value)}
                    className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full mt-1"
                    placeholder="Short description"
                  />
                </div>

                {/* Plan Form Fields */}
                <div className="p-5 space-y-4 text-xs flex-1">
                  {/* Price */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={edit.price ?? 0}
                        onChange={(e) => handleFieldChange(p.id, 'price', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="299"
                      />
                    </div>
                  </div>

                  {/* Duration Text */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Duration Label
                      </label>
                      <input
                        type="text"
                        value={edit.duration || ''}
                        onChange={(e) => handleFieldChange(p.id, 'duration', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="1 Month"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Duration Months
                      </label>
                      <input
                        type="number"
                        value={edit.duration_months ?? 1}
                        onChange={(e) => handleFieldChange(p.id, 'duration_months', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {/* Active / Inactive & Popular Toggles */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(edit.is_active)}
                        onChange={(e) => handleFieldChange(p.id, 'is_active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        {edit.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(edit.is_popular)}
                        onChange={(e) => handleFieldChange(p.id, 'is_popular', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Popular Tag
                      </span>
                    </label>
                  </div>

                  {/* Features Checkboxes */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Included Features
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {availableFeatures.map((feat) => {
                        const hasFeat = (edit.features || []).includes(feat);
                        return (
                          <label
                            key={feat}
                            className={`flex items-center gap-2 p-1.5 rounded transition-colors cursor-pointer text-xs ${
                              hasFeat ? 'bg-blue-50/70 text-blue-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasFeat}
                              onChange={() => handleFeatureToggle(p.id, feat)}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span>{feat}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Save Button */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {p.id.slice(0, 6)}...
                  </span>

                  <button
                    onClick={() => handleSavePlan(p.id)}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSaving ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>SAVE PLAN</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
