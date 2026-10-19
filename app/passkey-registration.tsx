'use client';
import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
export function PasskeyRegistration() {
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 async function register() {
  setBusy(true); setMessage('');
  try {
   const optionsResponse = await fetch('/api/webauthn/register/options', { method: 'POST' });
   const data = await optionsResponse.json();
   if (!optionsResponse.ok) throw new Error(data.error);
   const response = await startRegistration({ optionsJSON: data.options });
   const verificationResponse = await fetch('/api/webauthn/register/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: data.challengeId, response })
   });
   if (!verificationResponse.ok) throw new Error((await verificationResponse.json()).error);
   setMessage('Passkey cadastrada com sucesso.');
  } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro ao cadastrar passkey'); }
  finally { setBusy(false); }
 }
 return <section style={{marginTop:24}}>
  <h2>Segurança da conta</h2>
  <p>Cadastre uma passkey. O Selo não recebe sua biometria nem sua chave privada.</p>
  <button className="primary-button" type="button" disabled={busy} onClick={register}>{busy ? 'Cadastrando...' : 'Cadastrar passkey'}</button>
  {message && <p role="status">{message}</p>}
 </section>;
}
