'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/fetch';

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!passcode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await fetchJson('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      router.push('/admin/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm w-full">
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h1 className="mb-1 font-serif text-2xl tracking-tight text-slate-950">
          Commissioner Login
        </h1>
        <p className="mb-6 text-sm text-slate-500">Enter your passcode to manage slates.</p>

        <div className="space-y-4">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="Passcode"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-offset-2 focus:ring-2 focus:ring-[#b7893d]"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={login}
            disabled={!passcode.trim() || loading}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all hover:bg-slate-700 disabled:opacity-40"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
