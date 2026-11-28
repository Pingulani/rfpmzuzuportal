'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { supabase } from '../utils/supabase';
import MonthlyMatrixDashboard from '../components/check-in/MonthlyMatrixDashboard';
import TeamsMatrixDashboard from '../components/check-in/TeamsMatrixDashboard';
import EditMemberModal from '../components/check-in/EditMemberModal';
import NewcomerModal from '../components/check-in/NewcomerModal';
import AddMemberModal from '../components/check-in/AddMemberModal';
import MemberAttendanceRegister from '../components/check-in/MemberAttendanceRegister';
import DashboardActivityCharts from '../components/check-in/DashboardActivityCharts';
import TeamsDirectory from '../components/check-in/TeamsDirectory';
import LoginPage from '../components/auth/LoginPage';
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
  Eye,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const FIRST_REPORT_YEAR = 2024;
const DEMO_AUTH_STORAGE_KEY = 'rfpm-demo-auth';
const AUTH_CHANGE_EVENT = 'rfpm-auth-change';
const YEARS = Array.from(
  { length: Math.max(1, new Date().getFullYear() + 4 - FIRST_REPORT_YEAR + 1) },
  (_, index) => FIRST_REPORT_YEAR + index
);

interface RegisterMember {
  id: string;
  full_name: string;
  team?: string;
  raw_category?: string;
}

const THEME_CHANGE_EVENT = 'rfpm-color-theme-change';

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getThemeSnapshot() {
  return document.documentElement.dataset.theme === 'dark';
}

function getServerThemeSnapshot() {
  return false;
}

