# Assinatura Digital — V2

Nova implementação em Next.js + TypeScript. A V1 permanece preservada na branch `v1`.

## Escopo escolhido

Assinatura eletrônica com evidências: identidade autenticada, consentimento explícito, integridade do PDF final, trilha de auditoria e validação verificável por terceiros. **Não** é assinatura ICP-Brasil ou PAdES.

## Estado

**Fundação inicial, não pronta para produção.** A V2 ainda não emite assinaturas. Não reutilizar a validação da V1: ela aceita metadados editáveis sem verificar criptografia.

## Arquitetura planejada

- Next.js (App Router) e TypeScript na Vercel
- Turso: registros de documentos, participantes, eventos de auditoria e provas de integridade
- Cloudflare R2 privado: PDFs originais e finalizados
- Autenticação com identidade verificável e aceite explícito antes de assinar
- Hash SHA-256 do **PDF final imutável**, prova autenticada por chave do serviço e trilha de auditoria append-only
- Verificação pública por ID aleatório não enumerável, conferindo hash do arquivo apresentado, prova autenticada e status do registro
- Limites de upload, validação de MIME e estrutura do PDF, proteção CSRF/rate limiting, retenção e exclusão conforme LGPD

## Etapas

1. Scaffold Next.js e documentação do modelo de confiança (atual)
2. Autenticação, consentimento, identificação do signatário e registro de evidências
3. Upload seguro e armazenamento R2 com chaves privadas
4. Posicionamento visual e geração do PDF final
5. Selagem do hash final e validação criptográfica, incluindo testes de adulteração
6. Auditoria, controles de acesso, observabilidade e deploy

## Desenvolvimento

`npm install && npm run dev`

Copiar `.env.example` para `.env.local` apenas quando as integrações forem implementadas. Nunca commitar credenciais.

## Regras de segurança

Um QR Code é somente um localizador de registro. Metadados PDF não são evidência confiável. Hash sozinho não prova identidade. Uma assinatura RSA criada por chave arbitrária sem vínculo confiável com o signatário também não comprova identidade. Uma resposta de validação só pode ser positiva após verificar a prova e a integridade do arquivo.
