import { supabase } from '../utils/supabase';

export async function getMonthlyZoneReport(year: number, month: number, serviceType: string) {
  try {
    // 1. Fetch all services by type
    const { data: allServices, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('service_type', serviceType);

    if (servicesError) throw servicesError;

    // 2. Filter for the specific month in JavaScript to avoid date formatting errors
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`; 
    const servicesData = (allServices || []).filter(s => (s.service_date || '').startsWith(monthPrefix));
    
    const serviceIds = servicesData.map(s => s.id);

    // 3. Fetch attendance tied to those specific services using YOUR exact column names
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
            first_name,
            last_name,
            raw_team,
            raw_category
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