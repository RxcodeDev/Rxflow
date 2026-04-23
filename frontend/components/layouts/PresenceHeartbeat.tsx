'use client';

import { useEffect } from 'react';
import { apiPatch } from '@/lib/api';

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export default function PresenceHeartbeat() {
  useEffect(() => {
    // Set online immediately
    apiPatch('/users/me/presence', { status: 'online' }).catch(() => {});

    const id = setInterval(() => {
      apiPatch('/users/me/presence', { status: 'online' }).catch(() => {});
    }, INTERVAL_MS);

    // Set offline on tab close (best-effort; keepalive fetch supports headers)
    function handleUnload() {
      const token = localStorage.getItem('rxflow_token');
      if (!token) return;
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/users/me/presence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'offline' }),
        keepalive: true,
      }).catch(() => {});
    }

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return null;
}
