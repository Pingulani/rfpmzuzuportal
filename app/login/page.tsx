'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Adjust to 'next/navigation' for App Router, or 'next/router' for Pages router
import { supabase } from '../../utils/supabase'; // Adjust path if necessary
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed');

      // 2. Fetch the user's role to determine where to send them
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

// 🔴 FIX: This will print the exact reason Supabase is failing
if (roleError && roleError.code !== 'PGRST116') {
  throw new Error(`DB Error: ${roleError.message} (Code: ${roleError.code})`);
}
      }

      const userRole = roleData?.role || 'unassigned';

      // 3. Route based on role
      if (userRole === 'admin' || userRole === 'access_control') {
        router.push('/'); // Or your main dashboard/check-in route
      } else if (userRole === 'leader') {
        router.push('/zones-matrix'); // Push leaders directly to reports
      } else {
        throw new Error('No role assigned. Please contact the administrator.');
      }

    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.');
      // Automatically sign out if there was a role fetch error to prevent partial states
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#034a36] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <h1 className="text-2xl font-black tracking-wider text-white uppercase">
            RFP Mzuzu
          </h1>
          <h2 className="text-emerald-200 text-xs font-bold tracking-widest mt-2 uppercase">
            Ministry Portal Access
          </h2>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-600 tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-[#034a36] focus:border-transparent transition-all outline-none"
                  placeholder="name@rfpmzuzu.org"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-600 tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-[#034a36] focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#034a36] hover:bg-[#023325] text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</>
              ) : (
                'Secure Login'
              )}
            </button>
          </form>
        </div>
      </div>
      
      <p className="text-center text-gray-400 text-xs font-semibold mt-8 uppercase tracking-widest">
        Authorized Personnel Only
      </p>
    </div>
  );
}