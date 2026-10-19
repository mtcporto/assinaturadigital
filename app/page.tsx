import { auth } from '../auth';
import { SignForm } from './sign-form';
export default async function Home() {
 const session=await auth();
 return <main><section className="hero"><span className="eyebrow">Assinatura eletrônica sem complicação</span><h1>Seus documentos, com segurança e clareza.</h1><p className="lead">Registre a assinatura eletrônica de um PDF e compartilhe evidências verificáveis de integridade, em poucos passos.</p></section>
 <div className="flow-grid"><div className="panel">
 {session?.user?.email ? <><p className="account-line">Conectado como <strong>{session.user.email}</strong></p><SignForm/></> : <><h2>Comece por aqui</h2><p>Entre com sua conta Google para registrar a assinatura eletrônica de um documento PDF.</p><a className="button-link" href="/login">Entrar com Google →</a></>}
 </div><aside className="panel steps"><span className="status-pill">Como funciona</span><div className="step"><div className="step-number">1</div><div><strong>Envie o PDF</strong><span>Selecione o documento que deseja registrar.</span></div></div><div className="step"><div className="step-number">2</div><div><strong>Confirme o consentimento</strong><span>Autorize o registro das evidências da operação.</span></div></div><div className="step"><div className="step-number">3</div><div><strong>Verifique e compartilhe</strong><span>Receba um identificador e um link público de verificação.</span></div></div><p className="notice">O arquivo original é preservado. Esta versão ainda não insere marca visual de assinatura no PDF.</p></aside></div></main>;
}