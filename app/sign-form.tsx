'use client';
import { useState, type FormEvent } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
export function SignForm() {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<{id:string,sha256:string}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();setBusy(true);setMessage('');setResult(null);
  try {
   const form = new FormData(event.currentTarget);
   const intentResponse = await fetch('/api/sign-intents', { method: 'POST', body: form });
   const intent = await intentResponse.json();
   if (!intentResponse.ok) throw new Error(intent.error || 'Não foi possível preparar a assinatura');
   const optionsResponse = await fetch('/api/webauthn/sign/options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intentId: intent.intentId }) });
   const options = await optionsResponse.json();
   if (!optionsResponse.ok) throw new Error(options.error || 'Não foi possível iniciar a confirmação');
   const assertion = await startAuthentication(options.options);
   const verifyResponse = await fetch('/api/webauthn/sign/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intentId: intent.intentId, response: assertion }) });
   const result = await verifyResponse.json();
   if (!verifyResponse.ok) throw new Error(result.error || 'Não foi possível confirmar a assinatura');
   setResult(result);
  }
  catch(e){setMessage(e instanceof Error?e.message:'Erro inesperado');}finally{setBusy(false);}
 }
 return <section><h2>Assinar documento</h2><p className="account-line">PDF de até 5 MB · Registro com evidências digitais</p><form onSubmit={submit}>
 <label className="upload-field"><strong>Escolha seu documento PDF</strong><span style={{display:'block',fontSize:13,color:'#64748b'}}>O arquivo original será armazenado com segurança.</span><input name="file" type="file" accept="application/pdf,.pdf" required /></label>
 <label className="consent-field"><input type="checkbox" name="consent" value="yes" required/><span>Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.</span></label>
 <button className="primary-button" disabled={busy} type="submit">{busy?'Aguardando confirmação...':'Confirmar assinatura com passkey →'}</button></form>
 {message&&<p role="alert" style={{color:'#b91c1c'}}>{message}</p>}
 {result&&<div className="result-panel" role="status"><h3>✓ Assinatura registrada</h3><p>Seu registro de evidências foi criado com sucesso.</p><p><strong>Identificador</strong><br/><code className="mono">{result.id}</code></p><p><strong>SHA-256</strong><br/><code className="mono">{result.sha256}</code></p><div className="actions"><a className="button-link" href={`/verify/${result.id}`}>Verificar registro →</a><a className="secondary-link" href={`/api/documents/${result.id}`}>Baixar PDF original</a></div><p className="notice">O download é o arquivo original, sem marca visual de assinatura.</p></div>}
 </section>;
}