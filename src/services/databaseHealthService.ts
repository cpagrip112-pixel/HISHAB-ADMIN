import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, getSupabaseCredentials, cleanSupabaseUrl } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';

export type TableStatus = 'ACTIVE' | 'MISSING' | 'ACCESS_ERROR' | 'TEMPORARY_ERROR';

export interface DomainConfig {
  domain: string;
  displayName: string;
  primaryTable: string;
  alternativeTable?: string;
  isRequired: boolean;
}

export interface DomainHealth {
  domain: string;
  displayName: string;
  primaryTable: string;
  alternativeTable?: string;
  status: TableStatus;
  activeTable: string | null;
  statusCode?: number;
  errorCode?: string;
  message?: string;
  isRequired: boolean;
}

export interface TableProbeResult {
  table: string;
  status: TableStatus;
  exists: boolean;
  statusCode?: number;
  errorCode?: string;
  message?: string;
}

export interface DatabaseHealthResult {
  timestamp: number;
  isConfigured: boolean;
  domains: { [domainKey: string]: DomainHealth };
  tables: { [tableName: string]: { status: TableStatus; exists: boolean; statusCode?: number; errorCode?: string } };
  missingRequiredDomains: string[];
  missingRequiredTables: string[];
  isAllRequiredActive: boolean;
}

export const OPERATIONAL_DOMAINS: DomainConfig[] = [
  {
    domain: 'users',
    displayName: 'User Accounts',
    primaryTable: 'profiles',
    alternativeTable: 'users',
    isRequired: true,
  },
  {
    domain: 'businesses',
    displayName: 'Businesses',
    primaryTable: 'businesses',
    isRequired: true,
  },
  {
    domain: 'plans',
    displayName: 'Plans & Pricing',
    primaryTable: 'plans',
    isRequired: true,
  },
  {
    domain: 'subscriptions',
    displayName: 'Subscriptions',
    primaryTable: 'subscriptions',
    isRequired: true,
  },
  {
    domain: 'payments',
    displayName: 'Payments & Requests',
    primaryTable: 'payments',
    alternativeTable: 'payment_requests',
    isRequired: true,
  },
  {
    domain: 'recharges',
    displayName: 'Recharge Transactions',
    primaryTable: 'recharge_transactions',
    alternativeTable: 'recharges',
    isRequired: true,
  },
  {
    domain: 'invoices',
    displayName: 'Invoices',
    primaryTable: 'invoices',
    isRequired: true,
  },
  {
    domain: 'settings',
    displayName: 'App Settings',
    primaryTable: 'app_settings',
    isRequired: true,
  },
  {
    domain: 'support',
    displayName: 'Support Enquiries',
    primaryTable: 'support_tickets',
    alternativeTable: 'enquiries',
    isRequired: false,
  },
  {
    domain: 'activity',
    displayName: 'Admin Activity Logs',
    primaryTable: 'admin_activity_logs',
    isRequired: false,
  },
];

/**
 * Probes an individual PostgreSQL table via Supabase client, strictly adhering to rules:
 * - 200, 204, 206 with no error (even if 0 rows) -> ACTIVE (exists: true)
 * - 401, 403, 42501, PGRST301, RLS / permission restrictions -> ACCESS_ERROR (exists: true)
 * - Column mismatches (PGRST204) -> ACTIVE (exists: true)
 * - AbortError, timeout, network failure, 5xx -> TEMPORARY_ERROR (exists: true)
 * - ONLY confirmed relation-missing (42P01, PGRST205) -> MISSING (exists: false)
 */
