const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const P = require('pino');

// Diretório para armazenar as credenciais
const AUTH_FOLDER = './whatsapp-auth';

// Garante que o diretório de autenticação existe
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

// Simple logger with different levels
const logger = {
    info: (message) => console.log(`INFO: ${message}`),
    warn: (message) => console.warn(`WARN: ${message}`),
    error: (message) => console.error(`ERROR: ${message}`)
};

class WhatsAppClient {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.authPath = './auth_info.json';
        this.logger = P({ level: 'info' });

        if (!fs.existsSync(this.authPath)) {
            fs.writeFileSync(this.authPath, JSON.stringify({}));
        }
    }

    async initialize() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

            this.sock = makeWASocket({
                printQRInTerminal: true,
                auth: state,
                defaultQueryTimeoutMs: undefined,
                logger: this.logger
            });

            // Gerenciar eventos de conexão
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    
                    if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        logger.info(`Tentando reconectar... Tentativa ${this.reconnectAttempts}`);
                        await this.initialize();
                    } else {
                        logger.warn('Conexão fechada e não será reconectada.');
                    }
                } else if (connection === 'open') {
                    logger.info('Conexão estabelecida com sucesso!');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                }
            });

            // Salvar credenciais quando atualizadas
            this.sock.ev.on('creds.update', (creds) => {
                fs.writeFileSync(this.authPath, JSON.stringify(creds, null, 2));
            });

        } catch (error) {
            logger.error('Erro ao inicializar o WhatsApp:', error);
            throw error;
        }
    }

    async sendMessage(phoneNumber, message) {
        try {
            if (!this.isConnected) {
                throw new Error('Cliente WhatsApp não está conectado');
            }

            // Formata o número para o padrão WhatsApp
            const formattedNumber = `${phoneNumber}@s.whatsapp.net`;
            logger.info(`Enviando mensagem para ${formattedNumber}`);

            // Envia a mensagem
            const result = await this.sock.sendMessage(formattedNumber, {
                text: message
            });

            logger.info(`Mensagem enviada com sucesso para ${phoneNumber}`);
            return result;

        } catch (error) {
            logger.error(`Erro ao enviar mensagem para ${phoneNumber}:`, error);
            throw error;
        }
    }
}

module.exports = WhatsAppClient;
