'interface Props'
'use client';

import { useState, useEffect } from 'react';
import { getOrCreateService } from '../../services/attendanceService';

interface ServiceSelectorProps {
  onServiceReady: (serviceId: string) => void;
}

export default function ServiceSelector({ onServiceReady }: ServiceSelectorProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [serviceType, setServiceType] = useState('Sunday Service');

  useEffect(() => {
    async function initService() {
      const id = await getOrCreateService(selectedDate, serviceType);
      if (id) onServiceReady(id);
    }
    initService();
  }, [selectedDate, serviceType]);

  return (
    <div className="w-full max-w-lg bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Service Type</label>
        <select 
          value={serviceType} 
          onChange={(e) => setServiceType(e.target.value)}
          className="p-2 text-sm font-semibold border rounded-lg bg-gray-50 text-black focus:outline-none focus:border-red-800"
        >
          <option value="Sunday Service">Sunday Service</option>
          <option value="Midweek Service">Midweek Service</option>
        </select>
      </div>

      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Service Date</label>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 text-sm font-semibold border rounded-lg bg-gray-50 text-black focus:outline-none focus:border-red-800"
        />
      </div>
    </div>
  );
}