import { auth, signIn, signOut } from '../../auth';
import { PasskeyRegistration } from '../passkey-registration';
import Link from 'next/link';
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}) {
 const query=await searchParams;
 const next=typeof query.next==='string' && /^\/convite\/[A-Za-z0-9_-]{43}$/.test(query.next) ? query.next : '/';
 const session=await auth();
 return <main className="login-page"><section className="login-hero"><div className="login-copy"><span className="eyebrow">Minha conta</span><h1>Acesse sua conta</h1><p className="lead">Seus documentos e registros de assinatura, em um só lugar.</p><div className="panel login-panel">
 {session?.user ? <><h2>Conta conectada</h2><p>Autenticado como <strong>{session.user.email}</strong></p><div className="actions"><Link className="button-link" href="/">Assinar documento →</Link><form action={async()=>{'use server';await signOut();}}><button className="secondary-link">Sair</button></form></div></>
 : <><h2>Entre com Google</h2><p>Utilizamos sua conta Google para associar o registro de assinatura ao acesso autenticado.</p><form action={async()=>{'use server';await signIn('google',{redirectTo:next});}}><button className="primary-button">Continuar com Google →</button></form></>}
 {session?.user && <PasskeyRegistration/>}<p className="notice">O login comprova o controle da conta Google, não a identidade civil do titular.</p></div></div><div className="login-photo" role="img" aria-label="Mesa de trabalho iluminada pelo sol, com caderno, caneta e computador"/></section></main>;
}
