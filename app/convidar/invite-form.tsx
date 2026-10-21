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
   setUrl(data.invitationUrl);setMessage(data.delivery==='sent'?'Convite criado! O Selo enviou o convite por e-mail. O link expira em 7 dias.':data.delivery==='not_configured'?'Convite criado, mas o envio por e-mail não está configurado. Copie o link abaixo.':'Convite criado, mas não foi possível enviar o e-mail. Copie o link abaixo.');
  }catch{setMessage('Falha de conexão ao criar convite.');}finally{setBusy(false);}
 }
 return <section className="panel signing-panel"><h2>Convidar para assinar</h2><p>Crie um convite individual para outra pessoa. O documento fica armazenado de forma privada.</p>
 <form className="invite-form" onSubmit={submit}><label htmlFor="invite-pdf">Documento PDF (até 5 MB)</label><input className="invite-file" id="invite-pdf" name="file" type="file" accept="application/pdf,.pdf" required/>
 <label htmlFor="invite-email">E-mail do destinatário</label><input className="invite-input" id="invite-email" name="email" type="email" maxLength={254} required placeholder="pessoa@exemplo.com"/>
 <button className="primary-button" type="submit" disabled={busy}>{busy?'Criando…':'Criar convite'}</button></form>
 {message&&<p role="status">{message}</p>}
 {url&&<div className="invite-result result-panel"><label htmlFor="invite-link">Link individual (não compartilhe publicamente)</label><input className="invite-input mono" id="invite-link" readOnly value={url} onFocus={e=>e.currentTarget.select()}/><button className="primary-button" type="button" onClick={()=>navigator.clipboard.writeText(url).then(()=>setMessage('Link copiado. Envie somente ao destinatário.')).catch(()=>setMessage('Selecione e copie o link acima.'))}>Copiar link</button></div>}
 <p className="account-line">O destinatário pode visualizar e assinar o documento com sua própria conta e passkey. O Selo tenta enviar o convite por e-mail automaticamente; o link também fica disponível para compartilhamento manual.</p>
 </section>;
}
