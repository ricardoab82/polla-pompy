import Avatar from '@/components/ui/Avatar';
import type { Database } from '@/lib/supabase/types';

type LeaderboardRow = Database['public']['Views']['leaderboard']['Row'];

interface LeaderboardTableProps {
  rows:          LeaderboardRow[];
  currentUserId: string;
  compact?:      boolean; // top-10 mode for dashboard
}

export default function LeaderboardTable({ rows, currentUserId, compact = false }: LeaderboardTableProps) {
  const display = compact ? rows.slice(0, 10) : rows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
            <th className="py-2 px-2 text-left w-8">#</th>
            <th className="py-2 px-2 text-left">Jugador</th>
            <th className="py-2 px-2 text-right">Total</th>
            {!compact && (
              <>
                <th className="py-2 px-2 text-right hidden md:table-cell">Grupos</th>
                <th className="py-2 px-2 text-right hidden md:table-cell">Eliminat.</th>
                <th className="py-2 px-2 text-right hidden md:table-cell">Bonus</th>
                <th className="py-2 px-2 text-right hidden md:table-cell">Especial</th>
                <th className="py-2 px-2 text-right hidden sm:table-cell">Exactos</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {display.map((row) => {
            const isMe = row.user_id === currentUserId;
            return (
              <tr
                key={row.user_id}
                className={`border-b border-gray-50 transition-colors
                            ${isMe ? 'bg-[#e8f5e9]' : 'hover:bg-gray-50'}`}
              >
                <td className="py-3 px-2">
                  <span className={`font-display text-lg leading-none
                    ${row.rank === 1 ? 'text-[#f5c842]' :
                      row.rank === 2 ? 'text-gray-400' :
                      row.rank === 3 ? 'text-amber-700' : 'text-gray-600'}`}>
                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <Avatar displayName={row.display_name} avatarUrl={row.avatar_url} size={28} />
                    <span className={`font-medium ${isMe ? 'text-[#0a4a2e]' : 'text-gray-800'}`}>
                      {row.display_name}
                      {isMe && <span className="ml-1 text-xs text-[#0a4a2e] font-normal">(tú)</span>}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right font-bold text-[#0a4a2e]">
                  {row.total_points}
                </td>
                {!compact && (
                  <>
                    <td className="py-3 px-2 text-right text-gray-600 hidden md:table-cell">
                      {row.group_pts}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600 hidden md:table-cell">
                      {row.knockout_pts}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600 hidden md:table-cell">
                      {row.bonus_pts}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600 hidden md:table-cell">
                      {row.special_pts}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-500 hidden sm:table-cell">
                      {String(row.exact_results_count)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
