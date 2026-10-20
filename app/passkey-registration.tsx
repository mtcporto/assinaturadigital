'use client';
import { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
type Credential = { id: string; createdAt: string; lastUsedAt: string | null };
export function PasskeyRegistration() {
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [credentials,setCredentials]=useState<Credential[]>([]);
 const [message,setMessage]=useState('');
 async function refresh() {
  try {
   const response=await fetch('/api/webauthn/credentials',{cache:'no-store'});
   if(!response.ok) throw new Error('Não foi possível consultar as passkeys.');
   const data=await response.json();
   setCredentials(data.credentials ?? []);
  } catch { setMessage('Não foi possível consultar as passkeys cadastradas.'); }
  finally { setLoading(false); }
 }
 useEffect(()=>{void refresh();},[]);
 async function register() {
  setBusy(true);setMessage('');
  try {
   const optionsResponse=await fetch('/api/webauthn/register/options',{method:'POST'});
   const data=await optionsResponse.json();
   if(!optionsResponse.ok) throw new Error(data.error);
   const response=await startRegistration(data.options);
   const verificationResponse=await fetch('/api/webauthn/register/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:data.challengeId,response})});
   if(!verificationResponse.ok) throw new Error((await verificationResponse.json()).error);
   setMessage('Passkey cadastrada com sucesso.');
   await refresh();
  } catch(error) {
   const raw=error instanceof Error?error.message:'Erro ao cadastrar passkey';
   setMessage(/previously registered|already registered|excluded|InvalidStateError/i.test(raw)?'Esta passkey já está cadastrada. Use-a para confirmar assinaturas.':raw);
  } finally {setBusy(false);}
 }
 return <section style={{marginTop:24}}>
  <h2>Segurança da conta</h2>
  <p>O login é feito pelo Google. As passkeys confirmam assinaturas; o Selo não recebe sua biometria nem sua chave privada.</p>
  {loading?<p>Consultando passkeys...</p>:credentials.length>0?<p role="status"><strong>{credentials.length} passkey{credentials.length>1?'s':''} cadastrada{credentials.length>1?'s':''}.</strong> Pronta{credentials.length>1?'s':''} para confirmar documentos.</p>:<p>Nenhuma passkey cadastrada.</p>}
  {credentials.map((credential,index)=><p key={credential.id} className="notice">Passkey {index+1} · cadastrada em {new Date(credential.createdAt).toLocaleDateString('pt-BR')}{credential.lastUsedAt?' · usada em '+new Date(credential.lastUsedAt).toLocaleDateString('pt-BR'):''}</p>)}
  <button className="primary-button" type="button" disabled={busy||loading} onClick={register}>{busy?'Cadastrando...':credentials.length?'Cadastrar outra passkey':'Cadastrar passkey'}</button>
  {message&&<p role="status">{message}</p>}
 </section>;
}
