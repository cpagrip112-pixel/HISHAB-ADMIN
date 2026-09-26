import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { UserDetailsModal } from './components/UserDetailsModal';
import { AdminProfileModal } from './components/AdminProfileModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/Users';
import { SubscriptionsPage } from './pages/Subscriptions';
import { PlansPricingPage } from './pages/PlansPricing';
import { PaymentRequestsPage } from './pages/PaymentRequests';
import { FreeTrialPage } from './pages/FreeTrial';
import { BusinessesPage } from './pages/Businesses';
import { RechargeTransactionsPage } from './pages/RechargeTransactions';
import { InvoicesPage } from './pages/Invoices';
import { SupportEnquiriesPage } from './pages/SupportEnquiries';
import { AdminActivityPage } from './pages/AdminActivity';
import { SettingsPage } from './pages/Settings';
import { LoginPage } from './pages/Login';

import { adminService } from './services/adminService';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';

const AdminApp: React.FC = () => {
  const { user, isAdmin, isMfaVerified, isLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Badge counts
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);

  const tabTitles: { [key: string]: string } = {
    dashboard: 'Dashboard',
    users: 'User Management',
    subscriptions: 'Subscriptions',
    plans: 'Plans & Pricing',
    'payment-requests': 'Manual Payment Requests',
    'free-trial': 'Free Trial Settings',
    businesses: 'Business Accounts',
    recharge: 'Recharge Transactions',
    invoices: 'Invoices',
    support: 'Support / Enquiries',
    activity: 'Admin Activity Log',
    settings: 'System & Database Settings',
  };

  // Keyboard shortcut ⌘K / Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch pending badge counts & setup real-time listener
  useEffect(() => {
    if (!isSupabaseConfigured() || !user || !isAdmin || !isMfaVerified) return;

    const fetchCounts = async () => {
      try {
        const stats = await adminService.getDashboardStats();
        setPendingPaymentsCount(stats.pendingPayments || 0);

        const tickets = await adminService.getSupportTickets({ status: 'open', pageSize: 1 });
        setOpenTicketsCount(tickets.totalCount || 0);
      } catch {
        // ignore
      }
    };

    fetchCounts();

    // Setup Supabase Real-Time Channel for instant sync with User Website if tables exist
    let channel: any = null;
    const initRealtime = async () => {
      try {
        const tableStatus = await adminService.getTableStatus();
        const supabase = getSupabase();
        let ch = supabase.channel('hishab-admin-sync');

        if (tableStatus['payments']) {
          ch = ch.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'payments' },
            () => {
              fetchCounts();
            }
          );
        }

        if (tableStatus['subscriptions']) {
          ch = ch.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'subscriptions' },
            () => {
              fetchCounts();
            }
          );
        }

        if (tableStatus['support_tickets']) {
          ch = ch.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'support_tickets' },
            () => {
              fetchCounts();
            }
          );
        }

        channel = ch.subscribe();
      } catch {
        // ignore
      }
    };

    initRealtime();

    return () => {
      if (channel) {
        try {
          const supabase = getSupabase();
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [user, isAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Verifying Hishab Admin authorization...</span>
      </div>
    );
  }

  // Not logged in, not admin, or MFA (AAL2) not verified: render dedicated Admin Login / MFA flow
  if (!user || !isAdmin || !isMfaVerified) {
    return (
      <LoginPage
        onOpenSettings={() => {
          setCurrentTab('settings');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingPaymentsCount={pendingPaymentsCount}
        openTicketsCount={openTicketsCount}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* 2. Main Administration Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTabName={tabTitles[currentTab] || 'Admin Control Panel'}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectUser={(userId) => setSelectedUserId(userId)}
            />
          )}

          {currentTab === 'users' && (
            <UsersPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'plans' && <PlansPricingPage />}

          {currentTab === 'payment-requests' && (
            <PaymentRequestsPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'free-trial' && <FreeTrialPage />}

          {currentTab === 'businesses' && (
            <BusinessesPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'recharge' && (
            <RechargeTransactionsPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'invoices' && (
            <InvoicesPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'support' && (
            <SupportEnquiriesPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'activity' && (
            <AdminActivityPage onSelectUser={(userId) => setSelectedUserId(userId)} />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* 3. Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectUser={(userId) => {
          setSelectedUserId(userId);
          setIsSearchOpen(false);
        }}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          setIsSearchOpen(false);
        }}
      />

      {/* 4. User Details Modal */}
      <UserDetailsModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      {/* 5. Admin Profile Modal */}
      <AdminProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  );
}
