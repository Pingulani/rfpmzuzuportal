import { supabase } from '../utils/supabase';

export async function checkInMember(memberId: string, serviceId: string) {
  if (!serviceId) return { success: false, error: 'No active service session' };

  const { error } = await supabase
    .from('attendance')
    .insert([{ member_id: memberId, service_id: serviceId }]);

  if (error) {
    if (error.code === '23505') {
      // Already checked into this service
      return { success: true }; 
    }
    console.error('Check-in error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
export async function getLiveHeadcount() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Find today's service ID
  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('service_date', today)
    .maybeSingle();

  if (!service) return 0;

  // 2. Count the exact number of check-ins for that service
  const { count, error } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', service.id);

  if (error) {
    console.error('Error fetching headcount:', error);
    return 0;
  }

  return count || 0;
}
export async function getTeamAttendanceBreakdown() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Find today's service ID
  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('service_date', today)
    .maybeSingle();

  if (!service) return [];

  // 2. Fetch all attendance records for today, joining with member details (team)
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      member_id,
      members (
        raw_team
      )
    `)
    .eq('service_id', service.id);

  if (error || !data) {
    console.error('Error fetching team breakdown:', error);
    return [];
  }

  // 3. Count members per team
  const teamCounts: { [key: string]: number } = {};
  data.forEach((record: any) => {
    const team = record.members?.raw_team || 'General / Unassigned';
    teamCounts[team] = (teamCounts[team] || 0) + 1;
  });

  // Convert to an array for easy rendering
  return Object.keys(teamCounts).map((team) => ({
    teamName: team,
    count: teamCounts[team],
  })).sort((a, b) => b.count - a.count);
}
export async function getOrCreateService(serviceDate: string, serviceType: string) {
  // 1. Check if service exists for this date and type
  const { data: existingService } = await supabase
    .from('services')
    .select('id')
    .eq('service_date', serviceDate)
    .eq('service_type', serviceType)
    .maybeSingle();

  if (existingService) {
    return existingService.id;
  }

  // 2. If not, create it
  const { data: newService, error } = await supabase
    .from('services')
    .insert([{ service_date: serviceDate, service_type: serviceType }])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating service session:', error);
    return null;
  }

  return newService.id;
}