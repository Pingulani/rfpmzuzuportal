'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService';
import { Calendar, Users, Filter, Download, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const ZONE_CATEGORIES = [
  {
    groupName: "ZONES",
    zones: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4']
  },
  {
    groupName: "CAMPUSES",
    zones: ['MCA', 'Mzuzu Technical', 'MIT', 'MZUNI', 'UNILIA', 'MIJ']
  },
  {
    groupName: "OTHER",
    zones: ['Other Branches', 'Special Services', 'New Members', 'Unknown Zone or Not in a Zone']
  }
];

function getCalendarDatesForMonth(year: number, month: number, targetDayOfWeek: number) {
  const dates = [];
  let date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  
  while (date.getUTCMonth() === month - 1) {
    if (date.getUTCDay() === targetDayOfWeek) {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

export default function MonthlyMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026); 
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [manualHeadcounts, setManualHeadcounts] = useState<Record<number, string>>(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(`mzuzu_hc_${selectedYear}_${selectedMonth}_${activeServiceType}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [manualSouls, setManualSouls] = useState<Record<number, string>>(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(`mzuzu_souls_${selectedYear}_${selectedMonth}_${activeServiceType}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [visionTarget, setVisionTarget] = useState('350');

  useEffect(() => {
    const savedHc = localStorage.getItem(`mzuzu_hc_${selectedYear}_${selectedMonth}_${activeServiceType}`);
    const savedSouls = localStorage.getItem(`mzuzu_souls_${selectedYear}_${selectedMonth}_${activeServiceType}`);
    setManualHeadcounts(savedHc ? JSON.parse(savedHc) : {});
    setManualSouls(savedSouls ? JSON.parse(savedSouls) : {});
  }, [selectedMonth, selectedYear, activeServiceType]);

  const handleHeadcountChange = (wkNum: number, val: string) => {
    const updated = { ...manualHeadcounts, [wkNum]: val };
    setManualHeadcounts(updated);
    localStorage.setItem(`mzuzu_hc_${selectedYear}_${selectedMonth}_${activeServiceType}`, JSON.stringify(updated));
  };

  const handleSoulsChange = (wkNum: number, val: string) => {
    const updated = { ...manualSouls, [wkNum]: val };
    setManualSouls(updated);
    localStorage.setItem(`mzuzu_souls_${selectedYear}_${selectedMonth}_${activeServiceType}`, JSON.stringify(updated));
  };

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
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#fefce8',
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.getElementById('matrix-export-container');
          if (clonedContainer) {
            const inputs = clonedContainer.querySelectorAll('input');
            inputs.forEach(input => {
              const val = input.value;
              const span = clonedDoc.createElement('span');
              span.textContent = val || '0';
              span.className = input.className;
              span.style.display = 'inline-block';
              span.style.textAlign = 'right';
              if (input.parentNode) {
                input.parentNode.replaceChild(span, input);
              }
            });
          }
        }
      });
      const dataImage = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Mzuzu_Branch_Zones_Matrix_${MONTHS[selectedMonth - 1]}_${selectedYear}.png`;
      link.href = dataImage;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Export failed. Please check your browser console for details.');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-pulse flex flex-col gap-6">
        <div className="h-20 bg-gray-100 rounded-xl"></div>
        <div className="h-32 bg-gray-100 rounded-xl"></div>
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 rounded-lg"></div>
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
    const matchedServices = services.filter((s: any) => s.service_date?.trim() === dateStr.trim());
    const serviceIds = matchedServices.map((s: any) => s.id);
    const matchedRecords = serviceIds.length > 0 
      ? attendanceRecords.filter((r: any) => serviceIds.includes(r.service_id)) 
      : [];
    return { weekNum: index + 1, serviceId: serviceIds[0] || null, matchedRecords, dateStr };
  });

  const isZoneMatch = (dbCat: string, targetZone: string) => {
    const target = targetZone.trim().toLowerCase();
    const db = dbCat ? dbCat.trim().toLowerCase() : ''; 
    
    if (db === target) return true;
    
    if (target === 'new members' && (db.includes('new member') || db.includes('newcomer'))) return true;
    if (target === 'other branches' && (db.includes('other branch') || db.includes('visiting'))) return true;
    if (target === 'unknown zone or not in a zone' && (db === '' || db.includes('unknown') || db.includes('not in a zone') || db === 'n/a')) return true;
    
    return false;
  };

  const theme = activeServiceType === 'Sunday Service' 
    ? { primaryBg: 'bg-[#034a36]', secondaryBg: 'bg-[#023325]', accentBorder: 'border-emerald-800' }
    : { primaryBg: 'bg-indigo-900', secondaryBg: 'bg-indigo-950', accentBorder: 'border-indigo-800' };

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
      
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveServiceType('Sunday Service')} 
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-2 ${activeServiceType === 'Sunday Service' ? `${theme.primaryBg} text-white shadow-md` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Calendar className="w-4 h-4" /> Sunday Services
          </button>
          <button 
            onClick={() => setActiveServiceType('Midweek Service')} 
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-2 ${activeServiceType === 'Midweek Service' ? `${theme.primaryBg} text-white shadow-md` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Users className="w-4 h-4" /> Midweek Services
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="p-2 text-sm font-black uppercase bg-gray-50 border border-gray-300 text-gray-800 rounded-lg focus:ring-2 focus:ring-emerald-800 focus:outline-none">
            {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="p-2 text-sm font-black uppercase bg-gray-50 border border-gray-300 text-gray-800 rounded-lg focus:ring-2 focus:ring-emerald-800 focus:outline-none">
            {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
          <button 
            onClick={handleDownload} 
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 bg-emerald-800 text-white hover:bg-emerald-900`}
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      <div id="matrix-export-container" className="bg-[#fefce8] p-4 md:p-6 rounded-2xl w-full flex flex-col gap-4 font-sans text-gray-900 border border-yellow-200 shadow-xl">
        
        <div className={`${theme.primaryBg} text-white p-5 rounded-xl flex justify-between items-center shadow-md relative overflow-hidden`}>
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#facc15]" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-200">BRANCH ATTENDANCE REPORT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase">
              MZUZU BRANCH
            </h1>
            <h2 className="text-[#facc15] text-sm font-black tracking-widest mt-1">
              {MONTHS[selectedMonth - 1].toUpperCase()} {selectedYear} — {activeServiceType.toUpperCase()} ZONES
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Generated Date</span>
            <span className="text-sm font-black text-white">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          <div className="lg:col-span-4 flex flex-col gap-2">
            {displayWeeks.map((wkNum) => {
              const wkInfo = weeksDataTemplate[wkNum - 1];
              const registeredCount = wkInfo?.serviceId ? wkInfo.matchedRecords.length : 0;
              const hc = Number(manualHeadcounts[wkNum]) || 0;
              const variance = hc > 0 ? hc - registeredCount : 0;
              const dateDisplay = wkInfo?.dateStr ? wkInfo.dateStr : 'No Service Scheduled';
              const isAvailable = !!wkInfo;

              return (
                <div key={wkNum} className={`bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden transition-all ${!isAvailable && 'opacity-50 grayscale bg-gray-50'}`}>
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-3 py-1.5 flex justify-between items-center font-black">
                    <span className="tracking-wider flex items-center gap-1.5 text-sm">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      WEEK {wkNum}
                    </span>
                    <span className="text-[11px] font-bold text-blue-200 font-mono">{dateDisplay}</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="flex justify-between items-center font-black pb-1.5 border-b border-gray-100">
                      <span className="text-gray-500 font-bold uppercase text-xs">Headcount</span>
                      <input 
                        type="number"
                        value={manualHeadcounts[wkNum] || ''}
                        onChange={(e) => handleHeadcountChange(wkNum, e.target.value)}
                        className="w-20 text-right font-black text-lg text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded p-0.5 focus:ring-2 focus:outline-none transition-all"
                        placeholder="0"
                        disabled={!isAvailable}
                      />
                    </div>
                    <div className="flex justify-between items-center text-gray-700 px-1">
                      <span className="text-sm font-bold">Registered</span>
                      <span className="font-black text-base text-gray-900 font-mono">{registeredCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-700 px-1">
                      <span className="text-sm font-bold">Souls Won</span>
                      <input 
                        type="number"
                        value={manualSouls[wkNum] || ''}
                        onChange={(e) => handleSoulsChange(wkNum, e.target.value)}
                        className="w-14 text-right text-red-600 font-black text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded p-0.5 focus:outline-none transition-all"
                        placeholder="0"
                        disabled={!isAvailable}
                      />
                    </div>
                    <div className="flex justify-between items-center font-bold px-1 pt-1.5 border-t border-gray-100 text-xs">
                      <span className="text-gray-500 uppercase">Var</span>
                      <span className={`font-black font-mono text-sm px-2 rounded ${variance > 0 ? 'bg-emerald-50 text-emerald-700' : variance < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {variance > 0 ? `+${variance}` : variance}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className={`${theme.primaryBg} text-white p-3 rounded-lg shadow-md flex justify-between items-center mt-1 border border-emerald-700/40`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 block">Monthly Performance</span>
                <span className="font-black text-sm tracking-wider uppercase">Average Attendance</span>
              </div>
              <span className="text-[#facc15] font-black text-3xl font-mono bg-black/20 px-3 py-1 rounded-lg border border-yellow-500/30">{avgAttendance}</span>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden">
              <table className="w-full text-left border-collapse font-medium">
                <thead>
                  <tr className="bg-gray-900 text-white border-b border-gray-800 text-xs">
                    <th className="py-2 px-3 uppercase tracking-wider font-black">ZONES / CATEGORY</th>
                    {displayWeeks.map(wk => (
                      <th key={wk} className="py-2 px-2 text-center uppercase tracking-wider font-black w-12">WK{wk}</th>
                    ))}
                    <th className="py-2 px-3 text-center bg-[#fef08a] text-gray-900 uppercase tracking-wider font-black w-16">AVG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ZONE_CATEGORIES.map((group, gIdx) => (
                    <Fragment key={gIdx}>
                      <tr className="bg-gray-100/80 border-y border-gray-200 text-[#034a36] text-[11px] font-black uppercase tracking-wider">
                        <td colSpan={7} className="py-1.5 px-3">
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
                          <tr key={zIdx} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100 text-gray-800">
                            <td className="py-1.5 px-3 font-bold text-sm text-gray-900">{zoneName}</td>
                            {weeklyCounts.map((count, wIdx) => (
                              <td key={wIdx} className="py-1.5 px-2 text-center font-mono font-bold text-sm">
                                {count === null ? <span className="text-gray-300">-</span> : count > 0 ? <span className="text-gray-900 font-black">{count}</span> : <span className="text-gray-300">0</span>}
                              </td>
                            ))}
                            <td className="py-1.5 px-3 text-center bg-[#fef08a]/60 font-black text-gray-900 text-sm font-mono">{avg}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
              <div className={`${theme.primaryBg} text-white p-3 rounded-lg flex justify-between items-center shadow-sm border border-emerald-700/40`}>
                <div>
                  <span className="text-[10px] font-black tracking-wider text-emerald-200 uppercase block">VISION 100</span>
                  <span className="font-bold text-sm uppercase">Vision 100% Target</span>
                </div>
                <input 
                  type="number"
                  value={visionTarget}
                  onChange={(e) => setVisionTarget(e.target.value)}
                  className="w-24 bg-black/20 border border-yellow-500/30 text-right text-[#facc15] font-black text-xl rounded p-1 focus:outline-none font-mono"
                />
              </div>
              <div className={`${theme.primaryBg} text-white p-3 rounded-lg flex justify-between items-center shadow-sm border border-emerald-700/40`}>
                <div>
                  <span className="text-[10px] font-black tracking-wider text-emerald-200 uppercase block">Milestone Status</span>
                  <span className="font-bold text-sm uppercase">Achieved Rate</span>
                </div>
                <span className="text-[#facc15] font-black text-2xl font-mono bg-black/20 px-3 py-1 rounded border border-yellow-500/30">{achievedPercent}%</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}