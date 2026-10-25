'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { VerificationShare } from '../../components/verification-share';

type Verification = {
  contract?: {fileName:string;totalSigners:number;verifiedSignatures:number;completed:boolean;signers:{email:string;status:string;signedAt:string|null;verified:boolean}[]}|null;
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
        if (!response.ok && (data.reason === 'verification_unavailable' || response.status >= 500)) throw new Error('Serviço de verificação indisponível.');
        return data;
      })
      .then(data => { if (active) setRecord(data); })
      .catch(() => { if (active) setError('Não foi possível consultar as assinaturas agora. Verifique sua conexão e tente novamente mais tarde.'); })
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
      setFileError('Não foi possível conferir este arquivo. Tente novamente com o PDF original.');
    } finally {
      setChecking(false);
    }
  }

  const matches = Boolean(record?.valid && record.documentSha256 && fileHash && fileHash.toLowerCase() === record.documentSha256.toLowerCase());

  return <section>
    <span className="eyebrow">Consulta pública</span><h1>Confira as assinaturas do documento.</h1>
    <p className="lead">Veja se o documento foi assinado e se ainda existem assinaturas pendentes.</p>

    <div style={box} aria-live="polite">
      {loading ? <p>Consultando registro...</p> : error ? <p role="alert">{error}</p> : record?.valid ? <>
        <h2 style={{ color: '#166534' }}>✓ Assinatura verificada</h2>
        <p>O registro eletrônico e suas evidências foram validados. A conferência de um arquivo externo é opcional.</p>
        {record.contract && <div style={{padding:'18px 0',borderBottom:'1px solid var(--line)'}}><h2>{record.contract.fileName}</h2><h3 style={{color:record.contract.completed?'#166534':'#8a5a32'}}>{record.contract.completed?'✓ Documento assinado por todos':'Documento aguardando assinaturas'}</h3><p><strong>{record.contract.verifiedSignatures} de {record.contract.totalSigners} assinaturas verificadas</strong></p><ul>{record.contract.signers.map((signer,index)=><li key={index} style={{marginBottom:12}}><strong>{signer.email}</strong> — {signer.verified?'Assinatura verificada':signer.status==='pending'?'Aguardando assinatura':'Assinatura não verificada'}{signer.signedAt&&signer.verified?<span> · {new Date(signer.signedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'})}</span>:null}</li>)}</ul><p className="notice">Os e-mails são parcialmente ocultos nesta consulta pública.</p></div>}
        <VerificationShare id={id}/>
        <details style={{marginTop:18}}><summary style={{cursor:'pointer',fontWeight:700}}>Detalhes técnicos da assinatura</summary><p>Identificador: <code style={hashStyle}>{id}</code></p><p><strong>Confirmação da assinatura:</strong> {record.authentication === 'webauthn-passkey' ? 'Passkey (WebAuthn)' : record.authentication === 'legacy' ? 'Registro eletrônico legado' : 'Não informada'}</p>
        {record.createdAt && <p><strong>Registrado em:</strong> {new Date(record.createdAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'America/Sao_Paulo' })}</p>}
        <p><strong>SHA-256 do PDF original:</strong></p>
        <p style={hashStyle}>{record.documentSha256}</p></details>
      </> : <><h2 style={{ color: '#b91c1c' }}>Registro não validado</h2><p role="alert">{record?.reason === 'not_found' ? 'Não encontramos uma assinatura com esse código. Confira se copiou o código inteiro ou use o QR Code do comprovante.' : 'Não foi possível confirmar a validade desta assinatura. Confira o código e, se o problema continuar, solicite um novo comprovante.'}</p></>}
    </div>
    <details style={box}>
      <summary style={{cursor:"pointer",fontWeight:700}}>Tenho o arquivo PDF e quero conferir se é o mesmo documento</summary>
      <h2>Comparar arquivo com o registro</h2>
      <p>Use esta opção apenas para conferir um PDF recebido fora do Selo. O SHA-256 é calculado no navegador, sem enviar o arquivo ao servidor.</p>
      <label>Arquivo PDF<br/><input type="file" accept=".pdf,application/pdf" onChange={selectFile} /></label>
      {checking && <p role="status">Calculando SHA-256...</p>}
      {fileError && <p role="alert">{fileError}</p>}
      {record?.valid && !fileHash && !checking && <p role="status" style={{color:'#8a5a32',fontWeight:650}}>Arquivo ainda não conferido. Selecione o PDF recebido para verificar a correspondência com o registro.</p>}
      {file && fileHash && <div role="status">
        <p><strong>Arquivo:</strong> {file.name}</p>
        <p><strong>SHA-256 calculado:</strong> <span style={hashStyle}>{fileHash}</span></p>
        {record?.valid ? <p style={{ fontWeight: 700, color: matches ? '#166534' : '#b91c1c' }}>{matches ? '✓ O PDF corresponde exatamente ao arquivo registrado no Selo.' : '✗ Este PDF não corresponde ao documento registrado. Confira se selecionou o arquivo original correto.'}</p> : <p>Não é possível confirmar correspondência sem um registro válido.</p>}
      </div>}
    </details>
    <div className="actions" style={{marginTop:24,flexWrap:'wrap'}}><a className="button-link" href={'/api/documents/'+encodeURIComponent(id)}>Baixar PDF (acesso autorizado)</a><a className="secondary-link" href="/documentos">Meus documentos →</a><a className="secondary-link" href="/">Assinar outro PDF</a><a className="secondary-link" href="/verificar">Verificar outro registro</a></div><p className="notice"><a href={'/api/verify/' + encodeURIComponent(id)}>Consultar resposta JSON</a></p>
    <p className="notice">A validação confirma a integridade das evidências e, quando o PDF é comparado, a correspondência dos bytes. Não comprova identidade civil nem equivale a assinatura qualificada ICP-Brasil.</p>
  </section>;
}
