import { supabase } from '../utils/supabase';

export async function getMonthlyZoneReport(year: number, month: number, serviceType: string) {
  try {
    const { data: allServices, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('service_type', serviceType);

    if (servicesError) throw servicesError;

    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`; 
    const servicesData = (allServices || []).filter(s => (s.service_date || '').startsWith(monthPrefix));
    
    const serviceIds = servicesData.map(s => s.id);

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
        .in('service_id', serviceIds)
        .limit(10000); // Guarantees no check-ins are skipped

      if (attError) throw attError;
      attendanceData = attData || [];
    }

    // Explicitly fetch the registry for the MEM. column
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(10000); // Guarantees no members are skipped

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