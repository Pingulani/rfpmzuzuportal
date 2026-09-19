'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import NewcomerModal from './NewcomerModal';
import AddMemberModal from './AddMemberModal';

interface MemberSearchBarProps {
  serviceId: string;
}

export default function MemberSearchBar({ serviceId }: MemberSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states
  const [isNewcomerOpen, setIsNewcomerOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    setErrorMsg(null);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .or(`first_name.ilike.%${text}%,last_name.ilike.%${text}%,phone_number.ilike.%${text}%`)
      .limit(10);

    setSearching(false);

    if (error) {
      console.error('Search error:', error);
      setErrorMsg('Error searching database. Please try again.');
    } else {
      setResults(data || []);
    }
  };

  const handleCheckIn = async (memberId: string) => {
    if (!serviceId) {
      alert('Please select or create an active service first using the Service Selector above.');
      return;
    }

    const { error } = await supabase
      .from('attendance')
      .insert([{ service_id: serviceId, member_id: memberId }]);

    if (error) {
      if (error.code === '23505') {
        alert('This member is already checked into this service.');
      } else {
        console.error('Check-in error:', error);
        alert('Failed to check in member.');
      }
    } else {
      setCheckedInIds((prev) => [...prev, memberId]);
      alert('Successfully checked in!');
    }
  };

  const handleNewcomerSuccess = async (newMember: any) => {
    // Automatically check them into the active service after saving
    if (serviceId) {
      await handleCheckIn(newMember.id);
    } else {
      alert(`Registered newcomer ${newMember.first_name} successfully! (Select a service to check them in)`);
    }
    setQuery('');
    setResults([]);
  };

  const handleAddMemberSuccess = async (newMember: any) => {
    alert(`Successfully added regular member ${newMember.first_name} ${newMember.last_name}!`);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="w-full max-w-xl flex flex-col gap-4">
      {/* Top Action Buttons for Registration */}
      <div className="flex gap-3 justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <span className="text-xs font-black uppercase text-gray-700 tracking-wider">Quick Actions:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsNewcomerOpen(true)}
            className="bg-black text-white text-xs font-black uppercase tracking-wider py-2 px-3.5 rounded-lg hover:bg-gray-800 transition-colors shadow"
          >
            + Register Newcomer
          </button>
          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="bg-[#1b4332] text-white text-xs font-black uppercase tracking-wider py-2 px-3.5 rounded-lg hover:bg-[#122e22] transition-colors shadow"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search member by name or phone number..."
          className="w-full p-4 bg-white border border-gray-300 rounded-xl shadow-md text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
        />
        {searching && (
          <span className="absolute right-4 top-4 text-xs font-bold text-gray-400 animate-pulse">Searching...</span>
        )}
      </div>

      {errorMsg && <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg">{errorMsg}</p>}

      {/* Search Results Dropdown / List */}
      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <div className="p-5 bg-white rounded-xl shadow-md border border-gray-200 text-center flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-gray-700">
            No member found matching &ldquo;<span className="font-bold text-gray-900">{query}</span>&rdquo;.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsNewcomerOpen(true)}
              className="bg-black text-white text-xs font-black uppercase tracking-wider py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
            >
              Register as Newcomer
            </button>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="bg-[#1b4332] text-white text-xs font-black uppercase tracking-wider py-2 px-4 rounded-md hover:bg-[#122e22] transition-colors"
            >
              Add as Regular Member
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {results.map((member) => {
            const isCheckedIn = checkedInIds.includes(member.id);
            return (
              <div key={member.id} className="p-3.5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div>
                  <h4 className="font-black text-gray-900 text-sm">
                    {member.first_name} {member.last_name}
                  </h4>
                  <p className="text-xs font-semibold text-gray-500">
                    {member.raw_category || 'No Zone'} | {member.raw_team || 'No Team'} | {member.phone_number || 'No Phone'}
                  </p>
                </div>
                <button
                  onClick={() => handleCheckIn(member.id)}
                  disabled={isCheckedIn}
                  className={`py-1.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                    isCheckedIn
                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                      : 'bg-[#1b4332] text-white hover:bg-[#122e22]'
                  }`}
                >
                  {isCheckedIn ? 'Checked In ✓' : 'Check In'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <NewcomerModal
        isOpen={isNewcomerOpen}
        onClose={() => setIsNewcomerOpen(false)}
        onSuccess={handleNewcomerSuccess}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={handleAddMemberSuccess}
      />
    </div>
  );
}