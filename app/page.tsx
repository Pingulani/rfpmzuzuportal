'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '../utils/supabase';
import MonthlyMatrixDashboard from '../components/check-in/MonthlyMatrixDashboard';
import TeamsMatrixDashboard from '../components/check-in/TeamsMatrixDashboard';
import EditMemberModal from '../components/check-in/EditMemberModal';
import NewcomerModal from '../components/check-in/NewcomerModal';
import AddMemberModal from '../components/check-in/AddMemberModal';
import {
  Search,
  Edit3,
  Trash2,
  UserPlus,
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Check,
  LayoutDashboard,
  Network,
  UsersRound,
  FolderKanban,
  Bell,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

function getValidServiceDates(year: number, month: number, targetDayOfWeek: number) {
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

export default function PortalDashboard() {
  const [activeTab, setActiveTab] = useState<'zones' | 'teams' | 'checkin' | 'members'>('checkin');
  const [members, setMembers] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [checkinMonth, setCheckinMonth] = useState(9);
  const [checkinYear, setCheckinYear] = useState(2026);
  const [checkinServiceType, setCheckinServiceType] = useState<'Sunday Service' | 'Midweek Service'>('Sunday Service');
  
  const [activeServiceDates, setActiveServiceDates] = useState<{ weekNum: number; dateStr: string; serviceId: string | null }[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceAttendance, setServiceAttendance] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Non-blocking toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modal states
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isNewcomerOpen, setIsNewcomerOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Robust pagination loop to fetch ALL records from database (supporting 1,000+ members)
  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      let allMembersData: any[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error("Error fetching members batch:", error.message);
          break;
        }
        if (!data || data.length === 0) break;

        allMembersData = [...allMembersData, ...data];
        if (data.length < pageSize) break;
        page++;
      }

      const normalized = allMembersData.map(m => ({
        ...m,
        full_name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unnamed Member',
        phone: m.phone_number || m.phone || 'N/A',
        raw_category: m.raw_category || 'Unknown Zone',
        team: m.raw_team || m.team || 'N/A',
        status: m.member_status || 'Active'
      }));
      normalized.sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
      setMembers(normalized);
    } catch (err) {
      console.error("Error fetching all members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const syncAndLoadServices = async () => {
    const targetDay = checkinServiceType === 'Sunday Service' ? 0 : 3;
    const calendarDates = getValidServiceDates(checkinYear, checkinMonth, targetDay);

    if (calendarDates.length === 0) {
      setActiveServiceDates([]);
      setSelectedServiceId('');
      return;
    }

    const { data: existingServices } = await supabase
      .from('services')
      .select('id, service_date, service_type')
      .in('service_date', calendarDates)
      .eq('service_type', checkinServiceType);

    const serviceMap = new Map((existingServices || []).map((s: any) => [s.service_date, s.id]));

    const updatedDates = [];
    for (let i = 0; i < calendarDates.length; i++) {
      const dateStr = calendarDates[i];
      let sId = serviceMap.get(dateStr);

      if (!sId) {
        const { data: inserted } = await supabase
          .from('services')
          .insert([{ service_date: dateStr, service_type: checkinServiceType }])
          .select('id')
          .single();
        if (inserted) sId = inserted.id;
      }

      updatedDates.push({
        weekNum: i + 1,
        dateStr,
        serviceId: sId || null
      });
    }

    setActiveServiceDates(updatedDates);
    if (updatedDates.length > 0 && (!selectedServiceId || !updatedDates.some(d => d.serviceId === selectedServiceId))) {
      setSelectedServiceId(updatedDates[0].serviceId || '');
    }
  };

  const fetchServiceAttendance = async (serviceId: string) => {
    if (!serviceId) {
      setServiceAttendance([]);
      return;
    }
    const { data, error } = await supabase
      .from('attendance')
      .select('member_id')
      .eq('service_id', serviceId);

    if (!error && data) {
      setServiceAttendance(data.map((r: any) => r.member_id));
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    syncAndLoadServices();
  }, [checkinMonth, checkinYear, checkinServiceType]);

  useEffect(() => {
    if (selectedServiceId) {
      fetchServiceAttendance(selectedServiceId);
    }
  }, [selectedServiceId]);

  const toggleAttendance = async (memberId: string) => {
    if (!selectedServiceId || actionLoading) return;
    setActionLoading(true);

    const isAlreadyCheckedIn = serviceAttendance.includes(memberId);

    if (isAlreadyCheckedIn) {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('service_id', selectedServiceId)
        .eq('member_id', memberId);

      if (!error) {
        setServiceAttendance(prev => prev.filter(id => id !== memberId));
      }
    } else {
      const { error } = await supabase
        .from('attendance')
        .insert([{ service_id: selectedServiceId, member_id: memberId }]);

      if (!error) {
        setServiceAttendance(prev => [...prev, memberId]);
      }
    }
    setActionLoading(false);
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${memberName} from the directory? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) {
      alert('Failed to delete member: ' + error.message);
    } else {
      showToast(`Member ${memberName} deleted successfully.`);
      fetchMembers();
    }
  };

  const filteredMembers = members.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.raw_category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.team?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const activeMembers = members.filter(
    member => String(member.status || '').trim().toLowerCase() === 'active'
  );
  const activeTeamCounts = new Map<string, { name: string; memberCount: number }>();
  activeMembers.forEach(member => {
    const memberTeams = new Set(
      String(member.team || '')
        .split(',')
        .map((team: string) => team.trim())
        .filter((team: string) => team && !['n/a', 'none', 'unknown', 'unknown team or not in a team', 'not in a team'].includes(team.toLowerCase()))
    );
    memberTeams.forEach(team => {
      const key = team.toLowerCase();
      const current = activeTeamCounts.get(key);
      activeTeamCounts.set(key, { name: current?.name || team, memberCount: (current?.memberCount || 0) + 1 });
    });
  });
  const activeTeams = Array.from(activeTeamCounts.values())
    .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
  const chartTeams = activeTeams.slice(0, 6);
  const maxTeamMemberCount = chartTeams[0]?.memberCount || 1;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[70] bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-700">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[250px] bg-[#11130f] text-slate-100 transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[86px] px-6 flex items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image
              src="/rfp-gold-logo.png"
              alt="Raised For A Purpose Ministries logo"
              width={48}
              height={48}
              priority
              className="w-12 h-12 rounded-full object-contain"
            />
            <div>
              <p className="text-[10px] font-black tracking-[0.06em] leading-tight text-[#facc15]">RAISED FOR A PURPOSE</p>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.16em] mt-1">MZUZU BRANCH</p>
            </div>
          </div>
          <button aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="ml-auto lg:hidden p-1 text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1.5">
          {[
            { id: 'checkin' as const, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'members' as const, label: 'Member Management', icon: UsersRound },
            { id: 'zones' as const, label: 'Zones Matrix', icon: Network },
            { id: 'teams' as const, label: 'Teams Matrix', icon: FolderKanban },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-3 rounded-lg flex items-center gap-3 text-sm font-semibold transition-colors ${
                activeTab === id
                  ? 'bg-[#034a36] text-white shadow-lg shadow-black/30'
                  : 'text-slate-300 hover:bg-emerald-950/70 hover:text-[#facc15]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#d4b35e] text-[#11130f] flex items-center justify-center font-black text-xs">AD</div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Administrator</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Mzuzu Branch</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-[250px] min-h-screen">
        <header className="h-[86px] bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg border border-slate-200">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="hidden sm:block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Mzuzu Branch Portal</p>
              <h1 className="text-base md:text-xl font-black text-[#11130f] mt-0.5">
                {activeTab === 'checkin' ? 'Dashboard' : activeTab === 'members' ? 'Member Management' : `${activeTab === 'zones' ? 'Zones' : 'Teams'} Matrix`}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button aria-label="Notifications" className="relative hidden sm:flex w-10 h-10 rounded-full border border-slate-200 items-center justify-center text-slate-500 hover:bg-slate-50">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#d4b35e] rounded-full border border-white" />
            </button>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              aria-label="Add member"
              className="flex px-2.5 sm:px-4 py-2.5 bg-[#034a36] text-white text-xs font-bold rounded-lg hover:bg-[#023325] transition-colors items-center gap-2"
            >
              <UserCheck className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Add Member</span>
            </button>
            <button
              onClick={() => setIsNewcomerOpen(true)}
              aria-label="Newcomer check-in"
              className="flex px-2.5 md:px-4 py-2.5 bg-[#d4b35e] text-[#11130f] text-xs font-bold rounded-lg hover:bg-[#facc15] transition-colors items-center gap-2"
            >
              <UserPlus className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">Newcomer</span>
            </button>
            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-[#fef3c7] flex items-center justify-center text-[#11130f] font-black text-xs">AD</div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8">

      {/* 1. SERVICE CHECK-IN TAB */}
      {activeTab === 'checkin' && (
        <div className="w-full max-w-6xl space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Active Members</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{loadingMembers ? '—' : activeMembers.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-emerald-50 text-[#034a36] flex items-center justify-center"><UsersRound className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Active Teams</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{loadingMembers ? '—' : activeTeams.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-[#fef3c7] text-[#7a5410] flex items-center justify-center"><FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Checked In</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{serviceAttendance.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">All Members</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{loadingMembers ? '—' : members.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-[#fef3c7] text-[#7a5410] flex items-center justify-center"><UsersRound className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
          </div>

          <section aria-labelledby="team-chart-title" className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#034a36]">People &amp; teams</p>
                <h2 id="team-chart-title" className="text-base md:text-lg font-black text-slate-800 mt-1">Active members by team</h2>
              </div>
              <p className="text-xs text-slate-500">{loadingMembers ? 'Loading teams…' : `${activeTeams.length} active ${activeTeams.length === 1 ? 'team' : 'teams'}`}</p>
            </div>
            {loadingMembers ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading member data…</p>
            ) : chartTeams.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No active team assignments to chart yet.</p>
            ) : (
              <div className="space-y-4">
                {chartTeams.map(({ name, memberCount }) => (
                  <div key={name} className="grid grid-cols-[minmax(5rem,8rem)_1fr_2.5rem] sm:grid-cols-[minmax(8rem,12rem)_1fr_3rem] items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600 truncate" title={name}>{name}</span>
                    <div
                      className="h-3 bg-slate-100 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-label={`${name}: ${memberCount} active members`}
                      aria-valuemin={0}
                      aria-valuemax={maxTeamMemberCount}
                      aria-valuenow={memberCount}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[#034a36] to-[#d4b35e] rounded-full"
                        style={{ width: `${(memberCount / maxTeamMemberCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-right text-xs font-black text-slate-700">{memberCount}</span>
                  </div>
                ))}
                {activeTeams.length > chartTeams.length && (
                  <p className="pt-1 text-[11px] text-slate-400">Showing the 6 teams with the most active members.</p>
                )}
              </div>
            )}
          </section>

          <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-800" /> Live Service Check-in
              </h2>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">Select service type, month, and strict calendar Sunday/Wednesday date.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={checkinServiceType}
                onChange={(e) => setCheckinServiceType(e.target.value as any)}
                className="p-2.5 text-xs font-bold bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-800 focus:outline-none"
              >
                <option value="Sunday Service">Sunday Service (Sundays)</option>
                <option value="Midweek Service">Midweek Service (Wednesdays)</option>
              </select>

              <select
                value={checkinMonth}
                onChange={(e) => setCheckinMonth(Number(e.target.value))}
                className="p-2.5 text-xs font-bold bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-800 focus:outline-none"
              >
                {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
              </select>

              <select
                value={checkinYear}
                onChange={(e) => setCheckinYear(Number(e.target.value))}
                className="p-2.5 text-xs font-bold bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-800 focus:outline-none"
              >
                {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
            <div className="w-full md:w-auto flex-1">
              <label className="text-xs font-black text-emerald-900 uppercase tracking-wider block mb-1">
                Select Calendar Date ({checkinServiceType})
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full p-2.5 text-xs font-bold bg-white border border-emerald-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-800 focus:outline-none"
              >
                {activeServiceDates.length === 0 ? (
                  <option value="">No valid calendar dates found for this month</option>
                ) : (
                  activeServiceDates.map(item => (
                    <option key={item.serviceId} value={item.serviceId || ''}>
                      Week {item.weekNum}: {item.dateStr} ({checkinServiceType})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="text-xs font-bold text-emerald-900 bg-white px-4 py-3 rounded-lg border border-emerald-200 shadow-sm text-center">
              Checked In: <span className="font-black text-sm text-emerald-700">{serviceAttendance.length}</span> members
            </div>
          </div>

          <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Member Check-in List ({members.length} Total Loaded)</h3>
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input 
                type="text"
                placeholder="Search member name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>

          {loadingMembers ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
              Loading members database...
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[55vh]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-emerald-950 text-white text-xs uppercase font-black tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4 text-center">Check-in Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-800">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-semibold">
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const isCheckedIn = serviceAttendance.includes(m.id);
                      return (
                        <tr key={m.id} className={`transition-colors ${isCheckedIn ? 'bg-emerald-50/60' : 'hover:bg-gray-50'}`}>
                          <td className="py-3 px-4 font-bold text-gray-900">{m.full_name}</td>
                          <td className="py-3 px-4 text-gray-600">{m.phone || 'N/A'}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-900">{m.raw_category}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-900">{m.team}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => toggleAttendance(m.id)}
                              disabled={actionLoading || !selectedServiceId}
                              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm ${
                                isCheckedIn ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {isCheckedIn ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {isCheckedIn ? 'Checked In' : 'Check In'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      )}

      {/* 2. ZONES MATRIX TAB */}
      {activeTab === 'zones' && <MonthlyMatrixDashboard />}

      {/* 3. TEAMS MATRIX TAB */}
      {activeTab === 'teams' && <TeamsMatrixDashboard />}

      {/* 4. MEMBER DIRECTORY TAB */}
      {activeTab === 'members' && (
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide">Complete Member Directory</h2>
              <p className="text-xs text-gray-500 font-semibold">Managing {members.length} total database records.</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input 
                type="text"
                placeholder="Search member name, zone, team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>

          {loadingMembers ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
              Loading members database...
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[65vh]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-emerald-950 text-white text-xs uppercase font-black tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Zone / Campus</th>
                    <th className="py-3 px-4">Ministry Team</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-800">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-semibold">
                        No members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900">{m.full_name}</td>
                        <td className="py-3 px-4 text-gray-600">{m.phone || 'N/A'}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-900">{m.raw_category}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-900">{m.team}</td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingMember(m)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-black rounded-lg hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id, m.full_name)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 font-black rounded-lg hover:bg-red-100 transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EditMemberModal
        isOpen={editingMember !== null}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSuccess={() => {
          fetchMembers();
          showToast("Member profile updated successfully!");
        }}
      />

      <NewcomerModal
        isOpen={isNewcomerOpen}
        onClose={() => setIsNewcomerOpen(false)}
        onSuccess={(name) => {
          fetchMembers();
          showToast(`Newcomer "${name}" added and checked in!`);
        }}
        selectedServiceId={selectedServiceId}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={(name) => {
          fetchMembers();
          showToast(`Member "${name}" added successfully!`);
        }}
      />
        </div>
      </main>
    </div>
  );
}