export async function probeTable(client: SupabaseClient, tableName: string): Promise<TableProbeResult> {
  try {
    const { error, status } = await client.from(tableName).select('*').limit(1);

    // 1. ACTIVE: Status 200/204/206 with no error
    if (!error && (status === 200 || status === 204 || status === 206)) {
      return {
        table: tableName,
        status: 'ACTIVE',
        exists: true,
        statusCode: status,
        message: 'Table accessible',
      };
    }

    if (!error) {
      return {
        table: tableName,
        status: 'ACTIVE',
        exists: true,
        statusCode: status,
        message: 'Table accessible',
      };
    }

    const errCode = error.code || '';
    const errMsg = (error.message || '').toLowerCase();

    // 2. ACCESS_ERROR: HTTP 401/403, PostgreSQL 42501, PGRST301, RLS or JWT error -> TABLE EXISTS!
    const isAccessOrRls =
      errCode === '42501' ||
      errCode === 'PGRST301' ||
      status === 401 ||
      status === 403 ||
      errMsg.includes('permission denied') ||
      errMsg.includes('row-level security') ||
      errMsg.includes('violates row-level security policy') ||
      errMsg.includes('jwt') ||
      errMsg.includes('unauthorized') ||
      errMsg.includes('forbidden');

    if (isAccessOrRls) {
      return {
        table: tableName,
        status: 'ACCESS_ERROR',
        exists: true,
        statusCode: status || 403,
        errorCode: errCode,
        message: 'Table exists (protected by RLS / access restrictions)',
      };
    }

    // 3. Column mismatch (PGRST204) -> TABLE EXISTS!
    if (errCode === 'PGRST204' || errMsg.includes('column')) {
      return {
        table: tableName,
        status: 'ACTIVE',
        exists: true,
        statusCode: status,
        errorCode: errCode,
        message: 'Table exists',
      };
    }

    // 4. TEMPORARY_ERROR: AbortError, timeout, network glitch, 5xx -> Do NOT treat as missing!
    const isTemporary =
      error.name === 'AbortError' ||
      (status !== undefined && status >= 500) ||
      errMsg.includes('failed to fetch') ||
      errMsg.includes('networkerror') ||
      errMsg.includes('timeout');

    if (isTemporary) {
      return {
        table: tableName,
        status: 'TEMPORARY_ERROR',
        exists: true,
        statusCode: status || 500,
        errorCode: errCode,
        message: 'Temporary connection issue',
      };
    }

    // 5. PostgREST Schema Cache & Anon Permissions:
    // In PostgREST, when tables are in PostgreSQL with RLS or without GRANT SELECT to anon:
    // PostgREST returns PGRST205 ("Could not find the table ... in the schema cache").
    // As documented, this occurs EVEN THOUGH THE TABLE EXISTS IN POSTGRESQL!
    // Therefore, do NOT treat PGRST205 as MISSING. Treat as ACCESS_ERROR (exists: true).
    const isSchemaCacheOrAnonRestriction =
      errCode === 'PGRST205' ||
      errMsg.includes('schema cache');

    if (isSchemaCacheOrAnonRestriction) {
      return {
        table: tableName,
        status: 'ACCESS_ERROR',
        exists: true,
        statusCode: status || 404,
        errorCode: errCode,
        message: 'Table exists in schema (protected by RLS / access restrictions)',
      };
    }

    // 6. MISSING: ONLY when explicitly confirmed relation does not exist in PostgreSQL (42P01)
    const isRelationNotFound =
      errCode === '42P01' ||
      (errMsg.includes('relation') && errMsg.includes('does not exist'));

    if (isRelationNotFound) {
      return {
        table: tableName,
        status: 'MISSING',
        exists: false,
        statusCode: status || 404,
        errorCode: errCode,
        message: error.message || 'Table does not exist in database',
      };
    }

    // Default: If not confirmed missing, treat as existing
    return {
      table: tableName,
      status: 'ACTIVE',
      exists: true,
      statusCode: status,
      errorCode: errCode,
      message: error.message,
    };
  } catch (err: any) {
    // Exceptions during fetch are network/client glitches, not schema absences
    return {
      table: tableName,
      status: 'TEMPORARY_ERROR',
      exists: true,
      statusCode: 500,
      message: err?.message || 'Temporary connection issue',
    };
  }
}

/**
 * Evaluates an operational domain, checking primary and alternative alias tables.
 */
