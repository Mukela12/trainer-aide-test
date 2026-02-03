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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
  Sparkles,
  Package,
  CreditCard,
  UserPlus,
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
      { href: '/solo/sessions', label: 'Services', icon: <Clock size={20} /> },
      { href: '/solo/clients', label: 'Clients', icon: <Users size={20} /> },
    ],
  },
  {
    title: 'GROW',
    links: [
      { href: '/solo/packages', label: 'Packages', icon: <Package size={20} /> },
      { href: '/solo/templates', label: 'Templates', icon: <FileText size={20} />, badge: 'AI' },
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
      { href: '/studio-owner/services', label: 'Services', icon: <Clock size={20} /> },
      { href: '/studio-owner/clients', label: 'Clients', icon: <Users size={20} /> },
      { href: '/studio-owner/sessions', label: 'All Sessions', icon: <Dumbbell size={20} /> },
    ],
  },
  {
    title: 'GROW',
    links: [
      { href: '/studio-owner/packages', label: 'Packages', icon: <Package size={20} /> },
      { href: '/studio-owner/templates', label: 'Templates', icon: <FileText size={20} />, badge: 'AI' },
      { href: '/studio-owner/trainers', label: 'Trainers', icon: <UserPlus size={20} /> },
      { href: '/studio-owner/team', label: 'Team', icon: <UserPlus size={20} /> },
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
      { href: '/client/packages', label: 'My Credits', icon: <CreditCard size={20} /> },
      { href: '/client/sessions', label: 'Session History', icon: <Dumbbell size={20} /> },
      { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, currentUser } = useUserStore();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const navGroups =
    currentRole === 'studio_owner' ? studioOwnerGroups :
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
          <>
            <div className="flex items-center justify-center mb-3">
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
          </>
        )}
        {collapsed && (
          <div className="flex items-center justify-center">
            <div className="relative w-10 h-10">
              <Image
                src="/images/w-icon-logo.png"
                alt="W"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} className="dark:text-gray-300" /> : <ChevronLeft size={14} className="dark:text-gray-300" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("p-4 space-y-4", collapsed ? "px-2" : "")}>
        {navGroups.map((group) => (
          <div key={group.title}>
            {/* Section Header */}
            {!collapsed && (
              <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                      collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                      isActive
                        ? "bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                    title={collapsed ? link.label : undefined}
                  >
                    {/* Subtle accent indicator for active state */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                    )}
                    <span className={cn(
                      "transition-colors",
                      isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {link.icon}
                    </span>
                    {!collapsed && (
                      <span className="flex-1">{link.label}</span>
                    )}
                    {!collapsed && link.badge && (
                      <span className="text-xs">{link.badge}</span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg z-50">
                        {link.label}
                        {link.badge && <span className="ml-1">{link.badge}</span>}
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
      <div className={cn("absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700", collapsed ? "px-2 py-4" : "p-4")}>
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wondrous-cyan dark:bg-wondrous-cyan/80 rounded-full flex items-center justify-center">
                <User size={20} className="text-wondrous-dark-blue dark:text-wondrous-dark-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {currentUser.firstName} {currentUser.lastName}
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
                {currentUser.firstName} {currentUser.lastName}
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
