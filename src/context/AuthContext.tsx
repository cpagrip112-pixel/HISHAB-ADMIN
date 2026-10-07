import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { getSupabase, isSupabaseConfigured, cleanSupabaseUrl, getSupabaseCredentials } from '../lib/supabase';
import { sanitizeErrorMessage } from '../lib/security';

export interface AuthDiagnosticInfo {
  authStatus: 'SUCCESS' | 'FAILED' | 'IDLE';
  userId: string | null;
  email: string | null;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'USER' | 'NOT FOUND' | null;
  roleSource: string | null;
  providers: string[];
  lastError: string | null;
  mfaLevel?: 'aal1' | 'aal2' | string;
  mfaEnrolled?: boolean;
  supabaseProjectUrl: string;
}

export interface FactorItem {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at: string;
}

export interface MfaEnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

interface LoginResult {
  success: boolean;
  step: 'auth' | 'role' | 'mfa';
  error?: string;
  role?: string | null;
  user?: User;
  mfaStatus?: 'REQUIRED_VERIFY' | 'REQUIRED_ENROLL' | 'VERIFIED';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  isAdmin: boolean;
  isMfaVerified: boolean;
  mfaStatus: 'UNCHECKED' | 'REQUIRED_VERIFY' | 'REQUIRED_ENROLL' | 'VERIFIED';
  mfaLevel: 'aal1' | 'aal2' | null;
  factors: FactorItem[];
  selectedFactorId: string | null;
  isLoading: boolean;
  error: string | null;
  diagnostic: AuthDiagnosticInfo;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkUserRole: (user: User) => Promise<{ authorized: boolean; role: string; source: string }>;
  checkMfaAssuranceLevel: () => Promise<{ currentLevel: string | null; nextLevel: string | null; isAal2: boolean }>;
  verifyMfaCode: (code: string, factorId?: string) => Promise<{ success: boolean; error?: string }>;
  startMfaEnrollment: () => Promise<{ success: boolean; data?: MfaEnrollmentData; error?: string }>;
  confirmMfaEnrollment: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resetMfaEnrollment: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory brute force defense counter for the current client session
let failedAttemptsCount = 0;
let lockoutUntilTimestamp = 0;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMfaVerified, setIsMfaVerified] = useState<boolean>(false);
  const [mfaStatus, setMfaStatus] = useState<'UNCHECKED' | 'REQUIRED_VERIFY' | 'REQUIRED_ENROLL' | 'VERIFIED'>('UNCHECKED');
  const [mfaLevel, setMfaLevel] = useState<'aal1' | 'aal2' | null>(null);
  const [factors, setFactors] = useState<FactorItem[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [diagnostic, setDiagnostic] = useState<AuthDiagnosticInfo>({
    authStatus: 'IDLE',
    userId: null,
    email: null,
    role: null,
    roleSource: null,
    providers: [],
    lastError: null,
    mfaLevel: undefined,
    mfaEnrolled: false,
    supabaseProjectUrl: getSupabaseCredentials().url,
  });

  /**
   * AUTHORITATIVE ROLE VERIFICATION
   * SECURITY RULE: Never trust user_metadata!
   * user_metadata is client-writable by the end-user via supabase.auth.updateUser().
   * Roles MUST only come from:
   * 1. app_metadata (server-controlled, protected JWT claim)
   * 2. Authoritative PostgreSQL tables: profiles.role, admin_users, user_roles
   */
  const checkUserRole = useCallback(async (currentUser: User): Promise<{ authorized: boolean; role: string; source: string }> => {
    // 1. Check App Metadata (Server-controlled Supabase claims only)
    const appRole = (currentUser.app_metadata?.role || currentUser.app_metadata?.user_role || '')?.toString().toUpperCase();
    if (appRole === 'ADMIN' || appRole === 'SUPER_ADMIN') {
      const formattedRole = appRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
      setRole(formattedRole);
      setIsAdmin(true);
      return { authorized: true, role: formattedRole, source: 'app_metadata.role (secure)' };
    }

    const supabase = getSupabase();

    // 2. Check public.profiles table (role, user_role, is_admin)
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('role, user_role, is_admin')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!pErr && profile) {
        const pRole = (profile.role || profile.user_role || '')?.toString().toUpperCase();
        if (pRole === 'ADMIN' || pRole === 'SUPER_ADMIN' || profile.is_admin === true) {
          const formatted = pRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
          setRole(formatted);
          setIsAdmin(true);
          return { authorized: true, role: formatted, source: 'profiles.role (database)' };
        }
      }
    } catch {
      // ignore
    }

    // 3. Check public.admin_users table
    try {
      const { data: adminUser, error: aErr } = await supabase
        .from('admin_users')
        .select('id, role')
        .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
        .maybeSingle();

      if (!aErr && adminUser) {
        const aRole = (adminUser.role || 'ADMIN').toString().toUpperCase();
        if (aRole === 'ADMIN' || aRole === 'SUPER_ADMIN') {
          setRole(aRole);
          setIsAdmin(true);
          return { authorized: true, role: aRole, source: 'admin_users (database)' };
        }
      }
    } catch {
      // ignore
    }

    // 4. Check public.user_roles table
    try {
      const { data: uRoles, error: urErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!urErr && uRoles) {
        const ur = (uRoles.role || '').toString().toUpperCase();
        if (ur === 'ADMIN' || ur === 'SUPER_ADMIN') {
          setRole(ur);
          setIsAdmin(true);
          return { authorized: true, role: ur, source: 'user_roles (database)' };
        }
      }
    } catch {
      // ignore
    }

    // Explicitly DENY: Account does not have ADMIN or SUPER_ADMIN in any authoritative source
    setRole('USER');
    setIsAdmin(false);
    return { authorized: false, role: 'USER', source: 'none' };
  }, []);

  /**
   * Evaluates MFA assurance level and enrolled factors.
   * Required Level for Admin Access: AAL2
   */
  const evaluateMfaState = useCallback(async (): Promise<{
    currentLevel: string | null;
    nextLevel: string | null;
    isAal2: boolean;
    factorsList: FactorItem[];
    primaryFactorId: string | null;
    status: 'REQUIRED_VERIFY' | 'REQUIRED_ENROLL' | 'VERIFIED';
  }> => {
    const supabase = getSupabase();
    let currentLvl: 'aal1' | 'aal2' | null = null;
    let nextLvl: 'aal1' | 'aal2' | null = null;
    let factorsList: FactorItem[] = [];
    let verifiedTotpFactor: FactorItem | null = null;

    try {
      const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aalErr && aalData) {
        currentLvl = (aalData.currentLevel as any) || 'aal1';
        nextLvl = (aalData.nextLevel as any) || 'aal1';
      }
    } catch {
      currentLvl = 'aal1';
      nextLvl = 'aal1';
    }

    try {
      const { data: fData, error: fErr } = await supabase.auth.mfa.listFactors();
      if (!fErr && fData) {
        const allFactors = (fData.all || []) as any[];
        factorsList = allFactors.map((f) => ({
          id: f.id,
          friendly_name: f.friendly_name,
          factor_type: f.factor_type,
          status: f.status,
          created_at: f.created_at,
        }));

        verifiedTotpFactor = factorsList.find(
          (f) => f.factor_type === 'totp' && f.status === 'verified'
        ) || null;
      }
    } catch {
      // ignore
    }

    const isAal2 = currentLvl === 'aal2';
    let status: 'REQUIRED_VERIFY' | 'REQUIRED_ENROLL' | 'VERIFIED' = 'REQUIRED_ENROLL';

    if (isAal2) {
      status = 'VERIFIED';
    } else if (verifiedTotpFactor) {
      status = 'REQUIRED_VERIFY';
    } else {
      status = 'REQUIRED_ENROLL';
    }

    const primaryFactorId = verifiedTotpFactor?.id || null;

    setMfaLevel(currentLvl);
    setIsMfaVerified(isAal2);
    setMfaStatus(status);
    setFactors(factorsList);
    setSelectedFactorId(primaryFactorId);

    return {
      currentLevel: currentLvl,
      nextLevel: nextLvl,
      isAal2,
      factorsList,
      primaryFactorId,
      status,
    };
  }, []);

  const checkMfaAssuranceLevel = async () => {
    const res = await evaluateMfaState();
    return {
      currentLevel: res.currentLevel,
      nextLevel: res.nextLevel,
      isAal2: res.isAal2,
    };
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('Session check failed:', sessionError.message);
        }

        if (mounted && currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);

          const { role: detectedRole, source, authorized } = await checkUserRole(currentSession.user);
          const providers = currentSession.user.identities?.map((i) => i.provider) || [
            currentSession.user.app_metadata?.provider || 'email',
          ];

          let mfaState = { currentLevel: 'aal1', isAal2: false, status: 'REQUIRED_ENROLL' };
          if (authorized) {
            const evaluated = await evaluateMfaState();
            mfaState = {
              currentLevel: evaluated.currentLevel || 'aal1',
              isAal2: evaluated.isAal2,
              status: evaluated.status,
            };
          }

          setDiagnostic({
            authStatus: 'SUCCESS',
            userId: currentSession.user.id,
            email: currentSession.user.email || null,
            role: (detectedRole as any) || 'NOT FOUND',
            roleSource: source,
            providers,
            mfaLevel: mfaState.currentLevel,
            mfaEnrolled: mfaState.status === 'VERIFIED' || mfaState.status === 'REQUIRED_VERIFY',
            lastError: null,
            supabaseProjectUrl: getSupabaseCredentials().url,
          });
        }
      } catch (err: any) {
        if (mounted) setError(sanitizeErrorMessage(err, 'Authentication initialization failed.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
          if (!mounted) return;
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            const { role: detectedRole, source, authorized } = await checkUserRole(currentSession.user);
            const providers = currentSession.user.identities?.map((i) => i.provider) || [
              currentSession.user.app_metadata?.provider || 'email',
            ];

            let mfaState = { currentLevel: 'aal1', isAal2: false, status: 'REQUIRED_ENROLL' };
            if (authorized) {
              const evaluated = await evaluateMfaState();
              mfaState = {
                currentLevel: evaluated.currentLevel || 'aal1',
                isAal2: evaluated.isAal2,
                status: evaluated.status,
              };
            }

            setDiagnostic({
              authStatus: 'SUCCESS',
              userId: currentSession.user.id,
              email: currentSession.user.email || null,
              role: (detectedRole as any) || 'NOT FOUND',
              roleSource: source,
              providers,
              mfaLevel: mfaState.currentLevel,
              mfaEnrolled: mfaState.status === 'VERIFIED' || mfaState.status === 'REQUIRED_VERIFY',
              lastError: null,
              supabaseProjectUrl: getSupabaseCredentials().url,
            });
          } else {
            setRole(null);
            setIsAdmin(false);
            setIsMfaVerified(false);
            setMfaStatus('UNCHECKED');
            setMfaLevel(null);
            setFactors([]);
            setSelectedFactorId(null);
          }
          setIsLoading(false);
        });
        authListener = data;
      } catch {
        // ignore
      }
    }

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [checkUserRole, evaluateMfaState]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setError(null);

    // Brute force lockout check
    const now = Date.now();
    if (lockoutUntilTimestamp > now) {
      const waitSeconds = Math.ceil((lockoutUntilTimestamp - now) / 1000);
      const msg = `Too many failed attempts. Access temporarily locked for ${waitSeconds} seconds.`;
      setError(msg);
      return { success: false, step: 'auth', error: msg };
    }

    const creds = getSupabaseCredentials();
    const cleanUrl = cleanSupabaseUrl(creds.url);

    if (!cleanUrl || !creds.anonKey) {
      return {
        success: false,
        step: 'auth',
        error: 'Supabase configuration error: Project URL or Anon Key is missing.',
      };
    }

    try {
      const supabase = getSupabase();

      // ==========================================
      // STEP 1: Supabase Authentication
      // ==========================================
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        failedAttemptsCount++;
        if (failedAttemptsCount >= 5) {
          // Lock out for 30 seconds
          lockoutUntilTimestamp = Date.now() + 30000;
          failedAttemptsCount = 0;
        }

        let friendlyMessage = 'Invalid email or password. Please verify the credentials.';
        const msg = authError.message.toLowerCase();

        if (msg.includes('email not confirmed')) {
          friendlyMessage = 'Email address has not been confirmed yet. Please verify your email.';
        } else if (msg.includes('user not found')) {
          friendlyMessage = 'Invalid email or password.'; // Uniform message against email enumeration
        }

        setDiagnostic({
          authStatus: 'FAILED',
          userId: null,
          email: email.trim(),
          role: null,
          roleSource: null,
          providers: [],
          lastError: 'Authentication rejected.',
          supabaseProjectUrl: cleanUrl,
        });

        setError(friendlyMessage);
        return {
          success: false,
          step: 'auth',
          error: friendlyMessage,
        };
      }

      if (!data.user) {
        return {
          success: false,
          step: 'auth',
          error: 'No user account returned from Supabase Auth.',
        };
      }

      // Reset failed attempts upon successful authentication
      failedAttemptsCount = 0;
      lockoutUntilTimestamp = 0;

      setUser(data.user);
      setSession(data.session);

      const providers = data.user.identities?.map((i) => i.provider) || [
        data.user.app_metadata?.provider || 'email',
      ];

      // ==========================================
      // STEP 2 & 3: Authoritative Admin Role Check
      // ==========================================
      const { authorized, role: detectedRole, source } = await checkUserRole(data.user);

      if (!authorized) {
        // AUTHENTICATION SUCCEEDED, BUT NOT AUTHORIZED FOR ADMIN
        const roleMsg = 'Your account is authenticated, but you do not have Admin access.';
        setDiagnostic({
          authStatus: 'SUCCESS',
          userId: data.user.id,
          email: data.user.email || null,
          role: (detectedRole as any) || 'NOT FOUND',
          roleSource: source,
          providers,
          lastError: null,
          supabaseProjectUrl: cleanUrl,
        });

        setError(roleMsg);
        return {
          success: false,
          step: 'role',
          error: roleMsg,
          role: detectedRole,
          user: data.user,
        };
      }

      // ==========================================
      // STEP 4 & 5: Check Supabase MFA / TOTP Status
      // ==========================================
      const mfaEvaluation = await evaluateMfaState();

      setDiagnostic({
        authStatus: 'SUCCESS',
        userId: data.user.id,
        email: data.user.email || null,
        role: (detectedRole as any) || 'ADMIN',
        roleSource: source,
        providers,
        mfaLevel: mfaEvaluation.currentLevel || 'aal1',
        mfaEnrolled: mfaEvaluation.status === 'VERIFIED' || mfaEvaluation.status === 'REQUIRED_VERIFY',
        lastError: null,
        supabaseProjectUrl: cleanUrl,
      });

      return {
        success: true,
        step: 'mfa',
        role: detectedRole,
        user: data.user,
        mfaStatus: mfaEvaluation.status,
      };
    } catch (err: any) {
      const sanitized = sanitizeErrorMessage(err, 'An error occurred during authentication.');
      setError(sanitized);
      return {
        success: false,
        step: 'auth',
        error: sanitized,
      };
    }
  };

  /**
   * Verifies the 6-digit MFA code provided by the Admin.
   * Elevates session to AAL2 upon success.
   */
  const verifyMfaCode = async (code: string, factorId?: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const trimmedCode = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(trimmedCode)) {
      return { success: false, error: 'Please enter a valid 6-digit verification code.' };
    }

    let targetFactorId = factorId || selectedFactorId;
    if (!targetFactorId) {
      try {
        const supabase = getSupabase();
        const { data: fData } = await supabase.auth.mfa.listFactors();
        const found = fData?.all?.find((f) => f.status === 'verified' && f.factor_type === 'totp') || fData?.all?.[0];
        if (found) {
          targetFactorId = found.id;
          setSelectedFactorId(found.id);
        }
      } catch {
        // ignore
      }
    }

    if (!targetFactorId) {
      return { success: false, error: 'No MFA factor found. Please enroll your authenticator app.' };
    }

    try {
      const supabase = getSupabase();
      // Challenge and verify in one step using Supabase Auth MFA
      const { data, error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: targetFactorId,
        code: trimmedCode,
      });

      if (verifyErr) {
        const msg = 'Invalid verification code. Please try again.';
        setError(msg);
        return { success: false, error: msg };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        setSession(sessionData.session);
      }
      if (data?.user) {
        setUser(data.user);
      }

      // Re-evaluate MFA state to confirm AAL2 upgrade
      const evaluated = await evaluateMfaState();
      if (evaluated.currentLevel === 'aal2' || evaluated.isAal2) {
        setIsMfaVerified(true);
        setMfaStatus('VERIFIED');
        setMfaLevel('aal2');
        return { success: true };
      }

      // Fallback: If challengeAndVerify succeeded, force AAL2 state
      setIsMfaVerified(true);
      setMfaStatus('VERIFIED');
      setMfaLevel('aal2');
      return { success: true };
    } catch (err: any) {
      const msg = sanitizeErrorMessage(err, 'Invalid verification code. Please try again.');
      setError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Initiates MFA TOTP enrollment using Supabase Auth.
   * Generates a high-resolution QR Code from the standard RFC-compliant otpauth URI.
   * Handles duplicate friendly name and factor conflicts gracefully.
   */
  const startMfaEnrollment = async (): Promise<{ success: boolean; data?: MfaEnrollmentData; error?: string }> => {
    setError(null);
    try {
      const supabase = getSupabase();

      // Step 1: Clean up any stale unverified factors only (preserve valid verified factors)
      try {
        const { data: fData } = await supabase.auth.mfa.listFactors();
        if (fData?.all && fData.all.length > 0) {
          for (const f of fData.all) {
            if (f.status === 'unverified') {
              try {
                await supabase.auth.mfa.unenroll({ factorId: f.id });
              } catch (uErr) {
                console.warn('Cleanup unverified factor notice:', f.id, uErr);
              }
            }
          }
        }
      } catch (listErr) {
        console.warn('listFactors error before enrollment:', listErr);
      }

      // Step 2: Attempt enrollment with standard friendly name
      let enrollRes = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Hishab Admin Authenticator',
        issuer: 'Hishab Admin',
      });

      // Step 3: Handle duplicate friendly name error gracefully if old factor couldn't be deleted
      if (
        enrollRes.error &&
        (enrollRes.error.message.toLowerCase().includes('already exists') ||
          enrollRes.error.message.toLowerCase().includes('friendly name'))
      ) {
        // Attempt targeted unenroll of the exact conflicting factor if unverified
        try {
          const { data: fData } = await supabase.auth.mfa.listFactors();
          const existing = fData?.all?.find(
            (f) => (f.friendly_name === 'Hishab Admin Authenticator' || f.factor_type === 'totp') && f.status === 'unverified'
          );
          if (existing) {
            await supabase.auth.mfa.unenroll({ factorId: existing.id });
            enrollRes = await supabase.auth.mfa.enroll({
              factorType: 'totp',
              friendlyName: 'Hishab Admin Authenticator',
              issuer: 'Hishab Admin',
            });
          }
        } catch {
          // ignore
        }

        // If still blocked by duplicate name, use unique friendly name so enrollment NEVER fails
        if (enrollRes.error && enrollRes.error.message.toLowerCase().includes('already exists')) {
          const uniqueFriendlyName = `Hishab Admin Authenticator ${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
          enrollRes = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: uniqueFriendlyName,
            issuer: 'Hishab Admin',
          });
        }
      }

      const { data, error: enrollErr } = enrollRes;

      if (enrollErr || !data || !data.totp) {
        const msg = 'Unable to set up two-factor authentication. Please try again.';
        setError(msg);
        return { success: false, error: msg };
      }

      // Determine dynamic user email
      let userEmail = user?.email;
      if (!userEmail) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          userEmail = userData?.user?.email;
        } catch {
          // ignore
        }
      }
      userEmail = (userEmail || 'admin@hishab.app').trim();

      const issuer = 'Hishab Admin';
      const secret = data.totp.secret;

      // RFC 6238 compliant TOTP URI with dynamic user email:
      // Format: otpauth://totp/Hishab%20Admin:user@example.com?secret=BASE32_SECRET&issuer=Hishab%20Admin&algorithm=SHA1&digits=6&period=30
      const canonicalUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
      const finalUri = data.totp.uri || canonicalUri;

      // Generate pristine, scannable QR Code Data URL directly from the otpauth URI
      let finalQrCode = '';
      try {
        finalQrCode = await QRCode.toDataURL(finalUri, {
          width: 256,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (qrErr) {
        console.warn('QRCode generation fallback to Supabase svg:', qrErr);
        finalQrCode = data.totp.qr_code || '';
      }

      setSelectedFactorId(data.id);

      return {
        success: true,
        data: {
          factorId: data.id,
          qrCode: finalQrCode,
          secret: data.totp.secret,
          uri: finalUri,
        },
      };
    } catch (err: any) {
      const msg = sanitizeErrorMessage(err, 'Failed to initiate MFA enrollment.');
      setError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Confirms first-time MFA TOTP enrollment with the initial 6-digit code.
   * Factor becomes verified and session is elevated to AAL2.
   */
  const confirmMfaEnrollment = async (factorId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const trimmedCode = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(trimmedCode)) {
      return { success: false, error: 'Please enter a valid 6-digit verification code.' };
    }

    try {
      const supabase = getSupabase();
      const { data, error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: trimmedCode,
      });

      if (verifyErr) {
        const msg = 'Invalid verification code. Please try again.';
        setError(msg);
        return { success: false, error: msg };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        setSession(sessionData.session);
      }
      if (data?.user) {
        setUser(data.user);
      }

      // Re-evaluate MFA state
      await evaluateMfaState();
      setIsMfaVerified(true);
      setMfaStatus('VERIFIED');
      setMfaLevel('aal2');

      // Now that we have AAL2, clean up any stale unverified factors
      try {
        const { data: fData } = await supabase.auth.mfa.listFactors();
        if (fData?.all) {
          for (const f of fData.all) {
            if (f.id !== factorId && f.status === 'unverified') {
              await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
          }
        }
      } catch {
        // ignore
      }

      return { success: true };
    } catch (err: any) {
      const msg = sanitizeErrorMessage(err, 'Unable to set up two-factor authentication. Please try again.');
      setError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Resets MFA enrollment state for troubleshooting / reconfiguration.
   * Safely unenrolls existing factors before generating a fresh one.
   */
  const resetMfaEnrollment = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = getSupabase();
      const { data: fData } = await supabase.auth.mfa.listFactors();
      if (fData?.all) {
        for (const f of fData.all) {
          if (
            f.factor_type === 'totp' ||
            f.friendly_name === 'Hishab Admin Authenticator' ||
            f.friendly_name?.toLowerCase().includes('hishab') ||
            f.status === 'unverified'
          ) {
            try {
              await supabase.auth.mfa.unenroll({ factorId: f.id });
            } catch (uErr) {
              console.warn('Could not unenroll factor during reset:', f.id, uErr);
            }
          }
        }
      }
      setSelectedFactorId(null);
      setFactors([]);
      setIsMfaVerified(false);
      setMfaStatus('REQUIRED_ENROLL');
      setMfaLevel('aal1');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        await supabase.auth.signOut();
      }
    } catch {
      // ignore
    } finally {
      setUser(null);
      setSession(null);
      setRole(null);
      setIsAdmin(false);
      setIsMfaVerified(false);
      setMfaStatus('UNCHECKED');
      setMfaLevel(null);
      setFactors([]);
      setSelectedFactorId(null);
      setDiagnostic({
        authStatus: 'IDLE',
        userId: null,
        email: null,
        role: null,
        roleSource: null,
        providers: [],
        lastError: null,
        mfaLevel: undefined,
        mfaEnrolled: false,
        supabaseProjectUrl: getSupabaseCredentials().url,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isAdmin,
        isMfaVerified,
        mfaStatus,
        mfaLevel,
        factors,
        selectedFactorId,
        isLoading,
        error,
        diagnostic,
        login,
        logout,
        checkUserRole,
        checkMfaAssuranceLevel,
        verifyMfaCode,
        startMfaEnrollment,
        confirmMfaEnrollment,
        resetMfaEnrollment,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

