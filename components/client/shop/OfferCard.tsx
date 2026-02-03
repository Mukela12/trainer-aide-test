'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, Users, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface OfferCardProps {
  id: string;
  title: string;
  description: string | null;
  paymentAmount: number;
  currency: string;
  credits: number;
  expiryDays: number | null;
  expiresAt: string | null;
  remainingSpots: number | null;
  isGift: boolean;
  isFree: boolean;
  onClaim: (id: string) => void;
  isLoading: boolean;
}

export function OfferCard({
  id,
  title,
  description,
  paymentAmount,
  currency,
  credits,
  expiryDays,
  expiresAt,
  remainingSpots,
  isGift,
  isFree,
  onClaim,
  isLoading,
}: OfferCardProps) {
  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: curr || 'GBP',
    }).format(amount);
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow border-2 border-dashed border-purple-200 dark:border-purple-800">
      {isFree && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-green-500 text-white hover:bg-green-500">
            FREE
          </Badge>
        </div>
      )}
      {isGift && (
        <div className="absolute top-0 left-0">
          <Badge className="rounded-none rounded-br-lg bg-purple-500 text-white hover:bg-purple-500">
            <Gift size={12} className="mr-1" />
            Gift
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center shrink-0">
            <Gift className="text-purple-600 dark:text-purple-400" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <CreditCard size={14} />
            <span className="font-medium">{credits} credit{credits !== 1 ? 's' : ''}</span>
          </div>
          {expiryDays && (
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <Calendar size={14} />
              <span>Valid for {expiryDays} days</span>
            </div>
          )}
          {remainingSpots !== null && (
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
              <Users size={14} />
              <span>{remainingSpots} spot{remainingSpots !== 1 ? 's' : ''} left</span>
            </div>
          )}
        </div>

        {expiresAt && (
          <p className="text-xs text-gray-500">
            Offer expires: {format(new Date(expiresAt), 'MMM d, yyyy')}
          </p>
        )}

        <div className="flex items-baseline gap-2">
          {isFree ? (
            <span className="text-2xl font-bold text-green-600">Free</span>
          ) : (
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatPrice(paymentAmount, currency)}
            </span>
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
            {isLoading ? 'Claiming...' : 'Claim Offer'}
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
