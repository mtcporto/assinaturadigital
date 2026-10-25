'use client';
import { useState } from 'react';

export function VerificationShare({id}:{id:string}){
 const [message,setMessage]=useState('');
 const url='https://assinaturadigital-two.vercel.app/verify/'+encodeURIComponent(id);
 async function copy(value:string,label:string){
  try{await navigator.clipboard.writeText(value);setMessage(label+' copiado!');}
  catch{setMessage('Não foi possível copiar automaticamente. Toque no campo, selecione o conteúdo e copie.');}
 }
 return <div style={{padding:'12px 0',width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box',overflowWrap:'anywhere'}}>
  <p style={{margin:'0 0 8px'}}><strong>Compartilhar verificação</strong></p>
  <p className="account-line">Envie o link para outra pessoa conferir as assinaturas. Não é necessário entrar na conta.</p>
  <div style={{display:'grid',gap:14}}>
   <div style={{minWidth:0}}>
    <label htmlFor={'verify-url-'+id} style={{display:'block',marginBottom:6}}>Link de verificação</label>
    <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',minWidth:0}}>
     <input id={'verify-url-'+id} aria-label="Link de verificação" readOnly value={url} onFocus={e=>e.currentTarget.select()} style={{flex:'1 1 240px',width:'100%',minWidth:0,boxSizing:'border-box',padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>
     <button type="button" className="secondary-link" onClick={()=>copy(url,'Link')}>Copiar link</button>
    </div>
   </div>
   <div style={{minWidth:0}}>
    <label htmlFor={'verify-code-'+id} style={{display:'block',marginBottom:6}}>Código de verificação</label>
    <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',minWidth:0}}>
     <input id={'verify-code-'+id} aria-label="Código de verificação" readOnly value={id} onFocus={e=>e.currentTarget.select()} style={{flex:'1 1 240px',width:'100%',minWidth:0,boxSizing:'border-box',padding:10,border:'1px solid #cbd5e1',borderRadius:8,fontFamily:'monospace'}}/>
     <button type="button" className="secondary-link" onClick={()=>copy(id,'Código')}>Copiar código</button>
    </div>
   </div>
  </div>
  {message&&<p role="status" className="account-line" style={{marginTop:10}}>{message}</p>}
 </div>;
}
