import { supabase } from '../utils/supabase';
import { Member } from '../types';

// 1. Search Function (Used by the search bar)
export async function searchMembers(query: string): Promise<Member[]> {
  if (!query || query.length < 2) return []; 
  
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, phone_number, member_status, raw_team, raw_category')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
    .limit(5);

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }
  
  return data || [];
}

// 2. Registration Function (Used by the Newcomer Modal)
export async function registerNewcomer(firstName: string, lastName: string, phone: string, gender: string) {
  const { data, error } = await supabase
    .from('members')
    .insert([{
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      gender: gender,
      member_status: 'Newcomer',
      progression_stage: 'First Timer'
    }])
    .select()
    .single();

  if (error) {
    console.error('Registration error:', error);
    return null;
  }
  
  return data;
}
export async function getNewcomers() {
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, phone_number, created_at, gender')
    .eq('member_status', 'Newcomer')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching newcomers:', error);
    return [];
  }

  return data || [];
}