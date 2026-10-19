import { auth } from '../auth';
import { SignForm } from './sign-form';
export default async function Home() {
 const session=await auth();
 return <main>
 <section className="hero hero-editorial">
  <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line"/> Confiança que pode ser verificada</span><h1>Seus documentos com <em>mais valor.</em></h1><p className="lead">A tradição de um selo. A precisão da criptografia. Registre sua assinatura eletrônica e verifique a integridade de cada documento.</p><div className="hero-meta"><span>01 / ASSINAR</span><span>02 / REGISTRAR</span><span>03 / VERIFICAR</span></div></div>
  <div className="hero-art hero-photo" role="img" aria-label="Contrato sobre uma mesa, com selo de cera e caneta" />
 </section>
 <div className="flow-grid"><div className="panel signing-panel">
 <div className="panel-kicker">SUA PRÓXIMA ASSINATURA <span>↗</span></div>
 {session?.user?.email ? <><p className="account-line">Conectado como <strong>{session.user.email}</strong></p><SignForm/></> : <><h2>Comece por aqui</h2><p>Entre com sua conta Google para registrar a assinatura eletrônica de um documento PDF.</p><a className="button-link" href="/login">Entrar com Google →</a></>}
 </div><aside className="panel steps"><span className="eyebrow">Simples por princípio</span><h2>Três passos.<br/>Um registro confiável.</h2><div className="step"><div className="step-number">01</div><div><strong>Escolha o documento</strong><span>Selecione o PDF que deseja registrar.</span></div></div><div className="step"><div className="step-number">02</div><div><strong>Confirme sua intenção</strong><span>Autorize o registro das evidências da assinatura.</span></div></div><div className="step"><div className="step-number">03</div><div><strong>Verifique a integridade</strong><span>Consulte o identificador e compare o SHA-256.</span></div></div><div className="steps-foot"><span className="tiny-seal">✳</span><p>O original é preservado. O PDF com comprovante visual está em desenvolvimento.</p></div></aside></div>
 </main>;
}