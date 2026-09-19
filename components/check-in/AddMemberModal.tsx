'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { UserCheck, X, Save, Loader2, AlertCircle } from 'lucide-react';

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

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (memberName: string) => void;
}

export default function AddMemberModal({ isOpen, onClose, onSuccess }: AddMemberModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('Zone 1');
  const [team, setTeam] = useState('N/A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fullNameStr = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const { error: insertError } = await supabase
        .from('members')
        .insert([{
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phone.trim(),
          raw_category: zone,
          raw_team: team === 'N/A' ? null : team,
          member_status: 'Active'
        }]);

      if (insertError) throw insertError;

      setFirstName('');
      setLastName('');
      setPhone('');
      onSuccess(fullNameStr);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-blue-900 px-6 py-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider">Add Branch Member</h2>
            <p className="text-blue-200 text-xs font-semibold">Register a permanent member</p>
          </div>
          <button onClick={onClose} className="bg-blue-800/50 hover:bg-blue-800 p-1.5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">First Name</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Last Name</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Zone</label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-900 focus:outline-none"
            >
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">Ministry Team</label>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-900 focus:outline-none"
            >
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-xs font-bold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-black text-white bg-blue-900 rounded-lg hover:bg-blue-800 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}