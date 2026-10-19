import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'Selo | Assinatura eletrônica', description: 'Assine e verifique documentos com evidências digitais' };
export default function RootLayout({ children }: { children: ReactNode }) {
 return <html lang="pt-BR"><body>
  <header className="site-header"><div className="shell header-inner">
   <a href="/" className="brand"><span className="brand-mark" aria-hidden="true">✓</span> Selo<span style={{color:'#087f8c'}}>.</span></a>
   <nav className="main-nav" aria-label="Navegação principal"><a href="/">Assinar documento</a><a href="/documentos">Meus documentos</a><a href="/verificar">Verificar assinatura</a><a href="/login">Minha conta</a></nav>
  </div></header>
  <div className="shell page-content">{children}</div>
  <footer className="shell site-footer">Selo · Evidências verificáveis por SHA-256 e HMAC. Não equivale a assinatura qualificada ICP-Brasil.</footer>
 </body></html>;
}