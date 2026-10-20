'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function CancelInvite({id}:{id:string}){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function cancel(){
  if(!window.confirm('Cancelar este convite? O destinatário não poderá mais assinar por este link.'))return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/envelopes/recipients/'+encodeURIComponent(id)+'/cancel',{method:'POST'});
   if(!response.ok){const data=await response.json();throw new Error(data.error||'Não foi possível cancelar');}
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Falha ao cancelar');setBusy(false);}
 }
 return <span><button type="button" className="secondary-link" disabled={busy} onClick={cancel}>{busy?'Cancelando…':'Cancelar convite'}</button>{error&&<small role="alert">{error}</small>}</span>;
}
