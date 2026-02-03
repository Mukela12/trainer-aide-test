"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSessionStore } from '@/lib/stores/session-store';
import { useCalendarStore } from '@/lib/stores/booking-store';
import { useServiceStore } from '@/lib/stores/service-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Service, ServiceType } from '@/lib/types/service';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ServiceFormDialog } from '@/components/studio-owner/ServiceFormDialog';
import {
  Clock,
  Plus,
  Edit,
  Power,
  PowerOff,
  Users,
  User,
  UsersRound,
  Dumbbell,
  Play,
  Trash2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import ContentHeader from '@/components/shared/ContentHeader';

type MainTab = 'services' | 'sessions';
type SessionTab = 'upcoming' | 'in_progress' | 'completed';

export default function ServicesPage() {
  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('services');
  const [sessionTab, setSessionTab] = useState<SessionTab>('upcoming');

  // Service management
  const { services, addService, updateService } = useServiceStore();
  const { currentUser } = useUserStore();
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Session management
  const { sessions, deleteSession } = useSessionStore();
  const { sessions: calendarSessions } = useCalendarStore();

  // Service stats
  const activeServices = services.filter((s) => s.isActive);
  const inactiveServices = services.filter((s) => !s.isActive);

  // Session filtering
  const inProgressSessions = sessions.filter((s) => !s.completed);
  const now = new Date();
  const upcomingSessions = calendarSessions
    .filter((s) => {
      const sessionDate = s.datetime instanceof Date ? s.datetime : new Date(s.datetime);
      return sessionDate > now;
    })
    .sort((a, b) => {
      const dateA = a.datetime instanceof Date ? a.datetime : new Date(a.datetime);
      const dateB = b.datetime instanceof Date ? b.datetime : new Date(b.datetime);
      return dateA.getTime() - dateB.getTime();
    });
  const completedSessions = sessions
    .filter((s) => s.completed)
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  const displaySessions =
    sessionTab === 'upcoming'
      ? upcomingSessions
      : sessionTab === 'in_progress'
        ? inProgressSessions
        : completedSessions;

  // Service type helpers
  const getTypeIcon = (type: ServiceType) => {
    switch (type) {
      case '1-2-1':
        return <User size={16} />;
      case 'duet':
        return <Users size={16} />;
      case 'group':
        return <UsersRound size={16} />;
    }
  };

  const getTypeLabel = (type: ServiceType) => {
    switch (type) {
      case '1-2-1':
        return '1-on-1';
      case 'duet':
        return 'Duet';
      case 'group':
        return 'Group';
    }
  };

  const toggleServiceStatus = (serviceId: string, currentStatus: boolean) => {
    updateService(serviceId, { isActive: !currentStatus });
  };

  const handleAddService = () => {
    setSelectedService(null);
    setIsServiceDialogOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = (service: Service) => {
    const serviceWithUser = {
      ...service,
      createdBy: service.createdBy === 'user_owner_1' ? currentUser.id : service.createdBy,
    };

    if (selectedService) {
      updateService(serviceWithUser.id, serviceWithUser);
    } else {
      addService(serviceWithUser);
    }

    setIsServiceDialogOpen(false);
    setSelectedService(null);
  };

  const handleDeleteSession = (sessionId: string, sessionName: string, isCompleted: boolean) => {
    if (isCompleted) {
      alert('Cannot delete completed sessions. Completed sessions are historic records.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${sessionName}"?`)) {
      deleteSession(sessionId);
    }
  };

  // Stats for header
  const headerStats =
    mainTab === 'services'
      ? [
          { label: 'services', value: services.length, color: 'primary' as const },
          { label: 'active', value: activeServices.length, color: 'success' as const },
          { label: 'inactive', value: inactiveServices.length, color: 'default' as const },
        ]
      : [
          { label: 'upcoming', value: upcomingSessions.length, color: 'primary' as const },
          { label: 'in progress', value: inProgressSessions.length, color: 'warning' as const },
          { label: 'completed', value: completedSessions.length, color: 'success' as const },
        ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context={mainTab === 'services' ? 'Manage session types clients can book' : 'View and manage your training sessions'}
        stats={headerStats}
        actions={
          mainTab === 'services' ? (
            <Button onClick={handleAddService} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus size={20} />
              <span className="hidden sm:inline">Add Service</span>
            </Button>
          ) : (
            <Link href="/trainer/sessions/new">
              <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Plus size={20} />
                <span className="hidden sm:inline">New Session</span>
              </Button>
            </Link>
          )
        }
      />

      {/* Main Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setMainTab('services')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
              mainTab === 'services'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <span className="flex items-center gap-2">
              <Clock size={16} />
              Services
              <Badge variant="secondary" className="ml-1 text-xs">
                {services.length}
              </Badge>
            </span>
          </button>
          <button
            onClick={() => setMainTab('sessions')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
              mainTab === 'sessions'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <span className="flex items-center gap-2">
              <Dumbbell size={16} />
              Sessions
              {(upcomingSessions.length > 0 || inProgressSessions.length > 0) && (
                <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {upcomingSessions.length + inProgressSessions.length}
                </Badge>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Services Tab Content */}
      {mainTab === 'services' && (
        <div className="space-y-6">
          {/* Info Card */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-start gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm lg:text-base text-gray-900 dark:text-gray-100 mb-1">
                    What are Services?
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Services define session types (e.g., &quot;30min PT Session&quot;). They specify duration, type (1-on-1, duet, group), and credits.
                    Different from <span className="font-medium">Templates</span>, which are workout programs with exercises.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Services */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Active Services ({activeServices.length})
            </h2>

            {activeServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeServices.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                            <CardTitle className="text-base lg:text-lg dark:text-gray-100 truncate">{service.name}</CardTitle>
                          </div>
                          <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{service.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Duration</span>
                          <Badge variant="outline" className="dark:border-gray-600 text-xs">
                            <Clock size={12} className="mr-1" />
                            {service.duration} min
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Type</span>
                          <Badge variant="outline" className="dark:border-gray-600 text-xs">
                            {getTypeIcon(service.type)}
                            <span className="ml-1">{getTypeLabel(service.type)}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Max Capacity</span>
                          <span className="font-medium dark:text-gray-200">{service.maxCapacity}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Credits</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400">{service.creditsRequired}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditService(service)}
                          className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 text-xs"
                        >
                          <Edit size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleServiceStatus(service.id, service.isActive)}
                          className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20 text-xs"
                        >
                          <PowerOff size={14} className="mr-1" />
                          Disable
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No active services"
                description="Create your first service to allow clients to book sessions"
                actionLabel="Add Service"
                onAction={handleAddService}
              />
            )}
          </div>

          {/* Inactive Services */}
          {inactiveServices.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Inactive Services ({inactiveServices.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveServices.map((service) => (
                  <Card key={service.id} className="opacity-60 hover:opacity-100 transition-opacity dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                          <CardTitle className="text-base lg:text-lg dark:text-gray-100 truncate">{service.name}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="mb-2 text-xs">
                          Inactive
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3">
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Duration</span>
                          <span className="font-medium dark:text-gray-300">{service.duration} min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Type</span>
                          <span className="font-medium dark:text-gray-300">{getTypeLabel(service.type)}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleServiceStatus(service.id, service.isActive)}
                        className="w-full border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 text-xs"
                      >
                        <Power size={14} className="mr-1" />
                        Enable
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab Content */}
      {mainTab === 'sessions' && (
        <div className="space-y-6">
          {/* Session Sub-Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setSessionTab('upcoming')}
              className={cn(
                'px-4 py-3 font-medium text-sm transition-colors relative',
                sessionTab === 'upcoming'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              Upcoming
              {upcomingSessions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">{upcomingSessions.length}</span>
              )}
              {sessionTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
            </button>
            <button
              onClick={() => setSessionTab('in_progress')}
              className={cn(
                'px-4 py-3 font-medium text-sm transition-colors relative',
                sessionTab === 'in_progress'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              In Progress
              {inProgressSessions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">{inProgressSessions.length}</span>
              )}
              {sessionTab === 'in_progress' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
            </button>
            <button
              onClick={() => setSessionTab('completed')}
              className={cn(
                'px-4 py-3 font-medium text-sm transition-colors relative',
                sessionTab === 'completed'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              Completed
              {completedSessions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-full">
                  {completedSessions.length}
                </span>
              )}
              {sessionTab === 'completed' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
            </button>
          </div>

          {/* Sessions List */}
          {displaySessions.length > 0 ? (
            <div className="space-y-3">
              {displaySessions.map((session: any) => {
                const isCalendarSession = 'datetime' in session;
                const isCompleted = !isCalendarSession && session.completed;

                return (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 lg:p-5">
                      <div className="flex items-start gap-3 lg:gap-4">
                        {/* Icon */}
                        <div
                          className={cn(
                            'flex w-10 h-10 lg:w-12 lg:h-12 rounded-lg items-center justify-center flex-shrink-0',
                            isCompleted
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : isCalendarSession
                                ? 'bg-orange-100 dark:bg-orange-900/30'
                                : 'bg-purple-100 dark:bg-purple-900/30'
                          )}
                        >
                          <Dumbbell
                            className={
                              isCompleted
                                ? 'text-green-600 dark:text-green-400'
                                : isCalendarSession
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-purple-600 dark:text-purple-400'
                            }
                            size={20}
                            strokeWidth={2.5}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {isCalendarSession
                                  ? session.clientName
                                  : session.client
                                    ? `${session.client.firstName} ${session.client.lastName}`
                                    : 'Walk-in Client'}
                              </h3>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {isCalendarSession ? (
                                  format(
                                    session.datetime instanceof Date ? session.datetime : new Date(session.datetime),
                                    "EEE, MMM d 'at' h:mm a"
                                  )
                                ) : (
                                  <>
                                    {format(new Date(session.startedAt), "EEE, MMM d 'at' h:mm a")}
                                    {isCompleted &&
                                      session.completedAt &&
                                      ` - Completed ${format(new Date(session.completedAt), 'h:mm a')}`}
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={isCompleted ? 'success' : 'default'}
                              className={
                                isCompleted
                                  ? ''
                                  : isCalendarSession
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              }
                            >
                              {isCompleted ? 'Completed' : isCalendarSession ? 'Scheduled' : 'In Progress'}
                            </Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {isCalendarSession ? (
                            <Link href="/solo/calendar">
                              <Button size="sm" variant="outline" className="whitespace-nowrap gap-2">
                                <Calendar size={16} />
                                View
                              </Button>
                            </Link>
                          ) : (
                            <>
                              {!session.completed ? (
                                <Link href={`/trainer/sessions/${session.id}`}>
                                  <Button size="sm" className="whitespace-nowrap gap-2 bg-purple-600 hover:bg-purple-700">
                                    <Play size={16} />
                                    Resume
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/trainer/sessions/${session.id}/view`}>
                                  <Button size="sm" variant="outline" className="whitespace-nowrap gap-2">
                                    <ChevronRight size={16} />
                                    Details
                                  </Button>
                                </Link>
                              )}
                              {!session.completed && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSession(session.id, session.sessionName || 'Session', session.completed)}
                                  className="text-red-600 hover:text-red-700 whitespace-nowrap gap-2"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title={
                sessionTab === 'upcoming'
                  ? 'No upcoming sessions'
                  : sessionTab === 'in_progress'
                    ? 'No sessions in progress'
                    : 'No completed sessions'
              }
              description={
                sessionTab === 'upcoming'
                  ? 'Schedule sessions in your calendar'
                  : sessionTab === 'in_progress'
                    ? 'Start a new training session'
                    : 'Completed sessions will appear here'
              }
              action={
                sessionTab === 'upcoming' ? (
                  <Link href="/solo/calendar">
                    <Button>
                      <Calendar size={20} className="mr-2" />
                      View Calendar
                    </Button>
                  </Link>
                ) : sessionTab === 'in_progress' ? (
                  <Link href="/trainer/sessions/new">
                    <Button>
                      <Plus size={20} className="mr-2" />
                      Start Session
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>
      )}

      {/* Service Form Dialog */}
      <ServiceFormDialog
        open={isServiceDialogOpen}
        onClose={() => {
          setIsServiceDialogOpen(false);
          setSelectedService(null);
        }}
        onSave={handleSaveService}
        service={selectedService}
      />
    </div>
  );
}
