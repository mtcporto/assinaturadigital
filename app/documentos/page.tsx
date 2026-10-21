import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db } from '../../lib/db';
import { IntegrityButton } from './integrity-button';
import { dateTimeBR } from '../../lib/datetime';
export const dynamic = 'force-dynamic';
const PAGE_SIZE=25;
type Doc = {id:string;fileName:string;createdAt:string;status:string};
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
  const grouped=await client.execute({sql:`SELECT substr(created_at,1,7) AS period, COUNT(*) AS total FROM documents WHERE signer_id=? GROUP BY substr(created_at,1,7) ORDER BY period DESC`,args:[session.user.id]});
  months=grouped.rows.map(r=>({key:String(r.period),total:Number(r.total)})).filter(m=>/^\d{4}-\d{2}$/.test(m.key));
  const active=months.some(m=>m.key===mes)?mes:months[0]?.key;
  if(active){
   const total=months.find(m=>m.key===active)?.total??0;
   const requested=pagina&&/^\d{1,6}$/.test(pagina)?Number(pagina):1;
   currentPage=Math.min(Math.max(1,requested),Math.max(1,Math.ceil(total/PAGE_SIZE)));
   const result=await client.execute({sql:`SELECT d.id,d.created_at,d.status,
     (SELECT json_extract(a.details_json,'$.fileName') FROM audit_events a
      WHERE a.document_id=d.id AND a.event_type IN ('signed','signed_webauthn') ORDER BY a.created_at LIMIT 1) AS file_name,
     (SELECT e.file_name FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id WHERE r.document_id=d.id LIMIT 1) AS envelope_file_name
     FROM documents d WHERE d.signer_id=? AND substr(d.created_at,1,7)=? ORDER BY d.created_at DESC,d.id DESC LIMIT ? OFFSET ?`,args:[session.user.id,active,PAGE_SIZE,(currentPage-1)*PAGE_SIZE]});
   docs=result.rows.map(r=>({id:String(r.id),fileName:typeof r.file_name==='string'?r.file_name:typeof r.envelope_file_name==='string'?r.envelope_file_name:'Documento PDF',createdAt:String(r.created_at),status:String(r.status)}));
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
 <section className="panel documents-main">{error?<p role="alert">Não foi possível carregar seus documentos agora.</p>:months.length===0?<><h2>Nenhum documento registrado ainda</h2><p>Os documentos registrados aparecerão aqui.</p><a className="button-link" href="/">Assinar primeiro documento →</a></>:<><span className="eyebrow">Histórico de assinaturas</span><h2>{selected?monthTitle(selected):'Documentos'}</h2><p className="account-line">{total} registros neste período · Página {currentPage} de {pages}</p><div className="document-list">{docs.map(d=><article className="document-item invitation-item" key={d.id}><div className="invitation-info"><strong className="invitation-filename">{d.fileName}</strong><p className="account-line">{dateTimeBR(d.createdAt)} · {d.status==='signed'?'Registrado':'Revogado'}</p><code className="mono">{d.id}</code></div><div className="actions invitation-item-actions"><a className="secondary-link" href={`/verify/${d.id}`}>Verificar</a><a className="secondary-link" href={`/api/documents/${d.id}`}>Baixar documento</a><details className="invitation-receipts"><summary>Comprovantes</summary><div className="invitation-receipts-links"><a href={`/api/documents/${d.id}/receipt/pdf`}>Baixar PDF</a><a href={`/api/documents/${d.id}/receipt`}>Baixar JSON</a></div></details><IntegrityButton id={d.id} /></div></article>)}</div>{pages>1?<nav className="actions" aria-label="Páginas dos documentos">{currentPage>1?<a className="secondary-link" href={pageHref(currentPage-1)}>← Anterior</a>:null}<span className="account-line">Página {currentPage} de {pages}</span>{currentPage<pages?<a className="secondary-link" href={pageHref(currentPage+1)}>Próxima →</a>:null}</nav>:null}</>}</section></div></main>;
}
