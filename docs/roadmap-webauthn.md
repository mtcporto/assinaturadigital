# Fase 2 — WebAuthn/passkeys (plano de implementação)

Status: **iniciada, não habilitada**. Branch: `v2`.

## Princípios

- Google OAuth continua sendo o login inicial. A passkey confirma o controle de uma credencial, não a identidade civil.
- Nunca armazenar biometria, PIN, chave privada ou imagem facial.
- `RP_ID` e `EXPECTED_ORIGIN` devem ser fixos por ambiente, não inferidos de cabeçalhos Host enviados pelo cliente. Usar HTTPS em produção; localhost somente em desenvolvimento.
- Exigir `userVerification: 'required'` no cadastro e na autenticação, verificar challenge, origin, RP ID, assinatura, counter e identidade da credencial.
- Passkeys sincronizadas podem existir: não prometer chave exclusivamente presa a um dispositivo.
- Desafios aleatórios, expiração curta (ex.: 5 minutos), consumo atômico e uso único, inclusive em caso de falha de verificação.
- Aplicar proteção CSRF, limite de tentativas e logs sem dados biométricos.

## Sequência de entregas

1. **Migração Turso**: aplicar manualmente `db/migrations/001_webauthn.sql` no banco de destino; confirmar as tabelas antes de ativar endpoints.
2. **Cadastro**: `POST /api/webauthn/register/options` e `POST /api/webauthn/register/verify`; guardar chave pública, ID, counter e transports. Interface para cadastrar/remover credenciais com reautenticação.
3. **Assinatura vinculada ao PDF**: primeiro receber PDF e consentimento e calcular hash no servidor, criando uma intenção de assinatura de uso único. Emitir desafio ligado à intenção, ao hash do PDF e ao consentimento.
4. **Confirmação**: `POST /api/webauthn/sign/verify` valida a assertion, consome o desafio atomicamente e registra o resultado no mesmo fluxo transacional da operação. O endpoint de assinatura deve conferir o resultado no servidor; nunca confiar em um campo `webauthnVerified` enviado pelo navegador.
5. **Evidências**: registrar credencial utilizada, desafio/identificador de intenção, hash da operação e resultado verificado, sem divulgar dados pessoais na API pública.
6. **Testes**: challenge vencido, repetido, de outro usuário, de outro PDF, consentimento alterado, origem incorreta, credential ID incorreto, autenticação sem user verification e requisições concorrentes.

## Implantação

Não impor passkey obrigatória a todos antes de testar cadastro, recuperação de conta e assinatura em ambiente de preview. Não alterar `main` nem migrar produção automaticamente.

## Dependências propostas

`@simplewebauthn/server` e `@simplewebauthn/browser`. Conferir compatibilidade com a versão de Node usada no deploy antes de instalar.

## Critério de conclusão da fase

Uma assinatura nova só é aceita depois de confirmação WebAuthn válida e vinculada àquele documento e consentimento; tentativas de replay ou substituição falham; assinaturas anteriores continuam verificáveis. Isso, isoladamente, não certifica o nível jurídico avançado.
