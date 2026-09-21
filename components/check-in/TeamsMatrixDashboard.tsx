'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService'; // Ensure this returns members as well
import { Calendar, Users, Filter, Download } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Exact Teams Mapping Based on Mzuzu_Branch_Teams_Matrix_September_2026.jpg
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
      'Archive', 'Children\'s Church Teacher', 'Church Store', 'Decorator', 
      'Graphic Design', 'Pastor\'s Chauffer', 'Pastor\'s Executive Secretary', 
      'Prayer', 'Public Speaker', 'Sanctuary Keeper', 'Script Writer', 
      'Social Media', 'Uniform', 'Welfare'
    ]
  },
  {
    groupName: "BRANCH DIRECTORATE TEAMS",
    teams: [
      'Children\'s Music And Arts Ministry (MAM)', 'Finance', 'GLM Committee', 
      'Monitoring And Evaluation', 'Research And Conceptualisation', 
      'Music And Arts Ministry (MAM)', 'Training'
    ]
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

export default function TeamsMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Midweek Service');
  const [selectedMonth, setSelectedMonth] = useState(9); // Default Sept
  const [selectedYear, setSelectedYear] = useState(2026); // Default 2026
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getMonthlyZoneReport(selectedYear, selectedMonth, activeServiceType);
      setReportData(data);
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

  const handleDownload = async () => {
    const element = document.getElementById('teams-matrix-export-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#fefce8',
        logging: false,
        useCORS: true
      });
      const dataImage = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Mzuzu_Branch_Teams_Matrix_${MONTHS[selectedMonth - 1]}_${selectedYear}.png`;
      link.href = dataImage;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Export failed. Please check console for details.');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl bg-white p-8 rounded-2xl shadow-xl animate-pulse flex flex-col gap-6">
        <div className="h-20 bg-gray-100 rounded-xl"></div>
        <div className="space-y-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Ensure your getMonthlyZoneReport service returns members alongside services and attendanceRecords
  const { services = [], attendanceRecords = [], members = [] } = reportData || {};

  const targetDayOfWeek = activeServiceType === 'Sunday Service' ? 0 : 3;
  const calendarDates = getCalendarDatesForMonth(selectedYear, selectedMonth, targetDayOfWeek);
  const displayWeeks = [1, 2, 3, 4, 5];

  const weeksDataTemplate = calendarDates.map((dateStr, index) => {
    const matchedServices = services.filter((s: any) => s.service_date?.trim() === dateStr.trim());
    const serviceIds = matchedServices.map((s: any) => s.id);
    const matchedRecords = serviceIds.length > 0 
      ? attendanceRecords.filter((r: any) => serviceIds.includes(r.service_id)) 
      : [];
    return { weekNum: index + 1, serviceId: serviceIds[0] || null, matchedRecords, dateStr };
  });

  const isTeamMatch = (dbTeam: string, targetTeam: string) => {
    const db = dbTeam ? dbTeam.trim().toLowerCase() : ''; 
    const target = targetTeam.trim().toLowerCase();
    return db === target;
  };

  return (
    <div className="w-full max-w-[1400px] flex flex-col gap-4 mx-auto text-gray-900">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveServiceType('Sunday Service')} 
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-2 ${activeServiceType === 'Sunday Service' ? `bg-[#034a36] text-white shadow-md` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Calendar className="w-4 h-4" /> Sunday Services
          </button>
          <button 
            onClick={() => setActiveServiceType('Midweek Service')} 
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all duration-200 flex items-center gap-2 ${activeServiceType === 'Midweek Service' ? `bg-[#034a36] text-white shadow-md` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Matrix Export Container */}
      <div id="teams-matrix-export-container" className="bg-[#fefce8] p-4 md:p-8 rounded-xl border border-yellow-200 shadow-xl overflow-x-auto font-sans">
        
        {/* Executive Header Banner */}
        <div className="bg-[#034a36] text-white px-6 py-4 rounded-t-xl flex justify-between items-end border-b-4 border-emerald-500">
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase mb-1">MZUZU BRANCH</h1>
            <h2 className="text-[#facc15] text-xs font-black tracking-widest uppercase">
              {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType} TEAMS REPORT
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Generated</span>
            <span className="text-sm font-black text-white">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="bg-white border-x border-b border-gray-200 shadow-sm rounded-b-xl overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#034a36] text-white text-[11px]">
                <th className="py-2.5 px-4 font-black tracking-wider uppercase w-1/3">NAME</th>
                <th className="py-2.5 px-3 font-black tracking-wider text-center text-emerald-200">MEM.</th>
                {displayWeeks.map(wk => (
                  <th key={wk} className="py-2.5 px-2 font-black tracking-wider text-center text-emerald-200 w-12">WK{wk}</th>
                ))}
                <th className="py-2.5 px-3 font-black tracking-wider text-center text-[#facc15] bg-[#023325]">AVE.</th>
                <th className="py-2.5 px-3 font-black tracking-wider text-center text-[#facc15] bg-[#023325]">AVE.%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {TEAM_CATEGORIES.map((group, gIdx) => (
                <Fragment key={gIdx}>
                  {/* Category Header row */}
                  <tr className="bg-[#fef08a] border-y border-yellow-300 text-gray-900 font-black uppercase tracking-wider text-[10px]">
                    <td colSpan={9} className="py-1.5 px-4 flex items-center gap-1.5">
                      <Filter className="w-3 h-3 text-yellow-700" /> {group.groupName}
                    </td>
                  </tr>
                  
                  {/* Team Rows */}
                  {group.teams.map((teamName, tIdx) => {
                    // Total members explicitly assigned to this team in the database
                    const memCount = members.filter((m: any) => isTeamMatch(m.raw_team, teamName)).length;

                    // Calculate Check-ins for Wk1-Wk5
                    const weeklyCounts = displayWeeks.map((wkIndex) => {
                      if (wkIndex > calendarDates.length) return null; // No date for this week (e.g. 5th week)
                      const wkInfo = weeksDataTemplate[wkIndex - 1];
                      if (!wkInfo || !wkInfo.serviceId) return 0; // Missed service
                      
                      return wkInfo.matchedRecords.filter((r: any) => isTeamMatch(r.members?.raw_team, teamName)).length;
                    });

                    // Calculate Averages
                    const activeWeeksCount = weeklyCounts.filter(c => c !== null).length || 1;
                    const totalAttended = weeklyCounts.reduce((sum, val) => sum + (val || 0), 0);
                    const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;
                    const avgPercent = memCount > 0 ? Math.round((avg / memCount) * 100) : 0;

                    return (
                      <tr key={tIdx} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="py-2 px-4 font-bold text-gray-900">{teamName}</td>
                        <td className="py-2 px-3 text-center font-bold text-gray-500">{memCount}</td>
                        
                        {weeklyCounts.map((count, wIdx) => (
                          <td key={wIdx} className="py-2 px-2 text-center font-mono font-bold">
                            {count === null ? (
                               <span className="text-gray-300">-</span>
                            ) : count > 0 ? (
                              <span className="text-gray-900">{count}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        ))}

                        <td className="py-2 px-3 text-center font-black bg-[#fefce8] text-gray-900">{avg}</td>
                        <td className="py-2 px-3 text-center font-black bg-[#fefce8] text-emerald-700">{avgPercent}%</td>
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