'use client';

import { useState, useEffect } from 'react';
import { getLiveHeadcount } from '../../services/attendanceService';

export default function LiveHeadcount() {
  const [headcount, setHeadcount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      const count = await getLiveHeadcount();
      setHeadcount(count);
    }
    
    // Fetch immediately when the page loads
    fetchCount();

    // Silently refresh the number every 5 seconds
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Live Headcount</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">Today's Total Check-ins</p>
      </div>
      <div className="bg-red-800 text-white text-4xl font-black py-3 px-8 rounded-lg shadow-inner">
        {headcount}
      </div>
    </div>
  );
}