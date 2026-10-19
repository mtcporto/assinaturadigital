import { VerifyClient } from './verify-client';

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="verify-page">
    <VerifyClient id={id} />
  </main>;
}
