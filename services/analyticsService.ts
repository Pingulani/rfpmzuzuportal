import { supabase } from '../utils/supabase';

export async function getDirectorateAnalytics() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Get total member count
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });

  // 2. Get total newcomers registered
  const { count: totalNewcomers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('member_status', 'Newcomer');

  // 3. Get today's attendance count
  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('service_date', today)
    .maybeSingle();

  let todayTurnout = 0;
  if (service) {
    const { count } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', service.id);
    todayTurnout = count || 0;
  }

  return {
    totalMembers: totalMembers || 0,
    totalNewcomers: totalNewcomers || 0,
    todayTurnout: todayTurnout,
  };
}