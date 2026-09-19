'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService';
import { Calendar, Users, BarChart3, ShieldCheck, AlertCircle, Briefcase } from 'lucide-react';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const TEAM_CATEGORIES = [
  {
    groupName: "IN-SERVICE TEAMS",
    teams: [
      'Access Control', 'Audio Streaming', 'Catcher', 'Information Desk', 
      'Lyrics', 'Musicians', 'Photography', 'Projection', 'Royal Guard', 
      'Runner', 'Singer', 'Sound Crew', 'Stage Manager', 
      'Traffic Patrol And Security', 'Usher', 'Video Streaming', 'Videography'
    ]
  },
  {
    groupName: "BRANCH OPERATIONS TEAMS",
    teams: [
      'Archive', "Children's Church Teacher", 'Church Store', 'Decorator', 
      'Graphic Design', "Pastor's Chauffeur", "Pastor's Executive Secretary", 
      'Prayer', 'Public Speaker', 'Sanctuary Keeper', 'Script Writor', 
      'Social Media', 'Uniform', 'Welfare'
    ]
  },
  {
    groupName: "BRANCH DIRECTORATE TEAMS",
    teams: [
      "Children's Music And Arts Ministry (MAM)", 'Finance', 'GLM Committee', 
      'Monitoring And Evaluation', 'Research And Conceptualisation', 
      'Music And Arts Ministry (MAM)', 'Training'
    ]
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

export default function TeamsMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026); 
  
  const [reportData, setReportData] = useState<any>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
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

      const { data: membersData } = await supabase.from('members').select('*');
      if (membersData) setAllMembers(membersData);

      setLoading(false);
    }
    loadData();

    const channel = supabase
      .channel('teams-matrix-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, async () => {
        const data = await getMonthlyZoneReport(selectedYear, selectedMonth, activeServiceType);
        setReportData(data);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeServiceType, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="w-full max-w-6xl bg-white p-6 rounded-2xl shadow-xl border border-gray-200 animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg mb-6"></div>
        <div className="h-24 bg-gray-200 rounded-t-lg mb-1"></div>
        <div className="space-y-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const { services = [], attendanceRecords = [] } = reportData || {};

  const targetDayOfWeek = activeServiceType === 'Sunday Service' ? 0 : 3;
  const calendarDates = getCalendarDatesForMonth(selectedYear, selectedMonth, targetDayOfWeek);
  const weekNumbersArray = calendarDates.map((_, i) => i + 1);
  const totalColumnsCount = 4 + weekNumbersArray.length;

  const weeksDataTemplate = calendarDates.map((dateStr, index) => {
    const matchedService = services.find((s: any) => s.service_date === dateStr);
    const serviceId = matchedService ? matchedService.id : null;
    const matchedRecords = serviceId ? attendanceRecords.filter((r: any) => r.service_id === serviceId) : [];
    return { weekNum: index + 1, serviceId, matchedRecords };
  });

  const isTeamMatch = (dbTeam: string, targetTeam: string) => {
    const target = targetTeam.trim().toLowerCase();
    const db = dbTeam ? dbTeam.trim().toLowerCase() : ''; 
    
    if (!db || db === 'n/a' || db === 'none') return false; 
    if (db === target || db.includes(target) || target.includes(db)) return true;
    
    return false;
  };

  const theme = activeServiceType === 'Sunday Service' 
    ? {
        primaryBg: 'bg-emerald-900',
        secondaryBg: 'bg-emerald-950',
        borderDark: 'border-emerald-800',
        subText: 'text-amber-200',
        highlightText: 'text-emerald-900 font-black',
        lightBg: 'bg-emerald-50'
      }
    : {
        primaryBg: 'bg-indigo-900', 
        secondaryBg: 'bg-indigo-950',
        borderDark: 'border-indigo-800',
        subText: 'text-indigo-200',
        highlightText: 'text-indigo-900 font-black',
        lightBg: 'bg-indigo-50'
      };

  return (
    <div className="w-full max-w-6xl bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveServiceType('Sunday Service')} 
            className={`px-4 py-2.5 text-xs font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-1.5 ${activeServiceType === 'Sunday Service' ? 'bg-emerald-900 text-white shadow-md scale-[1.02]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <Calendar className="w-3.5 h-3.5" /> Sun Services
          </button>
          <button 
            onClick={() => setActiveServiceType('Midweek Service')} 
            className={`px-4 py-2.5 text-xs font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-1.5 ${activeServiceType === 'Midweek Service' ? 'bg-indigo-900 text-white shadow-md scale-[1.02]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <Users className="w-3.5 h-3.5" /> Midweek Services
          </button>
        </div>
        <div className="flex gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="p-2 text-sm font-bold bg-white border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-800 focus:outline-none">
            {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="p-2 text-sm font-bold bg-white border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-800 focus:outline-none">
            {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>

      {/* Styled Executive Header Banner */}
      <div className={`${theme.primaryBg} text-white p-5 rounded-t-xl flex justify-between items-end transition-colors duration-300 shadow-md`}>
        <div>
          <h1 className="text-2xl font-black tracking-widest uppercase flex items-center gap-2">
            <BarChart3 className="w-6 h-6 opacity-80" /> Mzuzu Branch
          </h1>
          <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${theme.subText}`}>
            {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType.toUpperCase()} TEAMS REPORT
          </p>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-auto border-x border-b border-gray-300 rounded-b-xl shadow-inner max-h-[70vh]">
        <table className="w-full text-left border-collapse tabular-nums">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className={`${theme.secondaryBg} text-white text-xs uppercase font-black tracking-wider transition-colors duration-300`}>
              <th className="py-3.5 px-4 border-r border-emerald-800">NAME</th>
              <th className="py-3.5 px-3 text-center border-r border-emerald-800 w-16">MEM.</th>
              {weekNumbersArray.map((num) => (
                <th key={num} className="py-3.5 px-3 text-center border-r border-emerald-800">WK{num}</th>
              ))}
              <th className="py-3.5 px-3 text-center border-r border-emerald-800">AVE.</th>
              <th className="py-3.5 px-3 text-center">AVE.%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {TEAM_CATEGORIES.map((group, gIdx) => (
              <Fragment key={gIdx}>
                <tr className="bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
                  <td colSpan={totalColumnsCount} className="py-2.5 px-4 border-y border-amber-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 opacity-70" /> {group.groupName}
                  </td>
                </tr>
                {group.teams.map((teamName, tIdx) => {
                  
                  // Accurate team-specific headcount calculation
                  const teamMembersCount = allMembers.filter((m: any) => {
                    const memberTeam = (m.team || m.raw_team || '').trim().toLowerCase();
                    const target = teamName.trim().toLowerCase();
                    if (!memberTeam) return false;
                    return memberTeam === target || memberTeam.includes(target) || target.includes(memberTeam);
                  }).length;

                  const weeklyCounts = weekNumbersArray.map((wkIndex) => {
                    const wkInfo = weeksDataTemplate[wkIndex - 1];
                    if (!wkInfo.serviceId) return 0;
                    return wkInfo.matchedRecords.filter((r: any) => isTeamMatch(r.members?.team || r.members?.raw_team, teamName)).length;
                  });

                  const activeWeeksCount = weeklyCounts.filter(c => c > 0).length || 1;
                  const totalAttended = weeklyCounts.reduce((sum, val) => sum + val, 0);
                  const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;
                  const avgPercent = teamMembersCount > 0 ? Math.round((avg / teamMembersCount) * 100) : 0;

                  return (
                    <tr key={tIdx} className="bg-white hover:bg-gray-50/80 transition-colors text-xs font-medium text-gray-800">
                      <td className="py-2 px-4 border-r border-gray-100 font-semibold text-gray-900">{teamName}</td>
                      <td className="py-2 px-3 text-center border-r border-gray-100 bg-gray-50/80 font-bold text-gray-700">{teamMembersCount}</td>
                      {weekNumbersArray.map((_, wIdx) => (
                        <td key={wIdx} className="py-2 px-3 text-center border-r border-gray-100 text-gray-700">{weeklyCounts[wIdx]}</td>
                      ))}
                      <td className="py-2 px-3 text-center border-r border-gray-100 bg-amber-50/60 text-amber-900 font-bold">{avg}</td>
                      <td className="py-2 px-3 text-center bg-amber-100/40 text-amber-900 font-bold">{avgPercent}%</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}

        
            {/* Registered Row */}
            <tr className={`${theme.lightBg} text-xs font-semibold text-gray-900`}>
              <td className="py-2.5 px-4 border-r border-gray-300 font-black">REGISTERED</td>
              <td className="py-2.5 px-3 text-center border-r border-gray-300 font-black bg-gray-100">
                {allMembers.length}
              </td>
              {weekNumbersArray.map(wkNum => {
                const wkInfo = weeksDataTemplate[wkNum - 1];
                const registeredCount = wkInfo.serviceId ? wkInfo.matchedRecords.length : 0;
                return (
                  <td key={wkNum} className={`py-2.5 px-3 text-center border-r border-gray-300 ${theme.highlightText}`}>
                    {registeredCount}
                  </td>
                );
              })}
              <td className="py-2.5 px-3 border-r border-gray-300 bg-gray-100"></td>
              <td className="py-2.5 px-3 bg-gray-100"></td>
            </tr>
            
            </tbody>
        </table>
      </div>
    </div>
  );
}