'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService';
import { Calendar, Users, Download, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Standard Zones List
const ZONES_LIST = [
  'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F'
];

export default function ZonesMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  const [selectedMonth, setSelectedMonth] = useState(9); // Default Sept 2026
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getMonthlyZoneReport(selectedYear, selectedMonth, activeServiceType);
        setReportData(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load matrix data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Realtime subscription to instantly update when check-ins happen
    const channel = supabase
      .channel('zones-matrix-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, async () => {
        const data = await getMonthlyZoneReport(selectedYear, selectedMonth, activeServiceType);
        setReportData(data);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeServiceType, selectedMonth, selectedYear]);

  const handleDownload = async () => {
    const element = document.getElementById('zones-matrix-export-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      const dataImage = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Mzuzu_Branch_Zones_Matrix_${MONTHS[selectedMonth - 1]}_${selectedYear}.png`;
      link.href = dataImage;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Export failed. Please check console.');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl bg-white p-8 rounded-2xl shadow-xl animate-pulse flex flex-col gap-6 mx-auto mt-6">
        <div className="h-16 bg-gray-100 rounded-xl"></div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const { services = [], attendanceRecords = [], members = [] } = reportData || {};

  // Helper to safely match zone regardless of whether database column is raw_zone or zone
  const getMemberZone = (member: any) => {
    return (member?.raw_zone || member?.zone || 'Unassigned').trim();
  };

  const isZoneMatch = (member: any, targetZone: string) => {
    const mZone = getMemberZone(member).toLowerCase();
    return mZone === targetZone.toLowerCase();
  };

  const displayWeeks = [1, 2, 3, 4, 5];

  return (
    <div className="w-full max-w-[1400px] flex flex-col gap-4 mx-auto text-gray-900 p-4">
      
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveServiceType('Sunday Service')} 
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 ${activeServiceType === 'Sunday Service' ? 'bg-[#034a36] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Calendar className="w-4 h-4" /> Sunday Services
          </button>
          <button 
            onClick={() => setActiveServiceType('Midweek Service')} 
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 ${activeServiceType === 'Midweek Service' ? 'bg-[#034a36] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Users className="w-4 h-4" /> Midweek Services
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="p-2 text-sm font-black uppercase bg-gray-50 border border-gray-300 rounded-lg outline-none">
            {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="p-2 text-sm font-black uppercase bg-gray-50 border border-gray-300 rounded-lg outline-none">
            {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
          <button 
            onClick={handleDownload} 
            className="px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 bg-[#034a36] text-white hover:bg-[#023325]"
          >
            <Download className="w-4 h-4" /> Export PNG
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Export Container */}
      <div id="zones-matrix-export-container" className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl overflow-x-auto font-sans">
        
        {/* Header Banner */}
        <div className="bg-[#034a36] text-white px-6 py-5 rounded-t-xl flex justify-between items-end border-b-4 border-emerald-500 mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase mb-1">MZUZU BRANCH</h1>
            <h2 className="text-[#facc15] text-xs font-black tracking-widest uppercase">
              {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType} ZONES REPORT
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Generated Date</span>
            <span className="text-sm font-black text-white">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#034a36] text-white text-[11px]">
                <th className="py-3 px-4 font-black tracking-wider uppercase w-1/3">ZONE NAME</th>
                <th className="py-3 px-3 font-black tracking-wider text-center text-emerald-200">MEM.</th>
                {displayWeeks.map(wk => (
                  <th key={wk} className="py-3 px-3 font-black tracking-wider text-center text-emerald-200 w-16">WK{wk}</th>
                ))}
                <th className="py-3 px-3 font-black tracking-wider text-center text-[#facc15] bg-[#023325]">AVE.</th>
                <th className="py-3 px-3 font-black tracking-wider text-center text-[#facc15] bg-[#023325]">AVE.%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {ZONES_LIST.map((zoneName, zIdx) => {
                // Total members in this zone
                const memCount = members.filter((m: any) => isZoneMatch(m, zoneName)).length;

                // Calculate counts for Wk1 to Wk5 using the week_number column in services
                const weeklyCounts = displayWeeks.map((wkNum) => {
                  // Find service matching this week number
                  const matchedService = services.find((s: any) => Number(s.week_number) === wkNum);
                  if (!matchedService) return 0;

                  // Filter attendance records for this service where member belongs to this zone
                  const matchedCount = attendanceRecords.filter((r: any) => {
                    if (r.service_id !== matchedService.id) return false;
                    const memberObj = r.members;
                    if (!memberObj) return false;
                    return isZoneMatch(memberObj, zoneName);
                  }).length;

                  return matchedCount;
                });

                const activeWeeksCount = displayWeeks.filter(wkNum => {
                  return services.some((s: any) => Number(s.week_number) === wkNum);
                }).length || 1;

                const totalAttended = weeklyCounts.reduce((sum, val) => sum + val, 0);
                const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;
                const avgPercent = memCount > 0 ? Math.round((avg / memCount) * 100) : 0;

                return (
                  <tr key={zIdx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-black text-gray-900">{zoneName}</td>
                    <td className="py-3 px-3 text-center font-bold text-gray-600 bg-gray-50">{memCount}</td>
                    
                    {weeklyCounts.map((count, wIdx) => (
                      <td key={wIdx} className="py-3 px-3 text-center font-mono font-bold text-gray-900">
                        {count > 0 ? count : <span className="text-gray-300">0</span>}
                      </td>
                    ))}

                    <td className="py-3 px-3 text-center font-black bg-[#fefce8] text-gray-900">{avg}</td>
                    <td className="py-3 px-3 text-center font-black bg-[#fefce8] text-emerald-700">{avgPercent}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}