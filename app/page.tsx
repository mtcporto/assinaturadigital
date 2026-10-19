import { auth } from '../auth';
import { SignForm } from './sign-form';
export default async function Home() {
 const session=await auth();
 return <main style={{maxWidth:760,margin:'48px auto',padding:20,fontFamily:'system-ui'}}><h1>Assinatura Digital V2</h1><p>Assinatura eletrônica com evidências e integridade SHA-256. Não é assinatura qualificada ICP-Brasil.</p>{session?.user?.email ? <><p>Conta Google: <strong>{session.user.email}</strong></p><SignForm/></> : <p><a href="/login">Entrar com Google para assinar</a></p>}</main>;
}
