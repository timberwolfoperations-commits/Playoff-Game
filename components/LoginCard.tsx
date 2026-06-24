'use client';

import { FormEvent, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';

export default function LoginCard() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const redirectTo = window.location.origin + '/dashboard';
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  return (
    <div className="flex w-full items-center justify-center py-6 sm:py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/75 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f]">
            Private league access
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-slate-950 sm:text-4xl">
            Sign in to The BIG Board
          </h1>
          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            Use a secure magic link to open your dashboard on any device.
          </p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-[1.5rem] border border-[#dbc7a4] bg-[linear-gradient(180deg,#faf5ea_0%,#f7f9fc_100%)] px-5 py-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <p className="text-base font-semibold text-slate-900 sm:text-lg">
              Check your inbox! ✉️ We sent a secure login link to your email address.
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-offset-2 transition focus:ring-2 focus:ring-[#b7893d]"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send Magic Link 🚀'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
