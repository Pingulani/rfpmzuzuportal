'use client';

interface NavbarProps {
  activeTab: 'check-in' | 'insights' | 'followup' | 'matrix';
  setActiveTab: (tab: 'check-in' | 'insights' | 'followup' | 'matrix') => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  return (
    <nav className="w-full max-w-lg bg-white p-2 rounded-xl shadow-md border border-gray-200 mb-6 flex justify-between gap-1">
      <button
        onClick={() => setActiveTab('check-in')}
        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
          activeTab === 'check-in'
            ? 'bg-red-800 text-white shadow'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🚪 Check-In
      </button>

      <button
        onClick={() => setActiveTab('insights')}
        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
          activeTab === 'insights'
            ? 'bg-red-800 text-white shadow'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        📊 Insights
      </button>

      <button
        onClick={() => setActiveTab('followup')}
        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
          activeTab === 'followup'
            ? 'bg-red-800 text-white shadow'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        📋 Follow-Up
      </button>

      <button
        onClick={() => setActiveTab('matrix')}
        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
          activeTab === 'matrix'
            ? 'bg-red-800 text-white shadow'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        📈 Matrix
      </button>
    </nav>
  );
}