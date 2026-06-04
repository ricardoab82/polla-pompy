'use client';

import Image from 'next/image';

const COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-purple-600',
  'bg-rose-600',    'bg-amber-600', 'bg-teal-600',
];

function colorForName(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface AvatarProps {
  displayName: string;
  avatarUrl?:  string | null;
  size?:       number; // px
  className?:  string;
}

export default function Avatar({ displayName, avatarUrl, size = 36, className = '' }: AvatarProps) {
  const bg = colorForName(displayName);

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={displayName}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-bold ${bg} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={displayName}
    >
      {initials(displayName)}
    </span>
  );
}
