const express = require('express');
const router = express.Router();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { auth } = require('./utils/auth');
const Log = require('./models/Log');
const fs = require('fs-extra');
const path = require('path');
const qrcode = require('qrcode');

let sock = null;
let ioInstance = null;
let lastQr = null;
let isReady = false;
let reconnecting = false;

const sessionFolder = path.join(__dirname, 'tokens', 'baileys-session');

// Inicializa o Baileys
async function startBaileys(socket) {
    if (reconnecting) return;
    reconnecting = true;
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
        const { version } = await fetchLatestBaileysVersion();
        sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state,
            syncFullHistory: false,
            getMessage: async () => undefined,
        });
        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;
            if (qr) {
                lastQr = await qrcode.toDataURL(qr);
                if (socket) socket.emit('qr', lastQr.replace(/^data:image\/png;base64,/, ''));
                if (ioInstance) ioInstance.emit('qr', lastQr.replace(/^data:image\/png;base64,/, ''));
                isReady = false;
            }
            if (connection === 'open') {
                isReady = true;
                if (socket) socket.emit('ready');
                if (ioInstance) ioInstance.emit('ready');
            }
            if (connection === 'close') {
                isReady = false;
                // Tenta reconectar sempre, mesmo se for loggedOut
                setTimeout(() => startBaileys(socket), 2000);
                if (socket) socket.emit('disconnected');
                if (ioInstance) ioInstance.emit('disconnected');
            }
        });
        sock.ev.on('creds.update', saveCreds);
    } catch (err) {
        if (socket) socket.emit('error', err.message);
        if (ioInstance) ioInstance.emit('error', err.message);
    } finally {
        reconnecting = false;
    }
}

// Envio de mensagem via Baileys
async function sendMessageBaileys(number, message) {
    if (!sock || !isReady) throw new Error('WhatsApp não está conectado');
    let formatted = number.replace(/\D/g, '');
    // Garante que começa com 55 (Brasil)
    if (!formatted.startsWith('55')) {
        formatted = '55' + formatted;
    }
    // Remove o primeiro 9 após o DDD se for número móvel de MG/SP/RJ antigo
    // Ex: 5531991234567 => 553131234567
    formatted = formatted.replace(/^(55\d{2})9(\d{8})$/, '$1$2');
    const jid = formatted.endsWith('@s.whatsapp.net') ? formatted : formatted + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text: message });
}

// Rotas REST
router.post('/', auth, async (req, res) => {
    try {
        const { number, message } = req.body;
        await sendMessageBaileys(number, message);
        res.json({ success: true, message: 'Mensagem enviada com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao enviar mensagem', error: error.message });
    }
});

router.get('/status', auth, (req, res) => {
    res.json({ connected: !!sock && isReady });
});

// Função para integrar com Socket.IO
function setupWhatsApp(io) {
    ioInstance = io;
    io.on('connection', (socket) => {
        socket.on('requestQR', async () => {
            // Sempre força reinicialização do Baileys e limpa estado
            try {
                if (sock) {
                    await sock.logout().catch(() => {});
                }
            } catch {}
            sock = null;
            isReady = false;
            lastQr = null;
            await startBaileys(socket);
        });
        socket.on('checkStatus', () => {
            if (isReady) {
                socket.emit('ready');
            } else if (lastQr) {
                socket.emit('qr', lastQr.replace(/^data:image\/png;base64,/, ''));
            } else {
                socket.emit('disconnected');
            }
        });
        socket.on('logout', async () => {
            if (sock) {
                await sock.logout();
                sock = null;
                isReady = false;
                lastQr = null;
                socket.emit('disconnected');
            }
        });
    });
    startBaileys();
}

module.exports = {
    router,
    setupWhatsApp,
    sendMessageBaileys
};
