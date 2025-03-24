const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode'); // Certifique-se de que esta linha está presente
const { welcomeMessage, getMessageByDay } = require('./utils/messages'); // Update the import path

let sock = null;
let qr = null;
let connectionStatus = 'disconnected';
const AUTH_FOLDER = './auth_info_baileys';

let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

// Função para inicializar o WhatsApp
async function connectToWhatsApp() {
    try {
        // Ensure auth folder exists
        if (!fs.existsSync(AUTH_FOLDER)) {
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }

        // Initialize auth state
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

        // Close existing connection if any
        if (sock) {
            sock.ws.close();
            sock = null;
        }

        // Create WhatsApp socket connection with additional configurations
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: P({ level: 'silent' }),
            connectTimeoutMs: 30000,
            retryRequestDelayMs: 1000,
            browser: ['JIBS Bot', 'Chrome', '1.0.0']
        });

        // Evento de conexão
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr: newQr } = update;

            if (newQr) {
                // Converte o QR code para base64
                qr = await qrcode.toDataURL(newQr);
                console.log('Novo QR Code disponível');
                retryCount = 0; // Reset retry count when new QR is generated
            }

            if (connection === 'close') {
                const error = lastDisconnect?.error;
                const statusCode = error?.output?.statusCode;
                console.log('Conexão fechada. Status code:', statusCode);

                // Handle specific error cases
                if (statusCode === 440) { // Conflict error
                    console.log('Detectado conflito de conexão. Limpando credenciais...');
                    try {
                        await fs.promises.rm(AUTH_FOLDER, { recursive: true, force: true });
                        console.log('Credenciais antigas removidas');
                    } catch (err) {
                        console.error('Erro ao limpar credenciais:', err);
                    }
                }

                const shouldReconnect = (statusCode !== DisconnectReason.loggedOut) && (retryCount < MAX_RETRIES);
                
                if (shouldReconnect) {
                    retryCount++;
                    console.log(`Tentativa de reconexão ${retryCount}/${MAX_RETRIES} em ${RETRY_INTERVAL/1000} segundos...`);
                    setTimeout(async () => {
                        try {
                            await connectToWhatsApp();
                        } catch (err) {
                            console.error('Erro na tentativa de reconexão:', err);
                        }
                    }, RETRY_INTERVAL);
                } else if (retryCount >= MAX_RETRIES) {
                    console.log('Número máximo de tentativas atingido. Por favor, reinicie o servidor.');
                    connectionStatus = 'error';
                }
            } else if (connection === 'open') {
                console.log('WhatsApp conectado com sucesso!');
                connectionStatus = 'connected';
                qr = null;
                retryCount = 0;
            }
        });

        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('Erro ao conectar WhatsApp:', error);
        connectionStatus = 'error';
        
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Tentativa de reconexão ${retryCount}/${MAX_RETRIES} em ${RETRY_INTERVAL/1000} segundos...`);
            setTimeout(connectToWhatsApp, RETRY_INTERVAL);
        } else {
            console.error('Número máximo de tentativas atingido');
            throw error;
        }
    }

    return sock;
}

// Função para obter status da conexão
function getConnectionStatus() {
    return {
        status: connectionStatus,
        qr: qr // Retorna o QR code em base64
    };
}

// Função para enviar mensagem
async function sendMessage(phone, message) {
    try {
        // Validate WhatsApp connection
        if (!sock || connectionStatus !== 'connected') {
            throw new Error('WhatsApp não está conectado');
        }

        // Validate phone parameter
        if (!phone) {
            throw new Error('Número de telefone é obrigatório');
        }

        // Validate message parameter
        if (!message) {
            throw new Error('Mensagem é obrigatória');
        }

        // Format phone number if needed
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // Format JID for WhatsApp
        const jid = `${formattedPhone}@s.whatsapp.net`;

        // Check if number exists on WhatsApp
        const [exists] = await sock.onWhatsApp(formattedPhone);
        if (!exists) {
            throw new Error(`O número ${formattedPhone} não está registrado no WhatsApp`);
        }

        // Send message with retry logic
        let retries = 3;
        while (retries > 0) {
            try {
                await sock.sendMessage(jid, { text: message });
                console.log(`Mensagem enviada com sucesso para ${formattedPhone}`);
                return true;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

module.exports = {
    connectToWhatsApp,
    getConnectionStatus,
    sendMessage
};
