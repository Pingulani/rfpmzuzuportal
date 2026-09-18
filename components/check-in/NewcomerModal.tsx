'use client';

import { useState } from 'react';
import { registerNewcomer } from '../../services/memberService';
import { Member } from '../../types';

interface Props {
  onClose: () => void;
  onSuccess: (newMember: Member) => void;
}

export default function NewcomerModal({ onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const newMember = await registerNewcomer(firstName, lastName, phone, gender);
    
    if (newMember) {
      onSuccess(newMember); // Instantly passes the new profile back to the search bar
    } else {
      alert('Failed to register newcomer. Please check your connection.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Register Newcomer</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
              <input required type="text" className="w-full p-2 border rounded focus:ring-red-800 focus:border-red-800 text-black" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
              <input required type="text" className="w-full p-2 border rounded focus:ring-red-800 focus:border-red-800 text-black" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
            <input type="text" className="w-full p-2 border rounded focus:ring-red-800 focus:border-red-800 text-black" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0999..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Gender</label>
            <select className="w-full p-2 border rounded focus:ring-red-800 text-black" value={gender} onChange={e => setGender(e.target.value)}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-red-800 text-white font-bold rounded hover:bg-red-900 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}