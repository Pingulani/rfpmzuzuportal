'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, LoaderCircle, X, XCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface MemberProfile {
  id: string;
  full_name: string;
  team?: string;
  raw_category?: string;
}

interface ServiceRecord {
  id: string;
  service_date: string;
  service_type: string;
}

interface MemberAttendanceRegisterProps {
  member: MemberProfile | null;
  onClose: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MemberAttendanceRegister({ member, onClose }: MemberAttendanceRegisterProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [attendedServiceIds, setAttendedServiceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;

    let cancelled = false;
    const loadRegister = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, service_date, service_type')
        .gte('service_date', `${year}-01-01`)
        .lte('service_date', `${year}-12-31`)
        .order('service_date', { ascending: true });

      if (serviceError) {
        if (!cancelled) {
          setErrorMessage(`Could not load the service register: ${serviceError.message}`);
          setLoading(false);
        }
        return;
      }

      const yearServices = (serviceData || []) as ServiceRecord[];
      let attendedIds = new Set<string>();

      if (yearServices.length > 0) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('service_id')
          .eq('member_id', member.id)
          .in('service_id', yearServices.map(service => service.id));

        if (attendanceError) {
          if (!cancelled) {
            setErrorMessage(`Could not load this member's attendance: ${attendanceError.message}`);
            setLoading(false);
          }
          return;
        }
        attendedIds = new Set((attendanceData || []).map(record => record.service_id));
      }

      if (!cancelled) {
        setServices(yearServices);
        setAttendedServiceIds(attendedIds);
        setLoading(false);
      }
    };

    loadRegister();
    return () => {
      cancelled = true;
    };
  }, [member, year]);

  if (!member) return null;

  const attendedCount = services.filter(service => attendedServiceIds.has(service.id)).length;
  const attendanceRate = services.length ? Math.round((attendedCount / services.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="member-register-title">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-[#550E0C] px-5 py-4 text-white sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Annual attendance register</p>
            <h2 id="member-register-title" className="mt-1 truncate text-lg font-black sm:text-xl">{member.full_name}</h2>
            <p className="mt-1 text-xs text-white/80">{member.team || 'No team assigned'} · {member.raw_category || 'No zone assigned'}</p>
          </div>
          <button onClick={onClose} aria-label="Close member register" className="rounded-lg p-2 text-white/80 transition hover:bg-black/20 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-[#550E0C]">
              <CalendarDays className="h-4 w-4" />
              <span>Yearly service record</span>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Year
              <select value={year} onChange={event => setYear(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-[#550E0C]">
                {Array.from({ length: Math.max(10, new Date().getFullYear() - 2015 + 1) }, (_, index) => new Date().getFullYear() - index).map(registerYear => (
                  <option key={registerYear} value={registerYear}>{registerYear}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#550E0C]" />
              Loading yearly register…
            </div>
          ) : errorMessage ? (
            <p role="alert" className="rounded-lg border border-[#550E0C]/20 bg-[#550E0C]/5 p-4 text-sm font-medium text-[#550E0C]">{errorMessage}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attended</p>
                  <p className="mt-1 text-2xl font-black text-[#550E0C]">{attendedCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Services held</p>
                  <p className="mt-1 text-2xl font-black text-black">{services.length}</p>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-200 p-4 sm:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance</p>
                  <p className="mt-1 text-2xl font-black text-[#550E0C]">{attendanceRate}%</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MONTHS.map((month, monthIndex) => {
                  const monthServices = services.filter(service => new Date(`${service.service_date}T00:00:00`).getMonth() === monthIndex);
                  const monthAttended = monthServices.filter(service => attendedServiceIds.has(service.id)).length;

                  return (
                    <section key={month} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                        <h3 className="text-xs font-black uppercase tracking-wide text-black">{month}</h3>
                        <span className="text-[11px] font-bold text-[#550E0C]">{monthAttended}/{monthServices.length}</span>
                      </div>
                      {monthServices.length ? (
                        <ul className="divide-y divide-slate-100">
                          {monthServices.map(service => {
                            const attended = attendedServiceIds.has(service.id);
                            return (
                              <li key={service.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                                <span className="font-medium text-slate-700">{service.service_date}</span>
                                <span className="mr-auto text-slate-500">{service.service_type}</span>
                                <span className={`inline-flex items-center gap-1 font-bold ${attended ? 'text-[#550E0C]' : 'text-slate-500'}`}>
                                  {attended ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                  {attended ? 'Present' : 'Absent'}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="px-3 py-3 text-xs text-slate-400">No recorded services</p>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
