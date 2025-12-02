'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to teacher dashboard which shows the room list
export default function RoomsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/teacher');
  }, [router]);

  return null;
}

