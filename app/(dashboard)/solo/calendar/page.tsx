"use client";

// Solo practitioner calendar page - redirects to trainer calendar
// This gives solo practitioners the same scheduling and booking capabilities as trainers
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SoloCalendarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/trainer/calendar');
  }, [router]);

  return null;
}
