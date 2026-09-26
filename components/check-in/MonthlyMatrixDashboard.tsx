'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../utils/supabase';
import { getMonthlyZoneReport } from '../../services/monthlyReportService';
import { Calendar, Users, Download, AlertCircle, Save, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const ZONE_GROUPS = [
  {
    groupName: "ZONES",
    items: ["Zone 1", "Zone 2", "Zone 3", "Zone 4"]
  },
  {
    groupName: "CAMPUSES",
    items: ["MCA", "Mzuzu Technical", "MIT", "MZUNI", "UNILIA", "MIJ"]
  },
  {
    groupName: "OTHER",
    items: ["Other Branches", "Special Services", "New Members", "Unknown Zone or Not in a Zone"]
  }
];

export default function ZonesMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  const [selectedMonth, setSelectedMonth] = useState(9); // Default September 2026
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    // Real-time subscription to catch check-ins instantly
    const channel = supabase
      .channel('zones-matrix-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeServiceType, selectedMonth, selectedYear]);

  // Handler to update editable Headcount or Souls Won in Supabase
  const handleServiceFieldUpdate = async (serviceId: string, field: 'manual_headcount' | 'souls_won', value: number) => {
    if (!serviceId) return;
    setSavingServiceId(serviceId);

    try {
      const { error } = await supabase
        .from('services')
        .update({ [field]: value })
        .eq('id', serviceId);

      if (error) throw error;
      
      // Refresh local data state
      await loadData();
    } catch (err: any) {
      console.error('Error updating service field:', err);
      alert('Failed to save changes: ' + err.message);
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById('zones-matrix-export-container');
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
      link.download = `Mzuzu_Branch_Zones_Matrix_${MONTHS[selectedMonth - 1]}_${selectedYear}.png`;
      link.href = dataImage;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Export failed.');
    }
  };

  if (loading && !reportData) {
    return (
      <div className="w-full max-w-7xl bg-white p-8 rounded-2xl shadow-xl animate-pulse flex flex-col gap-6 mx-auto mt-6">
        <div className="h-16 bg-gray-100 rounded-xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-96 bg-gray-50 rounded-xl"></div>
          <div className="lg:col-span-8 h-96 bg-gray-50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const { services = [], attendanceRecords = [] } = reportData || {};

  // Helper to normalize and match zone/campus/category
  const getMemberZoneOrCategory = (member: any) => {
    return (member?.raw_zone || member?.zone || member?.raw_category || member?.category || '').trim();
  };

  const isItemMatch = (member: any, targetItem: string) => {
    const val = getMemberZoneOrCategory(member).toLowerCase();
    const target = targetItem.toLowerCase();

    if (target === "unknown zone or not in a zone") {
      const allKnown = [
        "zone 1", "zone 2", "zone 3", "zone 4", 
        "mca", "mzuzu technical", "mit", "mzuni", "unilia", "mij", 
        "other branches", "special services", "new members"
      ];
      return !val || !allKnown.includes(val);
    }

    return val === target;
  };

  const displayWeeks = [1, 2, 3, 4, 5];

  // Build weekly stats for the left sidebar cards
  const weeklyCardStats = displayWeeks.map(wkNum => {
    const matchedService = services.find((s: any) => Number(s.week_number) === wkNum);
    const serviceId = matchedService?.id;
    
    // Filter attendance records specifically for this service ID
    const matchedRecords = serviceId ? attendanceRecords.filter((r: any) => r.service_id === serviceId) : [];
    
    // Unique attendees check-in count for this week (Registered)
    const registeredCount = new Set(matchedRecords.map((r: any) => r.member_id)).size;
    const headcount = matchedService ? (Number(matchedService.manual_headcount) || 0) : 0;
    const soulsWon = matchedService ? (Number(matchedService.souls_won) || 0) : 0;
    
    // Variance = Registered (Checked-in) minus Headcount
    const variance = registeredCount - headcount;

    return {
      weekNum: wkNum,
      serviceId,
      dateStr: matchedService?.service_date || 'No Service Scheduled',
      headcount,
      registered: registeredCount,
      soulsWon,
      variance
    };
  });

  const totalMonthlyAttendance = weeklyCardStats.reduce((acc, curr) => acc + curr.registered, 0);
  const activeWeeksCount = services.length > 0 ? new Set(services.map((s: any) => s.week_number)).size : 1;
  const averageAttendance = Math.round(totalMonthlyAttendance / (activeWeeksCount || 1));

  return (
    <div className="w-full max-w-[1450px] flex flex-col gap-4 mx-auto text-gray-900 p-2 md:p-4">
      
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

      {/* Main Export Container */}
      <div id="zones-matrix-export-container" className="bg-[#fefce8] p-4 md:p-6 rounded-2xl border border-yellow-200 shadow-xl font-sans">
        
        {/* Header Banner */}
        <div className="bg-[#034a36] text-white px-6 py-4 rounded-t-xl flex justify-between items-end border-b-4 border-emerald-500 mb-4">
          <div>
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest block mb-1">Branch Attendance Report</span>
            <h1 className="text-2xl font-black tracking-wider uppercase mb-0.5">MZUZU BRANCH</h1>
            <h2 className="text-[#facc15] text-xs font-black tracking-widest uppercase">
              {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType.toUpperCase()} ZONES
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Generated Date</span>
            <span className="text-sm font-black text-white">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Weekly Cards with Editable Headcount & Souls Won */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {weeklyCardStats.map((wk) => {
              const hasService = wk.serviceId !== undefined;
              return (
                <div key={wk.weekNum} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-[#034a36] text-white px-3 py-1.5 flex justify-between items-center text-xs font-black">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> WEEK {wk.weekNum}
                    </span>
                    <span className="text-emerald-200 font-mono text-[11px]">{wk.dateStr}</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                    
                    {/* Editable Headcount */}
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Headcount (Edit)</span>
                      <input 
                        type="number"
                        disabled={!hasService || savingServiceId === wk.serviceId}
                        value={wk.headcount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (wk.serviceId) handleServiceFieldUpdate(wk.serviceId, 'manual_headcount', val);
                        }}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm font-black text-gray-900 outline-none focus:border-[#034a36]"
                        placeholder="0"
                      />
                    </div>

                    {/* Live Registered (Check-ins) */}
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Registered</span>
                      <span className="text-base font-black text-emerald-700">{wk.registered}</span>
                    </div>

                    {/* Editable Souls Won */}
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Souls Won (Edit)</span>
                      <input 
                        type="number"
                        disabled={!hasService || savingServiceId === wk.serviceId}
                        value={wk.soulsWon}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (wk.serviceId) handleServiceFieldUpdate(wk.serviceId, 'souls_won', val);
                        }}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm font-black text-red-600 outline-none focus:border-[#034a36]"
                        placeholder="0"
                      />
                    </div>

                    {/* Variance: Registered minus Headcount */}
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block" title="Registered minus Headcount">Variance (Reg-Head)</span>
                      <span className={`text-base font-black ${wk.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {wk.variance >= 0 ? `+${wk.variance}` : wk.variance}
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}

            {/* Monthly Average Attendance Box */}
            <div className="bg-[#034a36] text-white p-4 rounded-xl shadow-md border-b-4 border-emerald-500">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">Monthly Performance</span>
              <div className="flex justify-between items-end mt-1">
                <span className="text-xs font-bold uppercase tracking-wider">Average Attendance</span>
                <span className="text-2xl font-black text-[#facc15] font-mono">{averageAttendance}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Zones, Campuses & Other Matrix Table */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#034a36] text-white text-[11px]">
                    <th className="py-3 px-4 font-black tracking-wider uppercase">ZONES / CATEGORY</th>
                    {displayWeeks.map(wk => (
                      <th key={wk} className="py-3 px-2 font-black tracking-wider text-center text-emerald-200 w-12">WK{wk}</th>
                    ))}
                    <th className="py-3 px-3 font-black tracking-wider text-center text-[#facc15] bg-[#023325] w-16">AVG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {ZONE_GROUPS.map((group, gIdx) => (
                    <Fragment key={gIdx}>
                      {/* Category Group Banner */}
                      <tr className="bg-[#fef08a] border-y border-yellow-300 text-gray-900 font-black uppercase tracking-wider text-[10px]">
                        <td colSpan={7} className="py-1.5 px-4">
                          ∇ {group.groupName}
                        </td>
                      </tr>

                      {/* Items under Group */}
                      {group.items.map((itemName, iIdx) => {
                        const weeklyCounts = displayWeeks.map(wkNum => {
                          const matchedService = services.find((s: any) => Number(s.week_number) === wkNum);
                          if (!matchedService) return 0;
                          
                          const serviceId = matchedService.id;

                          return attendanceRecords.filter((r: any) => {
                            if (r.service_id !== serviceId) return false;
                            const memberObj = r.members;
                            if (!memberObj) return false;
                            return isItemMatch(memberObj, itemName);
                          }).length;
                        });

                        const totalAttended = weeklyCounts.reduce((sum, val) => sum + val, 0);
                        const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;

                        return (
                          <tr key={iIdx} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <td className="py-2.5 px-4 font-bold text-gray-900">{itemName}</td>
                            
                            {weeklyCounts.map((count, wIdx) => (
                              <td key={wIdx} className="py-2.5 px-2 text-center font-mono font-bold">
                                {count > 0 ? (
                                  <span className="text-gray-900">{count}</span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                            ))}

                            <td className="py-2.5 px-3 text-center font-black bg-[#fefce8] text-gray-900">{avg}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Strategic Goal Card */}
            <div className="bg-[#034a36] text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center shadow-md border-b-4 border-emerald-500 gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">Strategic Goal</span>
                <span className="text-lg font-black tracking-wider">VISION 100% TARGET</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">Target</span>
                  <span className="text-xl font-black text-[#facc15] font-mono">350</span>
                </div>
                <div className="bg-[#023325] px-4 py-2 rounded-xl border border-emerald-600 text-right">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">Milestone Status</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">50.6%</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}