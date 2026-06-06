'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export interface ChartDataPoint {
  date: string;
  [displayName: string]: number | string;
}

interface Props {
  data: ChartDataPoint[];
  users: string[];         // all display names
  currentUser: string;     // current user's display name (highlight)
}

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c',
  '#0891b2', '#be185d', '#65a30d', '#b45309', '#6366f1',
];

export default function ProgressionChart({ data, users, currentUser }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        El gráfico se mostrará cuando haya datos de posición disponibles.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
        />
        <YAxis
          reversed
          domain={[1, 'dataMax']}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          label={{ value: 'Posición', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#9ca3af' }}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value: number, name: string) => [`#${value}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {users.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={name === currentUser ? '#f5c842' : COLORS[i % COLORS.length]}
            strokeWidth={name === currentUser ? 3 : 1.5}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
