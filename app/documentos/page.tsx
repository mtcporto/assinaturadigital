import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db } from '../../lib/db';
import { IntegrityButton } from './integrity-button';
import { VerificationShare } from '../components/verification-share';
import { dateTimeBR } from '../../lib/datetime';
export const dynamic = 'force-dynamic';
const PAGE_SIZE=25;
type Doc = {id:string;fileName:string;createdAt:string;status:string;shared:boolean;signedCount:number;recipientCount:number};
type Month = {key:string;total:number};
const monthName=(key:string)=>new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z'));
const monthTitle=(key:string)=>{const label=monthName(key);return label.charAt(0).toUpperCase()+label.slice(1);};
export default async function DocumentsPage({searchParams}:{searchParams:Promise<{mes?:string;pagina?:string}>}) {
 const session=await auth();
 if (!session?.user?.id) redirect('/login');
 const {mes,pagina}=await searchParams;
 let months:Month[]=[];let docs:Doc[]=[];let error=false;let currentPage=1;
 try {
  const client=db();
  const grouped=await client.execute({sql:`SELECT period,COUNT(*) AS total FROM (SELECT substr(created_at,1,7) AS period FROM documents WHERE signer_id=? UNION ALL SELECT substr(s.signed_at,1,7) AS period FROM envelope_signatures s JOIN envelope_recipients r ON r.id=s.recipient_id WHERE s.signer_id=? AND r.status='signed' AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.id=s.id)) GROUP BY period ORDER BY period DESC`,args:[session.user.id,session.user.id]});
  months=grouped.rows.map(r=>({key:String(r.period),total:Number(r.total)})).filter(m=>/^\d{4}-\d{2}$/.test(m.key));
  const active=months.some(m=>m.key===mes)?mes:months[0]?.key;
  if(active){
   const total=months.find(m=>m.key===active)?.total??0;
   const requested=pagina&&/^\d{1,6}$/.test(pagina)?Number(pagina):1;
   currentPage=Math.min(Math.max(1,requested),Math.max(1,Math.ceil(total/PAGE_SIZE)));
   const result=await client.execute({sql:`SELECT id,created_at,status,file_name,envelope_file_name,shared,envelope_id FROM (
    SELECT d.id,d.created_at,d.status,
      (SELECT json_extract(a.details_json,'$.fileName') FROM audit_events a WHERE a.document_id=d.id AND a.event_type IN ('signed','signed_webauthn') ORDER BY a.created_at LIMIT 1) AS file_name,
      (SELECT e.file_name FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id WHERE r.document_id=d.id LIMIT 1) AS envelope_file_name,
      0 AS shared,
      (SELECT r.envelope_id FROM envelope_recipients r WHERE r.document_id=d.id LIMIT 1) AS envelope_id
    FROM documents d WHERE d.signer_id=? AND substr(d.created_at,1,7)=?
    UNION ALL
    SELECT s.id,s.signed_at AS created_at,'signed' AS status,NULL AS file_name,e.file_name AS envelope_file_name,1 AS shared,s.envelope_id
    FROM envelope_signatures s JOIN signing_envelopes e ON e.id=s.envelope_id JOIN envelope_recipients r ON r.id=s.recipient_id
    WHERE s.signer_id=? AND r.status='signed' AND substr(s.signed_at,1,7)=? AND NOT EXISTS(SELECT 1 FROM documents d WHERE d.id=s.id)
   ) ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,args:[session.user.id,active,session.user.id,active,PAGE_SIZE,(currentPage-1)*PAGE_SIZE]});
   const envelopeIds=[...new Set(result.rows.map(row=>row.envelope_id).filter((id):id is string=>typeof id==='string'))];
   const counts=new Map<string,{signed:number;total:number}>();
   for(const envelopeId of envelopeIds){const progress=await client.execute({sql:"SELECT COUNT(*) AS total,SUM(CASE WHEN status='signed' THEN 1 ELSE 0 END) AS signed FROM envelope_recipients WHERE envelope_id=?",args:[envelopeId]});counts.set(envelopeId,{total:Number(progress.rows[0]?.total??0),signed:Number(progress.rows[0]?.signed??0)});}
   docs=result.rows.map(r=>({id:String(r.id),fileName:typeof r.envelope_file_name==='string'?r.envelope_file_name:typeof r.file_name==='string'?r.file_name:'Documento PDF',createdAt:String(r.created_at),status:String(r.status),shared:Number(r.shared)===1,signedCount:typeof r.envelope_id==='string'?counts.get(r.envelope_id)?.signed??1:1,recipientCount:typeof r.envelope_id==='string'?counts.get(r.envelope_id)?.total??1:1}));

  }
 } catch {error=true;}
 const selected=months.some(m=>m.key===mes)?mes:months[0]?.key;
 const years=[...new Set(months.map(m=>m.key.slice(0,4)))];
 const total=months.find(m=>m.key===selected)?.total??0;
 const pages=Math.ceil(total/PAGE_SIZE);
 const pageHref=(page:number)=>'/documentos?mes='+encodeURIComponent(selected??'')+'&pagina='+page;
 return <main><section className="hero"><span className="eyebrow">Área privada</span><h1>Meus documentos</h1><p className="lead">Encontre suas assinaturas por mês e ano, sem percorrer uma lista interminável.</p></section>
 <div className="documents-layout">
 <aside className="panel documents-sidebar"><h2>Períodos</h2>{years.map(year=><section key={year}><h3>{year}</h3><div className="month-list">{months.filter(m=>m.key.startsWith(year)).map(m=><a key={m.key} className={m.key===selected?'month-link active':'month-link'} href={'/documentos?mes='+m.key}><span>{monthName(m.key).replace(/ de \d{4}$/,'')}</span><span>{m.total}</span></a>)}</div></section>)}</aside>
 <section className="panel documents-main">{error?<p role="alert">Não foi possível carregar seus documentos agora.</p>:months.length===0?<><h2>Nenhum documento registrado ainda</h2><p>Os documentos registrados aparecerão aqui.</p><a className="button-link" href="/">Assinar primeiro documento →</a></>:<><span className="eyebrow">Histórico de assinaturas</span><h2>{selected?monthTitle(selected):'Documentos'}</h2><p className="account-line">{total} registros neste período · Página {currentPage} de {pages}</p><div className="document-list">{docs.map(d=><article className="document-item invitation-item" key={d.id}><div className="invitation-info"><strong className="invitation-filename">{d.fileName}</strong><p className="account-line">{dateTimeBR(d.createdAt)} · {d.status==='signed'?'Registrado':'Revogado'}</p>{d.recipientCount>1?<p className="account-line">Contrato: {d.signedCount} de {d.recipientCount} assinaturas · {d.signedCount===d.recipientCount?'Assinado por todos':'Aguardando outras assinaturas'}</p>:null}<details><summary style={{cursor:'pointer'}}>Link e código de verificação</summary><VerificationShare id={d.id}/></details></div><div className="actions invitation-item-actions"><a className="secondary-link" href={`/verify/${d.id}`}>Verificar</a><a className="secondary-link" href={`/api/documents/${d.id}`}>Baixar documento</a><details className="invitation-receipts"><summary>Comprovantes</summary><div className="invitation-receipts-links"><a href={`/api/documents/${d.id}/receipt/pdf`}>Baixar PDF</a><a href={`/api/documents/${d.id}/receipt`}>Baixar JSON</a></div></details>{!d.shared&&<IntegrityButton id={d.id} />}</div></article>)}</div>{pages>1?<nav className="actions" aria-label="Páginas dos documentos">{currentPage>1?<a className="secondary-link" href={pageHref(currentPage-1)}>← Anterior</a>:null}<span className="account-line">Página {currentPage} de {pages}</span>{currentPage<pages?<a className="secondary-link" href={pageHref(currentPage+1)}>Próxima →</a>:null}</nav>:null}</>}</section></div></main>;
}