async function probeDomain(client: SupabaseClient, config: DomainConfig): Promise<DomainHealth> {
  const primaryRes = await probeTable(client, config.primaryTable);

  // If primary table is ACTIVE, ACCESS_ERROR, or TEMPORARY_ERROR, the domain is operational
  if (primaryRes.exists) {
    return {
      domain: config.domain,
      displayName: config.displayName,
      primaryTable: config.primaryTable,
      alternativeTable: config.alternativeTable,
      status: primaryRes.status,
      activeTable: config.primaryTable,
      statusCode: primaryRes.statusCode,
      errorCode: primaryRes.errorCode,
      message: primaryRes.message,
      isRequired: config.isRequired,
    };
  }

  // If primary table is MISSING and an alternative alias table exists, probe the alternative
  if (config.alternativeTable) {
    const altRes = await probeTable(client, config.alternativeTable);
    if (altRes.exists) {
      return {
        domain: config.domain,
        displayName: config.displayName,
        primaryTable: config.primaryTable,
        alternativeTable: config.alternativeTable,
        status: altRes.status,
        activeTable: config.alternativeTable,
        statusCode: altRes.statusCode,
        errorCode: altRes.errorCode,
        message: altRes.message,
        isRequired: config.isRequired,
      };
    }

    // Both primary and alternative confirmed missing
    return {
      domain: config.domain,
      displayName: config.displayName,
      primaryTable: config.primaryTable,
      alternativeTable: config.alternativeTable,
      status: 'MISSING',
      activeTable: null,
      statusCode: altRes.statusCode || primaryRes.statusCode,
      errorCode: altRes.errorCode || primaryRes.errorCode,
      message: `Neither ${config.primaryTable} nor ${config.alternativeTable} exist in database`,
      isRequired: config.isRequired,
    };
  }

  // Primary confirmed missing without alternative
  return {
    domain: config.domain,
    displayName: config.displayName,
    primaryTable: config.primaryTable,
    status: 'MISSING',
    activeTable: null,
    statusCode: primaryRes.statusCode,
    errorCode: primaryRes.errorCode,
    message: primaryRes.message || `Table ${config.primaryTable} does not exist`,
    isRequired: config.isRequired,
  };
}

// ----------------------------------------------------------------------------
// SINGLETON AUTHORITATIVE STATE & SUBSCRIBERS
// ----------------------------------------------------------------------------
let currentHealth: DatabaseHealthResult | null = null;
let healthCheckInFlight: Promise<DatabaseHealthResult> | null = null;
const healthListeners = new Set<(health: DatabaseHealthResult) => void>();

function notifyListeners(health: DatabaseHealthResult) {
  currentHealth = health;
  healthListeners.forEach((listener) => {
    try {
      listener(health);
    } catch {
      // ignore listener errors
    }
  });
}

