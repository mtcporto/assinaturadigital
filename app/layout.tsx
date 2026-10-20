import type { ReactNode } from 'react';
import './globals.css';
import { SealMark } from './seal-mark';
export const metadata = { title: 'Selo | Assinatura eletrônica', description: 'A tradição de um selo. A precisão da criptografia.' };
export default function RootLayout({ children }: { children: ReactNode }) {
 return <html lang="pt-BR"><body>
 <header className="site-header"><div className="shell header-inner">
 <a href="/" className="brand"><span className="brand-mark"><SealMark size={42}/></span><span>Selo<span className="brand-period">.</span></span></a>
 <nav className="main-nav" aria-label="Navegação principal"><a href="/">Assinar documento</a><a href="/convidar">Enviar para assinatura</a><a href="/documentos">Meus documentos</a><a href="/verificar">Verificar assinatura</a><a className="nav-account" href="/login">Minha conta <span aria-hidden="true">↗</span></a></nav>
 </div></header>
 <div className="shell page-content">{children}</div>
 <footer className="shell site-footer"><div className="footer-inner"><div><strong>SELO<span className="brand-period">.</span></strong><p>Autenticidade é algo que se comprova.</p></div><div><span>SHA-256 / HMAC</span><p>Assinatura eletrônica com evidências verificáveis. Não equivale a assinatura qualificada ICP-Brasil.</p></div></div></footer>
 </body></html>;
}