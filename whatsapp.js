const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');

class WhatsAppManager {
    constructor() {
        this.sock = null;
        this.qr = null;
        this.authInfo = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.authFolder = path.join(__dirname, 'auth');
        this.authFile = path.join(this.authFolder, 'auth_info.json');
        this.eventListeners = new Map();

        // Ensure auth folder exists
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    async connect() {
        try {
            // Load auth info if exists
            if (fs.existsSync(this.authFile)) {
                this.authInfo = JSON.parse(fs.readFileSync(this.authFile, 'utf8'));
            }

            this.sock = makeWASocket({
                printQRInTerminal: true,
                auth: this.authInfo || undefined,
                logger: P({ level: 'silent' }),
                browser: ['Boa Parte', 'Chrome', '1.0.0']
            });

            this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
            this.sock.ev.on('creds.update', this.handleCredsUpdate.bind(this));

            return this.sock;
        } catch (error) {
            console.error('Error connecting to WhatsApp:', error);
            throw error;
        }
    }

    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            this.qr = qr;
            // Emit QR code event for frontend
            this.emit('qr', qr);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;

            if (shouldReconnect && this.connectionAttempts < this.maxRetries) {
                this.connectionAttempts++;
                console.log(`Tentando reconectar... Tentativa ${this.connectionAttempts}`);
                setTimeout(() => this.connect(), 5000);
            } else {
                this.isConnected = false;
                this.emit('disconnected');
            }
        } else if (connection === 'open') {
            console.log('WhatsApp conectado!');
            this.isConnected = true;
            this.connectionAttempts = 0;
            this.emit('connected');
        }
    }

    handleCredsUpdate(creds) {
        this.authInfo = creds;
        fs.writeFileSync(this.authFile, JSON.stringify(creds, null, 2));
    }

    async sendMessage(to, message) {
        if (!this.isConnected || !this.sock) {
            throw new Error('WhatsApp não está conectado');
        }

        try {
            // Format phone number
            let formattedNumber = to.replace(/\D/g, '');
            
            // Add +55 if not present
            if (!formattedNumber.startsWith('55')) {
                formattedNumber = '55' + formattedNumber;
            }
            
            // Add final formatting for WhatsApp
            const fullNumber = `${formattedNumber}@s.whatsapp.net`;
            
            console.log('Sending message to:', fullNumber); // Debug log

            // Send message
            const result = await this.sock.sendMessage(fullNumber, {
                text: message
            });

            return result;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            qr: this.qr
        };
    }
}

module.exports = new WhatsAppManager();
