'use client';

import { useState, useEffect } from 'react';
import { getDirectorateAnalytics } from '../../services/analyticsService';

export default function DirectorateDashboard() {
  const [stats, setStats] = useState({ totalMembers: 0, totalNewcomers: 0, todayTurnout: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const data = await getDirectorateAnalytics();
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) return <div className="text-gray-500 text-sm mb-6">Loading leadership analytics...</div>;

  return (
    <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-8 w-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">📊</div>
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Directorate Insights</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Turnout</p>
          <p className="text-2xl font-black text-red-800 mt-1">{stats.todayTurnout}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Newcomers</p>
          <p className="text-2xl font-black text-gray-800 mt-1">{stats.totalNewcomers}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Database</p>
          <p className="text-2xl font-black text-gray-800 mt-1">{stats.totalMembers}</p>
        </div>
      </div>
    </div>
  );
}