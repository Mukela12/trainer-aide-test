'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, CreditCard } from 'lucide-react';

interface PackageCardProps {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  validityDays: number | null;
  perSessionPriceCents: number | null;
  savingsPercent: number | null;
  isFree: boolean;
  onClaim: (id: string) => void;
  isLoading: boolean;
}

export function PackageCard({
  id,
  name,
  description,
  sessionCount,
  priceCents,
  validityDays,
  perSessionPriceCents,
  savingsPercent,
  isFree,
  onClaim,
  isLoading,
}: PackageCardProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100);
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {isFree && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-green-500 text-white hover:bg-green-500">
            FREE
          </Badge>
        </div>
      )}
      {savingsPercent && savingsPercent > 0 && !isFree && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-orange-500 text-white hover:bg-orange-500">
            Save {savingsPercent}%
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center shrink-0">
            <Package className="text-wondrous-magenta" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight">{name}</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <CreditCard size={14} />
            <span className="font-medium">{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
          </div>
          {validityDays && (
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <Calendar size={14} />
              <span>{validityDays} days validity</span>
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          {isFree ? (
            <span className="text-2xl font-bold text-green-600">Free</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatPrice(priceCents)}
              </span>
              {perSessionPriceCents && (
                <span className="text-sm text-gray-500">
                  ({formatPrice(perSessionPriceCents)}/session)
                </span>
              )}
            </>
          )}
        </div>
      </CardContent>

      <CardFooter>
        {isFree ? (
          <Button
            className="w-full"
            onClick={() => onClaim(id)}
            disabled={isLoading}
          >
            {isLoading ? 'Claiming...' : 'Get Now'}
          </Button>
        ) : (
          <Button className="w-full" variant="outline" disabled>
            Coming Soon
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
