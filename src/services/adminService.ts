import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
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
} from '../types';

// Cache table existence so we do not repeatedly spam PostgREST for missing tables (PGRST205)
const tableAvailability: { [tableName: string]: boolean } = {};

let detectedUserTable: 'profiles' | 'users' | null = null;
let detectedPaymentTable: 'payments' | 'payment_requests' | null = null;
let detectedRechargeTable: 'recharge_transactions' | 'recharges' | null = null;
let detectedSupportTable: 'support_tickets' | 'enquiries' | null = null;

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.message?.includes('schema cache') ||
    err.message?.includes('Could not find the table') ||
    err.message?.includes('relation') && err.message?.includes('does not exist')
  );
}

async function checkTableExists(tableName: string): Promise<boolean> {
  if (tableAvailability[tableName] !== undefined) {
    return tableAvailability[tableName];
  }

  if (!isSupabaseConfigured()) {
    tableAvailability[tableName] = false;
    return false;
  }

  const supabase = getSupabase();
  try {
    const { error } = await supabase.from(tableName).select('id', { head: true, count: 'exact' });
    if (error && isTableMissingError(error)) {
      tableAvailability[tableName] = false;
      return false;
    }
    tableAvailability[tableName] = !error;
    return !error;
  } catch {
    tableAvailability[tableName] = false;
    return false;
  }
}

