'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService';
import { Calendar, Users, BarChart3, Filter, ShieldCheck, AlertCircle, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const ZONE_CATEGORIES = [
  {
    groupName: "STANDARD ZONES",
    zones: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4']
  },
  {
    groupName: "TERTIARY INSTITUTIONS",
    zones: ['MCA', 'Mzuzu Technical', 'MIT', 'MZUNI', 'UNILIA', 'MIJ']
  },
  {
    groupName: "OTHER CATEGORIES",
    zones: ['Other Branches', 'Special Services', 'New Members', 'Unknown Zone or Not in a Zone']
  }
];

function getCalendarDatesForMonth(year: number, month: number, targetDayOfWeek: number) {
  const dates = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === targetDayOfWeek) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

export default function MonthlyMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026); 
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // States for the new Manual Inputs on the cards
  const [manualHeadcounts, setManualHeadcounts] = useState<Record<number, string>>({});
  const [manualSouls, setManualSouls] = useState<Record<number, string>>({});
  const [visionTarget, setVisionTarget] = useState('350');

  useEffect(() => {
    setManualHeadcounts({});
    setManualSouls({});
  }, [selectedMonth, selectedYear, activeServiceType]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getMonthlyZoneReport(selectedYear, selectedMonth, activeServiceType);
      setReportData(data);
      setLoading(false);
    }
    loadData();

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
    const element = document.getElementById('matrix-export-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fefce8' });
      const dataImage = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Mzuzu_Branch_Zones_Matrix_${MONTHS[selectedMonth - 1]}_${selectedYear}.png`;
      link.href = dataImage;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl bg-white p-6 rounded-xl shadow-xl border border-gray-200 animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg mb-6"></div>
        <div className="h-24 bg-gray-200 rounded-t-lg mb-1"></div>
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const { services = [], attendanceRecords = [] } = reportData || {};

  const targetDayOfWeek = activeServiceType === 'Sunday Service' ? 0 : 3;
  const calendarDates = getCalendarDatesForMonth(selectedYear, selectedMonth, targetDayOfWeek);
  const weekNumbersArray = calendarDates.map((_, i) => i + 1);

  const weeksDataTemplate = calendarDates.map((dateStr, index) => {
    const matchedService = services.find((s: any) => s.service_date === dateStr);
    const serviceId = matchedService ? matchedService.id : null;
    const matchedRecords = serviceId ? attendanceRecords.filter((r: any) => r.service_id === serviceId) : [];
    return { weekNum: index + 1, serviceId, matchedRecords, dateStr };
  });

  const isZoneMatch = (dbCat: string, targetZone: string) => {
    const target = targetZone.trim().toLowerCase();
    const db = dbCat ? dbCat.trim().toLowerCase() : ''; 
    
    if (db === target) return true;
    if (target === 'other branches' && db.startsWith('other branches')) return true;
    if (target === 'new members' && db === 'new members') return true;
    if (target === 'unknown zone or not in a zone' && (db === '' || db === 'unknown zone')) return true;
    
    return false;
  };

  const theme = activeServiceType === 'Sunday Service' 
    ? { primaryBg: 'bg-[#034a36]', secondaryBg: 'bg-[#023325]' }
    : { primaryBg: 'bg-indigo-900', secondaryBg: 'bg-indigo-950' };

  // UI calculations
  const displayWeeks = [1, 2, 3, 4, 5];
  const enteredHeadcounts = Object.values(manualHeadcounts).map(Number).filter(n => n > 0);
  const avgAttendance = enteredHeadcounts.length > 0 
    ? Math.round(enteredHeadcounts.reduce((a, b) => a + b, 0) / enteredHeadcounts.length) 
    : 0;
  const achievedPercent = Number(visionTarget) > 0 
    ? ((avgAttendance / Number(visionTarget)) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="w-full max-w-7xl flex flex-col gap-4">
      
      {/* Top Controls with Micro-Interactions (Non-printable) */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveServiceType('Sunday Service')} 
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-1.5 ${activeServiceType === 'Sunday Service' ? `${theme.primaryBg} text-white shadow-md scale-[1.02]` : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <Calendar className="w-3.5 h-3.5" /> Sun Services
          </button>
          <button 
            onClick={() => setActiveServiceType('Midweek Service')} 
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-1.5 ${activeServiceType === 'Midweek Service' ? `${theme.primaryBg} text-white shadow-md scale-[1.02]` : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <Users className="w-3.5 h-3.5" /> Midweek Services
          </button>
        </div>
        <div className="flex gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className={`p-2 text-sm font-bold bg-white border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:outline-none transition-all`}>
            {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className={`p-2 text-sm font-bold bg-white border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:outline-none transition-all`}>
            {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
          <button 
            onClick={handleDownload} 
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-1.5 ${theme.primaryBg} text-white shadow-sm hover:opacity-90`}
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Wrapping the visual elements we want exported as an image */}
      <div id="matrix-export-container" className="bg-[#fefce8] p-4 md:p-6 rounded-lg w-full flex flex-col gap-4 font-sans text-gray-900 border border-yellow-100">
        
        {/* Styled Header */}
        <div className={`${theme.primaryBg} text-white p-5 rounded-lg flex justify-between items-center shadow-sm`}>
          <div>
            <h1 className="text-2xl font-black tracking-widest uppercase">
              MZUZU BRANCH
            </h1>
            <h2 className="text-[#facc15] text-xs font-bold tracking-wider mt-1">
              {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType.toUpperCase()} ZONES REPORT
            </h2>
          </div>
          <div className="text-[10px] font-semibold text-gray-200">
            Generated: {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* LEFT COLUMN: Week Cards & Average */}
          <div className="w-full lg:w-1/3 flex flex-col gap-3">
            {displayWeeks.map((wkNum) => {
              const wkInfo = weeksDataTemplate[wkNum - 1];
              const registeredCount = wkInfo?.serviceId ? wkInfo.matchedRecords.length : 0;
              const hc = Number(manualHeadcounts[wkNum]) || 0;
              const variance = hc > 0 ? hc - registeredCount : 0;
              const dateDisplay = wkInfo?.dateStr ? wkInfo.dateStr : 'N/A';
              const isAvailable = !!wkInfo;

              return (
                <div key={wkNum} className={`bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden text-xs ${!isAvailable && 'opacity-60 grayscale'}`}>
                  <div className="bg-[#2563eb] text-white px-3 py-1.5 flex justify-between items-center font-bold">
                    <span className="uppercase tracking-wider">WEEK {wkNum}</span>
                    <span className="text-[10px]">{dateDisplay}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between items-center font-black text-sm pb-2 border-b border-gray-100">
                      <span className="text-gray-600">HEADCOUNT</span>
                      <input 
                        type="number"
                        value={manualHeadcounts[wkNum] || ''}
                        onChange={(e) => setManualHeadcounts(prev => ({...prev, [wkNum]: e.target.value}))}
                        className="w-16 text-right font-black text-lg focus:outline-none bg-transparent"
                        placeholder="0"
                        disabled={!isAvailable}
                      />
                    </div>
                    <div className="flex justify-between items-center text-gray-600 font-bold">
                      <span>Registered</span>
                      <span className="text-gray-900">{registeredCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 font-bold">
                      <span>Souls Won</span>
                      <input 
                        type="number"
                        value={manualSouls[wkNum] || ''}
                        onChange={(e) => setManualSouls(prev => ({...prev, [wkNum]: e.target.value}))}
                        className="w-12 text-right text-red-600 font-black focus:outline-none bg-transparent"
                        placeholder="0"
                        disabled={!isAvailable}
                      />
                    </div>
                    <div className="flex justify-between items-center text-gray-600 font-bold pt-1">
                      <span>Variance (Headcount - Reg.)</span>
                      <span className={`font-black ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {variance > 0 ? `+${variance}` : variance}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className={`${theme.primaryBg} text-white p-4 rounded-md shadow-sm flex justify-between items-center mt-auto`}>
              <span className="font-bold text-sm tracking-wider uppercase">AVERAGE ATT.</span>
              <span className="text-[#facc15] font-black text-3xl">{avgAttendance}</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Table & Vision Box */}
          <div className="w-full lg:w-2/3 flex flex-col gap-4">
            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px] font-bold">
                <thead>
                  <tr className="text-[#034a36] border-b-2 border-gray-200">
                    <th className="py-3 px-4 uppercase tracking-wider">ZONE / CATEGORY</th>
                    {displayWeeks.map(wk => (
                      <th key={wk} className="py-3 px-2 text-center uppercase tracking-wider">WK{wk}</th>
                    ))}
                    <th className="py-3 px-3 text-center bg-[#fef08a] uppercase tracking-wider">AVG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {ZONE_CATEGORIES.map((group, gIdx) => (
                    <Fragment key={gIdx}>
                      {/* Group Header to retain your original grouping structure visually */}
                      <tr className="bg-gray-50/50 border-b-2 border-gray-200 text-[#034a36] text-[10px] font-black uppercase tracking-wider">
                        <td colSpan={7} className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5"><Filter className="w-3 h-3 opacity-70" /> {group.groupName}</div>
                        </td>
                      </tr>
                      {group.zones.map((zoneName, zIdx) => {
                        
                        const weeklyCounts = displayWeeks.map((wkIndex) => {
                          if (wkIndex > weekNumbersArray.length) return null;
                          const wkInfo = weeksDataTemplate[wkIndex - 1];
                          if (!wkInfo || !wkInfo.serviceId) return 0;
                          return wkInfo.matchedRecords.filter((r: any) => isZoneMatch(r.members?.raw_category, zoneName)).length;
                        });

                        const activeWeeksCount = weeklyCounts.filter(c => c !== null && c > 0).length || 1;
                        const totalAttended = weeklyCounts.reduce((sum, val) => sum + (val || 0), 0);
                        const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;

                        return (
                          <tr key={zIdx} className="hover:bg-gray-50 transition-colors border-b border-gray-100 text-[11px] font-medium text-gray-800">
                            <td className="py-2.5 px-4 font-semibold text-gray-900">{zoneName}</td>
                            {weeklyCounts.map((count, wIdx) => (
                              <td key={wIdx} className="py-2.5 px-2 text-center">
                                {count === null ? <span className="text-gray-300">-</span> : count > 0 ? count : <span className="text-gray-300">0</span>}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-center bg-[#fef08a] font-black text-gray-900">{avg}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Targets Footer */}
            <div className="flex flex-col gap-2 mt-auto">
              <div className={`${theme.primaryBg} text-white p-3.5 rounded-md flex justify-between items-center shadow-sm`}>
                <span className="font-bold text-sm tracking-wider uppercase">VISION 100% TARGET</span>
                <input 
                  type="number"
                  value={visionTarget}
                  onChange={(e) => setVisionTarget(e.target.value)}
                  className="w-24 bg-transparent text-right text-[#facc15] font-black text-xl focus:outline-none"
                />
              </div>
              <div className={`${theme.primaryBg} text-white p-3.5 rounded-md flex justify-between items-center shadow-sm`}>
                <span className="font-bold text-sm tracking-wider uppercase">ACHIEVED %</span>
                <span className="text-[#facc15] font-black text-xl">{achievedPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}