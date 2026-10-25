'use client';
import { useState } from 'react';
export function InviteForm(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[url,setUrl]=useState('');
 const [fileError,setFileError]=useState('');
 const [extraEmails,setExtraEmails]=useState<string[]>([]);
 const [links,setLinks]=useState<{recipientEmail:string;invitationUrl:string;delivery:string}[]>([]);
 const MAX_PDF_BYTES=5*1024*1024;
 const formatMB=(bytes:number)=>(bytes/(1024*1024)).toLocaleString('pt-BR',{maximumFractionDigits:1});
 function checkFile(file:File|null){
  if(!file){setFileError('');return false;}
  const error=file.size>MAX_PDF_BYTES?`Arquivo muito grande. O PDF selecionado tem ${formatMB(file.size)} MB, mas o limite permitido é de 5 MB. Escolha um arquivo menor para continuar.`:file.size<8?'O arquivo selecionado está vazio ou é inválido. Escolha outro PDF.':!file.name.toLowerCase().endsWith('.pdf')?'Selecione um arquivo PDF.':'';
  setFileError(error);
  return !error;
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=e.currentTarget;
  const selected=form.querySelector<HTMLInputElement>('input[name="file"]')?.files?.[0]??null;
  if(!checkFile(selected))return;
  const emails=[String(new FormData(form).get('email')??''),...extraEmails].map(email=>email.trim().toLowerCase());
  if(new Set(emails).size!==emails.length){setMessage('Cada signatário deve ter um e-mail diferente.');return;}
  setBusy(true);setMessage('');setUrl('');setLinks([]);
  try{
   const payload=new FormData(form);
   if(extraEmails.length){payload.delete('email');for(const email of emails)payload.append('emails',email);}
   const response=await fetch('/api/envelopes',{method:'POST',body:payload});
   const data: {message?:string;error?:string;invitationUrl?:string;delivery?:string;recipients?:{recipientEmail:string;invitationUrl:string;delivery:string}[]} | null = await response.json().catch(()=>null);
   if(!response.ok){if(response.status===422){setFileError(data?.message??'Este PDF não é compatível com o Selo. Exporte uma cópia sem proteção e tente novamente.');return;}setMessage(response.status===413?'Arquivo muito grande. O limite permitido é de 5 MB. Selecione um PDF menor.':'Não foi possível criar o convite (HTTP '+response.status+(data?.error?' — '+data.error:'')+').');return;}
   if(!data?.invitationUrl){setMessage('O servidor respondeu sem um link de convite. Confira o histórico antes de tentar novamente.');return;}
   setUrl(data.invitationUrl);setLinks(data.recipients??[]);setMessage(data.delivery==='sent'?'Convite criado! O Selo enviou os convites por e-mail. Os links expiram em 7 dias.':'Convite criado. Confira os links abaixo e compartilhe individualmente com cada destinatário cujo e-mail não foi entregue.');
  }catch(error){setMessage('Não foi possível completar a solicitação. Confira o histórico antes de tentar novamente.');console.error('invite_request_failed',error);}finally{setBusy(false);}
 }
 return <section className="panel signing-panel"><h2>Convidar para assinar</h2><p>Convide até 10 pessoas para assinar o mesmo documento. O documento fica armazenado de forma privada.</p>
 <form className="invite-form" onSubmit={submit}><label htmlFor="invite-pdf">Documento PDF (até 5 MB)</label><input className="invite-file" id="invite-pdf" name="file" type="file" accept="application/pdf,.pdf" required aria-invalid={!!fileError} aria-describedby={fileError?'invite-file-error':undefined} onChange={e=>{checkFile(e.currentTarget.files?.[0]??null);setMessage('');setUrl('');}}/>{fileError&&<p id="invite-file-error" role="alert">{fileError}</p>}
 <label htmlFor="invite-email">E-mail do destinatário</label><input className="invite-input" id="invite-email" name="email" type="email" maxLength={254} required placeholder="pessoa@exemplo.com"/>
 {extraEmails.map((email,index)=><div key={index}><label htmlFor={'invite-extra-'+index}>E-mail do signatário {index+2}</label><div className="actions"><input className="invite-input" id={'invite-extra-'+index} type="email" maxLength={254} required value={email} placeholder="pessoa@exemplo.com" onChange={e=>setExtraEmails(previous=>previous.map((value,i)=>i===index?e.target.value:value))}/><button className="secondary-link" type="button" onClick={()=>setExtraEmails(previous=>previous.filter((_,i)=>i!==index))}>Remover</button></div></div>)}
 {extraEmails.length<9&&<button className="secondary-link" type="button" disabled={busy} onClick={()=>setExtraEmails(previous=>[...previous,''])}>+ Adicionar signatário</button>}
 <button className="primary-button" type="submit" disabled={busy||!!fileError}>{busy?'Criando…':'Criar convite'}</button></form>
 {message&&<p role="status">{message}</p>}
 {url&&links.length===0&&<div className="invite-result result-panel"><label htmlFor="invite-link">Link individual (não compartilhe publicamente)</label><input className="invite-input mono" id="invite-link" readOnly value={url} onFocus={e=>e.currentTarget.select()}/><button className="primary-button" type="button" onClick={()=>navigator.clipboard.writeText(url).then(()=>setMessage('Link copiado. Envie somente ao destinatário.')).catch(()=>setMessage('Selecione e copie o link acima.'))}>Copiar link</button></div>}
 {links.length>0&&<div className="invite-result result-panel"><h3>Links individuais</h3>{links.map(item=><div key={item.recipientEmail}><label>{item.recipientEmail} — {item.delivery==='sent'?'e-mail enviado':'envio não confirmado'}</label><input className="invite-input mono" readOnly value={item.invitationUrl} onFocus={e=>e.currentTarget.select()}/><button className="secondary-link" type="button" onClick={()=>navigator.clipboard.writeText(item.invitationUrl).then(()=>setMessage('Link copiado. Envie somente ao destinatário correspondente.')).catch(()=>setMessage('Selecione e copie o link acima.'))}>Copiar link</button></div>)}</div>}
 <p className="account-line">O destinatário pode visualizar e assinar o documento com sua própria conta e passkey. O Selo tenta enviar o convite por e-mail automaticamente; o link também fica disponível para compartilhamento manual.</p>
 </section>;
}
