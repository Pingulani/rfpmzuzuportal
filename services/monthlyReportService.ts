import { supabase } from '../utils/supabase';

export async function getMonthlyZoneReport(year: number, month: number, serviceType?: string) {
  const lastDay = new Date(year, month, 0).getDate();
  const formattedStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const formattedEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  // 1. Fetch services for the selected month and type
  let query = supabase
    .from('services')
    .select('id, service_date, service_type')
    .gte('service_date', formattedStart)
    .lte('service_date', formattedEnd);

  if (serviceType) {
    query = query.eq('service_type', serviceType);
  }

  const { data: services, error: servError } = await query;

  if (servError || !services) {
    console.error('Error fetching services for month:', servError);
    return { services: [], attendanceRecords: [], standardZones: [], allMembers: [] };
  }

  // 2. Fetch ALL members from the database to compute baseline team and zone counts (MEM.)
  const { data: allMembers, error: memError } = await supabase
    .from('members')
    .select('id, first_name, last_name, phone_number, raw_team, raw_category, member_status');

  if (memError) {
    console.error('Error fetching all members:', memError);
  }

  const membersList = allMembers || [];
  const serviceIds = services.map(s => s.id);

  if (serviceIds.length === 0) {
    return { services: [], attendanceRecords: [], standardZones: [], allMembers: membersList };
  }

  // 3. Fetch attendance records safely using flat columns (service_id, member_id)
  const { data: rawAttendance, error: attError } = await supabase
    .from('attendance')
    .select('service_id, member_id')
    .in('service_id', serviceIds);

  if (attError || !rawAttendance) {
    console.error('Error fetching attendance report data:', attError);
    return { services: [], attendanceRecords: [], standardZones: [], allMembers: membersList };
  }

  // Map member details into attendance records in-memory to prevent join errors
  const memberMap = new Map(membersList.map((m: any) => [m.id, m]));
  const attendanceRecords = rawAttendance.map((att: any) => ({
    service_id: att.service_id,
    members: memberMap.get(att.member_id) || null
  }));

  const standardZones = [
    'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 
    'MCA', 'Mzuzu Technical', 'MIT', 'MZUNI', 
    'UNILIA', 'MIJ', 'New Members', 'Prev. Week New Members', 
    'Unknown Zone', 'Other Branches', 'Streaming', 'Special Services'
  ];

  return { services, attendanceRecords, standardZones, allMembers: membersList };
}