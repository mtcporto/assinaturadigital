'use client';
import { useState } from 'react';
export function InviteForm(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[url,setUrl]=useState('');
 const [fileError,setFileError]=useState('');
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
  setBusy(true);setMessage('');setUrl('');
  try{
   const response=await fetch('/api/envelopes',{method:'POST',body:new FormData(form)});
   const data: {error?:string;invitationUrl?:string;delivery?:string} | null = await response.json().catch(()=>null);
   if(!response.ok){setMessage(response.status===413?'Arquivo muito grande. O limite permitido é de 5 MB. Selecione um PDF menor.':'Não foi possível criar o convite (HTTP '+response.status+(data?.error?' — '+data.error:'')+').');return;}
   if(!data?.invitationUrl){setMessage('O servidor respondeu sem um link de convite. Confira o histórico antes de tentar novamente.');return;}
   setUrl(data.invitationUrl);setMessage(data.delivery==='sent'?'Convite criado! O Selo enviou o convite por e-mail. O link expira em 7 dias.':data.delivery==='not_configured'?'Convite criado, mas o envio por e-mail não está configurado. Copie o link abaixo.':'Convite criado, mas não foi possível enviar o e-mail. Copie o link abaixo.');
  }catch(error){setMessage('Não foi possível completar a solicitação. Confira o histórico antes de tentar novamente.');console.error('invite_request_failed',error);}finally{setBusy(false);}
 }
 return <section className="panel signing-panel"><h2>Convidar para assinar</h2><p>Crie um convite individual para outra pessoa. O documento fica armazenado de forma privada.</p>
 <form className="invite-form" onSubmit={submit}><label htmlFor="invite-pdf">Documento PDF (até 5 MB)</label><input className="invite-file" id="invite-pdf" name="file" type="file" accept="application/pdf,.pdf" required aria-invalid={!!fileError} aria-describedby={fileError?'invite-file-error':undefined} onChange={e=>{checkFile(e.currentTarget.files?.[0]??null);setMessage('');setUrl('');}}/>{fileError&&<p id="invite-file-error" role="alert">{fileError}</p>}
 <label htmlFor="invite-email">E-mail do destinatário</label><input className="invite-input" id="invite-email" name="email" type="email" maxLength={254} required placeholder="pessoa@exemplo.com"/>
 <button className="primary-button" type="submit" disabled={busy||!!fileError}>{busy?'Criando…':'Criar convite'}</button></form>
 {message&&<p role="status">{message}</p>}
 {url&&<div className="invite-result result-panel"><label htmlFor="invite-link">Link individual (não compartilhe publicamente)</label><input className="invite-input mono" id="invite-link" readOnly value={url} onFocus={e=>e.currentTarget.select()}/><button className="primary-button" type="button" onClick={()=>navigator.clipboard.writeText(url).then(()=>setMessage('Link copiado. Envie somente ao destinatário.')).catch(()=>setMessage('Selecione e copie o link acima.'))}>Copiar link</button></div>}
 <p className="account-line">O destinatário pode visualizar e assinar o documento com sua própria conta e passkey. O Selo tenta enviar o convite por e-mail automaticamente; o link também fica disponível para compartilhamento manual.</p>
 </section>;
}
