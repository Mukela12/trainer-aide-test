"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, User } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  Dumbbell,
  Calendar,
  Settings,
  Home,
  BookOpen,
  Clock,
  Users,
} from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { cn } from '@/lib/utils/cn';

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const studioOwnerLinks: NavLink[] = [
  { href: '/studio-owner', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/studio-owner/clients', label: 'Clients', icon: <Users size={20} /> },
  { href: '/studio-owner/services', label: 'Services', icon: <Clock size={20} /> },
  { href: '/studio-owner/templates', label: 'Templates', icon: <FileText size={20} /> },
  { href: '/studio-owner/sessions', label: 'All Sessions', icon: <Dumbbell size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

const trainerLinks: NavLink[] = [
  { href: '/trainer', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/trainer/templates', label: 'Templates', icon: <FileText size={20} /> },
  { href: '/trainer/sessions', label: 'My Sessions', icon: <Dumbbell size={20} /> },
  { href: '/trainer/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

const clientLinks: NavLink[] = [
  { href: '/client', label: 'Home', icon: <Home size={20} /> },
  { href: '/client/sessions', label: 'History', icon: <BookOpen size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

const soloPractitionerLinks: NavLink[] = [
  { href: '/solo', label: 'Dashboard', icon: <Home size={20} /> },
  { href: '/solo/clients', label: 'Clients', icon: <Users size={20} /> },
  { href: '/solo/sessions', label: 'Sessions', icon: <Dumbbell size={20} /> },
  { href: '/solo/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
  { href: '/solo/templates', label: 'Templates', icon: <FileText size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { currentRole, currentUser } = useUserStore();

  const links =
    currentRole === 'studio_owner' ? studioOwnerLinks :
    currentRole === 'trainer' ? trainerLinks :
    currentRole === 'solo_practitioner' ? soloPractitionerLinks :
    clientLinks;

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative w-56 h-12">
              <Image
                src="/images/all-wondrous-logo.svg"
                alt="All Wondrous"
                fill
                sizes="224px"
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
          <button
            onClick={toggleMenu}
            className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Toggle menu"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeMenu}
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 z-50 shadow-xl">
            {/* Logo and Branding */}
            <div className="px-6 py-5 border-b border-wondrous-grey-light dark:border-gray-700">
              <div className="flex items-center justify-center mb-3">
                <div className="relative w-full h-16">
                  <Image
                    src="/images/all-wondrous-logo.svg"
                    alt="All Wondrous"
                    fill
                    sizes="256px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-1">
              {links.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px]",
                      isActive
                        ? "bg-wondrous-magenta text-white shadow-md"
                        : "text-wondrous-grey-dark dark:text-gray-300 hover:bg-wondrous-magenta/10 hover:text-wondrous-magenta dark:hover:text-wondrous-magenta"
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Info (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
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
            </div>
          </div>
        </>
      )}
    </>
  );
}
