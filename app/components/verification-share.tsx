'use client';
import { useState } from 'react';

export function VerificationShare({id}:{id:string}){
 const [message,setMessage]=useState('');
 const url='https://assinaturadigital-two.vercel.app/verify/'+encodeURIComponent(id);
 async function copy(value:string,label:string){
  try{await navigator.clipboard.writeText(value);setMessage(label+' copiado!');}
  catch{setMessage('Não foi possível copiar automaticamente. Selecione o texto acima e copie manualmente.');}
 }
 return <div style={{padding:'12px 0',maxWidth:'100%',overflowWrap:'anywhere'}}>
  <p style={{marginBottom:8}}><strong>Compartilhar verificação</strong></p>
  <p className="account-line">Envie o link para que outra pessoa confira as assinaturas, sem precisar entrar na sua conta.</p>
  <label style={{display:'block',marginBottom:5}}>Link de verificação</label>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',marginBottom:12}}>
   <input aria-label="Link de verificação" readOnly value={url} onFocus={e=>e.currentTarget.select()} style={{flex:'1 1 230px',minWidth:0,padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>
   <button type="button" className="secondary-link" onClick={()=>copy(url,'Link')}>Copiar link</button>
  </div>
  <label style={{display:'block',marginBottom:5}}>Código de verificação</label>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
   <input aria-label="Código de verificação" readOnly value={id} onFocus={e=>e.currentTarget.select()} style={{flex:'1 1 230px',minWidth:0,padding:10,border:'1px solid #cbd5e1',borderRadius:8,fontFamily:'monospace'}}/>
   <button type="button" className="secondary-link" onClick={()=>copy(id,'Código')}>Copiar código</button>
  </div>
  {message&&<p role="status" className="account-line">{message}</p>}
 </div>;
}
