"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTemplateStore } from '@/lib/stores/template-store';
import { useUserStore } from '@/lib/stores/user-store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle, Dumbbell, TrendingUp, Plus, Inbox, Users, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

// Format today's date
const today = new Date();
const dateString = format(today, 'EEEE, MMMM d');

interface DashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  totalSessions: number;
  averageRpe: number;
  pendingRequests: number;
  totalClients: number;
}

interface RecentClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  credits: number;
  createdAt: Date;
}

export default function StudioOwnerDashboard() {
  const templates = useTemplateStore((state) => state.templates);
  const { currentUser } = useUserStore();

  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    activeTemplates: 0,
    totalSessions: 0,
    averageRpe: 0,
    pendingRequests: 0,
    totalClients: 0,
  });
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);

      try {
        // Fetch analytics from API
        const analyticsResponse = await fetch('/api/analytics/dashboard');
        let pendingRequestsCount = 0;

        // Fetch pending booking requests count
        try {
          const requestsRes = await fetch('/api/booking-requests');
          if (requestsRes.ok) {
            const requestsData = await requestsRes.json();
            pendingRequestsCount = (requestsData.requests || []).filter(
              (r: { status: string }) => r.status === 'pending'
            ).length;
          }
        } catch {
          // Ignore errors fetching requests
        }

        // Fetch templates count from API
        let templatesCount = templates.length;
        try {
          const templatesRes = await fetch('/api/templates');
          if (templatesRes.ok) {
            const templatesData = await templatesRes.json();
            templatesCount = (templatesData.templates || []).length;
          }
        } catch {
          // Fall back to store data
        }

        // Fetch clients data
        let clientsCount = 0;
        try {
          const clientsRes = await fetch('/api/clients');
          if (clientsRes.ok) {
            const clientsData = await clientsRes.json();
            const clients = clientsData.clients || [];
            clientsCount = clients.length;

            // Sort by created_at and take recent 5
            const sortedClients = clients
              .sort((a: { created_at: string }, b: { created_at: string }) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              .slice(0, 5)
              .map((c: { id: string; first_name: string; last_name: string; email: string; credits: number; created_at: string }) => ({
                id: c.id,
                firstName: c.first_name || '',
                lastName: c.last_name || '',
                email: c.email,
                credits: c.credits || 0,
                createdAt: new Date(c.created_at),
              }));
            setRecentClients(sortedClients);
          }
        } catch {
          // Ignore errors
        }

        if (analyticsResponse.ok) {
          const data = await analyticsResponse.json();
          setStats({
            totalTemplates: templatesCount || templates.length,
            activeTemplates: templatesCount || templates.length,
            totalSessions: data.sessionsThisWeek || 0,
            averageRpe: data.averageRpe || 0,
            pendingRequests: pendingRequestsCount,
            totalClients: clientsCount,
          });
        } else {
          // Fall back to store-based calculations
          setStats({
            totalTemplates: templates.length,
            activeTemplates: templates.length,
            totalSessions: 0,
            averageRpe: 0,
            pendingRequests: pendingRequestsCount,
            totalClients: clientsCount,
          });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fall back to store data on error
        setStats({
          totalTemplates: templates.length,
          activeTemplates: templates.length,
          totalSessions: 0,
          averageRpe: 0,
          pendingRequests: 0,
          totalClients: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser.id) {
      loadDashboardData();
    }
  }, [currentUser.id, templates.length]);

  // Get recent templates from store as fallback
  const recentTemplates = templates.slice(0, 3);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A71075] via-[#8a0d60] to-[#0A1466] p-6 md:p-8 mb-6 lg:mb-8">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#A71075]/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">{dateString}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Welcome back, {currentUser.firstName}
            </h1>
            <p className="text-white/70">
              This week: <span className="text-white font-medium">{isLoading ? '...' : stats.totalSessions} sessions completed</span>
            </p>
          </div>

          {/* Quick Stat Display */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white/70 text-sm">Total Templates</p>
              <p className="text-3xl font-bold text-white">{isLoading ? '...' : stats.totalTemplates}</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <FileText className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <StatCard
          title="Templates"
          value={isLoading ? '...' : stats.totalTemplates}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Active"
          value={isLoading ? '...' : stats.activeTemplates}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Sessions"
          value={isLoading ? '...' : stats.totalSessions}
          icon={Dumbbell}
          color="magenta"
        />
        <StatCard
          title="Avg RPE"
          value={isLoading ? '...' : (stats.averageRpe > 0 ? `${stats.averageRpe}/10` : 'N/A')}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6 lg:mb-8">
        <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
          <Link href="/studio-owner/requests" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-cyan-200/50 dark:border-cyan-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Inbox className="text-cyan-600 dark:text-cyan-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Booking Requests</span>
              </div>
            </div>
          </Link>
        </div>
        {/* Second row of quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3">
          <Link href="/studio-owner/clients" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-purple-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="text-purple-600 dark:text-purple-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Manage Clients</span>
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

      {/* Recent Clients */}
      <div className="mt-6 lg:mt-8">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100">
            Recent Clients
          </h2>
          <Link href="/studio-owner/clients">
            <Button variant="ghost" size="sm" className="text-xs lg:text-sm">View All ({stats.totalClients})</Button>
          </Link>
        </div>

        {recentClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {recentClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-wondrous-blue-light flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-wondrous-dark-blue">
                        {client.firstName?.[0]}{client.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {client.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {client.credits}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">credits</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 lg:p-8 dark:bg-gray-800 dark:border-gray-700">
            <div className="text-center text-gray-500">
              <Users className="mx-auto mb-3 lg:mb-4 text-gray-400 dark:text-gray-600" size={40} />
              <p className="text-base lg:text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No clients yet</p>
              <p className="text-xs lg:text-sm mb-4 dark:text-gray-400">Add or invite clients to get started</p>
              <Link href="/studio-owner/clients">
                <Button className="bg-wondrous-magenta hover:bg-wondrous-magenta-dark text-sm">Add Client</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
