'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

interface LiveHeadcountProps {
  serviceId: string;
}

export default function LiveHeadcount({ serviceId }: LiveHeadcountProps) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const currentServiceId = serviceId;
    if (!currentServiceId) return;

    async function fetchHeadcount() {
      const { count: total, error } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', currentServiceId);

      if (!error && total !== null) {
        setCount(total);
      }
    }

    fetchHeadcount();

    const interval = setInterval(fetchHeadcount, 5000);
    return () => clearInterval(interval);
  }, [serviceId]);

  return (
    <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6 flex justify-between items-center">
      <div>
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Live Headcount</h2>
        <p className="text-xs text-gray-500">Total Check-ins for Selected Service</p>
      </div>
      <div className="bg-red-800 text-white text-3xl font-black px-6 py-3 rounded-lg shadow">
        {count}
      </div>
    </div>
  );
}