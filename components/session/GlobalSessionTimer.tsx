"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/lib/hooks/use-sessions';
import { useTimerStore } from '@/lib/stores/timer-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function GlobalSessionTimer() {
  const router = useRouter();
  const { currentUser, currentRole } = useUserStore();
  const { sessions, activeSessionId } = useSessionData(currentUser.id);
  const { sessionId: timerSessionId, getSecondsLeft, isTimerActive } = useTimerStore();
  const [secondsLeft, setSecondsLeft] = useState(0);

  const activeSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) ?? null : null;

  // Only show timer if session belongs to current user
  const shouldShowTimer = isTimerActive() &&
                          timerSessionId &&
                          activeSession &&
                          !activeSession.completed &&
                          activeSession.trainerId === currentUser.id;

  // Update timer display every second
  useEffect(() => {
    if (!shouldShowTimer) return;

    const interval = setInterval(() => {
      setSecondsLeft(getSecondsLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldShowTimer, getSecondsLeft]);

  if (!shouldShowTimer || !activeSession) {
    return null;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const getTimerColor = () => {
    if (secondsLeft > 600) return 'text-green-600'; // > 10 min
    if (secondsLeft > 300) return 'text-yellow-600'; // > 5 min
    if (secondsLeft > 60) return 'text-orange-600'; // > 1 min
    return 'text-red-600'; // < 1 min
  };

  const handleClick = () => {
    // Role-aware navigation
    const basePath = currentRole === 'studio_owner' ? '/studio-owner' :
                     currentRole === 'solo_practitioner' ? '/solo' :
                     '/trainer';
    router.push(`${basePath}/sessions/${timerSessionId}`);
  };

  return (
    <div
      className="fixed bottom-20 lg:bottom-8 right-4 z-50 cursor-pointer"
      onClick={handleClick}
    >
      <div className="bg-white dark:bg-gray-800 border-2 border-wondrous-primary dark:border-wondrous-primary shadow-lg rounded-lg p-3 hover:shadow-xl transition-shadow">
        <div className="flex items-center gap-3">
          <Clock className="text-wondrous-primary flex-shrink-0" size={20} />
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Session In Progress</p>
            <p className={cn('text-lg font-bold tabular-nums', getTimerColor())}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
          <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
            {activeSession.sessionName}
          </p>
          {activeSession.client && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activeSession.client.firstName} {activeSession.client.lastName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
