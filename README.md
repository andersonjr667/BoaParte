# 💒 Sistema de Gerenciamento de Membros da Igreja

Sistema web robusto para administração de membros, controle de presença, notificações automáticas via WhatsApp e geração de relatórios, com foco em segurança, automação e facilidade de uso.

---

## 📚 Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Instalação e Configuração](#instalação-e-configuração)
- [Integração WhatsApp](#integração-whatsapp)
- [Agendamento de Notificações](#agendamento-de-notificações)
- [Segurança](#segurança)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Exemplos de Uso](#exemplos-de-uso)
- [Boas Práticas](#boas-práticas)
- [Contato e Suporte](#contato-e-suporte)
- [Licença](#licença)

---

## ✨ Visão Geral

Este sistema foi desenvolvido para facilitar o gerenciamento de membros de igrejas, permitindo:
- Cadastro, atualização e exclusão de membros
- Controle de presenças e ausências
- Justificativas de faltas
- Notificações automáticas via WhatsApp
- Painel administrativo com estatísticas e exportação de dados

---

## 🚀 Funcionalidades

- Autenticação segura (admin e usuário comum)
- CRUD de membros
- Controle de presença e ausências
- Justificativas de faltas
- Notificações automáticas via WhatsApp
- Dashboard com gráficos e estatísticas
- Exportação de dados (CSV/Excel)
- Painel administrativo
- Logs de notificações e auditoria

---

## 🛠️ Tecnologias

- Node.js 18+
- MongoDB 6+
- Express.js
- JWT (JSON Web Token)
- bcrypt
- Socket.io (para QR Code do WhatsApp)
- Integração com WhatsApp (biblioteca específica)
- HTML, CSS, JavaScript (Frontend)

---

## ⚙️ Instalação e Configuração

1. **Clone o repositório:**
   ```bash
   git clone [url-do-repositorio]
   cd [nome-da-pasta]
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto:
   ```env
   MONGO_URI=sua-uri-do-mongodb
   JWT_SECRET=seu-segredo-jwt
   PORT=3000
   ```

4. **Inicialize o banco de dados e crie o admin padrão:**
   ```bash
   npm run init-db
   ```
   - Admin padrão:
     - Email: `admin@church.com`
     - Senha: `admin123`
   > **Troque a senha do admin após o primeiro login!**

5. **Execute o sistema:**
   - Ambiente de desenvolvimento:
     ```bash
     npm run dev
     ```
   - Ambiente de produção:
     ```bash
     npm start
     ```

---

## 📱 Integração WhatsApp

- Ao iniciar o servidor, um QR Code será exibido no terminal.
- Escaneie com o WhatsApp do número responsável pelo envio das notificações.
- Aguarde a confirmação de conexão.
- O sistema mantém a sessão ativa para envio automático de mensagens.

---

## ⏰ Agendamento de Notificações

- Notificações automáticas enviadas aos domingos às 20h.
- Membros ausentes por 2 ou mais semanas consecutivas são notificados.
- Todas as tentativas de notificação são registradas para auditoria.

---

## 🔒 Segurança

- Autenticação via JWT
- Senhas criptografadas com bcrypt
- Proteção contra CSRF e XSS
- Validação de dados em todas as rotas
- Logs de acesso e operações sensíveis

---

## 📁 Estrutura do Projeto

```
├── models/          # Modelos do MongoDB
├── public/          # Arquivos estáticos (JS, CSS, HTML)
│   ├── js/
│   ├── styles/
│   └── pages/
├── routes/          # Rotas da API
├── utils/           # Funções utilitárias
├── logs/            # Logs do sistema
└── README.md
```

---

## 📝 Exemplos de Uso

- **Cadastrar membro:**  
  Acesse o painel administrativo e clique em "Novo Membro".
- **Registrar presença:**  
  Selecione o membro e marque a presença na data desejada.
- **Enviar justificativa:**  
  Informe o motivo da ausência pelo painel ou via WhatsApp.
- **Exportar dados:**  
  Utilize o botão "Exportar" no dashboard para gerar relatórios.

---

## 💡 Boas Práticas

- Troque a senha do admin após o primeiro acesso.
- Mantenha o WhatsApp conectado para garantir o envio das notificações.
- Faça backup regular do banco de dados.
- Atualize as dependências do projeto periodicamente.

---

## 📬 Contato e Suporte

Dúvidas, sugestões ou suporte técnico:  
**Email:** [seu-email]

---

## 🏷️ Licença

Este projeto está sob a licença MIT. Sinta-se livre para usar, modificar e contribuir!

---

# Boa Parte - Sistema de Gerenciamento

## Setup do Projeto

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
- Copie `.env.example` para `.env`
- Ajuste as variáveis conforme necessário

3. Inicie o servidor:
```bash
npm start
```

## Deploy no Render

Para fazer deploy no Render.com:

1. Faça push do seu repositório para o GitHub.
2. No Render, crie um novo "Web Service" e conecte ao seu repositório.
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_ENV=production`
     - `PORT=3000`
     - `MONGO_URI=...` (sua string do MongoDB Atlas)
     - `JWT_SECRET=...` (sua chave secreta)
     - `SESSION_SECRET=...` (outra chave secreta)
     - `FRONTEND_URL=https://seusite.onrender.com` (ajuste para a URL do seu serviço)
     - Outras variáveis conforme `.env.example`

4. Após o deploy, acesse a URL fornecida pelo Render.
5. Se necessário, rode `npm audit fix --force` localmente para corrigir vulnerabilidades e faça novo push.

> **Dica:**
> - O arquivo `.env.example` lista todas as variáveis obrigatórias.
> - O diretório `tokens/` está no `.gitignore` e não será enviado ao Render (a sessão do WhatsApp será criada do zero no deploy).
