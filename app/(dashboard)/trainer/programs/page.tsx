'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgramCard } from '@/components/ai-programs/ProgramCard';
import { useAIPrograms } from '@/lib/hooks/use-ai-programs';
import { useUserStore } from '@/lib/stores/user-store';
import ContentHeader from '@/components/shared/ContentHeader';

type FilterType = 'all' | 'draft' | 'active' | 'completed' | 'archived';

export default function ProgramsListPage() {
  const router = useRouter();
  const { canCreateAIPrograms } = useUserStore();
  const { data: programs = [], isLoading: loading } = useAIPrograms();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Redirect trainers to solo route - AI Programs only for solo practitioners
  useEffect(() => {
    if (!canCreateAIPrograms()) {
      router.replace('/solo/programs');
    }
  }, [canCreateAIPrograms, router]);

  const filteredPrograms = programs.filter((program) => {
    // Apply status filter
    if (filter !== 'all' && program.status !== filter) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        program.program_name.toLowerCase().includes(search) ||
        program.description?.toLowerCase().includes(search) ||
        program.primary_goal?.toLowerCase().includes(search) ||
        program.experience_level?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const getFilterCount = (filterType: FilterType) => {
    if (filterType === 'all') return programs.length;
    return programs.filter(p => p.status === filterType).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Content Header */}
        <ContentHeader
          context="Create and manage AI-generated workout programs"
          stats={[
            { label: 'total', value: loading ? '...' : programs.length, color: 'primary' },
            { label: 'active', value: loading ? '...' : programs.filter(p => p.status === 'active').length, color: 'success' },
            { label: 'draft', value: loading ? '...' : programs.filter(p => p.status === 'draft').length, color: 'warning' },
          ]}
          actions={
            <Button
              onClick={() => router.push('/trainer/programs/new')}
              className="bg-wondrous-primary hover:bg-purple-700 text-white gap-2"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">New Program</span>
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Status Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'draft', 'active', 'completed', 'archived'] as FilterType[]).map((filterType) => (
              <Button
                key={filterType}
                onClick={() => setFilter(filterType)}
                variant={filter === filterType ? 'default' : 'outline'}
                className={
                  filter === filterType
                    ? 'bg-wondrous-primary hover:bg-purple-700 text-white'
                    : ''
                }
                size="sm"
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                <span className="ml-1.5 text-xs opacity-75">
                  ({getFilterCount(filterType)})
                </span>
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Programs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wondrous-magenta mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading programs...</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || filter !== 'all'
                  ? 'No programs found'
                  : 'No programs yet'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first AI-generated program to get started'}
              </p>
              {!searchTerm && filter === 'all' && (
                <Button
                  onClick={() => router.push('/trainer/programs/new')}
                  className="bg-wondrous-primary hover:bg-purple-700 text-white"
                >
                  <Plus size={20} className="mr-2" />
                  Create Program
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
