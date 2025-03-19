const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode'); // Certifique-se de que esta linha está presente
const { getRandomMessage } = require('./public/js/messages'); // Adicione esta linha

let sock = null;
let qr = null;
let connectionStatus = 'disconnected';
const AUTH_FOLDER = './auth_info_baileys';

// Função para inicializar o WhatsApp
async function connectToWhatsApp() {
    try {
        // Ensure auth folder exists
        if (!fs.existsSync(AUTH_FOLDER)) {
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }

        // Initialize auth state
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

        // Create WhatsApp socket connection
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: P({ level: 'silent' })
        });

        // Evento de conexão
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr: newQr } = update;

            if (newQr) {
                // Converte o QR code para base64
                qr = await qrcode.toDataURL(newQr);
                console.log('Novo QR Code disponível');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)? 
                    lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
                console.log('Conexão fechada devido a ', lastDisconnect?.error);
                if (shouldReconnect) {
                    await connectToWhatsApp();
                }
            } else if (connection === 'open') {
                console.log('WhatsApp conectado!');
                connectionStatus = 'connected';
                qr = null;
            }
        });

        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('Erro ao conectar WhatsApp:', error);
        connectionStatus = 'error';
        throw error;
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
async function sendMessage(to) {
    if (!sock || connectionStatus !== 'connected') {
        throw new Error('WhatsApp não está conectado');
    }

    try {
        // Remove todos os caracteres não numéricos e adiciona o código do país +55
        const cleanNumber = to.replace(/\D/g, '');
        const formattedNumber = cleanNumber.startsWith('55') ? `${cleanNumber}@s.whatsapp.net` : `55${cleanNumber}@s.whatsapp.net`;
        const message = getRandomMessage(); // Obtém uma mensagem aleatória
        console.log(`Enviando mensagem para ${formattedNumber}: ${message}`); // Log para depuração
        await sock.sendMessage(formattedNumber, { text: message });
        console.log('Mensagem enviada com sucesso'); // Log para depuração
        return true;
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
