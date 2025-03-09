const WhatsAppClient = require('./whatsapp');

async function example() {
    try {
        // Criar instância do cliente WhatsApp
        const whatsapp = new WhatsAppClient();
        
        // Inicializar o cliente (isso irá gerar o QR Code no terminal)
        console.log('Inicializando cliente WhatsApp...');
        await whatsapp.initialize();
        
        // Aguardar a conexão ser estabelecida
        console.log('Aguarde o QR Code aparecer no terminal e escaneie-o com seu WhatsApp');
        
        // Verificar se o cliente está conectado
        whatsapp.on('ready', () => {
            console.log('Cliente WhatsApp conectado com sucesso!');
        });

        // Exemplo de como enviar uma mensagem
        // Você pode descomentar estas linhas e substituir com um número real quando quiser testar
        /*
        setTimeout(async () => {
            try {
                // Substitua "5511999999999" pelo número de telefone desejado (formato internacional sem +)
                await whatsapp.sendMessage('5511999999999', 'Olá! Esta é uma mensagem de teste.');
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
            }
        }, 10000); // Espera 10 segundos para dar tempo de escanear o QR Code
        */
        
    } catch (error) {
        console.error('Erro no exemplo:', error);
    }
}

// Executar o exemplo
example();
