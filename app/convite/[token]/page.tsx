import { currentSigner } from '../../../lib/webauthn';
import { db } from '../../../lib/db';
import { sha256 } from '../../../lib/evidence';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function InvitationPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
 let fileName='',status='',expiresAt='',recipientEmail='';
 const signer=await currentSigner();
 try{
  const result=await db().execute({sql:`SELECT e.file_name,e.status AS envelope_status,r.status,r.expires_at,r.email
   FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id
   WHERE r.token_sha256=? LIMIT 1`,args:[sha256(new TextEncoder().encode(token))]});
  if(!result.rows.length) notFound();
  const row=result.rows[0];fileName=String(row.file_name);status=String(row.status);expiresAt=String(row.expires_at);recipientEmail=String(row.email).toLowerCase();
  if(row.envelope_status!=='pending') status='cancelled';
  else if(expiresAt<=new Date().toISOString())status='expired';
 }catch(error){if(error && typeof error==='object' && 'digest' in error)throw error;return <main><section className="panel"><h1>Convite indisponível</h1><p>Tente novamente mais tarde.</p></section></main>;}
 return <main><section className="hero"><span className="eyebrow">Convite individual</span><h1>Documento para assinatura</h1></section><section className="panel"><div className="invitation-details"><p><strong>Documento:</strong> {fileName}</p><p><strong>Situação:</strong> {status==='pending'?'Aguardando assinatura':status==='expired'?'Convite expirado':status==='signed'?'Assinado':'Indisponível'}</p><p><strong>Prazo:</strong> {expiresAt}</p></div>{status==='pending'&&<div className="invitation-actions"><a className="primary-button" href={`/api/invitations/${token}/pdf`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Visualizar PDF</a></div>}{status==='pending'&&<div className="invitation-details"><h2>Identificação do destinatário</h2>{!signer?<><p>Para assinar, entre com a conta Google correspondente ao endereço que recebeu o convite.</p><a className="button-link" href={`/login?next=${encodeURIComponent('/convite/'+token)}`}>Entrar com Google →</a></>:signer.email.toLowerCase()!==recipientEmail?<p role="alert">A conta conectada ({signer.email}) não corresponde ao destinatário deste convite. Entre com a conta correta para prosseguir.</p>:<><p>Conta do destinatário confirmada: <strong>{signer.email}</strong>.</p><p className="account-line">A confirmação da assinatura com passkey será disponibilizada nesta página na próxima etapa. Nenhuma assinatura foi realizada ainda.</p><a className="secondary-link" href="/login">Gerenciar ou cadastrar passkey →</a></>}</div>}</section></main>;
}
