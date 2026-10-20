'use client';
import {useState} from 'react';

export function RenewInvite({id,expired}:{id:string;expired:boolean}){
 const [busy,setBusy]=useState(false);
 const [url,setUrl]=useState('');
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 async function renew(){
  if(!window.confirm('Gerar novo link? O link anterior deixará de funcionar.'))return;
  setBusy(true);setError('');setUrl('');setCopied(false);
  try{
   const response=await fetch('/api/envelopes/recipients/'+encodeURIComponent(id)+'/renew',{method:'POST'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Falha ao gerar link');
   setUrl(data.invitationUrl);
  }catch(e){setError(e instanceof Error?e.message:'Falha de conexão');}finally{setBusy(false);}
 }
 async function copy(){
  try{await navigator.clipboard.writeText(url);setCopied(true);}
  catch{setError('Selecione e copie o link abaixo.');}
 }
 return <div>
  <button className="secondary-link" type="button" onClick={renew} disabled={busy}>{busy?'Gerando…':expired?'Renovar convite':'Gerar novo link'}</button>
  {error&&<p role="alert" className="account-line">{error}</p>}
  {url&&<div className="invite-result result-panel" style={{marginTop:'0.75rem'}}>
   <label htmlFor={'renew-'+id}>Novo link individual — válido por 7 dias</label>
   <input id={'renew-'+id} className="invite-input mono" readOnly value={url} onFocus={e=>e.currentTarget.select()}/>
   <button className="secondary-link" type="button" onClick={copy}>{copied?'Copiado!':'Copiar link'}</button>
   <p className="account-line">Envie este link apenas ao destinatário. Ele não poderá ser recuperado depois que sair desta página.</p>
  </div>}
 </div>;
}
