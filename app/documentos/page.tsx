import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db } from '../../lib/db';
import { IntegrityButton } from './integrity-button';
export const dynamic = 'force-dynamic';
type Doc = {id:string;fileName:string;createdAt:string;status:string};
type Month = {key:string;total:number};
const monthName=(key:string)=>new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z'));
export default async function DocumentsPage({searchParams}:{searchParams:Promise<{mes?:string}>}) {
 const session=await auth();
 if (!session?.user?.id) redirect('/login');
 const {mes}=await searchParams;
 let months:Month[]=[];let docs:Doc[]=[];let error=false;
 try {
  const client=db();
  const grouped=await client.execute({sql:`SELECT substr(created_at,1,7) AS period, COUNT(*) AS total FROM documents WHERE signer_id=? GROUP BY substr(created_at,1,7) ORDER BY period DESC`,args:[session.user.id]});
  months=grouped.rows.map(r=>({key:String(r.period),total:Number(r.total)})).filter(m=>/^\d{4}-\d{2}$/.test(m.key));
  const active=months.some(m=>m.key===mes)?mes:months[0]?.key;
  if(active){
   const result=await client.execute({sql:`SELECT d.id,d.created_at,d.status,
     (SELECT json_extract(a.details_json,'$.fileName') FROM audit_events a
      WHERE a.document_id=d.id AND a.event_type IN ('signed','signed_webauthn') ORDER BY a.created_at LIMIT 1) AS file_name
     FROM documents d WHERE d.signer_id=? AND substr(d.created_at,1,7)=? ORDER BY d.created_at DESC LIMIT 100`,args:[session.user.id,active]});
   docs=result.rows.map(r=>({id:String(r.id),fileName:typeof r.file_name==='string'?r.file_name:'Documento PDF',createdAt:String(r.created_at),status:String(r.status)}));
  }
 } catch {error=true;}
 const selected=months.some(m=>m.key===mes)?mes:months[0]?.key;
 const years=[...new Set(months.map(m=>m.key.slice(0,4)))];
 return <main><section className="hero"><span className="eyebrow">Área privada</span><h1>Meus documentos</h1><p className="lead">Encontre suas assinaturas por mês e ano, sem percorrer uma lista interminável.</p></section>
 <div className="documents-layout">
 <aside className="panel documents-sidebar"><h2>Períodos</h2>{years.map(year=><section key={year}><h3>{year}</h3><div className="month-list">{months.filter(m=>m.key.startsWith(year)).map(m=><a key={m.key} className={m.key===selected?'month-link active':'month-link'} href={'/documentos?mes='+m.key}><span>{monthName(m.key).replace(/ de \d{4}$/,'')}</span><span>{m.total}</span></a>)}</div></section>)}</aside>
 <section className="panel documents-main">{error?<p role="alert">Não foi possível carregar seus documentos agora.</p>:months.length===0?<><h2>Nenhum documento registrado ainda</h2><p>Os documentos registrados aparecerão aqui.</p><a className="button-link" href="/">Assinar primeiro documento →</a></>:<><span className="eyebrow">Histórico de assinaturas</span><h2 style={{textTransform:'capitalize'}}>{selected?monthName(selected):'Documentos'}</h2><p className="account-line">{months.find(m=>m.key===selected)?.total??0} registros neste período</p><div className="document-list">{docs.map(d=><article className="document-item" key={d.id}><div><strong>{d.fileName}</strong><p className="account-line">{new Date(d.createdAt).toLocaleString('pt-BR')} · {d.status==='signed'?'Registrado':'Revogado'}</p><code className="mono">{d.id}</code></div><div className="actions"><a className="secondary-link" href={`/verify/${d.id}`}>Verificar</a><a className="secondary-link" href={`/api/documents/${d.id}`}>PDF original</a><a className="secondary-link" href={`/api/documents/${d.id}/receipt`}>Comprovante</a><IntegrityButton id={d.id} /></div></article>)}</div>{(months.find(m=>m.key===selected)?.total??0)>100&&<p className="notice">Exibindo os 100 registros mais recentes deste mês. A paginação completa será adicionada.</p>}</>}</section></div></main>;
}
