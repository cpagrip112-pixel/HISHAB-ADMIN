export interface UserRecord {
  id: string; // Real Supabase Auth UUID
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: 'admin' | 'super_admin' | 'user' | string | null;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  created_at: string;
  last_sign_in_at: string | null;
  business?: BusinessRecord | null;
  subscription?: SubscriptionRecord | null;
  raw_user_meta?: Record<string, any>;
}

export interface BusinessRecord {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  business_type: string | null;
  gst_number: string | null;
  status: string | null;
  created_at: string;
  owner_name?: string | null;
  owner_email?: string | null;
}

export interface PlanRecord {
  id: string;
  name: string; // 'Monthly' | '2 Years' | '3 Years'
  price: number;
  duration: string; // '1 Month', '2 Years', '3 Years'
  duration_months: number;
  duration_value?: number;
  duration_unit?: 'days' | 'months' | 'years';
  description: string;
  features: string[];
  button_label?: string;
  is_active: boolean;
  is_popular: boolean;
  display_order?: number;
  created_at: string;
  updated_at?: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_name?: string | null;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  start_date: string | null;
  expiry_date: string | null;
  trial_end_date?: string | null;
  created_at: string;
  user?: UserRecord;
  payment_verified?: boolean;
  last_payment_status?: string | null;
}

export interface PaymentRequestRecord {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_name?: string | null;
  amount: number;
  utr: string;
  screenshot_url?: string | null;
  status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  user?: UserRecord;
}

export interface RechargeRecord {
  id: string;
  user_id: string;
  mobile_number: string;
  operator: string;
  amount: number;
  type: 'mobile' | 'dth';
  status: 'pending' | 'success' | 'failed';
  api_txn_id?: string | null;
  created_at: string;
  user?: UserRecord;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  user_id: string;
  business_id?: string | null;
  business_name?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  amount: number;
  status: 'paid' | 'unpaid' | 'draft' | 'cancelled';
  created_at: string;
  user?: UserRecord;
}

export interface SupportTicketRecord {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  user?: UserRecord;
}

export interface AdminActivityRecord {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: string;
  target_user_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AppSettings {
  free_trial_enabled: boolean;
  free_trial_days: number;
  free_trial_duration: number;
  free_trial_unit: 'days' | 'months' | 'years';
  free_trial_features: string[];
  upi_id: string;
}

export interface LandingSectionConfig {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

export interface LandingFeatureItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface LandingBenefitItem {
  id: string;
  title: string;
  description: string;
}

export interface LandingPageContent {
  id?: string;
  status: 'draft' | 'published';
  version?: number;
  // Public Announcement Bar
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  // Hero Section
  hero_headline: string;
  hero_subtitle: string;
  hero_description: string;
  hero_cta_primary_text: string;
  hero_cta_primary_link: string;
  hero_cta_secondary_text: string;
  hero_cta_secondary_link: string;
  // Feature Highlights
  features_heading: string;
  features_subheading: string;
  features_list: LandingFeatureItem[];
  // Services & Facilities
  billing_pos_title: string;
  billing_pos_description: string;
  billing_pos_bullets: string[];
  recharge_mobile_title: string;
  recharge_mobile_description: string;
  recharge_dth_title: string;
  recharge_dth_description: string;
  inventory_stock_title: string;
  inventory_stock_description: string;
  party_management_title: string;
  party_management_description: string;
  reports_invoices_title: string;
  reports_invoices_description: string;
  // Benefits Section
  benefits_heading: string;
  benefits_subheading: string;
  benefits_list: LandingBenefitItem[];
  // Call to Action
  cta_heading: string;
  cta_subheading: string;
  cta_button_text: string;
  cta_button_link: string;
  // Footer & Contact Information
  footer_text: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_address: string;
  // Sections order & toggle list
  sections: LandingSectionConfig[];
  updated_at?: string;
  published_at?: string;
}

export interface BannerRecord {
  id: string;
  title: string;
  description: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  badge_text?: string;
  type: 'hero' | 'promo' | 'popup';
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  freeTrialUsers: number;
  premiumUsers: number;
  expiredUsers: number;
  pendingPayments: number;
  verifiedPayments: number;
  totalBusinesses: number;
  newUsersToday: number;
  newUsers7Days: number;
  newUsers30Days: number;
  subscriptionOverview: {
    monthly: number;
    twoYears: number;
    threeYears: number;
  };
}
