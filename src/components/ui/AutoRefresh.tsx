'use client';

import { useEffect } from 'react';

export default function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  useEffect(() => {
    const id = setInterval(() => window.location.reload(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return null;
}
