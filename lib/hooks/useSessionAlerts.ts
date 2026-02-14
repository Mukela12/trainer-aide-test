import { useEffect, useRef } from 'react';
import { useToast } from '@/lib/hooks/use-toast';

interface UseSessionAlertsOptions {
  isActive: boolean;
  elapsedSeconds: number;
  alertIntervalMinutes?: number;
  onAlert?: (minutes: number) => void;
}

/**
 * Hook to trigger alerts at regular intervals during a session
 * @param isActive - Whether the timer is actively running
 * @param elapsedSeconds - Current elapsed time in seconds
 * @param alertIntervalMinutes - Interval in minutes (default: 10)
 * @param onAlert - Optional callback when alert triggers
 */
export function useSessionAlerts({
  isActive,
  elapsedSeconds,
  alertIntervalMinutes = 10,
  onAlert,
}: UseSessionAlertsOptions) {
  const { toast } = useToast();
  const lastAlertMinute = useRef<number>(0);
  const hasPlayedSound = useRef<boolean>(false);

  useEffect(() => {
    if (!isActive || elapsedSeconds === 0) {
      return;
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    // Check if we've crossed an alert interval
    const shouldAlert =
      elapsedMinutes > 0 &&
      elapsedMinutes % alertIntervalMinutes === 0 &&
      elapsedMinutes !== lastAlertMinute.current;

    if (shouldAlert) {
      // Update last alert
      lastAlertMinute.current = elapsedMinutes;

      // Play sound (beep)
      playAlertSound();

      // Show toast notification
      toast({
        title: `${elapsedMinutes} Minutes Elapsed`,
        description: `You've been training for ${elapsedMinutes} minutes. Keep up the great work!`,
        duration: 5000,
      });

      // Call optional callback
      if (onAlert) {
        onAlert(elapsedMinutes);
      }
    }
  }, [isActive, elapsedSeconds, alertIntervalMinutes, onAlert, toast]);

  // Reset when timer is stopped
  useEffect(() => {
    if (!isActive) {
      lastAlertMinute.current = 0;
      hasPlayedSound.current = false;
    }
  }, [isActive]);
}

/**
 * Play a simple beep sound for alert
 */
function playAlertSound() {
  try {
    // Create an audio context for the beep
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure beep sound (800Hz, 0.2s duration)
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    // Silently fail if audio not supported
    console.warn('Alert sound not available:', error);
  }
}
