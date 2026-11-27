'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle, UsersRound } from 'lucide-react';
import {
  getAttendanceRankings,
  type MemberAttendanceRanking,
  type TeamAttendanceRanking,
} from '../../services/attendanceAnalyticsService';

export default function DashboardActivityCharts() {
  const [members, setMembers] = useState<MemberAttendanceRanking[]>([]);
  const [teams, setTeams] = useState<TeamAttendanceRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRankings = async () => {
      try {
        const rankings = await getAttendanceRankings();
        if (cancelled) return;
        setMembers(rankings.members);
        setTeams(rankings.teams);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load attendance rankings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRankings();
    return () => {
      cancelled = true;
    };
  }, []);

  const topTeams = teams.slice(0, 6);
  const maxTeamCheckIns = topTeams[0]?.checkIns || 1;
  const maxMemberCheckIns = members[0]?.checkIns || 1;

  return (
    <section className="grid gap-5 xl:grid-cols-2" aria-label="Attendance activity rankings">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#550E0C]">Team performance</p>
            <h2 className="mt-1 text-base font-black text-black md:text-lg">Most attended teams</h2>
            <p className="mt-1 text-xs text-slate-500">Lifetime check-ins credited to active members’ assigned teams.</p>
          </div>
          <div className="rounded-lg bg-[#550E0C]/5 p-2 text-[#550E0C]"><UsersRound className="h-5 w-5" /></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading attendance…</div>
        ) : errorMessage ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-[#550E0C]/5 p-3 text-xs font-medium text-[#550E0C]"><AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}</p>
        ) : topTeams.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No team attendance records yet.</p>
        ) : (
          <div className="space-y-4">
            {topTeams.map((team, index) => (
              <div key={team.name} className="grid grid-cols-[minmax(5rem,8rem)_1fr_2.5rem] items-center gap-3 sm:grid-cols-[minmax(8rem,12rem)_1fr_3rem]">
                <span className="truncate text-xs font-semibold text-slate-700" title={team.name}>
                  {index === 0 && <span className="mr-1 text-[#550E0C]" aria-label="Top team">★</span>}{team.name}
                </span>
                <div
                  className="h-3 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={`${team.name}: ${team.checkIns} check-ins`}
                  aria-valuemin={0}
                  aria-valuemax={maxTeamCheckIns}
                  aria-valuenow={team.checkIns}
                >
                  <div className="h-full rounded-full bg-[#550E0C]" style={{ width: `${(team.checkIns / maxTeamCheckIns) * 100}%` }} />
                </div>
                <span className="text-right text-xs font-black text-black">{team.checkIns}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-slate-500">Ranked by total check-ins · {teams.length} teams with attendance</p>
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#550E0C]">Member recognition</p>
          <h2 className="mt-1 text-base font-black text-black md:text-lg">Top 20 most active members</h2>
          <p className="mt-1 text-xs text-slate-500">Active members ranked by total lifetime check-ins.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading attendance…</div>
        ) : errorMessage ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-[#550E0C]/5 p-3 text-xs font-medium text-[#550E0C]"><AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}</p>
        ) : members.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No active member attendance records yet.</p>
        ) : (
          <ol className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
            {members.map((member, index) => (
              <li key={member.memberId} className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(3rem,8rem)_2rem] items-center gap-2 py-2.5">
                <span className={`text-xs font-black ${index < 3 ? 'text-[#550E0C]' : 'text-slate-400'}`}>{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-black" title={member.name}>{member.name}</p>
                  <p className="truncate text-[10px] text-slate-500" title={member.teams.join(', ') || 'No team assigned'}>{member.teams.join(', ') || 'No team assigned'}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#550E0C]" style={{ width: `${(member.checkIns / maxMemberCheckIns) * 100}%` }} />
                </div>
                <span className="text-right text-xs font-black text-black">{member.checkIns}</span>
              </li>
            ))}
          </ol>
        )}
      </article>
    </section>
  );
}
