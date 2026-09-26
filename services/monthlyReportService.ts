import { supabase } from '../utils/supabase';

export async function getMonthlyZoneReport(year: number, month: number, serviceType: string) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // 1. Fetch services for the month
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('service_type', serviceType)
      .gte('service_date', startDate)
      .lte('service_date', endDate);

    if (servicesError) {
      console.error('Supabase Services Error:', servicesError.message);
      throw servicesError;
    }

    const serviceIds = (servicesData || []).map((s: any) => s.id);

    // 2. Fetch attendance records tied to those services
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
            raw_team,
            team,
            raw_category,
            category
          )
        `)
        .in('service_id', serviceIds);

      if (attError) {
        console.error('Supabase Attendance Error:', attError.message);
        throw attError;
      }
      attendanceData = attData || [];
    }

    // 3. Fetch all members for baseline counts
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*');

    if (membersError) {
      console.error('Supabase Members Error:', membersError.message);
      throw membersError;
    }

    return {
      services: servicesData || [],
      attendanceRecords: attendanceData,
      members: membersData || []
    };

  } catch (err) {
    console.error('Failed to load monthly report data:', err);
    return { services: [], attendanceRecords: [], members: [] };
  }
}