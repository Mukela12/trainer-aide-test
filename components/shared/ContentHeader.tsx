"use client";

import { ReactNode, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ContentHeaderStat {
  label: string;
  value: string | number;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'magenta' | 'slate';
}

export interface ContentHeaderProps {
  /** Context text (e.g., "View and manage your training sessions") */
  context?: string;
  /** Inline stats displayed as small badges */
  stats?: ContentHeaderStat[];
  /** Filter elements (optional) */
  filters?: ReactNode;
  /** Action buttons (optional) */
  actions?: ReactNode;
  /** Optional className */
  className?: string;
  /** Children rendered below the header */
  children?: ReactNode;
}

const statColorMap: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  primary: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  magenta: 'bg-pink-50 text-[#A71075] dark:bg-pink-900/30 dark:text-pink-400',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function ContentHeader({
  context,
  stats,
  filters,
  actions,
  className,
  children,
}: ContentHeaderProps) {
  const [showStickyBar, setShowStickyBar] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when header scrolls out of view
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const setupObserver = () => {
      if (!mediaQuery.matches) {
        setShowStickyBar(false);
        return;
      }

      const sentinel = sentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setShowStickyBar(!entry.isIntersecting);
        },
        { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
      );

      observer.observe(sentinel);
      return observer;
    };

    let observer = setupObserver();

    const handleMediaChange = () => {
      observer?.disconnect();
      observer = setupObserver();
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer?.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const hasContent = context || stats?.length || filters || actions;

  if (!hasContent && !children) {
    return null;
  }

  return (
    <>
      {/* Sticky Stats Bar - Desktop Only */}
      {stats && stats.length > 0 && (
        <div
          className={cn(
            'fixed top-0 left-0 right-0 z-40',
            'hidden lg:flex items-center gap-3',
            'px-6 py-2.5',
            'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
            'border-b border-gray-100 dark:border-gray-800 shadow-sm',
            'transition-all duration-200 ease-out',
            'lg:left-[var(--sidebar-width,16rem)]', // Account for sidebar (collapses with CSS var)
            showStickyBar
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-full pointer-events-none'
          )}
        >
          {/* Context in sticky bar */}
          {context && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {context}
            </span>
          )}
          {context && <span className="text-gray-300 dark:text-gray-600">|</span>}

          {/* Stats badges */}
          {stats.map((stat, index) => (
            <span
              key={index}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                statColorMap[stat.color || 'default']
              )}
            >
              <span className="font-semibold">{stat.value}</span>
              <span className="opacity-75">{stat.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Sentinel element - invisible marker for intersection observer */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div className={cn('mb-6', className)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left side: Context and Stats */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Context text */}
            {context && (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {context}
              </span>
            )}

            {/* Inline stats as small badges */}
            {stats && stats.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {context && <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>}
                {stats.map((stat, index) => (
                  <span
                    key={index}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                      statColorMap[stat.color || 'default']
                    )}
                  >
                    <span className="font-semibold">{stat.value}</span>
                    <span className="opacity-75">{stat.label}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Filters */}
            {filters && (
              <div className="flex items-center gap-2">
                {(context || stats?.length) && <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>}
                {filters}
              </div>
            )}
          </div>

          {/* Right side: Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Children */}
        {children}
      </div>
    </>
  );
}
