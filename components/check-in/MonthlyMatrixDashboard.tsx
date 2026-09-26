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

const ZONE_GROUPS = [
  { groupName: "ZONES", items: ["Zone 1", "Zone 2", "Zone 3", "Zone 4"] },
  { groupName: "CAMPUSES", items: ["MCA", "Mzuzu Technical", "MIT", "MZUNI", "UNILIA", "MIJ"] },
  { groupName: "OTHER", items: ["Other Branches", "Special Services", "New Members", "Unknown Zone or Not in a Zone"] }
];

export default function ZonesMatrixDashboard() {
  const [activeServiceType, setActiveServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [visionTarget, setVisionTarget] = useState<number>(350);

  const theme = activeServiceType === 'Sunday Service' 
    ? {
        bgPrimary: 'bg-[#034a36]',
        bgSecondary: 'bg-[#023325]',
        borderPrimary: 'border-emerald-500',
        borderSecondary: 'border-emerald-600',
        textMuted: 'text-emerald-200',
        textAccent: 'text-emerald-300',
        textHighlight: 'text-emerald-400',
        textData: 'text-emerald-700',
        badge: 'bg-emerald-400',
        ring: 'focus:border-[#034a36]',
        hover: 'hover:bg-[#023325]'
      }
    : {
        bgPrimary: 'bg-[#4a1c15]',
        bgSecondary: 'bg-[#31100a]', 
        borderPrimary: 'border-red-500',
        borderSecondary: 'border-red-600',
        textMuted: 'text-red-200',
        textAccent: 'text-red-300',
        textHighlight: 'text-red-400',
        textData: 'text-red-800',
        badge: 'bg-red-400',
        ring: 'focus:border-[#4a1c15]',
        hover: 'hover:bg-[#31100a]'
      };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getMonthlyZoneReport(selectedYear, selectedMonth, activeServiceType);
      setReportData(data);

      // Fetch the Vision 100 target for this specific month/type
      const { data: targetData } = await supabase
        .from('monthly_targets')
        .select('target_value')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .eq('service_type', activeServiceType)
        .single();
      
      if (targetData) setVisionTarget(targetData.target_value);
      else setVisionTarget(350); // Default if none set yet

    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load matrix data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('zones-matrix-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeServiceType, selectedMonth, selectedYear]);

  const handleServiceFieldUpdate = async (serviceId: string, field: 'manual_headcount' | 'souls_won', value: number) => {
    if (!serviceId) return;
    try {
      const { error } = await supabase
        .from('services')
        .update({ [field]: value })
        .eq('id', serviceId);

      if (error) throw error;
      await loadData(); 
    } catch (err: any) {
      console.error('Error updating service field:', err);
      alert('Failed to save changes: ' + err.message);
    }
  };

  const handleTargetUpdate = async (val: number) => {
    if (val === visionTarget) return;
    setVisionTarget(val); 

    try {
      const { error } = await supabase
        .from('monthly_targets')
        .upsert(
          { 
            year: selectedYear, 
            month: selectedMonth, 
            service_type: activeServiceType, 
            target_value: val 
          },
          { onConflict: 'year,month,service_type' } // Uses the UNIQUE constraint we created
        );

      if (error) throw error;
    } catch (err: any) {
      console.error('Error saving target:', err);
      alert('Failed to save Vision Target: ' + err.message);
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById('zones-matrix-export-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fefce8', useCORS: true });
      const link = document.createElement('a');
      link.download = `Mzuzu_Branch_Zones_Matrix_${MONTHS[selectedMonth - 1]}_${selectedYear}.png`;
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-96 bg-gray-50 rounded-xl"></div>
          <div className="lg:col-span-8 h-96 bg-gray-50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const { services = [], attendanceRecords = [] } = reportData || {};

  const getMemberCategory = (member: any) => {
    return (member?.raw_category || '').trim();
  };

  const isItemMatch = (member: any, targetItem: string) => {
    const val = getMemberCategory(member).toLowerCase();
    const target = targetItem.toLowerCase();
    if (target === "unknown zone or not in a zone") {
      const allKnown = ["zone 1", "zone 2", "zone 3", "zone 4", "mca", "mzuzu technical", "mit", "mzuni", "unilia", "mij", "other branches", "special services", "new members"];
      return !val || !allKnown.includes(val);
    }
    return val === target;
  };

  const displayWeeks = [1, 2, 3, 4, 5];

  const weeklyCardStats = displayWeeks.map(wkNum => {
    const matchedServices = services.filter((s: any) => Number(s.week_number) === wkNum);
    const hasService = matchedServices.length > 0;
    const serviceIds = matchedServices.map((s: any) => s.id);
    const firstServiceId = hasService ? matchedServices[0].id : null;
    
    const matchedRecords = attendanceRecords.filter((r: any) => serviceIds.includes(r.service_id));
    const registeredCount = new Set(matchedRecords.map((r: any) => r.member_id)).size;
    
    const headcount = matchedServices.reduce((acc: number, s: any) => acc + (Number(s.manual_headcount) || 0), 0);
    const soulsWon = matchedServices.reduce((acc: number, s: any) => acc + (Number(s.souls_won) || 0), 0);
    const variance = registeredCount - headcount;

    return {
      weekNum: wkNum,
      serviceIds,
      firstServiceId,
      dateStr: hasService ? matchedServices[0].service_date : 'No Service Scheduled',
      headcount,
      registered: registeredCount,
      soulsWon,
      variance
    };
  });

  // Calculate Average from HEADCOUNT as requested
  const totalMonthlyHeadcount = weeklyCardStats.reduce((acc, curr) => acc + curr.headcount, 0);
  const activeWeeksCount = services.length > 0 ? new Set(services.map((s: any) => s.week_number)).size : 1;
  const averageAttendance = Math.round(totalMonthlyHeadcount / (activeWeeksCount || 1));

  // Auto-calculate Milestone Status %
  const milestonePercentage = visionTarget > 0 ? ((averageAttendance / visionTarget) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full max-w-[1450px] flex flex-col gap-4 mx-auto text-gray-900 p-2 md:p-4">
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
            className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 ${activeServiceType === 'Midweek Service' ? 'bg-[#4a1c15] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
          <button onClick={handleDownload} className={`px-4 py-2 text-sm font-black uppercase rounded-lg transition-all flex items-center gap-2 ${theme.bgPrimary} text-white ${theme.hover}`}>
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

      <div id="zones-matrix-export-container" className="bg-[#fefce8] p-4 md:p-6 rounded-2xl border border-yellow-200 shadow-xl font-sans">
        
        <div className={`${theme.bgPrimary} text-white px-6 py-4 rounded-t-xl flex justify-between items-end border-b-4 ${theme.borderPrimary} mb-4 transition-colors`}>
          <div>
            <span className={`text-[10px] font-black ${theme.textAccent} uppercase tracking-widest block mb-1`}>Branch Attendance Report</span>
            <h1 className="text-2xl font-black tracking-wider uppercase mb-0.5">MZUZU BRANCH</h1>
            <h2 className="text-[#facc15] text-xs font-black tracking-widest uppercase">
              {MONTHS[selectedMonth - 1]} {selectedYear} — {activeServiceType.toUpperCase()} ZONES
            </h2>
          </div>
          <div className="text-right">
            <span className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider block`}>Generated Date</span>
            <span className="text-sm font-black text-white">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <div className="lg:col-span-4 flex flex-col gap-3">
            {weeklyCardStats.map((wk) => {
              const hasService = wk.firstServiceId !== null;
              return (
                <div key={wk.weekNum} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className={`${theme.bgPrimary} text-white px-3 py-1.5 flex justify-between items-center text-xs font-black transition-colors`}>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${theme.badge}`}></span> WEEK {wk.weekNum}
                    </span>
                    <span className={`${theme.textMuted} font-mono text-[11px]`}>{wk.dateStr}</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                    
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Headcount (Edit)</span>
                      <input 
                        type="number"
                        disabled={!hasService}
                        defaultValue={wk.headcount}
                        key={`headcount-${wk.firstServiceId}-${wk.headcount}`} 
                        onBlur={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (wk.firstServiceId && val !== wk.headcount) {
                            handleServiceFieldUpdate(wk.firstServiceId, 'manual_headcount', val);
                          }
                        }}
                        className={`w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm font-black text-gray-900 outline-none ${theme.ring} disabled:opacity-50`}
                        placeholder="0"
                      />
                    </div>

                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Registered</span>
                      <span className={`text-base font-black ${theme.textData}`}>{wk.registered}</span>
                    </div>

                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Souls Won (Edit)</span>
                      <input 
                        type="number"
                        disabled={!hasService}
                        defaultValue={wk.soulsWon}
                        key={`soulswon-${wk.firstServiceId}-${wk.soulsWon}`}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (wk.firstServiceId && val !== wk.soulsWon) {
                            handleServiceFieldUpdate(wk.firstServiceId, 'souls_won', val);
                          }
                        }}
                        className={`w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm font-black text-red-600 outline-none ${theme.ring} disabled:opacity-50`}
                        placeholder="0"
                      />
                    </div>

                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Variance (Reg-Head)</span>
                      <span className={`text-base font-black ${wk.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {wk.variance >= 0 ? `+${wk.variance}` : wk.variance}
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}

            <div className={`${theme.bgPrimary} text-white p-4 rounded-xl shadow-md border-b-4 ${theme.borderPrimary} transition-colors`}>
              <span className={`text-[10px] font-bold ${theme.textAccent} uppercase tracking-widest block`}>Monthly Performance</span>
              <div className="flex justify-between items-end mt-1">
                <span className="text-xs font-bold uppercase tracking-wider">Average Headcount</span>
                <span className="text-2xl font-black text-[#facc15] font-mono">{averageAttendance}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${theme.bgPrimary} text-white text-[11px] transition-colors`}>
                    <th className="py-3 px-4 font-black tracking-wider uppercase">ZONES / CATEGORY</th>
                    {displayWeeks.map(wk => (
                      <th key={wk} className={`py-3 px-2 font-black tracking-wider text-center ${theme.textMuted} w-12`}>WK{wk}</th>
                    ))}
                    <th className={`py-3 px-3 font-black tracking-wider text-center text-[#facc15] ${theme.bgSecondary} w-16`}>AVG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {ZONE_GROUPS.map((group, gIdx) => (
                    <Fragment key={gIdx}>
                      <tr className="bg-[#fef08a] border-y border-yellow-300 text-gray-900 font-black uppercase tracking-wider text-[10px]">
                        <td colSpan={7} className="py-1.5 px-4">∇ {group.groupName}</td>
                      </tr>
                      {group.items.map((itemName, iIdx) => {
                        
                        const weeklyCounts = displayWeeks.map(wkNum => {
                          const matchedServices = services.filter((s: any) => Number(s.week_number) === wkNum);
                          if (matchedServices.length === 0) return 0;
                          
                          const serviceIds = matchedServices.map((s: any) => s.id);
                          return attendanceRecords.filter((r: any) => {
                            if (!serviceIds.includes(r.service_id)) return false;
                            const memberObj = r.members;
                            return memberObj && isItemMatch(memberObj, itemName);
                          }).length;
                        });

                        const totalAttended = weeklyCounts.reduce((sum, val) => sum + val, 0);
                        const avg = totalAttended > 0 ? Math.round(totalAttended / activeWeeksCount) : 0;

                        return (
                          <tr key={iIdx} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <td className="py-2.5 px-4 font-bold text-gray-900">{itemName}</td>
                            {weeklyCounts.map((count, wIdx) => (
                              <td key={wIdx} className="py-2.5 px-2 text-center font-mono font-bold">
                                {count > 0 ? <span className="text-gray-900">{count}</span> : <span className="text-gray-300">0</span>}
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
            
            <div className={`${theme.bgPrimary} text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center shadow-md border-b-4 ${theme.borderPrimary} gap-4 transition-colors`}>
              <div>
                <span className={`text-[10px] font-bold ${theme.textAccent} uppercase tracking-widest block`}>Strategic Goal</span>
                <span className="text-lg font-black tracking-wider">VISION 100% TARGET</span>
              </div>
              <div className="flex items-center gap-6">
                
                {/* Editable Vision Target */}
                <div className="text-right flex flex-col items-end">
                  <span className={`text-[10px] font-bold ${theme.textAccent} uppercase tracking-widest block mb-1`}>Target (Edit)</span>
                  <input 
                    type="number"
                    defaultValue={visionTarget}
                    key={`target-${selectedYear}-${selectedMonth}-${activeServiceType}-${visionTarget}`} 
                    onBlur={(e) => handleTargetUpdate(parseInt(e.target.value) || 0)}
                    className={`w-24 bg-black/20 border border-black/10 rounded px-2 py-0.5 text-xl font-black text-[#facc15] font-mono text-right outline-none focus:bg-black/40 transition-all ${theme.ring}`}
                  />
                </div>

                {/* Auto-calculated Milestone Status */}
                <div className={`${theme.bgSecondary} px-4 py-2 rounded-xl border ${theme.borderSecondary} text-right`}>
                  <span className={`text-[10px] font-bold ${theme.textAccent} uppercase tracking-widest block`}>Milestone Status</span>
                  <span className={`text-lg font-black ${theme.textHighlight} font-mono`}>{milestonePercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}