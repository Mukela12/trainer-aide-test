"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudioOwnerStaffPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/studio-owner/trainers');
  }, [router]);

  return null;
}
