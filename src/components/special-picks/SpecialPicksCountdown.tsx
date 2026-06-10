'use client';

import { useEffect, useState } from 'react';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function SpecialPicksCountdown({ revealAt }: { revealAt: string }) {
  const target = new Date(revealAt).getTime();

  const [diff, setDiff] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, target - Date.now());
      setDiff(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSecs = Math.floor(diff / 1000);
  const h  = Math.floor(totalSecs / 3600);
  const m  = Math.floor((totalSecs % 3600) / 60);
  const s  = totalSecs % 60;
  const d  = Math.floor(totalSecs / 86400);
  const hh = Math.floor((totalSecs % 86400) / 3600);

  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      {d > 0 && (
        <div className="text-center">
          <p className="font-display text-4xl text-[#0a4a2e]">{pad(d)}</p>
          <p className="text-xs text-gray-500 mt-1">días</p>
        </div>
      )}
      <div className="text-center">
        <p className="font-display text-4xl text-[#0a4a2e]">{pad(d > 0 ? hh : h)}</p>
        <p className="text-xs text-gray-500 mt-1">horas</p>
      </div>
      <div className="font-display text-4xl text-gray-300 mb-3">:</div>
      <div className="text-center">
        <p className="font-display text-4xl text-[#0a4a2e]">{pad(m)}</p>
        <p className="text-xs text-gray-500 mt-1">minutos</p>
      </div>
      <div className="font-display text-4xl text-gray-300 mb-3">:</div>
      <div className="text-center">
        <p className="font-display text-4xl text-[#0a4a2e]">{pad(s)}</p>
        <p className="text-xs text-gray-500 mt-1">segundos</p>
      </div>
    </div>
  );
}
