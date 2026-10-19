import type { ReactNode } from 'react';
export const metadata = { title: 'Assinatura Digital V2', description: 'Assinatura eletrônica com evidências verificáveis' };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="pt-BR"><body style={{fontFamily:'system-ui',maxWidth:920,margin:'40px auto',padding:20,lineHeight:1.6}}>{children}</body></html>; }
