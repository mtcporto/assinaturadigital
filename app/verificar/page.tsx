'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export default function VerifyEntry(){
 const [value,setValue]=useState('');const [error,setError]=useState('');const router=useRouter();
 function submit(e:FormEvent){e.preventDefault();const raw=value.trim();const match=raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);if(match){setError('');router.push('/verify/'+match[0]);}else setError('Não encontramos um código de verificação nesse texto. Confira o link ou o comprovante recebido.');}
 return <main className="hero"><span className="eyebrow">Consulta pública</span><h1>Confira se um documento foi assinado.</h1><p className="lead">Recebeu um contrato ou comprovante? Veja quem assinou e se ainda falta alguma assinatura.</p>
 <div className="panel" style={{maxWidth:700}}>
 <h2>Como verificar?</h2>
 <p><strong>1.</strong> Se recebeu um comprovante do Selo, aponte a câmera do celular para o QR Code. Você chegará diretamente ao resultado.</p>
 <p><strong>2.</strong> Se recebeu um link ou código de verificação, cole no campo abaixo.</p>
 <form onSubmit={submit}><label htmlFor="record-id"><strong>Link ou código do comprovante</strong></label><input id="record-id" value={value} onChange={e=>{setValue(e.target.value);setError('');}} placeholder="Cole aqui o link ou código recebido" required style={{width:'100%',padding:14,margin:'14px 0 18px',border:'1px solid #cbd5e1',borderRadius:10}}/>{error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}<button className="primary-button" type="submit">Consultar assinaturas →</button></form>
 <p className="notice" style={{marginTop:18}}>Tem apenas o PDF original? Para confirmar que ele corresponde a um registro do Selo, você também precisa do código ou QR Code do comprovante. O arquivo é comparado na etapa seguinte, sem ser enviado ao servidor.</p>
 </div></main>;
}