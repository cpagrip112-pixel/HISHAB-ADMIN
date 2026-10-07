import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Connection details can come from environment variables or custom runtime config
const DEFAULT_SUPABASE_URL = 'https://nbhepwxmfabftxyhdppi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iaGVwd3htZmFiZnR4eWhkcHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzU4NjgsImV4cCI6MjEwMjIxMTg2OH0.gkq4B05wuSaHOFwTmY8MziTGVCsRsKxMJe4JASZjQgA';

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const STORAGE_KEY_URL = 'hishab_admin_supabase_url';
const STORAGE_KEY_ANON_KEY = 'hishab_admin_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let currentUrl: string = '';
let currentAnonKey: string = '';

/**
 * Cleans and normalizes Supabase Project URL.
 * Automatically strips trailing slashes, /rest/v1, /rest, and /auth/v1
 * to prevent 404s on GoTrue auth endpoints.
 */
export function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Strip /rest/v1, /rest, /auth/v1 if accidentally appended
  url = url.replace(/\/rest\/v1\/?$/, '');
  url = url.replace(/\/rest\/?$/, '');
  url = url.replace(/\/auth\/v1\/?$/, '');
  return url.replace(/\/+$/, '');
}

export function getSupabaseCredentials(): { url: string; anonKey: string; isFromEnv: boolean } {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON_KEY) : null;

  if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
    return {
      url: cleanSupabaseUrl(ENV_SUPABASE_URL),
      anonKey: ENV_SUPABASE_ANON_KEY.trim(),
      isFromEnv: true,
    };
  }

  if (storedUrl && storedAnonKey) {
    return {
      url: cleanSupabaseUrl(storedUrl),
      anonKey: storedAnonKey.trim(),
      isFromEnv: false,
    };
  }

  return {
    url: cleanSupabaseUrl(ENV_SUPABASE_URL || ''),
    anonKey: (ENV_SUPABASE_ANON_KEY || '').trim(),
    isFromEnv: !!ENV_SUPABASE_URL,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && url.trim() && anonKey && anonKey.trim());
}

export function getSupabase(): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();
  const sanitizedUrl = cleanSupabaseUrl(url);

  if (!sanitizedUrl || !anonKey) {
    if (!cachedClient) {
      cachedClient = createClient(
        'https://placeholder-project.supabase.co',
        'placeholder-anon-key',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        }
      );
    }
    return cachedClient;
  }

  if (!cachedClient || currentUrl !== sanitizedUrl || currentAnonKey !== anonKey) {
    currentUrl = sanitizedUrl;
    currentAnonKey = anonKey;
    cachedClient = createClient(sanitizedUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return cachedClient;
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    const cleanUrl = cleanSupabaseUrl(url);
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEY_ANON_KEY, anonKey.trim());
    currentUrl = '';
    currentAnonKey = '';
    cachedClient = null;
  }
}

export function clearCustomSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON_KEY);
    currentUrl = '';
    currentAnonKey = '';
    cachedClient = null;
  }
}

export type TableStatus = 'ACTIVE' | 'MISSING' | 'ACCESS_ERROR' | 'TEMPORARY_ERROR';

export interface TableInspectionResult {
  table: string;
  status: TableStatus;
  exists: boolean;
  message?: string;
  statusCode?: number;
}

/**
 * Probes a single Supabase table and precisely categorizes its state:
 * - ACTIVE: HTTP 200/206/204 with no error (even if 0 rows)
 * - MISSING: Confirmed relation-not-found error (PGRST205 or PostgreSQL 42P01)
 * - ACCESS_ERROR: Permission denied or RLS restrictions (42501, 401, 403, PGRST301) - table exists!
 * - TEMPORARY_ERROR: Network glitch, AbortError, timeout, 5xx - table not missing!
 */
