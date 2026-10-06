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

export async function testSupabaseConnection(urlToTest?: string, keyToTest?: string): Promise<{
  success: boolean;
  message: string;
  authHealth?: boolean;
  tables?: { [tableName: string]: boolean };
}> {
  try {
    const rawUrl = urlToTest || getSupabaseCredentials().url;
    const testUrl = cleanSupabaseUrl(rawUrl);
    const testKey = keyToTest || getSupabaseCredentials().anonKey;

    if (!testUrl || !testKey) {
      return { success: false, message: 'Supabase URL and Anon Key are required.' };
    }

    const client = createClient(testUrl, testKey);

    // Test auth session ping
    const { error: authError } = await client.auth.getSession();
    if (authError) {
      return { success: false, message: `Auth error: ${authError.message}` };
    }

    // Check availability of key Hishab tables
    const tableChecks: { [key: string]: boolean } = {};
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
        try {
          const { error } = await client.from(table).select('id', { count: 'exact', head: true });
          tableChecks[table] = !error;
        } catch {
          tableChecks[table] = false;
        }
      })
    );

    return {
      success: true,
      message: 'Successfully connected to existing Supabase project.',
      authHealth: true,
      tables: tableChecks,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase. Check your URL and Key.',
    };
  }
}
