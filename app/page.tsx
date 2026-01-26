"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
import { ROLE_DASHBOARDS } from '@/lib/permissions';
import { UserRole } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const currentRole = useUserStore((state) => state.currentRole);

  useEffect(() => {
    if (isAuthenticated && currentRole) {
      // Redirect to role-appropriate dashboard
      const dashboard = ROLE_DASHBOARDS[currentRole as UserRole] || '/solo';
      router.push(dashboard);
    } else {
      // Not authenticated - redirect to login
      router.push('/login');
    }
  }, [isAuthenticated, currentRole, router]);

  // Loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Loading...
        </p>
      </div>
    </div>
  );
}
