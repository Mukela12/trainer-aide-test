import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  color?: 'blue' | 'magenta' | 'orange' | 'green' | 'slate';
}

const colorStyles = {
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/20',
    iconColor: 'text-wondrous-blue',
    border: 'border-blue-200/50',
    accentGradient: 'from-blue-500/10 to-transparent',
  },
  magenta: {
    iconBg: 'bg-gradient-to-br from-pink-500/20 to-pink-600/20',
    iconColor: 'text-wondrous-magenta',
    border: 'border-pink-200/50',
    accentGradient: 'from-pink-500/10 to-transparent',
  },
  orange: {
    iconBg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/20',
    iconColor: 'text-wondrous-orange',
    border: 'border-orange-200/50',
    accentGradient: 'from-orange-500/10 to-transparent',
  },
  green: {
    iconBg: 'bg-gradient-to-br from-green-500/20 to-green-600/20',
    iconColor: 'text-green-600',
    border: 'border-green-200/50',
    accentGradient: 'from-green-500/10 to-transparent',
  },
  slate: {
    iconBg: 'bg-slate-100 dark:bg-slate-700',
    iconColor: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200/50 dark:border-slate-600/50',
    accentGradient: 'from-slate-500/5 to-transparent',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  color = 'blue'
}: StatCardProps) {
  const colors = colorStyles[color];

  return (
    <Card className={cn(
      "relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/95 border dark:border-gray-600 hover:shadow-lg active:scale-[0.98] transition-all duration-200",
      colors.border,
      className
    )}>
      {/* Subtle gradient accent */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl opacity-50",
        colors.accentGradient
      )} />

      <div className="relative p-5 sm:p-6">
        {/* Icon and Title Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide truncate">
              {title}
            </p>
          </div>
          <div className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-2",
            colors.iconBg
          )}>
            <Icon className={cn(colors.iconColor)} size={22} strokeWidth={2.5} />
          </div>
        </div>

        {/* Value */}
        <div className="mb-1">
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {value}
          </p>
        </div>

        {/* Trend */}
        {trend && (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span className={cn(
              "font-semibold",
              trend.value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span>{trend.label}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
