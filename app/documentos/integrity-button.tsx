'use client';
import { useState } from 'react';

type IntegrityResponse = { valid?: boolean; evidenceValid?: boolean; pdfMatchesEvidence?: boolean | null; issues?: string[]; error?: string };

export function IntegrityButton({ id }: { id: string }) {
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<IntegrityResponse | null>(null);
 async function check() {
  setLoading(true);
  setResult(null);
  try {
   const response = await fetch('/api/documents/' + encodeURIComponent(id) + '/integrity', { cache: 'no-store' });
   const data = await response.json() as IntegrityResponse;
   if (response.status === 401) { setResult({ error: 'Faça login novamente.' }); return; }
   if (response.status === 404) { setResult({ error: 'Documento não encontrado.' }); return; }
   if (data.issues?.includes('pdf_unavailable')) { setResult({ error: 'PDF indisponível no armazenamento. Tente novamente mais tarde.' }); return; }
   if (!response.ok && response.status !== 422) { setResult({ error: 'Não foi possível concluir a conferência.' }); return; }
   setResult(data);
  } catch { setResult({ error: 'Falha de conexão ao conferir o documento.' }); }
  finally { setLoading(false); }
 }
 return <div>
  <button className="secondary-link" type="button" onClick={check} disabled={loading}>
   {loading ? 'Conferindo...' : 'Conferir integridade'}
  </button>
  {result && <p role="status" className="account-line" style={{ marginTop: 6, color: result.valid ? '#166534' : '#b91c1c' }}>
   {result.error || (result.valid ? 'Integridade confirmada: evidências e PDF conferem.' : 'Atenção: foi encontrada uma divergência de integridade.')}
  </p>}
 </div>;
}
