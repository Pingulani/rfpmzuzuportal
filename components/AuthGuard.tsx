'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../utils/supabase'; // Adjust path if necessary
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session && pathname !== '/login') {
        // If there's no session and they aren't already on the login page, kick them to login
        router.push('/login');
      } else {
        // Allow them in
        setIsAuthorized(true);
      }
    };

    checkSession();

    // Set up a listener so if they click "Logout" later, they are instantly kicked out
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== '/login') {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Show a blank loading screen while we verify their credentials so they don't see a flash of the dashboard
  if (isAuthorized === null && pathname !== '/login') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#034a36]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-emerald-100 font-bold uppercase tracking-widest text-xs">Verifying Access...</p>
      </div>
    );
  }

  // If they are authorized (or on the login page), render the app normally
  return <>{children}</>;
}