import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Database,
  CheckCircle2,
  Copy,
  Check,
  LogOut,
  Terminal,
  KeyRound,
  QrCode,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { HishabLogo } from '../components/HishabLogo';
import { useAuth, MfaEnrollmentData } from '../context/AuthContext';
import { isSupabaseConfigured, getSupabaseCredentials } from '../lib/supabase';

interface LoginPageProps {
  onOpenSettings?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenSettings }) => {
  const {
    login,
    logout,
    user,
    isAdmin,
    role,
    isMfaVerified,
    mfaStatus,
    mfaLevel,
    diagnostic,
    verifyMfaCode,
    startMfaEnrollment,
    confirmMfaEnrollment,
    resetMfaEnrollment,
  } = useAuth();

  // Primary Login Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Copy helpers
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // MFA Verification State
  const [mfaCode, setMfaCode] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // MFA Enrollment State
  const [enrollmentStep, setEnrollmentStep] = useState<'prompt' | 'active'>('prompt');
  const [enrollmentData, setEnrollmentData] = useState<MfaEnrollmentData | null>(null);
  const [loadingEnrollment, setLoadingEnrollment] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [confirmingEnrollment, setConfirmingEnrollment] = useState(false);

  const mfaInputRef = useRef<HTMLInputElement>(null);
  const enrollInputRef = useRef<HTMLInputElement>(null);

  const creds = getSupabaseCredentials();

  // Focus MFA input when entering verification view
  useEffect(() => {
    if (user && isAdmin && !isMfaVerified && mfaStatus === 'REQUIRED_VERIFY') {
      setTimeout(() => {
        mfaInputRef.current?.focus();
      }, 100);
    }
  }, [user, isAdmin, isMfaVerified, mfaStatus]);

  // Focus Enrollment input when entering setup view
  useEffect(() => {
    if (enrollmentStep === 'active' && enrollmentData) {
      setTimeout(() => {
        enrollInputRef.current?.focus();
      }, 100);
    }
  }, [enrollmentStep, enrollmentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setSubmitting(true);
    setErrorMessage(null);

    const res = await login(email, password);

    if (!res.success) {
      if (res.step === 'role') {
        setErrorMessage(res.error || 'Your account is authenticated, but you do not have Admin access.');
      } else {
        setErrorMessage(res.error || 'Invalid credentials or authentication error.');
      }
    }

    setSubmitting(false);
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setMfaError('Please enter a 6-digit verification code.');
      return;
    }

    setVerifyingMfa(true);
    setMfaError(null);

    const res = await verifyMfaCode(mfaCode.trim());
    if (!res.success) {
      setMfaError(res.error || 'Invalid verification code. Please check your authenticator app.');
    }

    setVerifyingMfa(false);
  };

  const handleStartEnrollment = async () => {
    setLoadingEnrollment(true);
    setMfaError(null);
    const res = await startMfaEnrollment();
    if (res.success && res.data) {
      setEnrollmentData(res.data);
      setEnrollmentStep('active');
    } else {
      setMfaError(res.error || 'Failed to initiate authenticator setup. Please try again.');
    }
    setLoadingEnrollment(false);
  };

  const handleConfirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentData) return;
    if (!enrollmentCode.trim() || enrollmentCode.trim().length !== 6) {
      setMfaError('Please enter the 6-digit code shown in your authenticator app.');
      return;
    }

    setConfirmingEnrollment(true);
    setMfaError(null);

    const res = await confirmMfaEnrollment(enrollmentData.factorId, enrollmentCode.trim());
    if (!res.success) {
      setMfaError(res.error || 'Invalid code. Please ensure your device clock is synced.');
    }

    setConfirmingEnrollment(false);
  };

  const handleReEnroll = async () => {
    await resetMfaEnrollment();
    setEnrollmentData(null);
    setEnrollmentStep('prompt');
    setMfaCode('');
    setMfaError(null);
  };

  const copyUserId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copySecretKey = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const grantAdminSql = user
    ? `-- Run this in your Supabase SQL Editor to grant ADMIN access to this account:
UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE id = '${user.id}';

-- Or in auth.users app_metadata:
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "ADMIN"}' 
WHERE id = '${user.id}';`
    : '';

  const copySqlSnippet = () => {
    navigator.clipboard.writeText(grantAdminSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  /**
   * Formats Supabase SVG string to a data URL for <img> tags
   */
  const getQrSrc = (raw: string): string => {
    if (!raw) return '';
    if (raw.startsWith('data:image/')) return raw;
    if (raw.startsWith('<svg')) {
      return `data:image/svg+xml;utf-8,${encodeURIComponent(raw)}`;
    }
    return raw;
  };

  // =========================================================================
  // VIEW 1: USER IS AUTHENTICATED IN SUPABASE AUTH BUT DOES NOT HAVE ADMIN ROLE
  // =========================================================================
  if (user && !isAdmin) {
    const userProviders = user.identities?.map((i) => i.provider) || [
      user.app_metadata?.provider || 'email',
    ];

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 space-y-5">
          {/* Header Icon */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Authentication Succeeded — Admin Access Required
            </h2>

            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl mt-3">
              Your account is authenticated, but you do not have Admin access.
            </p>
          </div>

          {/* SECURE DIAGNOSTIC STATE */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>Authentication Diagnostic State</span>
              <span className="font-mono text-emerald-600 font-bold">LIVE SUPABASE</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Authentication:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                SUCCESS
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Email:</span>
              <span className="font-bold text-slate-900">{user.email}</span>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5">Supabase User ID:</span>
              <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg">
                <span className="font-mono text-slate-800 text-[11px] truncate flex-1 select-all font-semibold">
                  {user.id}
                </span>
                <button
                  onClick={() => copyUserId(user.id)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded"
                  title="Copy User UUID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Admin Role:</span>
              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {role || 'USER / NOT FOUND'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Auth Providers:</span>
              <span className="font-mono text-slate-700">{userProviders.join(', ')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Connected Project:</span>
              <span className="font-mono text-slate-700 truncate max-w-xs">{creds.url}</span>
            </div>
          </div>

          {/* Secure SQL instructions for database administrator */}
          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span>Grant Admin Role in Supabase SQL Editor:</span>
              </span>
              <button
                onClick={copySqlSnippet}
                className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-2 bg-slate-900 text-slate-200 text-[10px] font-mono rounded overflow-x-auto select-all">
              {grantAdminSql}
            </pre>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              After running this query in your Supabase dashboard, refresh this page or re-login to access the Admin Panel.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out &amp; Use Another Account</span>
            </button>

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Database Settings
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED & ADMIN ROLE VERIFIED — MFA REQUIRED (AAL2 ENFORCEMENT)
  // =========================================================================
  if (user && isAdmin && !isMfaVerified) {
    // -----------------------------------------------------------------------
    // SUB-VIEW 2A: FIRST-TIME MFA ENROLLMENT (NO MFA FACTOR ENROLLED YET)
    // -----------------------------------------------------------------------
    if (mfaStatus === 'REQUIRED_ENROLL') {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] pointer-events-none" />

          <div className="relative w-full max-w-md">
            {/* Brand Header */}
            <div className="text-center mb-6 flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl mb-3">
                <HishabLogo size="lg" showTagline={false} />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">HISHAB ADMIN</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">Smart Billing &bull; Central Control Panel</p>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {enrollmentStep === 'prompt' ? (
                <>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <KeyRound className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      Secure Your Admin Account
                    </h2>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Admin access requires two-factor authentication. Set up your authenticator app before continuing.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>Supported Authenticator Apps</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Works with Google Authenticator, Microsoft Authenticator, 1Password, Authy, or any standard TOTP app.
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-200">
                      <span>Admin Account:</span>
                      <span className="font-bold text-slate-800">{user.email}</span>
                    </div>
                  </div>

                  {mfaError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">{mfaError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStartEnrollment}
                    disabled={loadingEnrollment}
                    className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loadingEnrollment ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>SET UP AUTHENTICATOR</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cancel &amp; Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                /* ACTIVE ENROLLMENT: QR CODE & 6-DIGIT CODE CONFIRMATION */
                <>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-2">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      Scan QR Code in Authenticator
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Open your authenticator app and scan the code below:
                    </p>
                  </div>

                  {/* QR Code Presentation */}
                  {enrollmentData?.qrCode && (
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center shadow-xs">
                      <img
                        src={getQrSrc(enrollmentData.qrCode)}
                        alt="TOTP Enrollment QR Code"
                        className="w-48 h-48 rounded-lg"
                      />
                    </div>
                  )}

                  {/* Manual Secret Key */}
                  {enrollmentData?.secret && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Manual Setup Key:</span>
                        <button
                          type="button"
                          onClick={() => copySecretKey(enrollmentData.secret)}
                          className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                        >
                          {copiedSecret ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSecret ? 'Copied' : 'Copy Key'}</span>
                        </button>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono text-xs font-bold text-slate-800 tracking-wider select-all break-all">
                        {enrollmentData.secret}
                      </div>
                    </div>
                  )}

                  {mfaError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">{mfaError}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmEnrollment} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                        Enter 6-Digit Code from Authenticator
                      </label>
                      <input
                        ref={enrollInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoComplete="one-time-code"
                        required
                        value={enrollmentCode}
                        onChange={(e) => setEnrollmentCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full text-center tracking-[0.4em] font-mono font-bold text-xl py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={confirmingEnrollment || enrollmentCode.length !== 6}
                      className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {confirmingEnrollment ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify &amp; Activate 2FA</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setEnrollmentStep('prompt')}
                      className="font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      &larr; Back
                    </button>

                    <button
                      type="button"
                      onClick={() => logout()}
                      className="font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // SUB-VIEW 2B: MFA VERIFICATION (FACTOR ALREADY ENROLLED / AAL1 -> AAL2)
    // -----------------------------------------------------------------------
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="relative w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-6 flex flex-col items-center">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl mb-3">
              <HishabLogo size="lg" showTagline={false} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">HISHAB ADMIN</h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">Smart Billing &bull; Central Control Panel</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Two-Factor Security Verification
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your 6-digit security code from your authenticator app.
              </p>
            </div>

            {/* Account pill */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate text-slate-900 font-semibold">{user.email}</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                AAL2 ENFORCED
              </span>
            </div>

            {mfaError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">{mfaError}</span>
                  <span className="text-[11px] text-rose-600 block">
                    Codes change every 30 seconds. Ensure your phone's clock is set automatically.
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  6-Digit Security Code
                </label>
                <div className="relative">
                  <input
                    ref={mfaInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.45em] font-mono font-bold text-2xl py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifyingMfa || mfaCode.length !== 6}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifyingMfa ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code &amp; Open Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Defense In Depth Note */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Security Assurance:</span>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                AAL2 Mandatory
              </span>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleReEnroll}
                className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset TOTP factor and generate fresh QR code"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-enroll Authenticator</span>
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: STANDARD ADMIN SIGN-IN FORM (STEP 1: EMAIL & PASSWORD)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand Presentation */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl mb-3">
            <HishabLogo size="lg" showTagline={false} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">HISHAB ADMIN</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Smart Billing. Simple Business. &bull; Central Control Panel
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 sm:p-8 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sign In to Administration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the same Gmail and password used on the Hishab User Website.
            </p>
          </div>

          {/* Supabase Connection State Pill */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-2 truncate">
              <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate text-[11px] font-mono">{creds.url || 'Not configured'}</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
              LIVE AUTH
            </span>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{errorMessage}</span>
                {errorMessage.includes('Invalid email or password') && (
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Note: If you previously registered using <strong>Google OAuth</strong> without setting a password, please verify your account configuration in your Supabase Auth dashboard.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Email (Gmail)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hishab.app"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In &amp; Proceed to MFA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* DIAGNOSTIC STATE DISPLAY (WHEN FAILED) */}
          {diagnostic.authStatus === 'FAILED' && diagnostic.lastError && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1 text-slate-600 font-mono">
              <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1">
                Auth Diagnostics:
              </div>
              <div><strong>Status:</strong> <span className="text-rose-600 font-bold">FAILED</span></div>
              {diagnostic.email && <div><strong>Attempted Email:</strong> {diagnostic.email}</div>}
              <div><strong>Supabase Response:</strong> {diagnostic.lastError}</div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-blue-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              MFA / TOTP Enforced
            </span>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-blue-600 hover:underline font-medium cursor-pointer"
              >
                Connection Settings
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
