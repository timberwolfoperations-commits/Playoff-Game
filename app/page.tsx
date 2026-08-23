import Link from 'next/link';

const quickLinks = [
  {
    href: '/bracket/world-cup-2026',
    eyebrow: 'Explore',
    title: 'Open the public bracket view',
    description: 'Browse the current bracket without signing in.',
  },
  {
    href: '/players',
    eyebrow: 'Standings',
    title: 'See the public leaderboard',
    description: 'Review scores and full player breakdowns.',
  },
  {
    href: '/dashboard',
    eyebrow: 'Private',
    title: 'Sign in to manage your pool',
    description: 'Create a pool, join invites, and save picks with magic-link login.',
  },
  {
    href: '/admin',
    eyebrow: 'Commissioner',
    title: 'Open the admin area',
    description: 'Manage slates and commissioner-only setup tools.',
  },
];

const steps = [
  'Explore the public bracket and standings first.',
  'Sign in only when you want to create or join a pool.',
  'Create your survivor pool and share its invite link.',
  'Return to your dashboard to make and lock picks.',
];

export default function HomePage() {
  return (
    <div className="w-full space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(38,70,83,0.96)_0%,rgba(15,23,42,0.94)_52%,rgba(183,137,61,0.88)_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-8 sm:py-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_58%)]" />
        <div className="relative max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.38em] text-white/68">
            Explore first
          </p>
          <h1 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">
            The BIG Board is easier to navigate now.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
            You can browse the bracket and standings without signing in. Use magic-link login only
            when you want to create or join a survivor pool and save picks.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/bracket/world-cup-2026"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:bg-[#f8f4ec]"
            >
              Explore Bracket
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Sign In / Create Pool
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.8)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f]">
              {link.eyebrow}
            </p>
            <h2 className="mt-3 font-serif text-2xl tracking-tight text-slate-950">
              {link.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{link.description}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.8)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f]">
            Survivor pool setup
          </p>
          <h2 className="mt-3 font-serif text-2xl tracking-tight text-slate-950">
            A “group” is your pool.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            The app stores each private pool as a group. Once you sign in, create a pool, copy its
            invite link, and send that link to the rest of your players.
          </p>
          <ol className="mt-5 space-y-3 text-sm text-slate-600">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.8)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f]">
            Need an invite?
          </p>
          <h2 className="mt-3 font-serif text-2xl tracking-tight text-slate-950">
            Join from a pool link.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Invite links look like <span className="font-mono text-slate-700">/join/&lt;pool-id&gt;</span>.
            If you already have one, open it and the site will guide you through sign-in and joining.
          </p>
          <Link
            href="/join"
            className="mt-5 inline-flex rounded-full border border-[#dbc7a4] bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c5b1f] transition hover:bg-[#f4ede1]"
          >
            How invites work
          </Link>
        </div>
      </section>
    </div>
  );
}
