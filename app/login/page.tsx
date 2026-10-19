import { auth, signIn, signOut } from '../../auth';
export default async function Login() {
  const session = await auth();
  return <main><h1>Entrar</h1>{session?.user
    ? <><p>Autenticado como {session.user.email}</p><form action={async () => { 'use server'; await signOut(); }}><button>Sair</button></form></>
    : <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/login' }); }}><button>Entrar com Google</button></form>}
    <p>O login comprova acesso à conta Google, não identidade civil ou assinatura do documento.</p></main>;
}
