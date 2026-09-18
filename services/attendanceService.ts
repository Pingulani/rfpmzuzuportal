import { supabase } from '../utils/supabase';

export async function checkInMember(memberId: string) {
  // 1. Get today's date formatted for PostgreSQL (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  // 2. Look for an existing service for today
  let { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('service_date', today)
    .maybeSingle(); // Safely returns null if no service exists yet today

  // 3. If it's the first person of the day, create today's service record automatically
  if (!service) {
    const { data: newService, error: serviceError } = await supabase
      .from('services')
      .insert([{ service_date: today, service_type: 'Sunday', week_number: 1 }])
      .select('id')
      .single();

    if (serviceError) {
      console.error('Error creating service:', serviceError);
      return { success: false };
    }
    service = newService;
  }

  // 4. Log the member into today's service
  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert([{ service_id: service.id, member_id: memberId }]);

  // PostgreSQL Error 23505 means they are already checked in (our UNIQUE constraint working!)
  if (attendanceError?.code === '23505') {
    return { success: true, message: 'Already checked in' };
  }
  
  if (attendanceError) {
    console.error('Error checking in:', attendanceError);
    return { success: false };
  }

  return { success: true, message: 'Checked in' };
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