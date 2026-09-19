'use client';

import { useState, useEffect } from 'react';
import { getTeamAttendanceBreakdown } from '../../services/attendanceService';

export default function TeamBreakdown() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBreakdown() {
      const data = await getTeamAttendanceBreakdown();
      setTeams(data);
      setLoading(false);
    }
    loadBreakdown();

    // Refresh every 10 seconds to keep live with check-ins
    const interval = setInterval(loadBreakdown, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  return (
    <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-8 w-8 bg-red-800 text-white rounded-full flex items-center justify-center font-bold">👥</div>
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Team Turnout</h2>
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No team check-ins recorded yet today.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {teams.map((item, idx) => (
            <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 truncate mr-2" title={item.teamName}>{item.teamName}</span>
              <span className="bg-red-800 text-white text-xs font-black px-2.5 py-1 rounded-full">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}