export async function probeTableHealth(
  client: SupabaseClient,
  tableName: string
): Promise<TableInspectionResult> {
  try {
    const { error, status } = await client.from(tableName).select('*').limit(1);

    // 1. TABLE EXISTS (HTTP/status 200, no error)
    if (!error && (status === 200 || status === 206 || status === 204)) {
      return {
        table: tableName,
        status: 'ACTIVE',
        exists: true,
        message: 'Table active and accessible',
        statusCode: status,
      };
    }

    if (!error) {
      return {
        table: tableName,
        status: 'ACTIVE',
        exists: true,
        message: 'Table accessible',
        statusCode: status,
      };
    }

    // 2. TABLE DOES NOT EXIST (Confirmed relation-not-found error: PostgreSQL 42P01 or PostgREST PGRST205)
    const isRelationNotFound =
      error.code === 'PGRST205' ||
      error.code === '42P01' ||
      (Boolean(error.message) && (
        (error.message.includes('Could not find the table') && !error.message.includes('column')) ||
        (error.message.includes('relation') && error.message.includes('does not exist'))
      ));

    if (isRelationNotFound) {
      return {
        table: tableName,
        status: 'MISSING',
        exists: false,
        message: error.message || 'Table does not exist',
        statusCode: status || 404,
      };
    }

    // 3. ACCESS / RLS ERROR (permission denied, RLS restriction, authentication error, 42501, 401, 403, PGRST301)
    const isAccessOrRls =
      error.code === '42501' ||
      error.code === 'PGRST301' ||
      status === 401 ||
      status === 403 ||
      (Boolean(error.message) && (
        error.message.toLowerCase().includes('permission denied') ||
        error.message.toLowerCase().includes('violates row-level security') ||
        error.message.toLowerCase().includes('row-level security policy') ||
        error.message.toLowerCase().includes('jwt')
      ));

    if (isAccessOrRls) {
      return {
        table: tableName,
        status: 'ACCESS_ERROR',
        exists: true, // Table exists in PostgreSQL! RLS restriction is NOT a missing table
        message: 'Table exists (access restricted by RLS)',
        statusCode: status || 403,
      };
    }

    // 4. TEMPORARY / NETWORK ERROR (timeout, AbortError, network error, 5xx server error)
    const isTemporary =
      error.name === 'AbortError' ||
      (status !== undefined && status >= 500) ||
      (Boolean(error.message) && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('timeout')
      ));

    if (isTemporary) {
      return {
        table: tableName,
        status: 'TEMPORARY_ERROR',
        exists: true, // Do NOT classify as missing
        message: 'Temporary network or server error',
        statusCode: status || 500,
      };
    }

    // 5. Column error (PGRST204) - Table exists
    if (error.code === 'PGRST204' || (error.message && error.message.includes('column'))) {
      return {
        table: tableName,
        status: 'ACTIVE',
        exists: true,
        message: 'Table exists',
        statusCode: status,
      };
    }

    // Default: If not confirmed missing by relation-not-found, treat as existing
    return {
      table: tableName,
      status: 'ACTIVE',
      exists: true,
      message: error.message || 'Table accessible',
      statusCode: status,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      return {
        table: tableName,
        status: 'TEMPORARY_ERROR',
        exists: true,
        message: 'Temporary network error',
      };
    }
    return {
      table: tableName,
      status: 'TEMPORARY_ERROR',
      exists: true,
      message: err?.message || 'Temporary connection issue while probing table',
    };
  }
}

/**
 * Safely signals PostgREST / Supabase to reload schema cache without destructive operations
 */
export async function refreshPostgrestSchema(): Promise<void> {
  try {
    const client = getSupabase();
    // Attempt standard schema reload ping or RPC if available
    await client.rpc('reload_schema');
  } catch {
    // Ignore safe reload failures
  }
}

export async function testSupabaseConnection(urlToTest?: string, keyToTest?: string): Promise<{
  success: boolean;
  message: string;
  authHealth?: boolean;
  tables?: { [tableName: string]: boolean };
  tableStatuses?: { [tableName: string]: TableStatus };
}> {
  try {
    const rawUrl = urlToTest || getSupabaseCredentials().url;
    const testUrl = cleanSupabaseUrl(rawUrl);
    const testKey = keyToTest || getSupabaseCredentials().anonKey;

    if (!testUrl || !testKey) {
      return { success: false, message: 'Supabase URL and Anon Key are required.' };
    }

    // Reuse the active client if testing the currently configured credentials
    // This preserves authenticated admin JWT session for RLS-protected tables
    const isCurrent = !urlToTest && !keyToTest;
    const client = isCurrent ? getSupabase() : createClient(testUrl, testKey);

    // Test auth session ping
    const { error: authError } = await client.auth.getSession();
    if (authError) {
      return { success: false, message: `Auth error: ${authError.message}` };
    }

    // Check availability of key Hishab tables
    const tableChecks: { [key: string]: boolean } = {};
    const tableStatuses: { [key: string]: TableStatus } = {};
    const tablesToProbe = [
      'profiles',
      'users',
      'user_roles',
      'admin_users',
      'plans',
      'subscriptions',
      'payments',
      'payment_requests',
      'businesses',
      'recharge_transactions',
      'recharges',
      'invoices',
      'support_tickets',
      'enquiries',
      'admin_activity_logs',
      'app_settings',
    ];

    await Promise.all(
      tablesToProbe.map(async (table) => {
        const res = await probeTableHealth(client, table);
        tableChecks[table] = res.exists;
        tableStatuses[table] = res.status;
      })
    );

    return {
      success: true,
      message: 'Successfully connected to existing Supabase project.',
      authHealth: true,
      tables: tableChecks,
      tableStatuses,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase. Check your URL and Key.',
    };
  }
}
