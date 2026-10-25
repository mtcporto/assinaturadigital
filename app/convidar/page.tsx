import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db } from '../../lib/db';
import { InviteForm } from './invite-form';
import { VerificationShare } from '../components/verification-share';
import { CancelInvite } from './cancel-invite';
import { RenewInvite } from './renew-invite';
import { dateTimeBR } from '../../lib/datetime';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 25;

type Invitation = {
 envelopeId:string;
 id: string; fileName: string; recipientEmail: string; status: string;
 createdAt: string; expiresAt: string; signedAt: string | null; documentId: string | null; emailStatus:string | null; signedCount:number;recipientCount:number;signatureId:string|null;
};
type Month = {key:string; total:number};
type Filter='todos'|'pendentes'|'assinados'|'expirados'|'cancelados';
const FILTERS:{key:Filter;label:string}[]=[{key:'todos',label:'Todos'},{key:'pendentes',label:'Pendentes'},{key:'assinados',label:'Assinados'},{key:'expirados',label:'Expirados'},{key:'cancelados',label:'Cancelados'}];
function condition(filter:Filter){switch(filter){case 'pendentes':return "EXISTS(SELECT 1 FROM envelope_recipients rr WHERE rr.envelope_id=e.id AND rr.status='pending' AND rr.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))";case 'assinados':return "NOT EXISTS(SELECT 1 FROM envelope_recipients rr WHERE rr.envelope_id=e.id AND rr.status!='signed')";case 'expirados':return "NOT EXISTS(SELECT 1 FROM envelope_recipients rr WHERE rr.envelope_id=e.id AND rr.status='pending' AND rr.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND EXISTS(SELECT 1 FROM envelope_recipients rr WHERE rr.envelope_id=e.id AND (rr.status='expired' OR (rr.status='pending' AND rr.expires_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))))";case 'cancelados':return "NOT EXISTS(SELECT 1 FROM envelope_recipients rr WHERE rr.envelope_id=e.id AND rr.status!='cancelled')";default:return '1=1';}}

const monthName = (key:string) => new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z'));
const monthTitle = (key:string) => { const name=monthName(key);return name.charAt(0).toUpperCase()+name.slice(1); };

function statusLabel(row: Invitation) {
 if (row.status === 'signed') return 'Assinado';
 if (row.status === 'cancelled') return 'Cancelado';
 if (row.status === 'expired' || (row.status === 'pending' && Date.parse(row.expiresAt) <= Date.now())) return 'Expirado';
 return 'Aguardando assinatura';
}
function statusClass(row: Invitation) {
 const label=statusLabel(row);
 return label==='Assinado'?'signed':label==='Cancelado'?'cancelled':label==='Expirado'?'expired':'pending';
}
const dateLabel=dateTimeBR;

