import { supabase } from '../utils/supabase';

export async function getMonthlyZoneReport(year: number, month: number, serviceType: string) {
  try {
    // 1. Fetch all services by type (Bypasses SQL date-parsing issues)
    const { data: allServices, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('service_type', serviceType);

    if (servicesError) throw servicesError;

    // 2. Filter for the specific month in JavaScript (e.g., "2026-09")
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`; 
    const servicesData = (allServices || []).filter(s => (s.service_date || '').startsWith(monthPrefix));
    
    const serviceIds = servicesData.map(s => s.id);

    // 3. Fetch attendance tied to those specific services
    let attendanceData: any[] = [];
    if (serviceIds.length > 0) {
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select(`
          id,
          service_id,
          member_id,
          members (
            id,
            full_name,
            raw_zone,
            zone,
            raw_category,
            category
          )
        `)
        .in('service_id', serviceIds);

      if (attError) throw attError;
      attendanceData = attData || [];
    }

    // 4. Fetch all members for baseline counts
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*');

    if (membersError) throw membersError;

    return {
      services: servicesData,
      attendanceRecords: attendanceData,
      members: membersData || []
    };

  } catch (err: any) {
    console.error('Matrix Data Fetch Error:', err.message);
    throw err;
  }
}