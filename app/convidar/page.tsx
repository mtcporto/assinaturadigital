import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db } from '../../lib/db';
import { InviteForm } from './invite-form';

export const dynamic = 'force-dynamic';

type Invitation = {
 id: string; fileName: string; recipientEmail: string; status: string;
 createdAt: string; expiresAt: string; signedAt: string | null; documentId: string | null;
};

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

export default async function InvitePage() {
 const session = await auth();
 if (!session?.user?.id) redirect('/login');

 let invitations: Invitation[] = [];
 let error = false;
 try {
  const result = await db().execute({
   sql: `SELECT r.id, e.file_name, r.email, r.status, r.created_at, r.expires_at, r.signed_at, r.document_id
         FROM envelope_recipients r
         JOIN signing_envelopes e ON e.id = r.envelope_id
         WHERE e.owner_id = ?
         ORDER BY r.created_at DESC LIMIT 100`,
   args: [session.user.id]
  });
  invitations = result.rows.map(row => ({
   id: String(row.id), fileName: String(row.file_name), recipientEmail: String(row.email),
   status: String(row.status), createdAt: String(row.created_at), expiresAt: String(row.expires_at),
   signedAt: row.signed_at == null ? null : String(row.signed_at),
   documentId: row.document_id == null ? null : String(row.document_id)
  }));
 } catch { error = true; }

 return <main>
  <section className="hero">
   <span className="eyebrow">Assinatura por terceiros</span>
   <h1>Enviar para assinatura</h1>
   <p className="lead">Prepare um documento, convide um destinatário e acompanhe o resultado.</p>
  </section>
  <InviteForm />
  <section className="panel" style={{marginTop:'2rem'}}>
   <span className="eyebrow">Área do remetente</span>
   <h2>Convites enviados</h2>
   <p className="account-line">Acompanhe os convites criados por esta conta. Os dados são atualizados ao recarregar a página.</p>
   {error ? <p role="alert">Não foi possível carregar os convites. Tente atualizar a página.</p>
    : invitations.length === 0 ? <p>Nenhum convite enviado ainda. Crie o primeiro acima.</p>
    : <div className="document-list">
      {invitations.map(invitation => <article className="document-item" key={invitation.id}>
       <div>
        <strong>{invitation.fileName}</strong>
        <p className="account-line">Destinatário: {invitation.recipientEmail}</p>
        <p className="account-line">Criado em {dateLabel(invitation.createdAt)} · Prazo: {dateLabel(invitation.expiresAt)}</p>
        <p><strong>Situação: {statusLabel(invitation)}</strong>{invitation.signedAt ? ` · Assinado em ${dateLabel(invitation.signedAt)}` : ''}</p>
       </div>
       <div className="actions">
        {invitation.status === 'signed' && invitation.documentId ? <>
         <a className="secondary-link" href={`/verify/${invitation.documentId}`}>Verificar assinatura</a>
        </> : null}
       </div>
      </article>)}
     </div>}
   {invitations.length === 100 ? <p className="notice">Exibindo os 100 convites mais recentes.</p> : null}
  </section>
 </main>;
}
