# Boa Parte - Sistema de Gerenciamento de Contatos

Sistema web para gerenciamento de contatos com autenticação segura.

## Funcionalidades

- Autenticação de usuários
- Gerenciamento de contatos
- Dashboard com visualização de contatos
- Sistema de convites para registro
- Proteção contra ataques comuns (rate limiting, XSS, etc.)

## Tecnologias Utilizadas

- Node.js
- Express
- MongoDB
- JWT para autenticação
- Bootstrap para interface

## Configuração do Ambiente

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie o arquivo `.env.example` para `.env` e configure as variáveis:
   ```bash
   cp .env.example .env
   ```
4. Configure as seguintes variáveis no `.env`:
   - `MONGO_URI`: URL de conexão do MongoDB
   - `JWT_SECRET`: Chave secreta para tokens JWT
   - `INVITE_CODE`: Código para permitir novos registros
   - `PORT`: Porta do servidor (opcional, padrão 3000)

## Desenvolvimento

Para rodar em ambiente de desenvolvimento:
```bash
npm run dev
```

## Produção

Para rodar em produção:
```bash
npm start
```

## Deploy no Render

1. Crie uma conta no Render (render.com)
2. Conecte seu repositório GitHub
3. Crie um novo Web Service
4. Configure as variáveis de ambiente:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `INVITE_CODE`
   - `NODE_ENV=production`
5. Build Command: `npm install`
6. Start Command: `npm start`
