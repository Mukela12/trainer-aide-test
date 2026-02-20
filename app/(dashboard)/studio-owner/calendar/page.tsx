"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudioOwnerCalendarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/trainer/calendar');
  }, [router]);

  return null;
}
