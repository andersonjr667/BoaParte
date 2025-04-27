const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

let sock = null;

async function connectToWhatsApp(io) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            defaultQueryTimeoutMs: undefined
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    // Generate QR code as data URL
                    const qrUrl = await qrcode.toDataURL(qr);
                    // Emit to all connected clients
                    if (io) {
                        io.emit('qr', { qr: qrUrl });
                        console.log('QR Code emitted to clients');
                    }
                } catch (err) {
                    console.error('Error generating QR:', err);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed due to:', lastDisconnect?.error, ', Reconnecting:', shouldReconnect);
                
                if (shouldReconnect) {
                    connectToWhatsApp(io);
                }
            } else if (connection === 'open') {
                console.log('WhatsApp connection opened!');
                if (io) {
                    io.emit('connection-status', { connected: true });
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('Error in WhatsApp connection:', error);
    }
}

async function sendMessage(to, text) {
    try {
        if (!sock) {
            throw new Error('WhatsApp client not initialized');
        }

        // Remove todos os caracteres não numéricos
        const phoneNumber = to.replace(/\D/g, '');
        
        // Formata o número para o padrão do WhatsApp
        const formattedNumber = `${phoneNumber}@s.whatsapp.net`;

        // Envia a mensagem
        await sock.sendMessage(formattedNumber, { text });
        
        console.log(`Message sent to ${phoneNumber}`);
        return true;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}

function isConnected() {
    return sock?.user ? true : false;
}

function getConnectionStatus() {
    return {
        connected: sock?.user != null
    };
}

module.exports = {
    connectToWhatsApp,
    sendMessage,
    isConnected,
    getConnectionStatus
};
