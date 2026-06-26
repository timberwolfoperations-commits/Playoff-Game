import BracketEngine from '@/components/BracketEngine';
import DashboardAuthGate from '@/components/DashboardAuthGate';

// Maps contest route IDs to their bracket slugs used by BracketEngine.
// BracketEngine already handles the full lock-state-driven rendering:
//   - If current date > June 28, 2026 OR user.is_locked == true → read-only bracket tree
//   - Otherwise → interactive pick entry form
const CONTEST_BRACKET_MAP: Record<string, string> = {
  'wc-bracket-2026': 'world-cup-2026',
};

export default async function ContestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bracketSlug = CONTEST_BRACKET_MAP[id];

  if (!bracketSlug) {
    return (
      <DashboardAuthGate>
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-10 text-center text-slate-500">
          Contest not found.
        </div>
      </DashboardAuthGate>
    );
  }

  return (
    <DashboardAuthGate>
      <BracketEngine bracketSlug={bracketSlug} />
    </DashboardAuthGate>
  );
}
