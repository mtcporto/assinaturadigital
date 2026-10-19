import { auth, signIn, signOut } from '../../auth';
export default async function Login() {
 const session=await auth();
 return <main className="hero"><span className="eyebrow">Minha conta</span><h1>Acesse sua conta</h1><div className="panel" style={{maxWidth:540}}>
 {session?.user ? <><h2>Conta conectada</h2><p>Autenticado como <strong>{session.user.email}</strong></p><div className="actions"><a className="button-link" href="/">Assinar documento →</a><form action={async()=>{'use server';await signOut();}}><button className="secondary-link">Sair</button></form></div></>
 : <><h2>Entre com Google</h2><p>Utilizamos sua conta Google para associar o registro de assinatura ao acesso autenticado.</p><form action={async()=>{'use server';await signIn('google',{redirectTo:'/'});}}><button className="primary-button">Continuar com Google →</button></form></>}
 <p className="notice">O login comprova o controle da conta Google, não a identidade civil do titular.</p></div></main>;
}