'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { User, Phone, MapPin, Briefcase, X, Save, Loader2, AlertCircle } from 'lucide-react';

const ZONES = [
  'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 
  'MCA', 'Mzuzu Technical', 'MIT', 'MZUNI', 'UNILIA', 'MIJ', 
  'Other Branches', 'Special Services', 'New Members', 'Unknown Zone'
];

const TEAMS = [
  'N/A',
  'Access Control', 'Audio Streaming', 'Catcher', 'Information Desk', 
  'Lyrics', 'Musicians', 'Photography', 'Projection', 'Royal Guard', 
  'Runner', 'Singer', 'Sound Crew', 'Stage Manager', 
  'Traffic Patrol And Security', 'Usher', 'Video Streaming', 'Videography',
  'Archive', "Children's Church Teacher", 'Church Store', 'Decorator', 
  'Graphic Design', "Pastor's Chauffeur", "Pastor's Executive Secretary", 
  'Prayer', 'Public Speaker', 'Sanctuary Keeper', 'Script Writor', 
  'Social Media', 'Uniform', 'Welfare',
  "Children's Music And Arts Ministry (MAM)", 'Finance', 'GLM Committee', 
  'Monitoring And Evaluation', 'Research And Conceptualisation', 
  'Music And Arts Ministry (MAM)', 'Training'
];

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: any;
}

export default function EditMemberModal({ isOpen, onClose, onSuccess, member }: EditMemberModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [team, setTeam] = useState('N/A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member && isOpen) {
      const combinedName = member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim();
      setFullName(combinedName);
      setPhone(member.phone_number || member.phone || '');
      setZone(member.raw_category || member.zone || 'Unknown Zone');
      setTeam(member.raw_team || member.team || 'N/A');
      setError(null);
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Split full name back into first and last name columns
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error: updateError } = await supabase
        .from('members')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phone.trim(),
          raw_category: zone,
          raw_team: team === 'N/A' ? null : team
        })
        .eq('id', member.id);

      if (updateError) throw updateError;
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update member profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all scale-100">
        
        {/* Header */}
        <div className="bg-emerald-900 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Edit Member Profile</h2>
            <p className="text-emerald-200 text-xs font-semibold mt-0.5">Update database records</p>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white transition-colors bg-emerald-800/50 hover:bg-emerald-800 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpdate} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" /> Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-800 focus:outline-none transition-all font-medium"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-700" /> Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-800 focus:outline-none transition-all font-medium"
              />
            </div>

            {/* Zone Dropdown */}
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Assigned Zone
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-800 focus:outline-none transition-all font-medium"
              >
                {ZONES.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Team Dropdown */}
            <div>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-700" /> Ministry Team
              </label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-800 focus:outline-none transition-all font-medium"
              >
                {TEAMS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 shadow-md transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}