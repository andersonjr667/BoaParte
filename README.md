# BoaParte - Sistema de Autenticação

Sistema de autenticação moderno e seguro com interface intuitiva.

## 🚀 Funcionalidades

- Login seguro com JWT
- Registro de usuários com código de convite
- Interface moderna e responsiva
- Validação em tempo real
- Feedback visual para todas as ações
- Sistema de notificações
- Proteção contra tokens inválidos

## 🛠️ Tecnologias

- Frontend:
  - HTML5
  - CSS3 (com animações e design responsivo)
  - JavaScript (Vanilla)
  - FontAwesome para ícones

- Backend:
  - Node.js
  - Express.js
  - MongoDB (com Mongoose)
  - JWT para autenticação
  - Bcrypt para hash de senhas

## 📋 Pré-requisitos

- Node.js (v14 ou superior)
- MongoDB Atlas (ou MongoDB local)
- NPM ou Yarn

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/boaparte.git
cd boaparte
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
- MONGODB_URI
- JWT_SECRET
- REGISTRATION_CODE

4. Inicie o servidor:
```bash
npm start
```

## 🔐 Segurança

- Senhas hasheadas com bcrypt
- Tokens JWT com expiração
- Validação de dados no servidor
- Proteção contra tokens inválidos
- Código de registro necessário

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- Desktops
- Tablets
- Smartphones

## 🎨 Design

- Tema verde moderno
- Animações suaves
- Feedback visual
- Notificações elegantes
- Interface intuitiva

## 🤝 Contribuindo

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Faça o Commit das suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Faça o Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Módulo WhatsApp

Este projeto inclui um módulo para envio de mensagens via WhatsApp usando a biblioteca Baileys. O módulo permite:

- Autenticação via QR Code
- Armazenamento automático de credenciais
- Reconexão automática em caso de desconexão
- Envio de mensagens de texto

### Como usar o módulo WhatsApp

1. Primeiro, certifique-se de que todas as dependências estão instaladas:
```bash
npm install
```

2. Para testar o envio de mensagens, use o arquivo de exemplo:
```bash
node example-whatsapp.js
```

3. Quando executar pela primeira vez, um QR Code será exibido no terminal. Escaneie-o com seu WhatsApp para autenticar.

4. Para enviar mensagens em seu próprio código:
```javascript
const WhatsAppClient = require('./whatsapp');

async function sendMessage() {
    const whatsapp = new WhatsAppClient();
    await whatsapp.initialize();
    
    // Aguarde a conexão ser estabelecida
    // O número deve estar no formato internacional sem o '+'
    await whatsapp.sendMessage('5511999999999', 'Sua mensagem aqui');
}
```

### Notas importantes

- As credenciais são salvas automaticamente na pasta `whatsapp-auth`
- O número de telefone deve estar no formato internacional sem o '+' (exemplo: 5511999999999)
- A reconexão automática tentará reconectar até 5 vezes em caso de desconexão
- Não é necessário escanear o QR Code novamente após a primeira autenticação

# 1
