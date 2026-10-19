# Selo — Assinatura eletrônica com evidências verificáveis

Aplicação experimental em Next.js 15 para registrar evidências de assinatura eletrônica de PDFs, com login Google (Auth.js), documentos privados no Cloudflare R2 e metadados no Turso/libSQL.

**Produção:** https://assinaturadigital-two.vercel.app/  
**Branch de produção:** `v2` (a branch `v1` preserva o protótipo).

## Fluxo atual

1. Usuário autentica-se com Google.
2. Envia um PDF (limite da aplicação: 5 MB) e aceita expressamente o registro.
3. A API calcula SHA-256 do PDF, armazena o original no R2, registra evidências e evento de auditoria no Turso e sela as evidências com HMAC-SHA256.
4. Usuário recebe ID, link público de verificação e acesso privado ao PDF original.
5. A verificação pública confere o selo HMAC. O navegador pode comparar o SHA-256 de um PDF selecionado localmente, sem enviá-lo ao servidor.
6. Em **Meus documentos**, o usuário autenticado consulta seus próprios registros e baixa os originais.

## Limitações importantes

- **Não é assinatura qualificada ICP-Brasil, nem PAdES.** O login Google comprova controle de conta, não identidade civil.
- O arquivo atualmente baixado é o **PDF original**, não um PDF modificado/assinado visualmente. Não renomear o original para `_signed.pdf` como se fosse um novo artefato.
- Geração de `<nome>_signed.pdf` com selo visual, comprovante, QR Code e registro do hash do novo artefato ainda é evolução planejada.
- O registro válido, sozinho, não garante que qualquer PDF apresentado corresponda a ele: compare os bytes via SHA-256.
- Não use documentos sensíveis ou fluxos jurídicos de alto risco sem auditoria de segurança, privacidade e conformidade.

## Configuração

Variáveis de ambiente (segredos nunca devem ser enviados para o repositório):

```dotenv
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
EVIDENCE_HMAC_KEY=
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

Aplique `db/schema.sql` uma vez no Turso. Use um bucket R2 privado com permissões adequadas de leitura e gravação. Configure o OAuth Google para os endereços corretos de callback.

## Desenvolvimento

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Deploy por push na branch `v2` via integração GitHub → Vercel. Evite executar `vercel --prod` após push com deploy automático.

## Segurança e próximos passos

Implementar PDF com comprovante e QR Code, persistir e verificar seu hash separadamente, limitar tamanho de upload considerando o limite da plataforma, acrescentar rate limiting, revisão de autorização e trilha de auditoria mais completa.
