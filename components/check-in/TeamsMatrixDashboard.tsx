'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService';
import { Calendar, Users, Download, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const TEAM_GROUPS = [
  { 
    groupName: "IN-SERVICE TEAMS", 
    items: [
      "Access Control", "Audio Streaming", "Catcher", "Information Desk", "Lyrics", 
      "Musicians", "Photography", "Projection", "Royal Guard", "Runner", 
      "Singer", "Sound Crew", "Stage Manager", "Traffic Patrol And Security", 
      "Usher", "Video Streaming", "Videography"
    ] 
  },
  { 
    groupName: "BRANCH OPERATIONS TEAMS", 
    items: [
      "Archive", "Children's Church Teacher", "Church Store", "Decorator", 
      "Graphic Design", "Pastor's Chauffer", "Pastor's Executive Secretary", 
      "Prayer", "Public Speaker", "Sanctuary Keeper", "Script Writer", 
      "Social Media", "Uniform", "Welfare"
    ] 
  },
  { 
    groupName: "BRANCH DIRECTORATE TEAMS", 
    items: [
      "Children's Music And Arts Ministry (MAM)", "Finance", "GLM Committee", 
      "Monitoring And Evaluation", "Research And Conceptualisation", 
      "Music And Arts Ministry (MAM)", "Training"
    ] 
  }
];

export default function TeamsMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const theme = activeServiceType === 'Sunday Service' 
    ? {
        bgPrimary: 'bg-[#034a36]', bgSecondary: 'bg-[#023325]', borderPrimary: 'border-emerald-500',
        textMuted: 'text-emerald-200', textAccent: 'text-emerald-300', hover: 'hover:bg-[#023325]'
      }
    : {
        bgPrimary: 'bg-[#4a1c15]', bgSecondary: 'bg-[#31100a]', borderPrimary: 'border-red-500',
        textMuted: 'text-red-200', textAccent: 'text-red-300', hover: 'hover:bg-[#31100a]'
      };

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('teams-matrix-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => { loadData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeServiceType, selectedMonth, selectedYear]);

  const handleDownload = async () => {
    const element = document.getElementById('teams-matrix-export-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fefce8', useCORS: true });
      const link = document.createElement('a');
      link.download = `Mzuzu_Branch_Teams_Matrix_${MONTHS[selectedMonth - 1]}_${selectedYear}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  if (loading && !reportData) {
    return (
      <div className="w-full max-w-7xl bg-white p-8 rounded-2xl shadow-xl animate-pulse flex flex-col gap-6 mx-auto mt-6">
        <div className="h-16 bg-gray-100 rounded-xl"></div>
        <div className="h-[600px] bg-gray-50 rounded-xl"></div>
      </div>
    );
  }

  const { services = [], attendanceRecords = [], members = [] } = reportData || {};

  // Smart Match Algorithm with extra Safety Nets (String casting)
  const isTeamMatch = (member: any, targetTeam: string) => {
    const rawDbTeam = String(member?.raw_team || '').toLowerCase();
    const target = targetTeam.toLowerCase().trim();
    
    const normalize = (str: string) => str.replace(/&/g, 'and').replace(/['’]/g, '').trim();
    const normTarget = normalize(target);

    if (target === "unknown team or not in a team") {
      const allKnown = TEAM_GROUPS.flatMap(g => g.items).map(t => normalize(t.toLowerCase()));
      if (!rawDbTeam) return true;
      const dbTeams = rawDbTeam.split(',').map((t: string) => normalize(t));
      return !dbTeams.some((dbt: string) => 
        allKnown.includes(dbt) || allKnown.includes(dbt + 's') || allKnown.includes(dbt.replace(/s$/, ''))
      );
    }
    
    const dbTeams = rawDbTeam.split(',').map((t: string) => normalize(t));
    
    return dbTeams.some((dbt: string) => 
      dbt === normTarget || dbt === normTarget + 's' || normTarget === dbt + 's'
    );
  };

  const displayWeeks = [1, 2, 3, 4, 5];
  const activeWeeksCount = services.length > 0 ? new Set(services.map((s: any) => s.week_number)).size : 1;

  return (
    <div className="w-full max-w-[1400px] flex flex-col gap-4 mx-auto text-gray-900 p-2 md:p-4">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-2">
          <button onClick={() => setActiveServiceType('Sunday Service')} className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 ${activeServiceType === 'Sunday Service' ? 'bg-[#034a36] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Calendar className="w-4 h-4" /> Sunday Services</button>
          <button onClick={() => setActiveServiceType('Midweek Service')} className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 ${activeServiceType === 'Midweek Service' ? 'bg-[#4a1c15] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Users className="w-4 h-4" /> Midweek Services</button>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="p-2 text-sm font-black uppercase bg-gray-50 border border-gray-300 rounded-lg outline-none">
            {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="p-2 text-sm font-black uppercase bg-gray-50 border border-gray-300 rounded-lg outline-none">
            {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
          <button onClick={handleDownload} className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 ${theme.bgPrimary} text-white ${theme.hover}`}><Download className="w-4 h-4" /> Export PNG</button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" /><p>{errorMsg}</p>
        </div>
      )}

      {/* Full-Width Matrix Export Container */}
      <div id="teams-matrix-export-container" className="bg-[#fefce8] p-4 md:p-6 rounded-2xl border border-yellow-200 shadow-xl font-sans">
        
        {/* Header Banner */}
        <div className={`${theme.bgPrimary} text-white px-6 py-4 rounded-t-xl flex justify-between items-end border-b-4 ${theme.borderPrimary} mb-4 transition-colors`}>
          <div>
            <span className={`text-xs font-black ${theme.textAccent} uppercase tracking-widest block mb-1`}>Branch Attendance Report</span>
            <h1 className="text-3xl font-black tracking-wider uppercase mb-0.5">MZUZU BRANCH</h1>
            <h2 className="text-[#facc15] text-sm font-black tracking-widest uppercase">
              {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType.toUpperCase()} TEAMS REPORT
            </h2>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider block`}>Generated Date</span>
            <span className="text-base font-black text-white">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        {/* Matrix Table Full Width */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`${theme.bgPrimary} text-white text-sm transition-colors`}>
                <th className="py-3 px-5 font-black tracking-wider uppercase w-[35%]">NAME</th>
                <th className={`py-3 px-3 font-black tracking-wider text-center ${theme.textMuted} w-16`}>MEM.</th>
                {displayWeeks.map(wk => (
                  <th key={wk} className={`py-3 px-3 font-black tracking-wider text-center ${theme.textMuted} w-16`}>WK{wk}</th>
                ))}
                <th className={`py-3 px-4 font-black tracking-wider text-center text-[#facc15] ${theme.bgSecondary} w-20`}>AVE.</th>
                <th className={`py-3 px-4 font-black tracking-wider text-center text-gray-900 bg-[#fef08a] w-24`}>AVE.%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {TEAM_GROUPS.map((group, gIdx) => (
                <Fragment key={gIdx}>
                  <tr className="bg-[#fef08a] border-y border-yellow-300 text-gray-900 font-black uppercase tracking-wider text-xs">
                    <td colSpan={9} className="py-2.5 px-5 flex items-center gap-2">
                      <span className="bg-gray-900 text-yellow-300 w-4 h-4 rounded-sm flex items-center justify-center text-[10px]">∇</span> 
                      {group.groupName}
                    </td>
                  </tr>
                  
                  {group.items.map((itemName, iIdx) => {
                    
                    // 1. Calculate base member count (Ignores deleted/transferred members)
                    const memCount = members.filter((m: any) => {
                      const status = String(m?.member_status || '').toLowerCase();
                      if (status === 'deleted' || status === 'transferred') return false;
                      return isTeamMatch(m, itemName);
                    }).length;

                    // 2. Calculate weekly attendance for this specific team
                    const weeklyCounts = displayWeeks.map(wkNum => {
                      const matchedServices = services.filter((s: any) => Number(s.week_number) === wkNum);
                      if (matchedServices.length === 0) return 0;
                      
                      const serviceIds = matchedServices.map((s: any) => s.id);
                      return attendanceRecords.filter((r: any) => {
                        if (!serviceIds.includes(r.service_id)) return false;
                        const memberObj = r.members;
                        return memberObj && isTeamMatch(memberObj, itemName);
                      }).length;
                    });

                    // 3. Averages & Percentages
                    const totalAttended = weeklyCounts.reduce((sum, val) => sum + val, 0);
                    const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;
                    const avgPercent = memCount > 0 ? Math.round((avg / memCount) * 100) : 0;

                    return (
                      <tr key={iIdx} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="py-2.5 px-5 font-bold text-gray-900">{itemName}</td>
                        
                        {/* Member Base Count */}
                        <td className="py-2.5 px-3 text-center font-black text-gray-600 bg-gray-50/50 text-base">
                          {memCount}
                        </td>

                        {/* Weekly Columns */}
                        {weeklyCounts.map((count, wIdx) => (
                          <td key={wIdx} className="py-2.5 px-3 text-center font-mono font-black text-base">
                            {count > 0 ? <span className="text-gray-900">{count}</span> : <span className="text-gray-300">0</span>}
                          </td>
                        ))}

                        {/* Averages */}
                        <td className="py-2.5 px-4 text-center font-black bg-[#fefce8] text-gray-900 text-base">
                          {avg}
                        </td>
                        <td className="py-2.5 px-4 text-center font-black bg-[#fef08a] text-gray-900 text-base">
                          {avgPercent}%
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}