'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgramEditor } from '@/components/ai-programs/ProgramEditor';
import { useUserStore } from '@/lib/stores/user-store';
import type { AIProgram } from '@/lib/types/ai-program';

export default function ProgramEditPage() {
  const params = useParams();
  const router = useRouter();
  const { canCreateAIPrograms } = useUserStore();
  const programId = params.id as string;

  const [program, setProgram] = useState<AIProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect trainers to solo route - AI Programs only for solo practitioners
  useEffect(() => {
    if (!canCreateAIPrograms()) {
      router.replace(`/solo/programs/${programId}/edit`);
    }
  }, [canCreateAIPrograms, router, programId]);

  useEffect(() => {
    async function fetchProgram() {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/ai-programs/${programId}`);
        // const data = await response.json();
        // setProgram(data.program);

        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 500));
        setError('API endpoint not yet implemented');
      } catch (err) {
        setError('Failed to load program');
        console.error('Error fetching program:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProgram();
  }, [programId]);

  const handleSave = async (updatedProgram: AIProgram) => {
    try {
      setSaving(true);

      const response = await fetch(`/api/ai-programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProgram),
      });

      if (!response.ok) {
        throw new Error('Failed to save program');
      }

      // Navigate back to view mode
      router.push(`/trainer/programs/${programId}`);
    } catch (err) {
      console.error('Error saving program:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/trainer/programs/${programId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Error Loading Program
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button
              onClick={() => router.push('/trainer/programs')}
              className="bg-wondrous-primary hover:bg-purple-700 text-white"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Programs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft size={20} className="mr-2" />
              Cancel
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
                Edit Program
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Modify exercises, sets, reps, and program structure
              </p>
            </div>
          </div>

          <Button
            onClick={() => program && handleSave(program)}
            disabled={saving || !program}
            className="bg-wondrous-primary hover:bg-purple-700 text-white"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Editor */}
        {program && (
          <ProgramEditor
            program={program}
            onChange={setProgram}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
