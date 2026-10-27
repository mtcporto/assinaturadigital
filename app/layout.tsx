import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';
import { SealMark } from './seal-mark';
export const metadata = { title: 'Selo | Assinatura eletrônica', description: 'A tradição de um selo. A precisão da criptografia.' };
export default function RootLayout({ children }: { children: ReactNode }) {
 return <html lang="pt-BR"><body>
 <header className="site-header"><div className="shell header-inner">
 <Link href="/" className="brand"><span className="brand-mark"><SealMark size={42}/></span><span>Selo<span className="brand-period">.</span></span></Link>
 <nav className="main-nav" aria-label="Navegação principal"><Link href="/">Assinar documento</Link><Link href="/convidar">Enviar para assinatura</Link><Link href="/documentos">Meus documentos</Link><Link href="/verificar">Verificar assinatura</Link><Link className="nav-account" href="/login">Minha conta <span aria-hidden="true">↗</span></Link></nav>
 </div></header>
 <div className="shell page-content">{children}</div>
 <footer className="shell site-footer"><div className="footer-inner"><div><strong>SELO<span className="brand-period">.</span></strong><p>Autenticidade é algo que se comprova.</p></div><div><span>SHA-256 / HMAC</span><p>Assinatura eletrônica com evidências verificáveis. Não equivale a assinatura qualificada ICP-Brasil.</p></div></div></footer>
 </body></html>;
}
