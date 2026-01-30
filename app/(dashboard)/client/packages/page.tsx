'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  Package,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ContentHeader from '@/components/shared/ContentHeader';

interface ClientPackage {
  id: string;
  packageName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  purchasedAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'exhausted';
}

interface CreditsData {
  totalCredits: number;
  creditStatus: 'none' | 'low' | 'medium' | 'good';
  nearestExpiry: string | null;
  packages: ClientPackage[];
}

export default function ClientPackagesPage() {
  const { currentUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/client/packages');
        if (!res.ok) {
          throw new Error('Failed to fetch credits');
        }
        const data = await res.json();
        setCreditsData(data);
      } catch (err) {
        console.error('Error fetching credits:', err);
        setError('Unable to load your credits. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredits();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'exhausted':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCreditStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <Sparkles className="text-green-500" size={24} />;
      case 'medium':
        return <CreditCard className="text-yellow-500" size={24} />;
      case 'low':
        return <AlertTriangle className="text-orange-500" size={24} />;
      default:
        return <AlertTriangle className="text-red-500" size={24} />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  const { totalCredits, creditStatus, nearestExpiry, packages } = creditsData || {
    totalCredits: 0,
    creditStatus: 'none',
    nearestExpiry: null,
    packages: [],
  };

  const activePackages = packages.filter((p) => p.status === 'active');

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Content Header */}
      <ContentHeader
        context="View your session credits and packages"
        stats={[
          { label: 'credits', value: isLoading ? '...' : totalCredits, color: creditStatus === 'low' ? 'warning' : 'success' },
          { label: 'active packages', value: isLoading ? '...' : activePackages.length, color: 'primary' },
        ]}
      />

      {/* Credits Summary */}
      <Card className="mb-8 border-2 border-wondrous-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getCreditStatusIcon(creditStatus)}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Available Credits
                </p>
                <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {totalCredits}
                </p>
              </div>
            </div>
            {nearestExpiry && (
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Next Expiry
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatDistanceToNow(new Date(nearestExpiry), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>

          {creditStatus === 'low' && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={18} />
              <span className="text-sm text-orange-700 dark:text-orange-400">
                You&apos;re running low on credits. Consider purchasing more to continue training.
              </span>
            </div>
          )}

          {creditStatus === 'none' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} />
              <span className="text-sm text-red-700 dark:text-red-400">
                You have no credits remaining. Purchase a package to book sessions.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Packages */}
      <div className="mb-8">
        <h2 className="text-heading-2 dark:text-gray-100 mb-4">
          Active Packages ({activePackages.length})
        </h2>

        {activePackages.length > 0 ? (
          <div className="space-y-4">
            {activePackages.map((pkg) => {
              const usagePercent =
                pkg.sessionsTotal > 0
                  ? (pkg.sessionsUsed / pkg.sessionsTotal) * 100
                  : 0;

              return (
                <Card key={pkg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-wondrous-primary/10 rounded-lg flex items-center justify-center">
                          <Package className="text-wondrous-primary" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {pkg.packageName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Purchased {format(new Date(pkg.purchasedAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(pkg.status)}>
                        {pkg.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {pkg.sessionsUsed} of {pkg.sessionsTotal} sessions used
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {pkg.sessionsRemaining} remaining
                        </span>
                      </div>
                      <Progress value={usagePercent} className="h-2" />
                    </div>

                    {pkg.expiresAt && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={14} />
                        <span>
                          Expires {format(new Date(pkg.expiresAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <Package className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Active Packages
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You don&apos;t have any active packages. Contact your trainer to purchase credits.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Expired/Exhausted Packages */}
      {packages.filter((p) => p.status !== 'active').length > 0 && (
        <div>
          <h2 className="text-heading-2 dark:text-gray-100 mb-4">Past Packages</h2>
          <div className="space-y-3">
            {packages
              .filter((p) => p.status !== 'active')
              .map((pkg) => (
                <Card key={pkg.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="text-gray-400" size={18} />
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            {pkg.packageName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {pkg.sessionsUsed} sessions used
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(pkg.status)}>
                        {pkg.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
