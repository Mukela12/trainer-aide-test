'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Share2, FileText, Dumbbell, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgramOverview } from '@/components/ai-programs/ProgramOverview';
import { WorkoutsList } from '@/components/ai-programs/WorkoutsList';
import { ShareProgramModal } from '@/components/ai-programs/ShareProgramModal';
import { useUserStore } from '@/lib/stores/user-store';
import { useAIProgram } from '@/lib/hooks/use-ai-programs';

type TabType = 'overview' | 'workouts' | 'progress';

export default function ProgramViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { canCreateAIPrograms } = useUserStore();
  const programId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showShareModal, setShowShareModal] = useState(false);

  const { data: program, isLoading: loading, error: queryError } = useAIProgram(programId);
  const error = queryError?.message || null;

  // Redirect trainers to solo route - AI Programs only for solo practitioners
  useEffect(() => {
    if (!canCreateAIPrograms()) {
      router.replace(`/solo/programs/${programId}`);
    }
  }, [canCreateAIPrograms, router, programId]);

  const handleBack = () => {
    router.push('/trainer/programs');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wondrous-magenta mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading program...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error || 'Program not found'}
            </p>
            <Button onClick={handleBack} variant="outline" className="mt-4">
              ← Back to Programs
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Programs
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
                  {program.program_name}
                </h1>
                {getStatusBadge(program.status)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Created {new Date(program.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })} • AI Generated
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => router.push(`/trainer/programs/${programId}/edit`)}
              >
                <Edit size={16} />
                Edit
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowShareModal(true)}
              >
                <Share2 size={16} />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-wondrous-magenta text-wondrous-magenta'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <FileText size={16} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('workouts')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'workouts'
                  ? 'border-wondrous-magenta text-wondrous-magenta'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Dumbbell size={16} />
              Workouts
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'progress'
                  ? 'border-wondrous-magenta text-wondrous-magenta'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <TrendingUp size={16} />
              Progress
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <ProgramOverview program={program} />}
        {activeTab === 'workouts' && <WorkoutsList programId={programId} program={program} />}
        {activeTab === 'progress' && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Progress Tracking
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Assign this program to a client to track their progress through workouts.
              </p>
              <Button className="bg-wondrous-primary hover:bg-purple-700 text-white">
                Assign to Client
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && program && (
        <ShareProgramModal
          programId={programId}
          programName={program.program_name}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
