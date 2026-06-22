'use client';
import { useEffect } from 'react';

export default function ScrollToFirst({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [id]);
  return null;
}
