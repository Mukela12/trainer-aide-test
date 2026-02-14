"use client";

import { useState } from 'react';
import { useSessionData } from '@/lib/hooks/use-sessions';
import { useUserStore } from '@/lib/stores/user-store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDuration } from '@/lib/utils/generators';
import { Dumbbell, Search, Calendar, Clock, TrendingUp, User, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import ContentHeader from '@/components/shared/ContentHeader';

type FilterType = 'all' | 'completed' | 'in_progress';

export default function AllSessionsPage() {
  const { currentUser } = useUserStore();
  const { sessions } = useSessionData(currentUser.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.template?.name || 'Custom Session'.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.client?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.client?.lastName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'completed' && session.completed) ||
      (filterType === 'in_progress' && !session.completed);

    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    const dateA = new Date(a.completedAt || a.startedAt).getTime();
    const dateB = new Date(b.completedAt || b.startedAt).getTime();
    return dateB - dateA;
  });

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.completed).length,
    inProgress: sessions.filter(s => !s.completed).length,
    avgRpe: sessions.filter(s => s.overallRpe).length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + (s.overallRpe || 0), 0) / sessions.filter(s => s.overallRpe).length)
      : 0,
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Content Header */}
      <ContentHeader
        context="Monitor all training sessions across your studios"
        stats={[
          { label: 'total', value: stats.total, color: 'primary' },
          { label: 'completed', value: stats.completed, color: 'success' },
          { label: 'in progress', value: stats.inProgress, color: 'warning' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wondrous-blue-light rounded-lg flex items-center justify-center">
                <Dumbbell className="text-wondrous-dark-blue" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg RPE</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgRpe > 0 ? `${stats.avgRpe}/10` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search by client name, session, or template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-600" />
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All Sessions
          </Button>
          <Button
            variant={filterType === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('completed')}
          >
            Completed
          </Button>
          <Button
            variant={filterType === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('in_progress')}
          >
            In Progress
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Icon */}
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                    session.completed ? 'bg-green-100' : 'bg-wondrous-blue-light'
                  )}>
                    <Dumbbell
                      className={session.completed ? 'text-green-600' : 'text-wondrous-dark-blue'}
                      size={24}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 truncate">
                          {session.sessionName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          {session.client && (
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {session.client.firstName} {session.client.lastName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {format(new Date(session.startedAt), 'MMM d, yyyy')}
                          </span>
                          {session.duration && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {formatDuration(session.duration)}
                            </span>
                          )}
                          {session.overallRpe && (
                            <span className="flex items-center gap-1">
                              <TrendingUp size={14} />
                              RPE {session.overallRpe}/10
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={session.completed ? 'success' : 'default'}>
                        {session.completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>

                    {/* Template Info */}
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Template:</span> {session.template?.name || 'Custom Session'}
                    </div>

                    {/* Notes */}
                    {session.completed && (session.privateNotes || session.publicNotes) && (
                      <div className="mt-2 space-y-2">
                        {session.privateNotes && (
                          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1">Private Notes (Trainer Only):</p>
                            <p className="text-gray-700 dark:text-gray-300 italic">&quot;{session.privateNotes}&quot;</p>
                          </div>
                        )}
                        {session.publicNotes && (
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">Public Notes (Shared with Client):</p>
                            <p className="text-gray-700 dark:text-gray-300 italic">&quot;{session.publicNotes}&quot;</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title={searchQuery || filterType !== 'all' ? 'No sessions found' : 'No sessions yet'}
          description={
            searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Sessions will appear here once trainers start using templates'
          }
        />
      )}
    </div>
  );
}
