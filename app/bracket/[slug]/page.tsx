import BracketEngine from '@/components/BracketEngine';
import DashboardAuthGate from '@/components/DashboardAuthGate';

export default async function BracketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <DashboardAuthGate>
      <BracketEngine bracketSlug={slug} />
    </DashboardAuthGate>
  );
}
