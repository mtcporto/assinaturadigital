# Sistema de Assinatura Digital

## Sobre o Projeto

Este sistema permite a adição de assinaturas digitais em documentos PDF, fornecendo um mecanismo de validação de autenticidade através de QR Codes e links de verificação.

## Tecnologias Utilizadas

### Frontend
- **HTML5/CSS3** - Estrutura e estilização das páginas web
- **Bootstrap 5** - Framework CSS para design responsivo e componentes de interface
- **Bootstrap Icons** - Conjunto de ícones utilizados na interface

### Bibliotecas JavaScript
- **PDF.js** - Biblioteca para visualização e renderização de documentos PDF no navegador
- **PDF-lib** - Manipulação programática de documentos PDF, permitindo adicionar texto, imagens e modificar metadados
- **QRCode.js** - Geração de QR Codes com link de validação da assinatura
- **jsrsasign** - Implementação de criptografia RSA para assinatura digital

### Funcionalidades de Segurança
- **Criptografia RSA (2048 bits)** - Geração de pares de chaves para assinatura digital
- **Hash SHA-256** - Geração de identificadores únicos para documentos
- **QR Code de Validação** - Link integrado ao documento que permite validar sua autenticidade

## Estrutura do Projeto
- **index.html** - Página principal para assinatura de documentos
- **validar.html** - Interface para validação de documentos assinados
- **documentacao.html** - Documentação técnica do sistema
- **js/validar.js** - Script responsável pela validação de assinaturas

## Fluxo de Funcionamento
1. Upload do documento PDF
2. Posicionamento visual da assinatura no documento
3. Geração de assinatura digital com criptografia RSA
4. Inserção de QR Code de validação no documento
5. Download do documento assinado
6. Verificação da autenticidade através da página de validação

## Considerações de Segurança
O sistema implementa criptografia segura com RSA 2048 bits e SHA-256, porém não é uma solução de certificação digital no padrão ICP-Brasil. Sua validade jurídica é limitada conforme MP 2.200-2/2001, Art. 10 § 2º.

## Como Usar
1. Acesse a página principal (index.html)
2. Faça upload do documento PDF
3. Posicione a assinatura no local desejado 
4. Clique em "Assinar Documento"
5. Baixe o documento assinado
6. Para validar, acesse validar.html e faça upload do documento assinado