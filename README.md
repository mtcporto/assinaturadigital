# Selo — Assinatura eletrônica com evidências verificáveis

Aplicação experimental para registrar a manifestação de assinatura eletrônica sobre documentos PDF, preservar o original e permitir a verificação posterior da integridade das evidências e do arquivo.

**Aplicação:** https://assinaturadigital-two.vercel.app/  
**Branch de produção:** `v2` (`main` e `v1` preservadas).  
**Stack:** Next.js 15, React 19, Auth.js (Google), Turso/libSQL, Cloudflare R2 e Vercel.

> **Estado do produto:** MVP funcional de registro e verificação de evidências de assinatura eletrônica. Não é uma solução de assinatura qualificada ICP-Brasil, não produz assinatura criptográfica PAdES e não comprova identidade civil do titular de uma conta Google.

## O problema que o Selo resolve

O Selo permite que uma pessoa autenticada declare sua intenção de assinar um PDF e registre evidências técnicas dessa operação. Posteriormente, qualquer interessado com o identificador pode verificar se o registro de evidências permanece íntegro e comparar o arquivo apresentado com o PDF registrado.

É uma solução útil para **registro de consentimento e evidências de assinatura eletrônica**, especialmente em cenários de menor risco e em que as partes aceitem esse procedimento. Não garante, por si só, a identidade civil de quem realizou a operação nem a validade para todo tipo de documento.

### O que é possível verificar

- **Integridade do registro:** um selo HMAC-SHA256 detecta alterações nas evidências protegidas, desde que a chave e o ambiente sejam confiáveis.
- **Correspondência do documento:** o SHA-256 permite conferir se os bytes do PDF apresentado são idênticos aos bytes registrados.
- **Vínculo operacional com a conta:** a aplicação registra a operação associada à sessão Google autenticada e ao consentimento informado.

### O que isso não comprova

- Que a pessoa que controla a conta Google é, necessariamente, a pessoa civilmente identificada pelo nome ou e-mail.
- Que o titular da conta foi pessoalmente quem realizou a operação, sem possibilidade de acesso indevido ou compartilhamento.
- Que houve uma assinatura digital criptográfica incorporada ao PDF.
- Que o registro tenha carimbo do tempo de autoridade independente ou que as evidências não possam ser alteradas por quem controla a infraestrutura e as chaves.

## Fluxo implementado

1. O usuário acessa a aplicação e autentica-se com Google.
2. Seleciona um PDF (limite de 5 MB) e manifesta consentimento explícito para registrar a assinatura eletrônica.
3. A API calcula o SHA-256 do PDF, guarda o **arquivo original** em bucket privado Cloudflare R2 e grava os metadados e eventos de auditoria no Turso.
4. O sistema gera identificador do registro e selo HMAC-SHA256 das evidências.
5. O usuário pode consultar **Meus documentos**, acessar o registro de verificação e baixar o **PDF original**.
6. Na página pública de verificação, o sistema confere o selo do registro. O visitante também pode selecionar um PDF para comparação local de SHA-256, sem transmitir esse arquivo ao servidor.

**Importante:** a integridade do registro e a correspondência dos bytes são verificações distintas. Um registro válido não prova que qualquer PDF apresentado corresponda ao documento registrado; é preciso comparar o SHA-256.

## Estado das funcionalidades

| Funcionalidade | Estado |
| --- | --- |
| Login com Google | Implementado |
| Consentimento explícito no registro | Implementado |
| Upload de PDF e armazenamento privado do original | Implementado |
| SHA-256 do PDF e HMAC-SHA256 das evidências | Implementado |
| Identificador e página pública de verificação | Implementado |
| Comparação local do hash do PDF | Implementado |
| Histórico de documentos do usuário por mês/ano | Implementado |
| Download do PDF original | Implementado |
| PDF derivado com selo visual, certificado e QR Code | Planejado |
| Hash e verificação independentes do PDF derivado | Planejado |
| Assinatura criptográfica embutida no PDF (PAdES) | Não implementado |
| Verificação robusta de identidade civil | Não implementado |
| Assinatura qualificada ICP-Brasil | Não implementado |

## Assinatura eletrônica e validade jurídica

