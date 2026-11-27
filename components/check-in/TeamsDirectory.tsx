'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle, UsersRound } from 'lucide-react';
import { getAttendanceRankings } from '../../services/attendanceAnalyticsService';
import { TEAM_GROUPS } from './teamGroups';

interface TeamDirectoryMember {
  id: string;
  full_name: string;
  team?: string;
  raw_category?: string;
  phone?: string;
}

interface TeamSummary {
  name: string;
  memberCount: number;
}

interface TeamsDirectoryProps {
  teams: TeamSummary[];
  members: TeamDirectoryMember[];
  loadingMembers: boolean;
  refreshKey: number;
}

function normalizeTeamName(name: string) {
  return name.trim().toLowerCase();
}

export default function TeamsDirectory({ teams, members, loadingMembers, refreshKey }: TeamsDirectoryProps) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [memberCheckIns, setMemberCheckIns] = useState<Record<string, number>>({});
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const teamCounts = new Map(teams.map(team => [normalizeTeamName(team.name), team.memberCount]));
  const allTeams = new Map<string, TeamSummary>();
  TEAM_GROUPS.flatMap(group => group.items).forEach(name => {
    allTeams.set(normalizeTeamName(name), { name, memberCount: teamCounts.get(normalizeTeamName(name)) || 0 });
  });
  teams.forEach(team => {
    allTeams.set(normalizeTeamName(team.name), team);
  });
  const displayedTeams = Array.from(allTeams.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      try {
        const rankings = await getAttendanceRankings();
        if (cancelled) return;
        setMemberCheckIns(rankings.memberCheckIns);
        setErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load team attendance activity.');
        }
      } finally {
        if (!cancelled) setLoadingActivity(false);
      }
    };

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const selectedTeamMembers = selectedTeam
    ? members
      .filter(member => String(member.team || '').split(',').some(team => normalizeTeamName(team) === normalizeTeamName(selectedTeam)))
      .map(member => ({ ...member, checkIns: memberCheckIns[member.id] || 0 }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
    : [];
  const topMembers = [...selectedTeamMembers]
    .sort((a, b) => b.checkIns - a.checkIns || a.full_name.localeCompare(b.full_name))
    .slice(0, 10);

  if (selectedTeam) {
    return (
      <section className="w-full max-w-6xl space-y-5" aria-labelledby="team-details-title">
        <button
          type="button"
          onClick={() => setSelectedTeam(null)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#3D0908]/20 bg-white px-3 py-2 text-xs font-bold text-[#3D0908] transition hover:bg-[#3D0908]/5"
        >
          <ArrowLeft className="h-4 w-4" />
          All teams
        </button>

        <header className="flex flex-col gap-3 rounded-2xl border-b-4 border-rfp-gold bg-[#3D0908] p-5 text-white sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Team details</p>
            <h2 id="team-details-title" className="mt-1 text-xl font-black md:text-2xl">{selectedTeam}</h2>
            <p className="mt-1 text-xs text-white/80">
              {selectedTeamMembers.length} active {selectedTeamMembers.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl bg-black/20 px-3 py-2 text-xs font-bold sm:self-auto">
            <UsersRound className="h-4 w-4" />
            {selectedTeamMembers.length} members
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3D0908]">Attendance ranking</p>
              <h3 className="mt-1 text-base font-black text-gray-900">Top 10 active members</h3>
              <p className="mt-1 text-xs text-slate-500">Ranked by lifetime check-ins among active members assigned to this team.</p>
            </div>

            {loadingActivity ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading attendance…
              </div>
            ) : errorMessage ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-[#3D0908]/5 p-3 text-xs font-medium text-[#3D0908]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMessage}
              </p>
            ) : topMembers.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No active members are assigned to this team.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {topMembers.map((member, index) => (
                  <li key={member.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <span className={`text-xs font-black ${index < 3 ? 'text-[#3D0908]' : 'text-slate-400'}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{member.full_name}</p>
                      <p className="truncate text-[10px] text-slate-500">{member.raw_category || 'No zone assigned'}</p>
                    </div>
                    <span className="whitespace-nowrap rounded-lg bg-[#3D0908]/5 px-2.5 py-1.5 text-xs font-black text-[#3D0908]">
                      {member.checkIns} {member.checkIns === 1 ? 'check-in' : 'check-ins'}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4 md:px-5">
              <h3 className="text-base font-black text-gray-900">Team members</h3>
              <p className="mt-1 text-xs text-slate-500">All active members currently assigned to {selectedTeam}.</p>
            </div>
            {selectedTeamMembers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No active members are assigned to this team.</p>
            ) : (
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Zone / campus</th>
                      <th className="px-4 py-3 text-right">Check-ins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTeamMembers.map(member => (
                      <tr key={member.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{member.full_name}</p>
                          {member.phone && member.phone !== 'N/A' && (
                            <p className="mt-0.5 text-[10px] text-slate-500">{member.phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{member.raw_category || '—'}</td>
                        <td className="px-4 py-3 text-right font-black text-[#3D0908]">{member.checkIns}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-6xl space-y-5" aria-labelledby="teams-directory-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3D0908]">People &amp; teams</p>
          <h2 id="teams-directory-title" className="mt-1 text-xl font-black text-gray-900">All teams</h2>
          <p className="mt-1 text-xs text-slate-500">Browse teams, view their members, and see each team’s most active members.</p>
        </div>
        <p className="text-xs font-semibold text-slate-500">{displayedTeams.length} teams · {teams.length} with active members</p>
      </div>

      {loadingMembers ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-14 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading teams…
        </div>
      ) : displayedTeams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center">
          <UsersRound className="mx-auto h-8 w-8 text-[#3D0908]" />
          <p className="mt-3 text-sm font-bold text-gray-900">No teams found</p>
          <p className="mt-1 text-xs text-slate-500">Active member team assignments will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayedTeams.map(team => (
            <article key={team.name.toLowerCase()} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rfp-gold/15 text-rfp-gold-ink">
                  <UsersRound className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                  {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
              <h3 className="mt-4 text-base font-black text-gray-900">{team.name}</h3>
              <p className="mt-1 text-xs text-slate-500">Active members assigned to this team</p>
              <button
                type="button"
                onClick={() => setSelectedTeam(team.name)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#3D0908] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-black"
              >
                View team
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
