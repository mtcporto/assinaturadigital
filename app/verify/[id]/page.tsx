import { VerifyClient } from './verify-client';

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
    <VerifyClient id={id} />
  </main>;
}