function subscribeToAuth(onChange: () => void) {
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getAuthSnapshot() {
  return window.sessionStorage.getItem(DEMO_AUTH_STORAGE_KEY) === 'authenticated';
}

function getServerAuthSnapshot() {
  return false;
}

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

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PortalDashboard() {
  const [activeTab, setActiveTab] = useState<'zones' | 'teams' | 'teamDirectory' | 'checkin' | 'members'>('checkin');
  const [members, setMembers] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDarkMode = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const isAuthenticated = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getServerAuthSnapshot);
  
  const [checkinMonth, setCheckinMonth] = useState(() => new Date().getMonth() + 1);
  const [checkinYear, setCheckinYear] = useState(() => new Date().getFullYear());
  const [checkinServiceType, setCheckinServiceType] = useState<'Sunday Service' | 'Midweek Service'>(
    () => new Date().getDay() === 3 ? 'Midweek Service' : 'Sunday Service'
  );
  
  const [activeServiceDates, setActiveServiceDates] = useState<{ weekNum: number; dateStr: string; serviceId: string | null }[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceAttendance, setServiceAttendance] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRegisterMember, setSelectedRegisterMember] = useState<RegisterMember | null>(null);
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  
  // Non-blocking toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modal states
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isNewcomerOpen, setIsNewcomerOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  useEffect(() => {
    const darkModeEnabled = window.localStorage.getItem('rfpm-color-theme') === 'dark';
    document.documentElement.dataset.theme = darkModeEnabled ? 'dark' : 'light';
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleDarkMode = () => {
    const nextDarkMode = !isDarkMode;
    document.documentElement.dataset.theme = nextDarkMode ? 'dark' : 'light';
    window.localStorage.setItem('rfpm-color-theme', nextDarkMode ? 'dark' : 'light');
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  const handleDemoLogin = () => {
    window.sessionStorage.setItem(DEMO_AUTH_STORAGE_KEY, 'authenticated');
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  };

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
      const today = getLocalDateString(new Date());
      const defaultDate = updatedDates.find(item => item.dateStr === today)
        || [...updatedDates].reverse().find(item => item.dateStr <= today)
        || updatedDates[0];
      setSelectedServiceId(defaultDate.serviceId || '');
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
    if (!isAuthenticated) return;
    fetchMembers();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    syncAndLoadServices();
  }, [isAuthenticated, checkinMonth, checkinYear, checkinServiceType]);

  useEffect(() => {
    if (isAuthenticated && selectedServiceId) {
      fetchServiceAttendance(selectedServiceId);
    }
  }, [isAuthenticated, selectedServiceId]);

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
        setRankingRefreshKey(key => key + 1);
      }
    } else {
      const { error } = await supabase
        .from('attendance')
        .insert([{ service_id: selectedServiceId, member_id: memberId }]);

      if (!error) {
        setServiceAttendance(prev => [...prev, memberId]);
        setRankingRefreshKey(key => key + 1);
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
    const memberTeams = new Map<string, string>();
    String(member.team || '')
      .split(',')
      .map((team: string) => team.trim())
      .filter((team: string) => team && !['n/a', 'none', 'unknown', 'unknown team or not in a team', 'not in a team'].includes(team.toLowerCase()))
      .forEach((team: string) => {
        const key = team.toLowerCase();
        if (!memberTeams.has(key)) memberTeams.set(key, team);
      });
    memberTeams.forEach(team => {
      const key = team.toLowerCase();
      const current = activeTeamCounts.get(key);
      activeTeamCounts.set(key, { name: current?.name || team, memberCount: (current?.memberCount || 0) + 1 });
    });
  });
  const activeTeams = Array.from(activeTeamCounts.values())
    .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
  const chartTeams = activeTeams.slice(0, 6);
  const teamChartMax = Math.max(4, Math.ceil((chartTeams[0]?.memberCount || 0) / 4) * 4);
  const teamChartPoints = chartTeams.map((team, index) => ({
    ...team,
    x: chartTeams.length === 1 ? 445 : 115 + index * (655 / (chartTeams.length - 1)),
    y: 205 - (team.memberCount / teamChartMax) * 170,
  }));
  const teamChartLine = teamChartPoints.map(point => `${point.x},${point.y}`).join(' ');

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleDemoLogin} />;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[70] bg-[#3D0908] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-[#3D0908]">
          <Check className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] p-2.5 text-white transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col overflow-y-auto rounded-[1.5rem] border border-rfp-gold/30 bg-gradient-to-b from-[#3D0908] via-[#300807] to-[#170707] shadow-[0_20px_60px_rgba(35,5,4,0.28)]">
          <div className="flex min-h-[78px] items-center border-b border-rfp-gold/25 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/rfp-gold-logo.png"
                alt="Raised For A Purpose Ministries logo"
                width={46}
                height={46}
                priority
                className="h-11 w-11 shrink-0 rounded-full object-contain ring-1 ring-rfp-gold/60"
              />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black tracking-[0.06em] leading-tight text-white">RAISED FOR A PURPOSE</p>
                <p className="mt-1 text-[9px] font-bold tracking-[0.16em] text-rfp-gold">MZUZU BRANCH</p>
              </div>
            </div>
            <button aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="ml-auto p-1 text-white/75 lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-3 mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-[#3D0908] ring-2 ring-rfp-gold/70">AD</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Administrator</p>
              <p className="mt-0.5 truncate text-[10px] text-white/60">Mzuzu Branch</p>
            </div>
            <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-rfp-gold shadow-[0_0_10px_rgba(208,173,90,0.7)]" aria-label="Signed in" />
          </div>

          <nav className="space-y-1 px-3 pt-5">
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">Workspace</p>
            {[
              { id: 'checkin' as const, label: 'Dashboard', icon: LayoutDashboard },
              { id: 'members' as const, label: 'Member Management', icon: UsersRound },
              { id: 'teamDirectory' as const, label: 'Teams', icon: UsersRound },
              { id: 'zones' as const, label: 'Zones Matrix', icon: Network },
              { id: 'teams' as const, label: 'Teams Matrix', icon: FolderKanban },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
                className={`group flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-3 text-left text-xs font-semibold transition-all ${
                  activeTab === id
                    ? 'border-rfp-gold bg-white/10 text-white shadow-inner shadow-black/10'
                    : 'border-transparent text-white/70 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <Icon className={`h-[17px] w-[17px] ${activeTab === id ? 'text-rfp-gold' : 'text-white/65 group-hover:text-rfp-gold'}`} />
                <span>{label}</span>
                {activeTab === id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rfp-gold" />}
              </button>
            ))}
          </nav>

          <div className="mt-5 space-y-1.5 px-3">
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">Quick actions</p>
            <button
              type="button"
              onClick={() => {
                setIsAddMemberOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-rfp-gold/45 bg-rfp-gold/10 px-3 py-3 text-left text-xs font-bold text-white transition-colors hover:bg-rfp-gold/20"
            >
              <UserCheck className="h-[17px] w-[17px] text-rfp-gold" />
              <span>Add Member</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNewcomerOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <UserPlus className="h-[17px] w-[17px]" />
              <span>Newcomer Check-in</span>
            </button>
          </div>

          <div className="mt-auto border-t border-rfp-gold/20 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[280px]">
        <header className="h-[86px] bg-white border-b border-b-rfp-gold/40 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg border border-slate-200">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="hidden sm:block text-[11px] font-bold uppercase tracking-[0.16em] text-[#3D0908]/70">Mzuzu Branch Portal</p>
              <h1 className="text-base md:text-xl font-black text-[#3D0908] mt-0.5">
                {activeTab === 'checkin'
                  ? 'Dashboard'
                  : activeTab === 'members'
                    ? 'Member Management'
                    : activeTab === 'teamDirectory'
                      ? 'Teams'
                      : `${activeTab === 'zones' ? 'Zones' : 'Teams'} Matrix`}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDarkMode}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#3D0908]/20 bg-white px-2.5 text-xs font-bold text-[#3D0908] transition-colors hover:bg-[#3D0908]/5 sm:px-3"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button aria-label="Notifications" className="relative hidden sm:flex w-10 h-10 rounded-full border border-[#3D0908]/20 items-center justify-center text-[#3D0908] hover:bg-[#3D0908]/5">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#3D0908] rounded-full border border-white" />
            </button>
            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-[#3D0908]/10 flex items-center justify-center text-[#3D0908] font-black text-xs">AD</div>
              <ChevronDown className="w-4 h-4 text-[#3D0908]" />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8">

      {/* 1. SERVICE CHECK-IN TAB */}
      {activeTab === 'checkin' && (
        <div className="flex w-full max-w-6xl flex-col gap-5">
          <div className="order-2 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <div className="bg-white rounded-xl border border-[#3D0908]/15 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Active Members</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{loadingMembers ? '—' : activeMembers.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-[#3D0908]/5 text-[#3D0908] flex items-center justify-center"><UsersRound className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Active Teams</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{loadingMembers ? '—' : activeTeams.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-black text-white flex items-center justify-center"><FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Checked In</p>
                <p className="text-2xl font-black text-[#3D0908] mt-1">{serviceAttendance.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-[#3D0908]/5 text-[#3D0908] flex items-center justify-center"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">All Members</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{loadingMembers ? '—' : members.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-black text-white flex items-center justify-center"><UsersRound className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
          </div>

          <section aria-labelledby="team-chart-title" className="order-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3D0908]">People &amp; teams</p>
                <h2 id="team-chart-title" className="text-base md:text-lg font-black text-slate-800 mt-1">Active members by team</h2>
              </div>
              <p className="text-xs text-slate-500">{loadingMembers ? 'Loading teams…' : `${activeTeams.length} active ${activeTeams.length === 1 ? 'team' : 'teams'}`}</p>
            </div>
            {loadingMembers ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading member data…</p>
            ) : chartTeams.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No active team assignments to chart yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <svg
                  viewBox="0 0 820 320"
                  role="img"
                  aria-label={`Line chart of active members by team: ${chartTeams.map(team => `${team.name}, ${team.memberCount}`).join('; ')}`}
                  className="h-[300px] w-full min-w-[680px] overflow-visible"
                >
                  <text x="20" y="120" transform="rotate(-90 20 120)" textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold">
                    Active members
                  </text>
                  {[0, 1, 2, 3, 4].map(tick => {
                    const y = 205 - tick * 42.5;
                    const value = Math.round((teamChartMax * tick) / 4);
                    return (
                      <g key={tick}>
                        <line x1="95" y1={y} x2="795" y2={y} className="stroke-slate-200" strokeDasharray={tick === 0 ? undefined : '4 5'} />
                        <text x="84" y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px]">{value}</text>
                      </g>
                    );
                  })}
                  {teamChartPoints.length > 1 && (
                    <polyline
                      points={teamChartLine}
                      fill="none"
                      stroke="#3D0908"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {teamChartPoints.map((point, index) => (
                    <g key={point.name}>
                      <title>{`${point.name}: ${point.memberCount} active members`}</title>
                      <circle cx={point.x} cy={point.y} r="5.5" fill={index === 0 ? '#B9913B' : '#3D0908'} stroke="white" strokeWidth="2" />
                      <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-slate-700 text-[11px] font-black">
                        {point.memberCount}
                      </text>
                      <text
                        x={point.x - 4}
                        y="244"
                        textAnchor="end"
                        transform={`rotate(-25 ${point.x - 4} 244)`}
                        className="fill-slate-600 text-[10px] font-semibold"
                      >
                        {point.name}
                      </text>
                    </g>
                  ))}
                </svg>
                <ul className="sr-only">
                  {chartTeams.map(team => <li key={team.name}>{team.name}: {team.memberCount} active members</li>)}
                </ul>
                {activeTeams.length > chartTeams.length && (
                  <p className="pt-1 text-[11px] text-slate-400">Showing the 6 teams with the most active members.</p>
                )}
              </div>
            )}
          </section>

          <div className="order-4">
            <DashboardActivityCharts key={rankingRefreshKey} />
          </div>

          <div className="order-1 w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-xl md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#3D0908]" /> Live Service Check-in
              </h2>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">Select service type, month, and strict calendar Sunday/Wednesday date.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={checkinServiceType}
                onChange={(e) => setCheckinServiceType(e.target.value as any)}
                className="p-2.5 text-xs font-bold bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3D0908] focus:outline-none"
              >
                <option value="Sunday Service">Sunday Service (Sundays)</option>
                <option value="Midweek Service">Midweek Service (Wednesdays)</option>
              </select>

              <select
                value={checkinMonth}
                onChange={(e) => setCheckinMonth(Number(e.target.value))}
                className="p-2.5 text-xs font-bold bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3D0908] focus:outline-none"
              >
                {MONTHS.map((m, idx) => (<option key={m} value={idx + 1}>{m}</option>))}
              </select>

              <select
                value={checkinYear}
                onChange={(e) => setCheckinYear(Number(e.target.value))}
                className="p-2.5 text-xs font-bold bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3D0908] focus:outline-none"
              >
                {YEARS.map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#3D0908]/5 p-4 rounded-xl border border-[#3D0908]/20">
            <div className="w-full md:w-auto flex-1">
              <label className="text-xs font-black text-[#3D0908] uppercase tracking-wider block mb-1">
                Select Calendar Date ({checkinServiceType})
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full p-2.5 text-xs font-bold bg-white border border-[#3D0908]/30 text-gray-900 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3D0908] focus:outline-none"
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

            <div className="text-xs font-bold text-[#3D0908] bg-white px-4 py-3 rounded-lg border border-[#3D0908]/20 shadow-sm text-center">
              Checked In: <span className="font-black text-sm text-[#3D0908]">{serviceAttendance.length}</span> members
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
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3D0908]"
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
                <thead className="bg-[#3D0908] text-white text-xs uppercase font-black tracking-wider sticky top-0 z-10">
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
                        <tr key={m.id} className={`transition-colors ${isCheckedIn ? 'bg-[#3D0908]/5' : 'hover:bg-gray-50'}`}>
                          <td className="py-3 px-4 font-bold text-gray-900">{m.full_name}</td>
                          <td className="py-3 px-4 text-gray-600">{m.phone || 'N/A'}</td>
                          <td className="py-3 px-4 font-semibold text-[#3D0908]">{m.raw_category}</td>
                          <td className="py-3 px-4 font-semibold text-[#3D0908]">{m.team}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => toggleAttendance(m.id)}
                              disabled={actionLoading || !selectedServiceId}
                              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm ${
                                isCheckedIn ? 'bg-[#3D0908] text-white hover:bg-black' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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

      {/* 3. TEAMS DIRECTORY TAB */}
      {activeTab === 'teamDirectory' && (
        <TeamsDirectory
          teams={activeTeams}
          members={activeMembers}
          loadingMembers={loadingMembers}
          refreshKey={rankingRefreshKey}
        />
      )}

      {/* 4. TEAMS MATRIX TAB */}
      {activeTab === 'teams' && <TeamsMatrixDashboard />}

      {/* 5. MEMBER DIRECTORY TAB */}
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
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3D0908]"
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
                <thead className="bg-[#3D0908] text-white text-xs uppercase font-black tracking-wider sticky top-0 z-10">
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
                        <td className="py-3 px-4 font-semibold text-[#3D0908]">{m.raw_category}</td>
                        <td className="py-3 px-4 font-semibold text-[#3D0908]">{m.team}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedRegisterMember(m)}
                            className="px-3 py-1.5 bg-[#3D0908]/5 text-[#3D0908] font-black rounded-lg hover:bg-[#3D0908]/10 transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => setEditingMember(m)}
                            className="px-3 py-1.5 bg-slate-100 text-black font-black rounded-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id, m.full_name)}
                            className="px-3 py-1.5 bg-black text-white font-black rounded-lg hover:bg-[#3D0908] transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                          </div>
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
          setRankingRefreshKey(key => key + 1);
          showToast("Member profile updated successfully!");
        }}
      />

      <NewcomerModal
        isOpen={isNewcomerOpen}
        onClose={() => setIsNewcomerOpen(false)}
        onSuccess={(name) => {
          fetchMembers();
          setRankingRefreshKey(key => key + 1);
          showToast(`Newcomer "${name}" added and checked in!`);
        }}
        selectedServiceId={selectedServiceId}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={(name) => {
          fetchMembers();
          setRankingRefreshKey(key => key + 1);
          showToast(`Member "${name}" added successfully!`);
        }}
      />
      <MemberAttendanceRegister
        member={selectedRegisterMember}
        onClose={() => setSelectedRegisterMember(null)}
      />
        </div>
      </main>
    </div>
  );
}