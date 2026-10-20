'use client';

import { useEffect, useState, type ChangeEvent } from 'react';

type Verification = {
  valid: boolean;
  reason: string;
  documentSha256?: string;
  createdAt?: string;
  note?: string;
  authentication?: 'webauthn-passkey' | 'legacy';
};

const box: React.CSSProperties = { border: '1px solid var(--line)', borderRadius: 20, padding: 30, marginTop: 22, background: '#fff', boxShadow: '0 10px 35px rgba(14,39,60,.035)' };
const hashStyle: React.CSSProperties = { overflowWrap: 'anywhere', fontFamily: 'monospace', fontSize: 13 };

export function VerifyClient({ id }: { id: string }) {
  const [record, setRecord] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [checking, setChecking] = useState(false);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/verify/' + encodeURIComponent(id), { cache: 'no-store' })
      .then(async response => {
        const data = await response.json() as Verification;
        if (!response.ok && data.reason === 'verification_unavailable') throw new Error('Serviço de verificação indisponível.');
        return data;
      })
      .then(data => { if (active) setRecord(data); })
      .catch(() => { if (active) setError('Não foi possível consultar o registro. Tente atualizar a página.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFileHash('');
    setFileError('');
    if (!selected) return;
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Selecione um arquivo PDF.');
      return;
    }
    setChecking(true);
    try {
      const bytes = await selected.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      setFileHash(hash);
    } catch {
      setFileError('Não foi possível calcular o SHA-256 deste arquivo.');
    } finally {
      setChecking(false);
    }
  }

  const matches = Boolean(record?.valid && record.documentSha256 && fileHash && fileHash.toLowerCase() === record.documentSha256.toLowerCase());

  return <section>
    <span className="eyebrow">Verificação pública</span><h1>Verificar assinatura eletrônica</h1>
    <p className="lead">Confira as evidências de um registro e compare o PDF recebido com o original.</p>
    <p>Identificador: <code style={hashStyle}>{id}</code></p>
    <div style={box} aria-live="polite">
      {loading ? <p>Consultando registro...</p> : error ? <p role="alert">{error}</p> : record?.valid ? <>
        <h2 style={{ color: '#166534' }}>✓ Registro de evidências válido</h2>
        <p>O selo criptográfico e os eventos de auditoria do registro foram verificados. Isso ainda não confirma que o PDF recebido é o mesmo documento.</p>
        <p><strong>Confirmação da assinatura:</strong> {record.authentication === 'webauthn-passkey' ? 'Passkey (WebAuthn)' : record.authentication === 'legacy' ? 'Registro eletrônico legado' : 'Não informada'}</p>
        {record.createdAt && <p><strong>Registrado em:</strong> {new Date(record.createdAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'medium' })}</p>}
        <p><strong>SHA-256 do PDF original:</strong></p>
        <p style={hashStyle}>{record.documentSha256}</p>
      </> : <><h2 style={{ color: '#b91c1c' }}>Registro não validado</h2><p role="alert">{record?.reason === 'not_found' ? 'Registro não encontrado.' : 'O registro não passou na verificação de integridade ou o identificador é inválido.'}</p></>}
    </div>
    <div style={box}>
      <h2>Conferir um PDF</h2>
      <p>Selecione o documento para calcular seu SHA-256 localmente. O arquivo não é enviado ao servidor.</p>
      <label>Arquivo PDF<br/><input type="file" accept=".pdf,application/pdf" onChange={selectFile} /></label>
      {checking && <p role="status">Calculando SHA-256...</p>}
      {fileError && <p role="alert">{fileError}</p>}
      {record?.valid && !fileHash && !checking && <p role="status" style={{color:'#8a5a32',fontWeight:650}}>Arquivo ainda não conferido. Selecione o PDF recebido para verificar a correspondência com o registro.</p>}
      {file && fileHash && <div role="status">
        <p><strong>Arquivo:</strong> {file.name}</p>
        <p><strong>SHA-256 calculado:</strong> <span style={hashStyle}>{fileHash}</span></p>
        {record?.valid ? <p style={{ fontWeight: 700, color: matches ? '#166534' : '#b91c1c' }}>{matches ? '✓ Integridade do PDF confirmada: os bytes correspondem ao documento registrado.' : '✗ Integridade do PDF não confirmada: este arquivo é diferente do documento registrado.'}</p> : <p>Não é possível confirmar correspondência sem um registro válido.</p>}
      </div>}
    </div>
    <div className="actions" style={{marginTop:24,flexWrap:'wrap'}}><a className="button-link" href="/documentos">Meus documentos →</a><a className="secondary-link" href="/">Assinar outro PDF</a><a className="secondary-link" href="/verificar">Verificar outro registro</a></div><p className="notice"><a href={'/api/verify/' + encodeURIComponent(id)}>Consultar resposta JSON</a></p>
    <p className="notice">A validação confirma a integridade das evidências e, quando o PDF é comparado, a correspondência dos bytes. Não comprova identidade civil nem equivale a assinatura qualificada ICP-Brasil.</p>
  </section>;
}