export default async function InvitePage({searchParams}:{searchParams:Promise<{mes?:string;pagina?:string;status?:string}>}) {
 const session = await auth();
 if (!session?.user?.id) redirect('/login');
 const {mes,pagina,status} = await searchParams;
 const filter:Filter=FILTERS.some(x=>x.key===status)?status as Filter:'todos';
 const where=condition(filter);

 let invitations: Invitation[] = [];
 let envelopes: {id:string;fileName:string;createdAt:string;recipients:Invitation[]}[]=[];
 let months: Month[] = [];
 let error = false;
 let selected: string | undefined;
 let currentPage = 1;
 try {
  const client = db();
  const grouped = await client.execute({
   sql: `SELECT substr(e.created_at,1,7) AS period, COUNT(*) AS total
         FROM signing_envelopes e
         WHERE e.owner_id=? AND ${where} GROUP BY substr(e.created_at,1,7) ORDER BY period DESC`,
   args: [session.user.id]
  });
  months = grouped.rows.map(r=>({key:String(r.period),total:Number(r.total)})).filter(m=>/^\d{4}-\d{2}$/.test(m.key));
  selected = months.some(m=>m.key===mes) ? mes : months[0]?.key;
  if (selected) {
   const total = months.find(m=>m.key===selected)?.total ?? 0;
   const requestedPage = pagina && /^\d{1,6}$/.test(pagina) ? Number(pagina) : 1;
   currentPage = Math.min(Math.max(1,requestedPage),Math.max(1,Math.ceil(total/PAGE_SIZE)));
   const envelopeResult=await client.execute({sql:`SELECT e.id,e.file_name,e.created_at FROM signing_envelopes e WHERE e.owner_id=? AND substr(e.created_at,1,7)=? AND ${where} ORDER BY e.created_at DESC,e.id DESC LIMIT ? OFFSET ?`,args:[session.user.id,selected,PAGE_SIZE,(currentPage-1)*PAGE_SIZE]});
   const envelopeRows=envelopeResult.rows;
   if(envelopeRows.length){
    const placeholders=envelopeRows.map(()=>'?').join(',');
    const result=await client.execute({sql:`SELECT r.id,r.envelope_id,e.file_name,r.email,r.status,r.created_at,r.expires_at,r.signed_at,r.document_id,(SELECT s.id FROM envelope_signatures s WHERE s.recipient_id=r.id LIMIT 1) AS signature_id,m.status AS email_status,(SELECT COUNT(*) FROM envelope_recipients rr WHERE rr.envelope_id=r.envelope_id) AS recipient_count,(SELECT COUNT(*) FROM envelope_recipients rr WHERE rr.envelope_id=r.envelope_id AND rr.status='signed') AS signed_count FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id LEFT JOIN invitation_email_deliveries m ON m.recipient_id=r.id WHERE r.envelope_id IN (${placeholders}) ORDER BY r.created_at,r.id`,args:envelopeRows.map(row=>String(row.id))});
    invitations=result.rows.map(row=>({envelopeId:String(row.envelope_id),id:String(row.id),fileName:String(row.file_name),recipientEmail:String(row.email),status:String(row.status),createdAt:String(row.created_at),expiresAt:String(row.expires_at),signedAt:row.signed_at==null?null:String(row.signed_at),documentId:row.document_id==null?null:String(row.document_id),signatureId:row.signature_id==null?null:String(row.signature_id),emailStatus:row.email_status==null?null:String(row.email_status),signedCount:Number(row.signed_count),recipientCount:Number(row.recipient_count)}));
   }
   envelopes=envelopeRows.map(row=>({id:String(row.id),fileName:String(row.file_name),createdAt:String(row.created_at),recipients:invitations.filter(invitation=>invitation.envelopeId===String(row.id))}));

  }
 } catch { error = true; }
 const years = [...new Set(months.map(m=>m.key.slice(0,4)))];
 const selectedTotal = months.find(m=>m.key===selected)?.total ?? 0;
 const totalPages = Math.ceil(selectedTotal/PAGE_SIZE);
 const pageHref = (page:number) => '/convidar?status='+filter+'&mes='+encodeURIComponent(selected??'')+'&pagina='+page;

 return <main>
  <section className="hero">
   <span className="eyebrow">Assinatura por terceiros</span>
   <h1>Enviar para assinatura</h1>
   <p className="lead">Prepare um documento, convide os signatários e acompanhe o resultado.</p>
  </section>
  <InviteForm />
  <section style={{marginTop:'2rem'}}>
   <span className="eyebrow">Área do remetente</span>
   <h2>Convites enviados</h2>
   <p className="account-line">Consulte os convites por ano e mês. Atualize a página para ver novas assinaturas.</p>
   <nav className="actions" aria-label="Filtrar convites por situação" style={{margin:'1.25rem 0',flexWrap:'wrap'}}>{FILTERS.map(x=><a key={x.key} className={filter===x.key?'button-link':'secondary-link'} href={'/convidar?status='+x.key}>{x.label}</a>)}</nav>
   <div className="documents-layout">
    <aside className="panel documents-sidebar">
     <h2>Períodos</h2>
     {years.length===0 ? <p className="account-line">Nenhum período disponível.</p> : years.map(year=><section key={year}>
      <h3>{year}</h3>
      <div className="month-list">{months.filter(m=>m.key.startsWith(year)).map(m=>
       <a key={m.key} className={m.key===selected?'month-link active':'month-link'} href={'/convidar?status='+filter+'&mes='+m.key}>
        <span>{monthName(m.key).replace(/ de \d{4}$/,'')}</span><span>{m.total}</span>
       </a>)}</div>
     </section>)}
    </aside>
    <section className="panel documents-main">
     {error ? <p role="alert">Não foi possível carregar os convites. Tente atualizar a página.</p>
      : months.length===0 ? <><h2>Nenhum convite enviado ainda</h2><p>Crie o primeiro convite no formulário acima.</p></>
      : <>
       <span className="eyebrow">Histórico de convites</span>
       <h2>{selected?monthTitle(selected):'Convites'}</h2>
       <p className="account-line">{selectedTotal} {selectedTotal===1?'contrato':'contratos'} neste período · Página {currentPage} de {totalPages}</p>
       {invitations.length===0?<p>Nenhum convite com esta situação no período.</p>:null}
       <div className="document-list">
        {envelopes.map(envelope=><article className="document-item" key={envelope.id} style={{display:'block'}}>
         <strong>{envelope.fileName}</strong>
         <p className="account-line">Criado em {dateLabel(envelope.createdAt)} · Contrato: {envelope.recipients.filter(r=>r.status==='signed').length} de {envelope.recipients.length} assinaturas · {envelope.recipients.every(r=>r.status==='signed')?'Assinado por todos':'Aguardando assinaturas'}</p>
         {(()=>{const signed=envelope.recipients.filter(r=>r.status==='signed'&&(r.signatureId||r.documentId));const representative=signed[0];const id=representative?.signatureId??representative?.documentId;return id?<div className="actions invitation-item-actions" style={{marginTop:'0.85rem',flexWrap:'wrap'}}><a className="secondary-link" href={`/api/documents/${id}`}>PDF original</a><a className="secondary-link" href={`/api/documents/${id}/combined`}>{envelope.recipients.every(r=>r.status==='signed')?'Contrato com comprovantes':`Versão parcial (${signed.length}/${envelope.recipients.length})`}</a><a className="secondary-link" href={`/verify/${id}`}>Verificar contrato</a></div>:null;})()}
         <div style={{marginTop:'1rem',marginLeft:'clamp(12px, 3vw, 32px)',paddingLeft:'1rem',borderLeft:'3px solid #d7dfda'}}>{envelope.recipients.map(invitation=><div key={invitation.id} style={{padding:'1rem 0',borderTop:'1px solid #ddd'}}>
          <div><strong>{invitation.recipientEmail}</strong><p className="account-line">Prazo: {dateLabel(invitation.expiresAt)} · E-mail: {invitation.emailStatus==='delivered'?'Entregue':invitation.emailStatus==='accepted'?'Aceito para envio':invitation.emailStatus==='bounced'?'Devolvido':invitation.emailStatus==='failed'?'Falha no envio':'Sem confirmação de entrega'}</p><p className="invitation-status-line"><span className={`invitation-status invitation-status--${statusClass(invitation)}`}>{statusLabel(invitation)}</span>{invitation.signedAt?<span className="account-line">Assinado em {dateLabel(invitation.signedAt)}</span>:null}</p></div>
          <div className="actions invitation-item-actions">{invitation.status==='signed'&&(invitation.signatureId||invitation.documentId)?<><a className="secondary-link" href={`/verify/${invitation.signatureId??invitation.documentId}`}>Verificar assinatura individual</a><details className="invitation-receipts" style={{maxWidth:"100%",minWidth:0}}><summary>Link e código</summary><div style={{width:"min(100%,560px)",maxWidth:"100%"}}><VerificationShare id={invitation.signatureId??invitation.documentId??''}/></div></details><details className="invitation-receipts"><summary>Comprovantes técnicos</summary><div className="invitation-receipts-links"><a href={`/api/documents/${invitation.signatureId??invitation.documentId}/receipt/pdf`}>Baixar PDF</a><a href={`/api/documents/${invitation.signatureId??invitation.documentId}/receipt`}>Baixar JSON</a></div></details></>:null}{invitation.status==='pending'||invitation.status==='expired'?<RenewInvite id={invitation.id} expired={invitation.status==='expired'||Date.parse(invitation.expiresAt)<=Date.now()}/>:null}{invitation.status==='pending'&&Date.parse(invitation.expiresAt)>Date.now()?<CancelInvite id={invitation.id}/>:null}</div>
         </div>)}</div>
        </article>)}
       </div>
       {totalPages>1?<nav className="actions" aria-label="Páginas dos convites" style={{marginTop:'1.5rem'}}>
        {currentPage>1?<a className="secondary-link" href={pageHref(currentPage-1)}>← Anterior</a>:null}
        <span className="account-line">Página {currentPage} de {totalPages}</span>
        {currentPage<totalPages?<a className="secondary-link" href={pageHref(currentPage+1)}>Próxima →</a>:null}
       </nav>:null}
      </>}
    </section>
   </div>
  </section>
 </main>;
}
