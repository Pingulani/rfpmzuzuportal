'use client';

import { useState, useEffect } from 'react';
import { getNewcomers } from '../../services/memberService';

export default function NewcomerRoster() {
  const [newcomers, setNewcomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNewcomers() {
      const data = await getNewcomers();
      setNewcomers(data);
      setLoading(false);
    }
    loadNewcomers();
  }, []);

  if (loading) return null;

  return (
    <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-8 w-8 bg-red-800 text-white rounded-full flex items-center justify-center font-bold">📋</div>
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Newcomer Follow-Up</h2>
      </div>

      {newcomers.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No newcomers registered yet.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {newcomers.map((person) => (
            <div key={person.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="font-bold text-gray-900">{person.first_name} {person.last_name}</p>
                <p className="text-xs text-gray-500">{person.phone_number || 'No phone provided'} • <span className="text-red-800 font-semibold">{person.gender}</span></p>
              </div>
              {person.phone_number && (
                <a 
                  href={`tel:${person.phone_number}`}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded hover:bg-black transition-colors"
                >
                  Call
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}