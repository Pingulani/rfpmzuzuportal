'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService';
import { Calendar, Users, BarChart3, Filter, ShieldCheck, AlertCircle } from 'lucide-react';

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
  const [manualHeadcounts, setManualHeadcounts] = useState<Record<number, string>>({});

  useEffect(() => {
    setManualHeadcounts({});
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

  // --- Step 5: Professional Skeleton Loader State ---
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
  const totalColumnsCount = 3 + weekNumbersArray.length;

  const weeksDataTemplate = calendarDates.map((dateStr, index) => {
    const matchedService = services.find((s: any) => s.service_date === dateStr);
    const serviceId = matchedService ? matchedService.id : null;
    const matchedRecords = serviceId ? attendanceRecords.filter((r: any) => r.service_id === serviceId) : [];
    return { weekNum: index + 1, serviceId, matchedRecords };
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
    ? {
        primaryBg: 'bg-brand-sunday',
        secondaryBg: 'bg-brand-sundayDark',
        borderDark: 'border-brand-sundayDark',
        subText: 'text-brand-gold',
        highlightText: 'text-brand-sunday',
        auditBorder: 'border-brand-sundayDark'
      }
    : {
        primaryBg: 'bg-brand-midweek', 
        secondaryBg: 'bg-brand-midweekDark',
        borderDark: 'border-brand-midweek',
        subText: 'text-brand-midweekLight',
        highlightText: 'text-brand-midweek',
        auditBorder: 'border-brand-midweekDark'
      };

  return (
    <div className="w-full max-w-6xl bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      
      {/* Top Controls with Micro-Interactions */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
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
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className={`p-2 text-sm font-bold bg-white border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:outline-none transition-all ${activeServiceType === 'Sunday Service' ? 'focus:ring-brand-sunday' : 'focus:ring-brand-midweek'}`}>
            {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className={`p-2 text-sm font-bold bg-white border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:outline-none transition-all ${activeServiceType === 'Sunday Service' ? 'focus:ring-brand-sunday' : 'focus:ring-brand-midweek'}`}>
            {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>

      {/* Styled Header */}
      <div className={`${theme.primaryBg} text-white p-5 rounded-t-xl flex justify-between items-end transition-colors duration-300 shadow-md`}>
        <div>
          <h1 className="text-2xl font-black tracking-widest uppercase flex items-center gap-2">
            <BarChart3 className="w-6 h-6 opacity-80" /> Mzuzu Branch
          </h1>
          <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${theme.subText}`}>
            {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType.toUpperCase()} ZONES REPORT
          </p>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white max-h-[70vh]">
        <table className="w-full text-left border-collapse tabular-nums">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className={`${theme.secondaryBg} text-white text-xs uppercase font-black tracking-wider transition-colors duration-300`}>
              <th className="py-3.5 px-4">NAME</th>
              {weekNumbersArray.map((num) => (
                <th key={num} className="py-3.5 px-3 text-center">WK{num}</th>
              ))}
              <th className="py-3.5 px-3 text-center">AVE.</th>
              <th className="py-3.5 px-3 text-center">AVE.%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ZONE_CATEGORIES.map((group, gIdx) => (
              <Fragment key={gIdx}>
                <tr className="bg-amber-50 text-amber-900 text-xs font-black uppercase tracking-wider">
                  <td colSpan={totalColumnsCount} className="py-2.5 px-4 border-y border-amber-200 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 opacity-70" /> {group.groupName}
                  </td>
                </tr>
                {group.zones.map((zoneName, zIdx) => {
                  
                  const weeklyCounts = weekNumbersArray.map((wkIndex) => {
                    const wkInfo = weeksDataTemplate[wkIndex - 1];
                    if (!wkInfo.serviceId) return 0;
                    return wkInfo.matchedRecords.filter((r: any) => isZoneMatch(r.members?.raw_category, zoneName)).length;
                  });

                  const activeWeeksCount = weeklyCounts.filter(c => c > 0).length || 1;
                  const totalAttended = weeklyCounts.reduce((sum, val) => sum + val, 0);
                  const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;

                  return (
                    <tr key={zIdx} className="bg-white hover:bg-gray-50/80 transition-colors text-xs font-medium text-gray-800">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{zoneName}</td>
                      {weekNumbersArray.map((_, wIdx) => (
                        <td key={wIdx} className="py-2.5 px-3 text-center text-gray-700">{weeklyCounts[wIdx]}</td>
                      ))}
                      <td className="py-2.5 px-3 text-center bg-amber-50/50 text-amber-900 font-bold">{avg}</td>
                      <td className="py-2.5 px-3 text-center bg-amber-50/30 text-amber-900 font-bold">-</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}