import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Tag,
  Clock,
  Building,
  Smartphone,
  FileText,
  LifeBuoy,
  History,
  Settings,
  LogOut,
  User as UserIcon,
  X,
  ShieldCheck,
} from 'lucide-react';
import { HishabLogo } from './HishabLogo';
import { useAuth } from '../context/AuthContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | null;
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  pendingPaymentsCount?: number;
  openTicketsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingPaymentsCount = 0,
  openTicketsCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  onOpenProfile,
}) => {
  const { user, role, logout } = useAuth();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'plans', label: 'Plans & Pricing', icon: Tag },
    {
      id: 'payment-requests',
      label: 'Payment Requests',
      icon: ShieldCheck,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null,
    },
    { id: 'free-trial', label: 'Free Trial', icon: Clock },
    { id: 'businesses', label: 'Businesses', icon: Building },
    { id: 'recharge', label: 'Recharge Transactions', icon: Smartphone },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    {
      id: 'support',
      label: 'Support / Enquiries',
      icon: LifeBuoy,
      badge: openTicketsCount > 0 ? openTicketsCount : null,
    },
    { id: 'activity', label: 'Admin Activity', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <HishabLogo size="md" showTagline={true} />
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Administration
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                  strokeWidth={2}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-blue-700'
                      : 'bg-amber-500 text-slate-950 font-black'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: Admin Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
        <button
          onClick={() => {
            if (onOpenProfile) onOpenProfile();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {user?.email || 'Administrator'}
            </div>
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {role || 'Admin'} Profile
            </div>
          </div>
        </button>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 border-r border-slate-800 shadow-sm z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs h-full bg-slate-900 shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
