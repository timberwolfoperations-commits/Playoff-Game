import BracketEngine from '@/components/BracketEngine';

export default async function BracketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BracketEngine bracketSlug={slug} />;
}
