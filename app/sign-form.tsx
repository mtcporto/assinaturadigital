'use client';
import { useState, type FormEvent } from 'react';
export function SignForm() {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<{id:string,sha256:string}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault(); setBusy(true);setMessage('');setResult(null);
  try {
   const form=new FormData(event.currentTarget);
   const response=await fetch('/api/sign',{method:'POST',body:form});
   const data=await response.json();
   if(!response.ok) throw new Error(data.error||'Erro ao registrar assinatura');
   setResult(data);
  } catch(e) {setMessage(e instanceof Error?e.message:'Erro inesperado');}
  finally {setBusy(false);}
 }
 return <section><h2>Assinar PDF</h2><form onSubmit={submit}><p><label>Documento PDF (até 5 MB)<br/><input name="file" type="file" accept="application/pdf,.pdf" required/></label></p><p><label><input type="checkbox" name="consent" value="yes" required/> Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.</label></p><button disabled={busy} type="submit">{busy?'Registrando...':'Registrar assinatura eletrônica'}</button></form>{message&&<p role="alert">{message}</p>}{result&&<div role="status"><h3>Registro criado</h3><p>ID: <code>{result.id}</code></p><p>SHA-256: <code style={{overflowWrap:'anywhere'}}>{result.sha256}</code></p><p><a href={`/verify/${result.id}`}>Verificar registro</a> · <a href={`/api/documents/${result.id}`}>Baixar PDF original</a></p></div>}</section>;
}
