'use client';
import {useState} from 'react';
import {startAuthentication} from '@simplewebauthn/browser';
export function InvitationSignature({token}:{token:string}){
 const [consented,setConsented]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[signed,setSigned]=useState('');
 async function sign(){
 setBusy(true);setMessage('');
 try{
 const optsResponse=await fetch('/api/invitations/'+encodeURIComponent(token)+'/sign/options',{method:'POST'});
 const opts=await optsResponse.json();
 if(!optsResponse.ok)throw new Error(opts.error||'Não foi possível iniciar a assinatura');
 const response=await startAuthentication(opts.options);
 const verifyResponse=await fetch('/api/invitations/'+encodeURIComponent(token)+'/sign/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({response})});
 const result=await verifyResponse.json();
 if(!verifyResponse.ok)throw new Error(result.error||'Não foi possível confirmar a assinatura');
 setSigned(result.id);
 }catch(e){setMessage(e instanceof Error?e.message:'Erro ao assinar');}finally{setBusy(false);}
 }
 if(signed)return <div className="result-panel" role="status"><h3>✓ Documento assinado</h3><p>A assinatura eletrônica foi registrada com evidências verificáveis.</p><a className="primary-button" href={'/verify/'+signed}>Verificar assinatura →</a></div>;
 return <section><h2>Confirmar assinatura</h2><p>Confira o PDF antes de prosseguir. A confirmação por passkey registra sua concordância com o documento recebido.</p><p><label className="consent-field"><input type="checkbox" required disabled={busy} id="invite-consent" checked={consented} onChange={e=>setConsented(e.target.checked)}/><span>Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.</span></label></p><button id="invite-sign-button" className="primary-button" type="button" disabled={!consented||busy} onClick={sign}>{busy?'Aguardando confirmação...':'Assinar com passkey →'}</button>{message&&<p role="alert">{message} {message==='passkey_required'&&<a href={'/login?next='+encodeURIComponent('/convite/'+token)}>Cadastrar passkey →</a>}</p>}</section>;
}
