'use client';

import { type FormEvent, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Eye, EyeOff, Home, LockKeyhole, UserRound } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username.trim() !== 'admin' || password !== '1234') {
      setErrorMessage('That username and password do not match. Please try again.');
      return;
    }

    setErrorMessage(null);
    onLogin();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#170b0a] px-4 py-8 sm:px-6 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-rfp-gold/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#3D0908]/80 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#100707_100%)]" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-rfp-gold/25 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.5)] lg:min-h-[650px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#3D0908] px-7 py-8 text-white sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 top-12 h-72 w-72 rounded-full border border-rfp-gold/20" />
            <div className="absolute -right-10 top-24 h-52 w-52 rounded-full border border-rfp-gold/15" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-8 left-10 h-px w-32 bg-rfp-gold/60" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-full border-2 border-rfp-gold/70 bg-white shadow-lg shadow-black/20">
                <Image
                  src="/rfp-login-logo.png"
                  alt="Raised For A Purpose Ministries"
                  width={68}
                  height={68}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em]">Raised For A Purpose</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">Mzuzu Branch Portal</p>
              </div>
            </div>

            <div className="mt-12 max-w-md sm:mt-16 lg:mt-20">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-rfp-gold">Faith · Family · Purpose</p>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                RFP IS
                <span className="block text-rfp-gold">HOME</span>
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/80 sm:text-base">
                A place to grow in faith, find your people, and serve with purpose. Here, every story matters and every heart has a place. Welcome home to a family united in Christ.
              </p>
            </div>
          </div>

          <blockquote className="relative mt-10 max-w-md border-l-2 border-rfp-gold pl-4 sm:mt-14">
            <Home aria-hidden="true" className="mb-3 h-4 w-4 text-rfp-gold" />
            <p className="text-sm leading-6 text-white/90">
              “So we, being many, are one body in Christ, and every one members one of another.”
            </p>
            <cite className="mt-2 block text-[10px] font-bold not-italic uppercase tracking-[0.15em] text-rfp-gold">Romans 12:5 · KJV</cite>
          </blockquote>
        </section>

        <section className="flex items-center justify-center bg-[#fffdfa] px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rfp-gold-ink">Welcome back</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#211817] sm:text-3xl">Sign in to your account</h2>
              <p className="mt-2 text-sm leading-6 text-[#766b69]">Continue serving, connecting, and growing together.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-username" className="mb-2 block text-xs font-bold text-[#3d302e]">Username</label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b7d79]" />
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={event => setUsername(event.target.value)}
                    placeholder="Enter your username"
                    className="w-full rounded-xl border border-[#e5deda] bg-white py-3 pl-10 pr-4 text-sm text-[#211817] outline-none transition focus:border-[#3D0908] focus:ring-4 focus:ring-[#3D0908]/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-xs font-bold text-[#3d302e]">Password</label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b7d79]" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-[#e5deda] bg-white py-3 pl-10 pr-11 text-sm text-[#211817] outline-none transition focus:border-[#3D0908] focus:ring-4 focus:ring-[#3D0908]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(current => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#8b7d79] transition hover:text-[#3D0908]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-lg border border-[#3D0908]/15 bg-[#3D0908]/5 px-3 py-2.5 text-xs font-semibold text-[#3D0908]">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rfp-gold/70 bg-[#3D0908] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#3D0908]/15 transition hover:bg-black focus:outline-none focus:ring-4 focus:ring-[#3D0908]/20"
              >
                Sign in
                <ArrowRight className="h-4 w-4 text-rfp-gold" />
              </button>
            </form>

            <div className="mt-8 border-t border-[#eee6e1] pt-5 text-center text-[10px] text-[#9b908d]">
              © {new Date().getFullYear()} Raised For A Purpose Ministries · Mzuzu Branch
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
