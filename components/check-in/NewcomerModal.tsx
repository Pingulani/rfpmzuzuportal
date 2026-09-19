'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { UserPlus, X, Save, Loader2, AlertCircle, Calendar } from 'lucide-react';

const ZONES = [
  'New Members', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 
  'MCA', 'Mzuzu Technical', 'MIT', 'MZUNI', 'UNILIA', 'MIJ', 
  'Other Branches', 'Special Services', 'Unknown Zone'
];

interface NewcomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (memberName: string) => void;
  selectedServiceId?: string;
  selectedServiceDate?: string;
  selectedServiceType?: string;
}

export default function NewcomerModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  selectedServiceId, 
  selectedServiceDate, 
  selectedServiceType 
}: NewcomerModalProps) {
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [residence, setResidence] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  
  const [referralType, setReferralType] = useState<'friend' | 'other'>('friend');
  const [friendName, setFriendName] = useState('');
  const [otherReferral, setOtherReferral] = useState('');

  const [facebookHandle, setFacebookHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [zone, setZone] = useState('New Members');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const fullNameStr = fullName.trim();

    try {
      const referralSource = referralType === 'friend' 
        ? `Through a Friend: ${friendName}` 
        : `Other: ${otherReferral}`;

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Insert newcomer into members table
      const { data: newMemberData, error: insertError } = await supabase
        .from('members')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth || null,
          gender: gender,
          residence: residence.trim(),
          phone_number: phoneNumber.trim(),
          email: emailAddress.trim(),
          email_address: emailAddress.trim(),
          occupation: occupation.trim(),
          referral_source: referralSource,
          facebook_handle: facebookHandle.trim(),
          twitter_handle: twitterHandle.trim(),
          whatsapp_number: whatsappNumber.trim(),
          raw_category: zone,
          member_status: 'Newcomer',
          date_joined: todayStr
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Explicitly auto-check-in newcomer to the selected service date & type
      if (selectedServiceId && newMemberData) {
        const { error: attError } = await supabase
          .from('attendance')
          .insert([{ service_id: selectedServiceId, member_id: newMemberData.id }]);

        if (attError) {
          console.error("Error auto-checking in newcomer:", attError.message);
        }
      }

      // Reset form
      setFullName('');
      setDateOfBirth('');
      setGender('Male');
      setResidence('');
      setPhoneNumber('');
      setEmailAddress('');
      setOccupation('');
      setFriendName('');
      setOtherReferral('');
      setFacebookHandle('');
      setTwitterHandle('');
      setWhatsappNumber('');
      setZone('New Members');

      onSuccess(fullNameStr);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save newcomer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="bg-amber-700 px-6 py-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider">Newcomer Registration Card</h2>
            <p className="text-amber-100 text-[11px] font-semibold">Raised For A Purpose (RFP) Ministries</p>
          </div>
          <button onClick={onClose} className="bg-amber-800/60 hover:bg-amber-800 p-1.5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Service Target Badge */}
        {selectedServiceDate && (
          <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-900">
            <Calendar className="w-4 h-4 text-amber-700" />
            <span>Auto Check-in Target: <span className="font-black text-amber-950">{selectedServiceDate} ({selectedServiceType})</span></span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. John Banda"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Residence</label>
              <input
                type="text"
                placeholder="e.g. Area 3, Mzuzu"
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 0994135411"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="e.g. user@email.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Occupation / Educational Institution</label>
              <input
                type="text"
                placeholder="e.g. MZUNI / Accountant"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">How Did You Hear of RFP?</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input 
                  type="radio" 
                  name="referral" 
                  checked={referralType === 'friend'} 
                  onChange={() => setReferralType('friend')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                Through a Friend? Name:
              </label>
              {referralType === 'friend' && (
                <input
                  type="text"
                  placeholder="Enter friend's name"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none ml-6"
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input 
                  type="radio" 
                  name="referral" 
                  checked={referralType === 'other'} 
                  onChange={() => setReferralType('other')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                Other? Please Specify:
              </label>
              {referralType === 'other' && (
                <input
                  type="text"
                  placeholder="Please specify how you heard about us"
                  value={otherReferral}
                  onChange={(e) => setOtherReferral(e.target.value)}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none ml-6"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Facebook</label>
              <input
                type="text"
                placeholder="Facebook handle"
                value={facebookHandle}
                onChange={(e) => setFacebookHandle(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Twitter / X</label>
              <input
                type="text"
                placeholder="Twitter handle"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">WhatsApp</label>
              <input
                type="text"
                placeholder="WhatsApp number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Assigned Zone</label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
            >
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-xs font-bold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 text-xs font-black text-white bg-amber-700 rounded-lg hover:bg-amber-800 flex items-center gap-2 shadow-md">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Auto Check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}