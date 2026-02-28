"use client";

import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ContentHeader from '@/components/shared/ContentHeader';

export default function SoloRevenuePage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <ContentHeader context="Track your earnings and financial performance" />

      <Card className="p-12 text-center">
        <CardContent className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Revenue Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Full revenue tracking, payout history, and financial reporting coming soon.
            You&apos;ll be able to see earnings breakdowns, track trends, and export reports.
          </p>
          <div className="flex items-center justify-center gap-6 pt-4 text-sm text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><TrendingUp size={14} /> Earnings trends</span>
            <span className="flex items-center gap-1"><BarChart3 size={14} /> Payout history</span>
            <span className="flex items-center gap-1"><DollarSign size={14} /> Revenue reports</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