async function detectTables() {
  if (!isSupabaseConfigured()) return;

  const [hasProfiles, hasUsers, hasPayments, hasPaymentRequests, hasRechargeTxns, hasRecharges, hasSupportTickets, hasEnquiries] =
    await Promise.all([
      checkTableExists('profiles'),
      checkTableExists('users'),
      checkTableExists('payments'),
      checkTableExists('payment_requests'),
      checkTableExists('recharge_transactions'),
      checkTableExists('recharges'),
      checkTableExists('support_tickets'),
      checkTableExists('enquiries'),
    ]);

  if (hasProfiles) detectedUserTable = 'profiles';
  else if (hasUsers) detectedUserTable = 'users';
  else detectedUserTable = 'profiles';

  if (hasPayments) detectedPaymentTable = 'payments';
  else if (hasPaymentRequests) detectedPaymentTable = 'payment_requests';
  else detectedPaymentTable = 'payments';

  if (hasRechargeTxns) detectedRechargeTable = 'recharge_transactions';
  else if (hasRecharges) detectedRechargeTable = 'recharges';
  else detectedRechargeTable = 'recharge_transactions';

  if (hasSupportTickets) detectedSupportTable = 'support_tickets';
  else if (hasEnquiries) detectedSupportTable = 'enquiries';
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
   * Resets table detection cache, useful when user runs migrations
   */
  clearTableCache() {
    Object.keys(tableAvailability).forEach((k) => delete tableAvailability[k]);
    detectedUserTable = null;
    detectedPaymentTable = null;
    detectedRechargeTable = null;
    detectedSupportTable = null;
  },

  /**
   * Returns list of core tables that are missing in the Supabase schema cache
   */
  async getTableStatus(): Promise<{ [tableName: string]: boolean }> {
    const tables = [
      'profiles',
      'businesses',
      'plans',
      'subscriptions',
      'payments',
      'recharge_transactions',
      'invoices',
      'support_tickets',
      'admin_activity_logs',
      'app_settings',
    ];

    const result: { [key: string]: boolean } = {};
    await Promise.all(
      tables.map(async (t) => {
        result[t] = await checkTableExists(t);
      })
    );
    return result;
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
        if (isTableMissingError(error)) tableAvailability['admin_activity_logs'] = false;
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
        if (isTableMissingError(error)) tableAvailability[userTable] = false;
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
  // PLANS & PRICING
  // ----------------------------------------------------
  async getPlans(): Promise<PlanRecord[]> {
    if (!isSupabaseConfigured()) return [];
    if (!(await checkTableExists('plans'))) return [];

    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.from('plans').select('*').order('duration_months', { ascending: true });
      if (error) {
        if (isTableMissingError(error)) tableAvailability['plans'] = false;
        return [];
      }
      if (!data || data.length === 0) return [];

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        duration: p.duration || `${p.duration_months || 1} Month`,
        duration_months: p.duration_months || 1,
        description: p.description || '',
        features: Array.isArray(p.features) ? p.features : typeof p.features === 'string' ? JSON.parse(p.features || '[]') : [],
        is_active: Boolean(p.is_active ?? true),
        is_popular: Boolean(p.is_popular ?? false),
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async seedDefaultPlans(): Promise<PlanRecord[]> {
    if (!isSupabaseConfigured()) return [];
    const supabase = getSupabase();

    const defaultPlans = [
      {
        name: 'Monthly',
        price: 299,
        duration: '1 Month',
        duration_months: 1,
        description: 'Flexible monthly billing plan for growing shops',
        features: ['Billing', 'Invoices', 'Products', 'Customers', 'Reports', 'Stock'],
        is_active: true,
        is_popular: false,
      },
      {
        name: '2 Years',
        price: 3999,
        duration: '2 Years',
        duration_months: 24,
        description: 'Best value for established businesses with long-term savings',
        features: ['Billing', 'Invoices', 'Products', 'Customers', 'Reports', 'Stock', 'Priority Support'],
        is_active: true,
        is_popular: true,
      },
      {
        name: '3 Years',
        price: 4999,
        duration: '3 Years',
        duration_months: 36,
        description: 'Maximum savings with complete uninterrupted access',
        features: ['Billing', 'Invoices', 'Products', 'Customers', 'Reports', 'Stock', 'Dedicated Manager'],
        is_active: true,
        is_popular: false,
      },
    ];

    try {
      const { data, error } = await supabase.from('plans').insert(defaultPlans).select('*');
      if (error) throw error;
      tableAvailability['plans'] = true;
      await this.logActivity('Seeded 3 standard plans: Monthly, 2 Years, 3 Years');
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        duration: p.duration,
        duration_months: p.duration_months,
        description: p.description,
        features: Array.isArray(p.features) ? p.features : [],
        is_active: p.is_active,
        is_popular: p.is_popular,
        created_at: p.created_at,
      }));
    } catch (err) {
      throw err;
    }
  },

  async updatePlan(plan: Partial<PlanRecord> & { id: string }): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();
    const supabase = getSupabase();

    if (plan.is_popular) {
      await supabase.from('plans').update({ is_popular: false }).neq('id', plan.id);
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (plan.name !== undefined) updatePayload.name = sanitizeText(plan.name, 100);
    if (plan.price !== undefined) {
      const priceVal = validatePrice(plan.price);
      if (!priceVal.valid) throw new Error(priceVal.error || 'Invalid price value.');
      updatePayload.price = priceVal.price;
    }
    if (plan.duration !== undefined) updatePayload.duration = sanitizeText(plan.duration, 50);
    if (plan.duration_months !== undefined) updatePayload.duration_months = Math.max(1, Math.min(120, Number(plan.duration_months) || 1));
    if (plan.description !== undefined) updatePayload.description = sanitizeText(plan.description, 500);
    if (plan.features !== undefined) updatePayload.features = plan.features;
    if (plan.is_active !== undefined) updatePayload.is_active = plan.is_active;
    if (plan.is_popular !== undefined) updatePayload.is_popular = plan.is_popular;

    const { error } = await supabase.from('plans').update(updatePayload).eq('id', plan.id);
    if (error) throw error;

    await this.logActivity(`Updated plan: ${plan.name || plan.id}`, null, {
      plan_id: plan.id,
      price: plan.price,
      is_popular: plan.is_popular,
    });
  },

  // ----------------------------------------------------
  // FREE TRIAL SETTINGS
  // ----------------------------------------------------
  async getAppSettings(): Promise<AppSettings> {
    if (!isSupabaseConfigured() || !(await checkTableExists('app_settings'))) {
      return { free_trial_days: 15, upi_id: 'Q164166564@ybl' };
    }
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error || !data || data.length === 0) {
        if (error && isTableMissingError(error)) tableAvailability['app_settings'] = false;
        return { free_trial_days: 15, upi_id: 'Q164166564@ybl' };
      }

      let trialDays = 15;
      let upi = 'Q164166564@ybl';

      data.forEach((row) => {
        if (row.key === 'free_trial_days') {
          trialDays = parseInt(row.value, 10) || 15;
        } else if (row.key === 'upi_id') {
          upi = row.value || upi;
        }
      });

      return { free_trial_days: trialDays, upi_id: upi };
    } catch {
      return { free_trial_days: 15, upi_id: 'Q164166564@ybl' };
    }
  },

  async updateFreeTrialDays(days: number): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    await this.assertMfaAal2();
    const trialVal = validateTrialDays(days);
    if (!trialVal.valid) throw new Error(trialVal.error || 'Invalid trial days value.');
    const sanitizedDays = trialVal.days;
    const supabase = getSupabase();

    const { error } = await supabase.from('app_settings').upsert({
      key: 'free_trial_days',
      value: sanitizedDays.toString(),
      description: 'Number of free trial days given to new registered Hishab users',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (isTableMissingError(error)) tableAvailability['app_settings'] = false;
      throw error;
    }

    tableAvailability['app_settings'] = true;
    await this.logActivity(`Updated free trial days to ${days} days`, null, {
      free_trial_days: days,
    });
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
        if (isTableMissingError(error)) {
          tableAvailability[paymentTable] = false;
        }
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
        if (isTableMissingError(error)) tableAvailability['subscriptions'] = false;
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

      const subscriptions: SubscriptionRecord[] = rows.map((r) => ({
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
      }));

      return { subscriptions, totalCount: count || subscriptions.length };
    } catch {
      return { subscriptions: [], totalCount: 0 };
    }
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
        if (isTableMissingError(error)) tableAvailability['businesses'] = false;
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
        if (isTableMissingError(error)) tableAvailability[rechargeTable] = false;
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
        if (isTableMissingError(error)) tableAvailability['invoices'] = false;
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
        if (isTableMissingError(error)) tableAvailability[supportTable] = false;
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