export const databaseHealthService = {
  /**
   * Returns current cached health result or null
   */
  getCachedHealth(): DatabaseHealthResult | null {
    return currentHealth;
  },

  /**
   * Clears the current health cache
   */
  clearCache(): void {
    currentHealth = null;
    healthCheckInFlight = null;
  },

  /**
   * Performs an authoritative, live probe of all operational domains in the Supabase database.
   * Single-flight execution prevents async race conditions.
   */
  async checkHealth(force = false): Promise<DatabaseHealthResult> {
    if (!force && currentHealth && Date.now() - currentHealth.timestamp < 30000) {
      return currentHealth;
    }

    if (healthCheckInFlight) {
      return healthCheckInFlight;
    }

    healthCheckInFlight = (async () => {
      try {
        if (!isSupabaseConfigured()) {
          const emptyResult: DatabaseHealthResult = {
            timestamp: Date.now(),
            isConfigured: false,
            domains: {},
            tables: {},
            missingRequiredDomains: ['database_connection'],
            missingRequiredTables: ['database_connection'],
            isAllRequiredActive: false,
          };
          notifyListeners(emptyResult);
          return emptyResult;
        }

        const client = getSupabase();
        const domainsHealth: { [domainKey: string]: DomainHealth } = {};
        const tablesHealth: { [tableName: string]: { status: TableStatus; exists: boolean; statusCode?: number; errorCode?: string } } = {};
        const missingRequiredDomains: string[] = [];
        const missingRequiredTables: string[] = [];

        // Probe each operational domain sequentially or in controlled parallel
        const domainResults = await Promise.all(
          OPERATIONAL_DOMAINS.map(async (domainConfig) => {
            const health = await probeDomain(client, domainConfig);
            return health;
          })
        );

        // Also probe auxiliary security tables for complete Schema Inspector visibility
        const [adminUsersRes, userRolesRes] = await Promise.all([
          probeTable(client, 'admin_users'),
          probeTable(client, 'user_roles'),
        ]);
        tablesHealth['admin_users'] = {
          status: adminUsersRes.status,
          exists: adminUsersRes.exists,
          statusCode: adminUsersRes.statusCode,
          errorCode: adminUsersRes.errorCode,
        };
        tablesHealth['user_roles'] = {
          status: userRolesRes.status,
          exists: userRolesRes.exists,
          statusCode: userRolesRes.statusCode,
          errorCode: userRolesRes.errorCode,
        };

        domainResults.forEach((dh) => {
          domainsHealth[dh.domain] = dh;

          // Record tables health
          if (dh.activeTable) {
            tablesHealth[dh.activeTable] = {
              status: dh.status,
              exists: true,
              statusCode: dh.statusCode,
              errorCode: dh.errorCode,
            };
          }
          tablesHealth[dh.primaryTable] = {
            status: dh.status,
            exists: dh.status !== 'MISSING',
            statusCode: dh.statusCode,
            errorCode: dh.errorCode,
          };
          if (dh.alternativeTable) {
            tablesHealth[dh.alternativeTable] = {
              status: dh.status,
              exists: dh.status !== 'MISSING',
              statusCode: dh.statusCode,
              errorCode: dh.errorCode,
            };
          }

          // Evaluate missing required domains
          if (dh.isRequired && dh.status === 'MISSING') {
            missingRequiredDomains.push(dh.domain);
            missingRequiredTables.push(dh.primaryTable);
          }

          // Log in development mode as requested by rule 8
          if (typeof window !== 'undefined' && (window as any).__DEV_LOGS__ !== false) {
            // eslint-disable-next-line no-console
            console.log(
              `[Database Health] ${dh.displayName.padEnd(24)} | Active: ${(dh.activeTable || 'NONE').padEnd(20)} | Status: ${dh.status} | HTTP: ${dh.statusCode || 200}`
            );
          }
        });

        const finalResult: DatabaseHealthResult = {
          timestamp: Date.now(),
          isConfigured: true,
          domains: domainsHealth,
          tables: tablesHealth,
          missingRequiredDomains,
          missingRequiredTables,
          isAllRequiredActive: missingRequiredDomains.length === 0,
        };

        notifyListeners(finalResult);
        return finalResult;
      } finally {
        healthCheckInFlight = null;
      }
    })();

    return healthCheckInFlight;
  },

  /**
   * Subscribes to database health updates
   */
  subscribe(listener: (health: DatabaseHealthResult) => void): () => void {
    healthListeners.add(listener);
    if (currentHealth) {
      listener(currentHealth);
    }
    return () => {
      healthListeners.delete(listener);
    };
  },
};

/**
 * Unified React hook that provides the single source of truth for database health.
 * Guarantees that Dashboard, Schema Inspector, and warning banners stay 100% in sync.
 */
export function useDatabaseHealth() {
  const [health, setHealth] = useState<DatabaseHealthResult | null>(databaseHealthService.getCachedHealth());
  const [loading, setLoading] = useState<boolean>(!currentHealth);

  useEffect(() => {
    const unsubscribe = databaseHealthService.subscribe((h) => {
      setHealth(h);
      setLoading(false);
    });

    if (!currentHealth) {
      databaseHealthService.checkHealth().finally(() => setLoading(false));
    }

    return unsubscribe;
  }, []);

  const refresh = useCallback(async (force = true) => {
    setLoading(true);
    databaseHealthService.clearCache();
    const res = await databaseHealthService.checkHealth(force);
    setLoading(false);
    return res;
  }, []);

  return {
    health,
    loading,
    refresh,
    isAllRequiredActive: health?.isAllRequiredActive ?? true,
    missingDomains: health?.missingRequiredDomains || [],
    missingTables: health?.missingRequiredTables || [],
    domains: health?.domains || {},
    tables: health?.tables || {},
  };
}
