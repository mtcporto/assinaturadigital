import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db } from '../../lib/db';
import { InviteForm } from './invite-form';
import { CancelInvite } from './cancel-invite';
import { RenewInvite } from './renew-invite';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 25;

type Invitation = {
 id: string; fileName: string; recipientEmail: string; status: string;
 createdAt: string; expiresAt: string; signedAt: string | null; documentId: string | null;
};
type Month = {key:string; total:number};
type Filter='todos'|'pendentes'|'assinados'|'expirados'|'cancelados';
const FILTERS:{key:Filter;label:string}[]=[{key:'todos',label:'Todos'},{key:'pendentes',label:'Pendentes'},{key:'assinados',label:'Assinados'},{key:'expirados',label:'Expirados'},{key:'cancelados',label:'Cancelados'}];
function condition(filter:Filter){const now="datetime('now')";switch(filter){case 'pendentes':return `r.status='pending' AND r.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ',${now})`;case 'assinados':return "r.status='signed' AND r.document_id IS NOT NULL";case 'expirados':return "(r.status='expired' OR (r.status='pending' AND r.expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ',datetime('now'))))";case 'cancelados':return "r.status='cancelled'";default:return '1=1';}}

const monthName = (key:string) => new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z'));

function statusLabel(row: Invitation) {
 if (row.status === 'signed' && row.documentId) return 'Assinado';
 if (row.status === 'cancelled') return 'Cancelado';
 if (row.status === 'expired' || (row.status === 'pending' && Date.parse(row.expiresAt) <= Date.now())) return 'Expirado';
 return 'Aguardando assinatura';
}
function dateLabel(value: string) {
 const date = new Date(value);
 return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});
}

export default async function InvitePage({searchParams}:{searchParams:Promise<{mes?:string;pagina?:string;status?:string}>}) {
 const session = await auth();
 if (!session?.user?.id) redirect('/login');
 const {mes,pagina,status} = await searchParams;
 const filter:Filter=FILTERS.some(x=>x.key===status)?status as Filter:'todos';
 const where=condition(filter);

 let invitations: Invitation[] = [];
 let months: Month[] = [];
 let error = false;
 let selected: string | undefined;
 let currentPage = 1;
 try {
  const client = db();
  const grouped = await client.execute({
   sql: `SELECT substr(r.created_at,1,7) AS period, COUNT(*) AS total
         FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id
         WHERE e.owner_id=? AND ${where} GROUP BY substr(r.created_at,1,7) ORDER BY period DESC`,
   args: [session.user.id]
  });
  months = grouped.rows.map(r=>({key:String(r.period),total:Number(r.total)})).filter(m=>/^\d{4}-\d{2}$/.test(m.key));
  selected = months.some(m=>m.key===mes) ? mes : months[0]?.key;
  if (selected) {
   const total = months.find(m=>m.key===selected)?.total ?? 0;
   const requestedPage = pagina && /^\d{1,6}$/.test(pagina) ? Number(pagina) : 1;
   currentPage = Math.min(Math.max(1,requestedPage),Math.max(1,Math.ceil(total/PAGE_SIZE)));
   const result = await client.execute({
    sql: `SELECT r.id, e.file_name, r.email, r.status, r.created_at, r.expires_at, r.signed_at, r.document_id
          FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id
          WHERE e.owner_id=? AND substr(r.created_at,1,7)=? AND ${where}
          ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    args: [session.user.id,selected,PAGE_SIZE,(currentPage-1)*PAGE_SIZE]
   });
   invitations = result.rows.map(row=>({
    id:String(row.id),fileName:String(row.file_name),recipientEmail:String(row.email),
    status:String(row.status),createdAt:String(row.created_at),expiresAt:String(row.expires_at),
    signedAt:row.signed_at==null?null:String(row.signed_at),
    documentId:row.document_id==null?null:String(row.document_id)
   }));
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
   <p className="lead">Prepare um documento, convide um destinatário e acompanhe o resultado.</p>
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
       <h2 style={{textTransform:'capitalize'}}>{selected?monthName(selected):'Convites'}</h2>
       <p className="account-line">{selectedTotal} {selectedTotal===1?'convite':'convites'} neste período · Página {currentPage} de {totalPages}</p>
       {invitations.length===0?<p>Nenhum convite com esta situação no período.</p>:null}
       <div className="document-list">
        {invitations.map(invitation=><article className="document-item" key={invitation.id}>
         <div>
          <strong>{invitation.fileName}</strong>
          <p className="account-line">Destinatário: {invitation.recipientEmail}</p>
          <p className="account-line">Criado em {dateLabel(invitation.createdAt)} · Prazo: {dateLabel(invitation.expiresAt)}</p>
          <p><strong>Situação: {statusLabel(invitation)}</strong>{invitation.signedAt?` · Assinado em ${dateLabel(invitation.signedAt)}`:''}</p>
         </div>
         <div className="actions">{invitation.status==='signed'&&invitation.documentId?
          <><a className="secondary-link" href={`/api/documents/${invitation.documentId}`}>Baixar PDF assinado</a><a className="secondary-link" href={`/verify/${invitation.documentId}`}>Verificar assinatura</a><a className="secondary-link" href={`/api/documents/${invitation.documentId}/receipt/pdf`}>Comprovante PDF</a><a className="secondary-link" href={`/api/documents/${invitation.documentId}/receipt`}>Comprovante JSON</a></>:null}{invitation.status==='pending'||invitation.status==='expired'?<RenewInvite id={invitation.id} expired={invitation.status==='expired'||Date.parse(invitation.expiresAt)<=Date.now()}/>:null}{invitation.status==='pending'&&Date.parse(invitation.expiresAt)>Date.now()?<CancelInvite id={invitation.id}/>:null}</div>
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
