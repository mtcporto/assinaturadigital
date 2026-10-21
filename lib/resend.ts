type DeliveryResult={status:'sent'|'failed'|'not_configured';id?:string};
export async function sendInvitationEmail(input:{to:string;url:string;fileName:string;expiresAt:string}):Promise<DeliveryResult>{
 const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
 if(!key||!from)return {status:'not_configured'};
 const date=new Date(input.expiresAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
 const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#182a2c"><h1 style="font-size:28px">Selo</h1><h2>Documento aguardando assinatura</h2><p>Você recebeu um convite para assinar o documento <strong>${escape(input.fileName)}</strong>.</p><p>O convite é individual e expira em ${escape(date)}.</p><p><a href="${escape(input.url)}" style="display:inline-block;background:#173d38;color:white;padding:13px 20px;border-radius:5px;text-decoration:none">Visualizar e assinar</a></p><p style="font-size:12px;color:#687677">Acesse somente se reconhecer o convite. O Selo exige autenticação para assinar. Se não esperava este e-mail, ignore-o.</p></div>`;
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[input.to],subject:'Selo — documento aguardando sua assinatura',html,text:`Você recebeu um convite para assinar ${input.fileName}. Acesse: ${input.url} (válido até ${date}). Se não esperava este e-mail, ignore-o.`}),signal:AbortSignal.timeout(8000)});
  if(!response.ok){console.error('resend_invitation_failed',response.status);return {status:'failed'};}
  const data=await response.json() as {id?:string};
  return {status:'sent',id:data.id};
 }catch(error){console.error('resend_invitation_unavailable',error instanceof Error?error.message:'unknown');return {status:'failed'};}
}
