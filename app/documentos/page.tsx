import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db } from '../../lib/db';
export const dynamic = 'force-dynamic';
export default async function DocumentsPage() {
 const session = await auth();
 if (!session?.user?.id) redirect('/login');
 let docs: {id:string;fileName:string;createdAt:string;status:string}[] = [];
 let error = false;
 try {
  const result = await db().execute({
   sql: `SELECT d.id,d.created_at,d.status,
      (SELECT json_extract(a.details_json,'$.fileName') FROM audit_events a
       WHERE a.document_id=d.id AND a.event_type='signed' ORDER BY a.created_at LIMIT 1) AS file_name
      FROM documents d WHERE d.signer_id=? ORDER BY d.created_at DESC LIMIT 100`,
   args: [session.user.id]
  });
  docs = result.rows.map(r => ({id:String(r.id),fileName:typeof r.file_name==='string'?r.file_name:'Documento PDF',createdAt:String(r.created_at),status:String(r.status)}));
 } catch {error=true;}
 return <main><section className="hero"><span className="eyebrow">Área privada</span><h1>Meus documentos</h1><p className="lead">Consulte os registros associados à sua conta Google.</p></section>
 <section className="panel" style={{marginBottom:48}}>{error?<p role="alert">Não foi possível carregar seus documentos agora.</p>:docs.length===0?<><h2>Nenhum documento registrado ainda</h2><p>Os PDFs assinados aparecerão aqui.</p><a className="button-link" href="/">Assinar primeiro documento →</a></>:<><h2>{docs.length} {docs.length===1?'documento':'documentos'}</h2><div className="document-list">{docs.map(d=><article className="document-item" key={d.id}><div><strong>{d.fileName}</strong><p className="account-line">{new Date(d.createdAt).toLocaleString('pt-BR')} · {d.status==='signed'?'Registro válido':'Revogado'}</p><code className="mono">{d.id}</code></div><div className="actions"><a className="secondary-link" href={`/verify/${d.id}`}>Verificar</a><a className="secondary-link" href={`/api/documents/${d.id}`}>PDF original</a></div></article>)}</div></>}</section></main>;
}
