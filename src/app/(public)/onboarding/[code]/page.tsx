import { Wizard } from './wizard';

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Wizard initialCode={code} />;
}
