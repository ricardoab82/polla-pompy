import Link from 'next/link';
import Image from 'next/image';
import Countdown from '@/components/ui/Countdown';
import { PICK_LOCK_MINUTES } from '@/lib/config';
import type { MatchRow, PickRow } from '@/lib/supabase/types';

interface MatchCardProps {
  match: MatchRow;
  pick?: PickRow | null;
}

function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday:  'short',
    day:      'numeric',
    month:    'short',
    hour:     '2-digit',
    minute:   '2-digit',
  });
}

export default function MatchCard({ match, pick }: MatchCardProps) {
  const lockTime  = new Date(new Date(match.kickoff_utc).getTime() - PICK_LOCK_MINUTES * 60 * 1000);
  const isLocked  = new Date() >= lockTime;
  const isLive    = match.status === 'live';
  const isFinished = match.status === 'finished';

  const pointsColor =
    pick?.points_earned === null || pick?.points_earned === undefined ? '' :
    pick.points_earned > 0 ? 'text-green-600' : 'text-red-500';

  return (
    <Link href={`/picks/${match.id}`}>
      <div className={`card hover:shadow-md transition-shadow cursor-pointer
                       ${match.is_colombia_match ? 'colombia-border' : ''}
                       ${isLive ? 'ring-2 ring-green-400' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.home_team_logo && (
              <Image src={match.home_team_logo} alt={match.home_team} width={32} height={32} className="object-contain" />
            )}
            <span className="text-xs font-medium text-center truncate w-full text-center">
              {match.home_team}
            </span>
          </div>

          {/* Center: score / pick */}
          <div className="flex flex-col items-center flex-none gap-0.5">
            {isFinished && match.home_score !== null ? (
              <div className="font-display text-2xl text-[#0a4a2e]">
                {match.home_score} – {match.away_score}
              </div>
            ) : isLive ? (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-semibold">EN VIVO</span>
              </div>
            ) : (
              <div className="text-xs text-gray-500">{formatKickoff(match.kickoff_utc)}</div>
            )}

            {/* My pick */}
            {pick ? (
              <div className="flex items-center gap-1 text-sm">
                <span className={`font-display text-lg ${isFinished ? pointsColor : 'text-gray-700'}`}>
                  {pick.home_pick}–{pick.away_pick}
                </span>
                {pick.is_auto_assigned && <span className="badge-auto">Auto</span>}
                {isFinished && pick.points_earned !== null && (
                  <span className={`text-xs font-bold ${pointsColor}`}>
                    ({pick.points_earned > 0 ? `+${pick.points_earned}` : pick.points_earned} pts)
                  </span>
                )}
              </div>
            ) : (
              !isLocked && <span className="text-xs text-gray-400">Sin pick</span>
            )}

            {/* Lock countdown */}
            {!isLocked && !isFinished && (
              <Countdown
                targetDate={lockTime.toISOString()}
                className="text-xs text-gray-400 justify-center"
              />
            )}
            {isLocked && !isFinished && !isLive && (
              <span className="text-xs text-red-500 font-medium">Cerrado</span>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.away_team_logo && (
              <Image src={match.away_team_logo} alt={match.away_team} width={32} height={32} className="object-contain" />
            )}
            <span className="text-xs font-medium text-center truncate w-full text-center">
              {match.away_team}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
