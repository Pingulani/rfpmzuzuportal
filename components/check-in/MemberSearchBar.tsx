'use client';

import { useState, useEffect } from 'react';
import { searchMembers } from '../../services/memberService';
import { checkInMember } from '../../services/attendanceService';
import NewcomerModal from './NewcomerModal';
import { Member } from '../../types';

export default function MemberSearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false); // Controls the pop-up

  useEffect(() => {
    async function fetchResults() {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        const data = await searchMembers(searchTerm);
        setResults(data);
        setIsSearching(false);
      } else {
        setResults([]);
      }
    }
    fetchResults();
  }, [searchTerm]);

  const handleCheckIn = async (memberId: string) => {
    setCheckedInIds((prev) => new Set(prev).add(memberId));
    const response = await checkInMember(memberId);
    
    if (!response.success) {
      setCheckedInIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
      alert('Check-in failed. Please try again.');
    }
  };

  const handleNewcomerSuccess = (newMember: Member) => {
    setShowModal(false); // Close the form
    setSearchTerm(newMember.first_name); // Auto-fill the search bar with their name!
    setResults([newMember]); // Drop their new profile onto the screen immediately
  };

  return (
    <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="flex items-center space-x-3 mb-6">
        <div className="h-8 w-8 bg-red-800 text-white rounded-full flex items-center justify-center font-bold">🔍</div>
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Access Control</h2>
      </div>
      
      <input
        type="text"
        placeholder="Search name or phone number..."
        className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-800 text-black text-lg"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      <div className="mt-4 min-h-[80px]">
        {isSearching && <p className="text-gray-500 text-sm p-4">Searching database...</p>}
        
        {!isSearching && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((member) => {
              const isCheckedIn = checkedInIds.has(member.id);
              return (
                <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:border-red-800">
                  <div>
                    <p className="font-bold text-gray-900">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-gray-500">{member.phone_number || 'No phone'} • {member.member_status}</p>
                  </div>
                  <button 
                    onClick={() => handleCheckIn(member.id)}
                    disabled={isCheckedIn}
                    className={`px-4 py-2 text-sm font-bold rounded shadow transition-colors ${isCheckedIn ? 'bg-green-600 text-white cursor-default' : 'bg-red-800 text-white hover:bg-red-900'}`}
                  >
                    {isCheckedIn ? '✓ CHECKED IN' : 'CHECK IN'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!isSearching && searchTerm.length >= 2 && results.length === 0 && (
          <p className="text-gray-500 text-sm p-4">
            No member found. <button onClick={() => setShowModal(true)} className="text-red-800 font-bold underline">Register Newcomer</button>
          </p>
        )}
      </div>

      {showModal && (
        <NewcomerModal onClose={() => setShowModal(false)} onSuccess={handleNewcomerSuccess} />
      )}
    </div>
  );
}