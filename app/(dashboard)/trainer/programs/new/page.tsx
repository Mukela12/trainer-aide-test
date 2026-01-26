'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
import { ProgramGeneratorWizard } from '@/components/ai-programs/ProgramGeneratorWizard';

export default function NewProgramPage() {
  const router = useRouter();
  const { canCreateAIPrograms } = useUserStore();

  // Redirect trainers to solo route - AI Programs only for solo practitioners
  useEffect(() => {
    if (!canCreateAIPrograms()) {
      router.replace('/solo/programs/new');
    }
  }, [canCreateAIPrograms, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ProgramGeneratorWizard />
      </div>
    </div>
  );
}
