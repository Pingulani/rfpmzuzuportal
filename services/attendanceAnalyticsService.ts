import { supabase } from '../utils/supabase';

export interface MemberAttendanceRanking {
  memberId: string;
  name: string;
  teams: string[];
  checkIns: number;
}

export interface TeamAttendanceRanking {
  name: string;
  checkIns: number;
  activeMembers: number;
}

interface AttendanceRow {
  member_id: string;
  members: {
    first_name: string | null;
    last_name: string | null;
    raw_team: string | null;
    member_status: string | null;
  } | {
    first_name: string | null;
    last_name: string | null;
    raw_team: string | null;
    member_status: string | null;
  }[] | null;
}

const PAGE_SIZE = 1000;

export async function getAttendanceRankings(): Promise<{
  members: MemberAttendanceRanking[];
  teams: TeamAttendanceRanking[];
}> {
  const memberCheckIns = new Map<string, MemberAttendanceRanking>();
  const teamCheckIns = new Map<string, { name: string; checkIns: number; members: Set<string> }>();
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from('attendance')
      .select('member_id, members(first_name, last_name, raw_team, member_status)')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    const rows = (data || []) as unknown as AttendanceRow[];
    rows.forEach(row => {
      const member = Array.isArray(row.members) ? row.members[0] : row.members;
      if (!member || String(member.member_status || 'Active').trim().toLowerCase() !== 'active') return;

      const name = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed Member';
      const teams = Array.from(new Set(
        String(member.raw_team || '')
          .split(',')
          .map(team => team.trim())
          .filter(team => team && !['n/a', 'none', 'unknown', 'not in a team'].includes(team.toLowerCase()))
      ));

      const ranking = memberCheckIns.get(row.member_id) || {
        memberId: row.member_id,
        name,
        teams,
        checkIns: 0,
      };
      ranking.checkIns += 1;
      memberCheckIns.set(row.member_id, ranking);

      teams.forEach(team => {
        const key = team.toLowerCase();
        const current = teamCheckIns.get(key) || { name: team, checkIns: 0, members: new Set<string>() };
        current.checkIns += 1;
        current.members.add(row.member_id);
        teamCheckIns.set(key, current);
      });
    });

    if (rows.length < PAGE_SIZE) break;
    page += 1;
  }

  return {
    members: Array.from(memberCheckIns.values())
      .sort((a, b) => b.checkIns - a.checkIns || a.name.localeCompare(b.name))
      .slice(0, 20),
    teams: Array.from(teamCheckIns.values())
      .map(({ name, checkIns, members }) => ({ name, checkIns, activeMembers: members.size }))
      .sort((a, b) => b.checkIns - a.checkIns || a.name.localeCompare(b.name)),
  };
}
