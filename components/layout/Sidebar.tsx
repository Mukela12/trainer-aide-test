"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Dumbbell,
  Calendar,
  CalendarPlus,
  Settings,
  Home,
  BookOpen,
  User,
  Users,
  UsersRound,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
  Sparkles,
  Package,
  CreditCard,
  UserPlus,
  ShoppingBag,
  DollarSign,
  Lock,
  Megaphone,
  Banknote,
} from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils/cn';

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  title: string;
  links: NavLink[];
}

// Grouped navigation for solo practitioners
const soloPractitionerGroups: NavGroup[] = [
  {
    title: 'OPERATE',
    links: [
      { href: '/solo', label: 'Dashboard', icon: <Home size={20} /> },
      { href: '/solo/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
      { href: '/solo/clients', label: 'Clients', icon: <Users size={20} /> },
      { href: '/solo/sessions', label: 'Services', icon: <Clock size={20} /> },
    ],
  },
  {
    title: 'MONEY',
    links: [
      { href: '/solo/revenue', label: 'Revenue', icon: <DollarSign size={20} /> },
    ],
  },
  {
    title: 'GROW',
    links: [
      { href: '/solo/templates', label: 'Templates', icon: <FileText size={20} />, badge: 'AI' },
      { href: '#', label: 'Campaigns', icon: <Megaphone size={20} />, badge: 'Soon' },
    ],
  },
  {
    title: 'SETTINGS',
    links: [
      { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
  },
];

// Grouped navigation for studio owners
const studioOwnerGroups: NavGroup[] = [
  {
    title: 'OPERATE',
    links: [
      { href: '/studio-owner', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { href: '/studio-owner/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
      { href: '/studio-owner/clients', label: 'Clients', icon: <Users size={20} /> },
      { href: '/studio-owner/services', label: 'Services', icon: <Clock size={20} /> },
    ],
  },
  {
    title: 'MONEY',
    links: [
      { href: '/studio-owner/revenue', label: 'Revenue', icon: <DollarSign size={20} /> },
    ],
  },
  {
    title: 'BUSINESS',
    links: [
      { href: '/studio-owner/staff', label: 'Staff', icon: <UsersRound size={20} /> },
      { href: '#', label: 'Payroll', icon: <Banknote size={20} />, badge: 'Soon' },
    ],
  },
  {
    title: 'GROW',
    links: [
      { href: '/studio-owner/templates', label: 'Templates', icon: <FileText size={20} />, badge: 'AI' },
      { href: '#', label: 'Campaigns', icon: <Megaphone size={20} />, badge: 'Soon' },
    ],
  },
  {
    title: 'SETTINGS',
    links: [
      { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
  },
];

// Flat navigation for trainers (simpler structure)
const trainerGroups: NavGroup[] = [
  {
    title: 'WORK',
    links: [
      { href: '/trainer', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { href: '/trainer/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
      { href: '/trainer/sessions', label: 'My Sessions', icon: <Dumbbell size={20} /> },
    ],
  },
  {
    title: 'TOOLS',
    links: [
      { href: '/trainer/templates', label: 'Templates', icon: <FileText size={20} /> },
      { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
  },
];

// Flat navigation for clients
const clientGroups: NavGroup[] = [
  {
    title: 'MY STUDIO',
    links: [
      { href: '/client', label: 'Home', icon: <Home size={20} /> },
      { href: '/client/book', label: 'Book Session', icon: <CalendarPlus size={20} /> },
      { href: '/client/bookings', label: 'My Bookings', icon: <Calendar size={20} /> },
      { href: '/client/shop', label: 'Shop', icon: <ShoppingBag size={20} /> },
      { href: '/client/packages', label: 'My Credits', icon: <CreditCard size={20} /> },
      { href: '/client/sessions', label: 'Session History', icon: <Dumbbell size={20} /> },
      { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
  },
];

/** Check if a nav link should be active based on the current pathname. */
function isNavActive(pathname: string, href: string): boolean {
  if (href === '/solo' || href === '/trainer' || href === '/studio-owner' || href === '/client') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, currentUser, businessName } = useUserStore();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    // Update CSS variable so the layout can adjust its margin
    document.documentElement.style.setProperty('--sidebar-width', next ? '5rem' : '16rem');
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Staff roles (studio_manager, receptionist, finance_manager) see the studio-owner nav
  const isStudioStaff = ['studio_owner', 'studio_manager', 'receptionist', 'finance_manager'].includes(currentRole);
  const navGroups =
    isStudioStaff ? studioOwnerGroups :
    currentRole === 'trainer' ? trainerGroups :
    currentRole === 'solo_practitioner' ? soloPractitionerGroups :
    clientGroups;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-20 hidden lg:block transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo and Branding */}
      <div className={cn("py-5 border-b border-gray-100 dark:border-gray-700 relative", collapsed ? "px-2" : "px-6")}>
        {!collapsed && (
          <Link
            href={
              isStudioStaff ? '/studio-owner' :
              currentRole === 'trainer' ? '/trainer' :
              currentRole === 'solo_practitioner' ? '/solo' :
              '/client'
            }
          >
            <div className="flex items-center justify-center mb-3 cursor-pointer">
              <div className="relative w-full h-16">
                <Image
                  src="/images/all-wondrous-logo.svg"
                  alt="All Wondrous"
                  fill
                  sizes="(max-width: 768px) 100vw, 256px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link
            href={
              isStudioStaff ? '/studio-owner' :
              currentRole === 'trainer' ? '/trainer' :
              currentRole === 'solo_practitioner' ? '/solo' :
              '/client'
            }
          >
            <div className="flex items-center justify-center cursor-pointer">
              <div className="relative w-10 h-10">
                <Image
                  src="/images/w-icon-new.svg"
                  alt="W"
                  fill
                  sizes="40px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </Link>
        )}

        {/* Toggle Button */}
        <button
          onClick={handleToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} className="dark:text-gray-300" /> : <ChevronLeft size={14} className="dark:text-gray-300" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("p-4 space-y-4 pb-40 overflow-y-auto", collapsed ? "px-2" : "")} style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {navGroups.map((group) => (
          <div key={group.title}>
            {/* Section Header */}
            {!collapsed && (
              <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = isNavActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                      collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                      isActive
                        ? "bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                    title={collapsed ? link.label : undefined}
                  >
                    {/* Subtle accent indicator for active state */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-wondrous-blue to-wondrous-magenta rounded-full" />
                    )}
                    <span className={cn(
                      "transition-colors",
                      isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                    )}>
                      {link.icon}
                    </span>
                    {!collapsed && (
                      <span className="flex-1">{link.label}</span>
                    )}
                    {!collapsed && link.badge && (
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        link.badge === 'Soon'
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          : link.badge === 'AI'
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}>{link.badge}</span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg z-50">
                        {link.label}
                        {link.badge && <span className={cn(
                          "ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          link.badge === 'Soon'
                            ? "bg-gray-600 text-gray-300"
                            : link.badge === 'AI'
                              ? "bg-purple-700 text-purple-200"
                              : "bg-gray-700 text-gray-300"
                        )}>{link.badge}</span>}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info (Bottom) */}
      <div className={cn("absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800", collapsed ? "px-2 py-4" : "p-4")}>
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wondrous-cyan dark:bg-wondrous-cyan/80 rounded-full flex items-center justify-center">
                <User size={20} className="text-wondrous-dark-blue dark:text-wondrous-dark-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {businessName || `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'My Account'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                  {currentRole.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <div className="w-10 h-10 bg-wondrous-cyan dark:bg-wondrous-cyan/80 rounded-full flex items-center justify-center cursor-pointer">
                <User size={20} className="text-wondrous-dark-blue dark:text-wondrous-dark-blue" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg z-50">
                {businessName || `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'My Account'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors relative group"
              title="Logout"
            >
              <LogOut size={18} />
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg z-50">
                Logout
              </div>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
