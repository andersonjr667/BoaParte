const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const messages = require('./utils/messages');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

let sock = null;
let isConnecting = false;
const RECONNECT_INTERVAL = 3000;
const MAX_RETRIES = 5;
let retryCount = 0;
let qr = null;

// Configuração do logger
const logger = P({ 
    timestamp: () => `,"time":"${new Date().toJSON()}"`,
    level: 'silent' 
});

// Add disk space check function
async function checkDiskSpace() {
    try {
        // For Windows
        const { stdout } = await exec('wmic logicaldisk get freespace,size /format:csv');
        const lines = stdout.trim().split('\n');
        const values = lines[1].split(',');
        const freeSpace = parseInt(values[1]);
        const totalSpace = parseInt(values[2]);
        
        // Ensure at least 100MB free
        const MIN_FREE_SPACE = 100 * 1024 * 1024; // 100MB in bytes
        if (freeSpace < MIN_FREE_SPACE) {
            throw new Error('Insufficient disk space');
        }
        return true;
    } catch (error) {
        console.error('Error checking disk space:', error);
        return false;
    }
}

// Função para inicializar o WhatsApp
async function connectToWhatsApp() {
    if (isConnecting) return;
    try {
        isConnecting = true;

        // Check disk space before proceeding
        const hasSpace = await checkDiskSpace();
        if (!hasSpace) {
            throw new Error('Insufficient disk space for WhatsApp operation');
        }

        // Create AUTH_FOLDER if it doesn't exist
        const AUTH_FOLDER = './auth_info_baileys';
        if (!fs.existsSync(AUTH_FOLDER)) {
            await fs.promises.mkdir(AUTH_FOLDER, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        
        sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            logger,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            retryRequestDelayMs: 2000,
            browser: ['Ubuntu', 'Chrome', '22.04.4'],
            defaultQueryTimeoutMs: 60000,
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr: newQr } = update;

            if (newQr) {
                try {
                    qr = await generateQRWithLogo(newQr);
                    console.log('New QR code generated with logo');
                    retryCount = 0;
                } catch (qrError) {
                    console.error('Error generating QR code:', qrError);
                    qr = null;
                }
            }

            if (connection === 'close') {
                const error = lastDisconnect?.error;
                const statusCode = error?.output?.statusCode;
                console.log('Conexão fechada. Status code:', statusCode);

                // Clear any existing reconnection timeout
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }

                // Handle specific disconnection cases
                if (statusCode === DisconnectReason.loggedOut || 
                    statusCode === DisconnectReason.connectionLost ||
                    statusCode === DisconnectReason.connectionReplaced) {
                    console.log('Limpando credenciais devido a desconexão permanente...');
                    try {
                        await fs.promises.rm(AUTH_FOLDER, { recursive: true, force: true });
                        console.log('Credenciais antigas removidas');
                        connectionStatus = 'disconnected';
                        retryCount = 0;
                    } catch (err) {
                        console.error('Erro ao limpar credenciais:', err);
                    }
                }

                const shouldReconnect = (statusCode !== DisconnectReason.loggedOut) && (retryCount < MAX_RETRIES);
                
                if (shouldReconnect) {
                    retryCount++;
                    console.log(`Tentativa de reconexão ${retryCount}/${MAX_RETRIES} em ${RECONNECT_INTERVAL/1000} segundos...`);
                    connectionStatus = 'reconnecting';
                    
                    reconnectTimeout = setTimeout(async () => {
                        try {
                            await connectToWhatsApp();
                        } catch (err) {
                            console.error('Erro na tentativa de reconexão:', err);
                            connectionStatus = 'error';
                        }
                    }, RECONNECT_INTERVAL);
                } else {
                    console.log('Número máximo de tentativas atingido ou logout detectado');
                    connectionStatus = 'error';
                }
            } else if (connection === 'open') {
                console.log('WhatsApp conectado com sucesso!');
                connectionStatus = 'connected';
                qr = null;
                retryCount = 0;
                reconnectAttempts = 0;
            }
        });

        // Modify credentials update handler
        sock.ev.on('creds.update', async () => {
            try {
                const hasSpace = await checkDiskSpace();
                if (!hasSpace) {
                    console.error('Low disk space detected during credentials update');
                    return;
                }
                await saveCreds();
            } catch (error) {
                console.error('Error saving credentials:', error);
                // If we can't save credentials, mark connection as error
                connectionStatus = 'error';
            }
        });

        return sock;
    } catch (error) {
        console.error('Erro ao inicializar WhatsApp:', error);
        connectionStatus = 'error';
        
        // If error is disk space related, try cleanup
        if (error.code === 'ENOSPC') {
            try {
                await fs.promises.rm(AUTH_FOLDER, { recursive: true, force: true });
                console.log('Cleaned up auth folder due to disk space issues');
            } catch (cleanupError) {
                console.error('Failed to clean up:', cleanupError);
            }
        }
        
        throw error;
    } finally {
        isConnecting = false;
    }
}

// Função para enviar mensagem com melhor tratamento de erros
async function sendMessage(phone, message) {
    try {
        if (!sock || connectionStatus !== 'connected') {
            throw new Boom('WhatsApp não está conectado', { statusCode: 428 });
        }

        if (!phone || !message) {
            throw new Boom('Número de telefone e mensagem são obrigatórios', { statusCode: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const jid = `${formattedPhone}@s.whatsapp.net`;

        try {
            const [exists] = await sock.onWhatsApp(formattedPhone);
            if (!exists) {
                throw new Boom(`O número ${formattedPhone} não está registrado no WhatsApp`, { statusCode: 404 });
            }
        } catch (error) {
            if (error.output?.statusCode === 428) {
                // Se a conexão foi perdida durante a verificação, tenta reconectar
                connectionStatus = 'disconnected';
                await connectToWhatsApp();
                throw new Boom('Tentando reconectar ao WhatsApp. Por favor, tente novamente em alguns segundos.', { statusCode: 503 });
            }
            throw error;
        }

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

// Função para obter status da conexão
function getConnectionStatus() {
    return {
        status: connectionStatus,
        qr: qr
    };
}

async function generateQRWithLogo(qrData) {
    try {
        // Generate QR code with optimal settings for reliable scanning
        return await qrcode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 400,
            color: {
                dark: '#000000',
                light: '#ffffff',
            }
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
}

module.exports = {
    connectToWhatsApp,
    getConnectionStatus,
    sendMessage
};
