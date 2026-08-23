import Link from 'next/link';

export default function JoinLandingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f]">
        Join a pool
      </p>
      <h1 className="mt-3 font-serif text-3xl tracking-tight text-slate-950">
        You need an invite link to join.
      </h1>
      <p className="mt-4 text-sm leading-6 text-slate-500">
        Pools are private. Ask the pool owner to send you a link that looks like{' '}
        <span className="font-mono text-slate-700">/join/&lt;pool-id&gt;</span>. When you open it,
        the app will prompt you to sign in if needed and then add you to that pool.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Sign In
        </Link>
        <Link
          href="/"
          className="rounded-full border border-[#dbc7a4] bg-white px-5 py-3 text-sm font-semibold text-[#7c5b1f] transition hover:bg-[#f4ede1]"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}
