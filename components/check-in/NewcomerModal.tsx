'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { X, Save, Loader2, AlertCircle, Calendar } from 'lucide-react';

interface NewcomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data?: any) => void;
  selectedServiceId?: string;
}

export default function NewcomerModal({ isOpen, onClose, onSuccess, selectedServiceId: initialServiceId }: NewcomerModalProps) {
  // 1. Form State matching the paper form exactly
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [residence, setResidence] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  
  // Radio buttons for "How Did You Hear"
  const [heardThrough, setHeardThrough] = useState<'Friend' | 'Other' | ''>('');
  const [heardDetails, setHeardDetails] = useState('');
  
  // Socials
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Tracking
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || '');
  const [availableServices, setAvailableServices] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Fetch services for the dropdown
  useEffect(() => {
    if (!isOpen) return;
    async function fetchServices() {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const { data, error } = await supabase
        .from('services')
        .select('id, service_date, service_type')
        .gte('service_date', startOfMonth)
        .order('service_date', { ascending: true });
      
      if (!error && data) {
        setAvailableServices(data);
        if (!initialServiceId && data.length > 0) {
          setSelectedServiceId(data[0].id);
        }
      }
    }
    fetchServices();
  }, [isOpen, initialServiceId]);

  if (!isOpen) return null;

  // 3. Submit Handler sending to newcomers, members, and attendance tables
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step A: Save full details to 'newcomers' table
      const { error: insertError } = await supabase
        .from('newcomers')
        .insert([{
          full_name: fullName.trim(),
          dob: dob || null,
          gender: gender || null,
          residence: residence.trim(),
          phone_number: phone.trim() || null,
          email_address: email.trim() || null,
          occupation: occupation.trim(),
          heard_through: heardThrough,
          heard_details: heardDetails.trim(),
          facebook: facebook.trim(),
          twitter: twitter.trim(),
          whatsapp: whatsapp.trim(),
          visit_date: visitDate,
          service_id: selectedServiceId || null
        }]);

      if (insertError) throw new Error(`Newcomers Table: ${insertError.message}`);

      // Step B: Sync lightweight profile to 'members' so the Matrix & Check-in buttons work
      const nameParts = fullName.trim().split(' ');
      const first = nameParts[0];
      const last = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert([{
          first_name: first,
          last_name: last,
          phone_number: phone.trim() || null,
          zone: 'New Members',         
          category: 'New Members',     
          raw_category: 'New Members', 
          raw_team: 'N/A',             
          gender: gender || 'Unknown',
          member_status: 'Active',     // Active ensures they show up in the check-in directory
          date_joined: visitDate
        }])
        .select('id')
        .single();

      if (memberError) throw new Error(`Members Directory: ${memberError.message}`);

      // Step C: Auto Check-in to trigger the Matrix real-time update
      if (selectedServiceId && newMember) {
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert([{
            service_id: selectedServiceId,
            member_id: newMember.id
          }]);

        if (attendanceError && attendanceError.code !== '23505') {
          throw new Error(`Attendance Check-in: ${attendanceError.message}`);
        }
      }

      onSuccess(fullName);
      onClose();
    } catch (err: any) {
      console.error('Error saving newcomer:', err.message);
      setError(err.message || 'Failed to save newcomer.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Render the Form UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#e8e8e8] w-full max-w-2xl rounded shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-[6px] border-black p-2 relative">
        
        <button onClick={onClose} className="absolute right-4 top-4 z-20 bg-gray-300 hover:bg-gray-400 p-1 rounded text-black">
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto bg-white border-[4px] border-black p-6 h-full">
          
          <div className="w-full text-center border-b-4 border-black pb-4 mb-6">
            <h1 className="text-4xl font-black font-serif tracking-tight text-black">Welcome To</h1>
            <h2 className="text-xl font-bold font-serif text-black mt-1">Raised For A Purpose (RFP) Ministries</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded text-xs font-bold border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label className="text-base font-bold text-black flex items-end gap-2">
                Full Name: 
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium" />
              </label>

              <label className="text-base font-bold text-black flex items-end gap-2">
                Date of Birth:
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium" />
              </label>

              <label className="text-base font-bold text-black flex items-end gap-2">
                Gender:
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium">
                  <option value=""></option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label className="text-base font-bold text-black flex items-end gap-2">
                Residence:
                <input type="text" value={residence} onChange={(e) => setResidence(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium" />
              </label>

              <label className="text-base font-bold text-black flex items-end gap-2">
                Phone Number:
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium" />
              </label>

              <label className="text-base font-bold text-black flex items-end gap-2">
                Email Address:
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium" />
              </label>

              <label className="text-base font-bold text-black flex items-end gap-2">
                Occupation/Educational Institution:
                <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium" />
              </label>
            </div>

            <div className="mt-6">
              <h3 className="text-2xl font-black font-serif text-center text-black mb-4">How Did You Hear of RFP?</h3>
              <div className="flex flex-col gap-4 pl-2">
                <label className="flex items-center gap-3 text-base font-bold text-black cursor-pointer">
                  <input type="radio" name="hearSource" checked={heardThrough === 'Friend'} onChange={() => setHeardThrough('Friend')} className="w-6 h-6 border-2 border-black accent-black" />
                  Through a Friend? Name:
                  <input type="text" disabled={heardThrough !== 'Friend'} value={heardThrough === 'Friend' ? heardDetails : ''} onChange={(e) => setHeardDetails(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium disabled:opacity-50" />
                </label>
                <label className="flex items-center gap-3 text-base font-bold text-black cursor-pointer">
                  <input type="radio" name="hearSource" checked={heardThrough === 'Other'} onChange={() => setHeardThrough('Other')} className="w-6 h-6 border-2 border-black accent-black" />
                  Other? Please Specify:
                  <input type="text" disabled={heardThrough !== 'Other'} value={heardThrough === 'Other' ? heardDetails : ''} onChange={(e) => setHeardDetails(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium disabled:opacity-50" />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-4 pl-2 mt-4">
              <label className="flex items-end gap-2 text-xl font-bold font-serif text-black">
                f:
                <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-sans text-base font-medium" />
              </label>
              <label className="flex items-end gap-2 text-xl font-bold font-serif text-black">
                X (Twitter):
                <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-sans text-base font-medium" />
              </label>
              <label className="flex items-end gap-2 text-xl font-bold font-serif text-black">
                WhatsApp:
                <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-sans text-base font-medium" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t-4 border-black">
              <label className="text-base font-bold text-black flex items-end gap-2">
                Current Date:
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="flex-1 border-b-[3px] border-dotted border-black bg-transparent focus:outline-none px-2 font-medium" />
              </label>
              
              <label className="text-sm font-bold text-black flex items-center gap-2">
                <Calendar className="w-5 h-5 shrink-0" /> Service Matrix Link:
                <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} className="flex-1 border-2 border-black p-1 bg-gray-50 focus:outline-none font-medium text-xs">
                  <option value="">-- Do Not Link --</option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.service_date} ({s.service_type})</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="submit" disabled={loading} className="px-8 py-3 text-sm font-black uppercase text-white bg-black rounded flex items-center gap-2 hover:bg-gray-800 transition-colors">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Submit Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}