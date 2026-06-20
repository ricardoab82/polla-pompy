'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, TooltipProps,
} from 'recharts';

export interface BumpChartPoint {
  label: string;
  [displayName: string]: number | string;
}

interface Props {
  data: BumpChartPoint[];
  users: string[];       // only users with points > 0
  currentUser: string;
  totalUsers: number;    // for Y axis domain
}

const MUTED_COLORS = [
  '#93c5fd', '#fca5a5', '#86efac', '#d8b4fe', '#fdba74',
  '#67e8f9', '#f9a8d4', '#bef264', '#fcd34d', '#a5b4fc',
];

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const sorted = [...payload]
    .filter((p) => p.value != null)
    .sort((a, b) => (a.value as number) - (b.value as number));

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-[200px]">
      <p className="font-semibold text-gray-500 mb-2">{label}</p>
      {sorted.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-none" style={{ background: p.color }} />
          <span className="truncate text-gray-700">{p.name}</span>
          <span className="ml-auto font-semibold text-gray-900">#{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function BumpChart({ data, users, currentUser, totalUsers }: Props) {
  if (!data.length || !users.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        El gráfico se mostrará cuando haya datos de posición disponibles.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          reversed
          domain={[1, Math.max(totalUsers, users.length)]}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={28}
          tickFormatter={(v: number) => `#${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        {users.map((name, i) => {
          const isCurrent = name === currentUser;
          return (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={isCurrent ? '#f5c842' : MUTED_COLORS[i % MUTED_COLORS.length]}
              strokeWidth={isCurrent ? 3 : 1.5}
              strokeOpacity={isCurrent ? 1 : 0.6}
              dot={isCurrent
                ? { r: 4, fill: '#f5c842', strokeWidth: 0 }
                : { r: 2.5, fill: MUTED_COLORS[i % MUTED_COLORS.length], strokeWidth: 0, fillOpacity: 0.7 }
              }
              activeDot={{ r: isCurrent ? 6 : 4, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
