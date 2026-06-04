'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string; // ISO string
  label?:     string;
  className?: string;
  onExpire?:  () => void;
}

function formatDiff(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total   = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours   = Math.floor(total / 3600) % 24;
  const days    = Math.floor(total / 86400);
  return { days, hours, minutes, seconds };
}

export default function Countdown({ targetDate, label, className = '', onExpire }: CountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [diff, setDiff]       = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    setDiff(new Date(targetDate).getTime() - Date.now());

    const tick = () => {
      const remaining = new Date(targetDate).getTime() - Date.now();
      setDiff(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, onExpire]);

  // Render nothing until mounted to avoid server/client mismatch
  if (!mounted) {
    return (
      <div className={className}>
        {label && <p className="text-xs text-gray-500 mb-1 text-center">{label}</p>}
        <div className="font-mono font-bold tabular-nums opacity-0">00h:00m:00s</div>
      </div>
    );
  }

  if (diff <= 0) {
    return (
      <span className={`text-red-600 font-semibold ${className}`}>
        Cerrado
      </span>
    );
  }

  const { days, hours, minutes, seconds } = formatDiff(diff);
  const isUrgent = diff < 60 * 60 * 1000; // < 1 hour

  return (
    <div className={`${className} ${isUrgent ? 'countdown-urgent' : ''}`}>
      {label && <p className="text-xs text-gray-500 mb-1 text-center">{label}</p>}
      <div className="flex items-center gap-1 font-mono font-bold tabular-nums">
        {days > 0 && (
          <>
            <span>{days}d</span>
            <span className="text-gray-400">:</span>
          </>
        )}
        <span>{String(hours).padStart(2, '0')}h</span>
        <span className="text-gray-400">:</span>
        <span>{String(minutes).padStart(2, '0')}m</span>
        <span className="text-gray-400">:</span>
        <span>{String(seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
}
