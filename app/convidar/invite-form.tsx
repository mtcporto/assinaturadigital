'use client';
import { useState } from 'react';
export function InviteForm(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[url,setUrl]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage('');setUrl('');
  try{
   const response=await fetch('/api/envelopes',{method:'POST',body:new FormData(e.currentTarget)});
   const data=await response.json();
   if(!response.ok){setMessage('Não foi possível criar o convite ('+(data.error??response.status)+'). Confira se a migração 003 foi aplicada.');return;}
   setUrl(data.invitationUrl);setMessage('Convite criado. O envio é manual nesta primeira etapa. O link expira em 7 dias.');
  }catch{setMessage('Falha de conexão ao criar convite.');}finally{setBusy(false);}
 }
 return <section className="panel signing-panel"><h2>Convidar para assinar</h2><p>Crie um convite individual para outra pessoa. O documento fica armazenado de forma privada.</p>
 <form className="invite-form" onSubmit={submit}><label htmlFor="invite-pdf">Documento PDF (até 5 MB)</label><input className="invite-file" id="invite-pdf" name="file" type="file" accept="application/pdf,.pdf" required/>
 <label htmlFor="invite-email">E-mail do destinatário</label><input className="invite-input" id="invite-email" name="email" type="email" maxLength={254} required placeholder="pessoa@exemplo.com"/>
 <button className="primary-button" type="submit" disabled={busy}>{busy?'Criando…':'Criar convite'}</button></form>
 {message&&<p role="status">{message}</p>}
 {url&&<div className="invite-result result-panel"><label htmlFor="invite-link">Link individual (não compartilhe publicamente)</label><input className="invite-input mono" id="invite-link" readOnly value={url} onFocus={e=>e.currentTarget.select()}/><button className="primary-button" type="button" onClick={()=>navigator.clipboard.writeText(url).then(()=>setMessage('Link copiado. Envie somente ao destinatário.')).catch(()=>setMessage('Selecione e copie o link acima.'))}>Copiar link</button></div>}
 <p className="account-line">Nesta etapa, o convite permite consultar seu estado; a assinatura do destinatário será implementada na próxima etapa. Nenhum e-mail é enviado automaticamente.</p>
 </section>;
}