No Brasil, **assinatura eletrônica** é uma categoria mais ampla do que assinatura digital com certificado ICP-Brasil. A legislação admite modalidades e meios distintos de demonstrar autoria e integridade, observados os requisitos legais e a aceitação aplicável.

Referências normativas para avaliação do caso concreto:

- [MP nº 2.200-2/2001, art. 10](https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm): trata de documentos eletrônicos e admite, nas condições do § 2º, outros meios de comprovação de autoria e integridade.
- [Lei nº 14.063/2020](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm): estabelece categorias de assinatura eletrônica simples, avançada e qualificada em seu âmbito de aplicação.

**Enquadramento prudente do MVP:** mecanismo de assinatura eletrônica com registro de evidências, compatível em finalidade com usos de assinatura simples. Isso **não equivale a certificação jurídica do produto**, nem significa que todo documento assinado pelo fluxo seja válido ou suficiente para qualquer finalidade. A classificação jurídica e a suficiência das provas dependem do caso concreto, das exigências aplicáveis e do procedimento efetivamente adotado.

Para contratos de alto valor, documentos sujeitos a formalidades especiais ou cenários com risco relevante de contestação, é necessária avaliação jurídica, de segurança e de conformidade antes do uso em produção.

## Arquitetura

- **Next.js / React:** interface, autenticação e rotas de API.
- **Auth.js / Google OAuth:** autenticação de acesso; não realiza identificação civil.
- **Turso/libSQL:** metadados de documentos, evidências e eventos de auditoria.
- **Cloudflare R2 privado:** armazenamento do PDF original.
- **SHA-256:** identificação e conferência de integridade dos bytes do arquivo.
- **HMAC-SHA256:** selo de integridade das evidências mantido pela própria aplicação.
- **Vercel:** hospedagem e execução.

O HMAC usa segredo controlado pelo serviço: **não é uma assinatura digital assimétrica do signatário**, nem uma prova independente da plataforma.

## Limitações e riscos conhecidos

- A identidade civil do signatário não é verificada; o login demonstra acesso à conta Google.
- A proteção HMAC depende da segurança da chave e da infraestrutura; não substitui armazenamento imutável, auditoria independente ou carimbo do tempo confiável.
- O PDF baixado é o **original**, não um novo PDF com assinatura embutida. Não o rotular como `_signed.pdf` sem produzir e registrar um artefato distinto.
- O eventual selo visual, certificado e QR Code **não transformarão**, isoladamente, o PDF em um arquivo com assinatura criptográfica PAdES.
- São necessárias revisões adicionais de autorização, limitação de requisições, privacidade, retenção, recuperação, rotação/versionamento de chaves e trilha de auditoria.
- Não utilizar documentos sensíveis ou fluxos jurídicos de alto risco sem avaliação específica.

## Próximas etapas (prioridade sugerida)

1. **Autoria e consentimento:** reforçar autenticação no momento da assinatura, vincular explicitamente a manifestação de vontade ao documento e ampliar evidências de auditoria.
2. **Confiabilidade das evidências:** trilha resistente a alterações, versionamento das chaves HMAC, políticas de retenção e, conforme necessidade, referência temporal independente.
3. **PDF de apresentação:** gerar `<nome>_signed.pdf` com selo visual, identificador, QR Code e página de evidências, preservando o original; armazenar e verificar o hash do novo artefato separadamente.
4. **Definição do nível de assinatura:** estabelecer requisitos de negócio e jurídicos antes de propor assinatura avançada, integração com prestadores de confiança ou PAdES/ICP-Brasil.
5. **Segurança operacional:** rate limiting, revisão de permissões, observabilidade, testes e política de privacidade.

## Configuração

Variáveis de ambiente (nunca publicar os valores dos segredos):

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

Aplicar `db/schema.sql` ao Turso. Configurar bucket R2 privado e permissões de leitura/gravação apropriadas. Registrar no Google OAuth os endereços de callback do ambiente.

## Desenvolvimento

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

O deploy de produção é acionado por push na branch `v2` via GitHub → Vercel. Evitar `vercel --prod` após um push que já inicia deploy automático.

---

**Resumo:** o Selo já registra e verifica evidências de uma operação de assinatura eletrônica. Seu foco atual é **integridade verificável e rastreabilidade operacional**, não comprovação inequívoca de identidade civil ou assinatura digital qualificada.
