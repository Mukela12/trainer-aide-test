"use client";

import Link from 'next/link';
import { useTemplateStore } from '@/lib/stores/template-store';
import { useSessionStore } from '@/lib/stores/session-store';
import { useUserStore } from '@/lib/stores/user-store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle, Dumbbell, TrendingUp, Plus } from 'lucide-react';

export default function StudioOwnerDashboard() {
  const templates = useTemplateStore((state) => state.templates);
  const sessions = useSessionStore((state) => state.sessions);
  const { currentUser } = useUserStore();

  // Calculate stats
  const totalTemplates = templates.length;
  const activeTemplates = templates.length; // All templates are active in this demo
  const totalSessions = sessions.filter(s => s.completed).length;
  const averageRpe = sessions.filter(s => s.overallRpe).length > 0
    ? Math.round(sessions.filter(s => s.overallRpe).reduce((acc, s) => acc + (s.overallRpe || 0), 0) / sessions.filter(s => s.overallRpe).length)
    : 0;

  // Get recent templates
  const recentTemplates = templates.slice(0, 3);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-heading-1 font-bold text-gray-900 dark:text-gray-100 mb-2">
          Hey {currentUser.firstName}! 👋
        </h1>
        <p className="text-sm lg:text-body-sm text-gray-600 dark:text-gray-400">
          Manage templates and track sessions across all studios
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <StatCard
          title="Templates"
          value={totalTemplates}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Active"
          value={activeTemplates}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Sessions"
          value={totalSessions}
          icon={Dumbbell}
          color="magenta"
        />
        <StatCard
          title="Avg RPE"
          value={averageRpe > 0 ? `${averageRpe}/10` : 'N/A'}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6 lg:mb-8">
        <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Link href="/studio-owner/templates/builder" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-blue-200/50 dark:border-blue-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="text-wondrous-blue dark:text-blue-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Create New Template</span>
              </div>
            </div>
          </Link>
          <Link href="/studio-owner/templates" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-pink-200/50 dark:border-pink-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-pink-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="text-wondrous-magenta" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">View All Templates</span>
              </div>
            </div>
          </Link>
          <Link href="/studio-owner/sessions" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-orange-200/50 dark:border-orange-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-orange-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Dumbbell className="text-wondrous-orange" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">View All Sessions</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Templates */}
      <div>
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100">
            Recent Templates
          </h2>
          <Link href="/studio-owner/templates">
            <Button variant="ghost" size="sm" className="text-xs lg:text-sm">View All</Button>
          </Link>
        </div>

        {recentTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {recentTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base lg:text-lg dark:text-gray-100">
                    {template.name}
                  </CardTitle>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {template.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs lg:text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {template.blocks.length} blocks
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {template.type.replace('_', ' ')}
                    </span>
                  </div>
                  <Link href={`/studio-owner/templates/${template.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 lg:p-8 dark:bg-gray-800 dark:border-gray-700">
            <div className="text-center text-gray-500">
              <FileText className="mx-auto mb-3 lg:mb-4 text-gray-400 dark:text-gray-600" size={40} />
              <p className="text-base lg:text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No templates yet</p>
              <p className="text-xs lg:text-sm mb-4 dark:text-gray-400">Create your first workout template to get started</p>
              <Link href="/studio-owner/templates/builder">
                <Button className="bg-wondrous-magenta hover:bg-wondrous-magenta-dark text-sm">Create Template</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
