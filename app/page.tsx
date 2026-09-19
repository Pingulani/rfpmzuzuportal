'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import MonthlyMatrixDashboard from '../components/check-in/MonthlyMatrixDashboard';
import TeamsMatrixDashboard from '../components/check-in/TeamsMatrixDashboard';
import EditMemberModal from '../components/check-in/EditMemberModal';
import NewcomerModal from '../components/check-in/NewcomerModal';
import AddMemberModal from '../components/check-in/AddMemberModal';
import { Search, Edit3, Trash2, UserPlus, UserCheck, Calendar, CheckCircle2, XCircle, Check } from 'lucide-react';

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

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center relative">
      
      {/* Non-Blocking Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-xs font-black uppercase tracking-wider border border-emerald-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation & Action Bar */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 mb-6 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-900 text-white p-2.5 rounded-xl font-black text-sm tracking-wider">
            RFPMZUZU
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 uppercase">Mzuzu Branch Portal</h1>
            <p className="text-xs text-gray-500 font-semibold">Executive Attendance & Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewcomerOpen(true)}
            className="px-3 py-2 bg-amber-600 text-white text-xs font-black uppercase rounded-lg shadow-sm hover:bg-amber-700 transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Newcomer Check-in
          </button>
          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="px-3 py-2 bg-blue-900 text-white text-xs font-black uppercase rounded-lg shadow-sm hover:bg-blue-800 transition-all flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" /> Add Member
          </button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`px-3 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'checkin' ? 'bg-emerald-900 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Service Check-in
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-3 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'zones' ? 'bg-emerald-900 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Zones Matrix
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-3 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'teams' ? 'bg-emerald-900 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Teams Matrix
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'members' ? 'bg-emerald-900 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Directory
          </button>
        </div>
      </div>

      {/* 1. SERVICE CHECK-IN TAB */}
      {activeTab === 'checkin' && (
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
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

          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Member Check-in List ({members.length} Total Loaded)</h3>
            <div className="relative w-full md:w-72">
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
                          <td className="py-3 px-4 font-semibold text-indigo-900">{m.team}</td>
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
      )}

      {/* 2. ZONES MATRIX TAB */}
      {activeTab === 'zones' && <MonthlyMatrixDashboard />}

      {/* 3. TEAMS MATRIX TAB */}
      {activeTab === 'teams' && <TeamsMatrixDashboard />}

      {/* 4. MEMBER DIRECTORY TAB */}
      {activeTab === 'members' && (
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
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
                        <td className="py-3 px-4 font-semibold text-indigo-900">{m.team}</td>
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

    </main>
  );
}