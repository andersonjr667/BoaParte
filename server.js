require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const whatsapp = require('./whatsapp');
const routes = require('./routes');
const Log = require('./models/Log');
const User = require('./models/User');
const { auth, adminOnly, requireRole } = require('./utils/auth');
const { saveLog } = require('./utils/logger');
const ngrok = require('ngrok');
const ngrokConfigPath = path.join(__dirname, 'ngrok.json');

let helmet;
try {
    helmet = require('helmet');
} catch (e) {
    console.warn('Helmet not found, continuing without security middleware');
    helmet = null;
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;

// Console colors
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m"
};

// Função para mostrar o banner do sistema
function showBanner() {
    const version = require('./package.json').version;
    console.clear();
    console.log(`${colors.magenta}${colors.bright}
    ╔════════════════════════════════════╗
    ║        Sistema de Gestão dos       ║
    ║         Visitantes da Igreja       ║
    ║                                    ║
    ║              Boa Parte             ║
    ║          Versão ${version}              ╚════════════════════════════════════╝${colors.reset}
    `);
}

function printBanner() {
    console.clear();
    console.log('\x1b[35m');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║        Sistema de Gestão dos Visitantes da Igreja           ║');
    console.log('║                    Boa Parte  v1.7.1                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m');
}

function printStatus({ mongo, mode, urls, browser, venom, warnings }) {
    console.log('');
    if (mongo) console.log(`\x1b[36m✓ MongoDB: ${mongo}\x1b[0m`);
    if (mode) console.log(`\x1b[36m✓ Modo: ${mode}\x1b[0m`);
    if (urls && urls.length) {
        console.log('\x1b[36m✓ Endereços:');
        urls.forEach(u => console.log(`  └─ ${u}`));
        console.log('\x1b[0m');
    }
    if (browser) console.log(`\x1b[36m✓ Navegador: ${browser}\x1b[0m`);
    if (venom) console.log(`\x1b[36m✓ WhatsApp: ${venom}\x1b[0m`);
    if (warnings && warnings.length) {
        warnings.forEach(w => console.log(`\x1b[33m⚠️  ${w}\x1b[0m`));
    }
    console.log('');
}

// Função para mostrar status do servidor
function logServerStatus() {
    console.log(`${colors.green}✓ Servidor rodando:${colors.reset}`);
    console.log(`  └─ Local:   ${colors.cyan}http://localhost:${port}${colors.reset}`);
    console.log(`  └─ Modo:    ${colors.cyan}${process.env.NODE_ENV || 'development'}${colors.reset}`);
    console.log(`  └─ MongoDB: ${colors.cyan}Conectado${colors.reset}\n`);
}

// Security middleware
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'self'"],
            },
        } : false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
}

// Configuração para ambiente de produção
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Configuração CORS para produção
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração para servir arquivos estáticos
app.use(express.static('public'));
app.use('/db', express.static('db')); // Permite acesso aos arquivos JSON

// Rota para salvar alterações no arquivo members.json
app.post('/db/members.json', auth, async (req, res) => {
    try {
        const membersPath = path.join(__dirname, 'db', 'members.json');
        await fs.writeJson(membersPath, req.body, { spaces: 2 });
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar members.json:', error);
        res.status(500).json({ error: 'Erro ao salvar alterações' });
    }
});

// Request logging middleware
app.use(async (req, res, next) => {
    const start = Date.now();
    res.on('finish', async () => {
        const duration = Date.now() - start;
        if (duration > 1000) { // Log requests that take more than 1 second
            await Log.logAction({
                type: 'system',
                action: 'slow_request',
                description: `Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`,
                username: req.userData?.username || req.userData?.email || 'anonymous',
                source: 'server'
            });
        }
    });
    next();
});



// WhatsApp configuration
let whatsappClient = null;
let lastQrCode = null; // Armazena o último QR code gerado

// Detecta ambiente para pasta de tokens
const isRender = !!process.env.RENDER;
const tokensFolder = isRender
  ? '/persistent/tokens' // Render Persistent Disk, se disponível
  : path.join(__dirname, 'tokens');

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Inicializa WhatsApp
    async function initWhatsApp() {
        try {
            whatsappClient = await whatsapp.create({
                session: 'BoaParte-System',
                multidevice: true,
                headless: 'new',
                useChrome: false,
                debug: false,
                logQR: false,
                createPathFileToken: true,
                folderNameToken: tokensFolder,
            },
            (base64Qr) => {
                if (base64Qr) {
                    lastQrCode = base64Qr; // Salva o último QR code
                    socket.emit('qr', base64Qr);
                }
            },
            (statusFind) => {
                if (statusFind === 'isLogged') socket.emit('ready');
            });

            whatsappClient.onStateChange((state) => {
                if (state === 'CONNECTED') socket.emit('ready');
                if (state === 'DISCONNECTED') {
                    socket.emit('disconnected');
                    whatsappClient = null;
                    lastQrCode = null; // Limpa QR ao desconectar
                }
            });
        } catch (error) {
            console.error('Erro ao inicializar WhatsApp:', error);
            socket.emit('error', error.message);
        }
    }

    // Eventos do socket
    socket.on('requestQR', async () => {
        console.log('Socket.IO: requestQR recebido');
        if (!whatsappClient) {
            console.log('Socket.IO: whatsappClient nulo, iniciando WhatsApp...');
            await initWhatsApp();
        } else if (!(await whatsappClient.isConnected())) {
            // Se o cliente existe mas está desconectado, fecha e reinicia para garantir QR
            try { await whatsappClient.close(); } catch (e) {}
            whatsappClient = null;
            lastQrCode = null;
            await initWhatsApp();
        } else {
            // Se já está conectado, apenas avisa o frontend
            socket.emit('ready');
            return;
        }
        // Se existe um QR salvo e não está conectado, reenvia para o frontend
        if (lastQrCode && (!whatsappClient || !(await whatsappClient.isConnected()))) {
            socket.emit('qr', lastQrCode);
        }
    });

    socket.on('checkStatus', async () => {
        console.log('Socket.IO: checkStatus recebido');
        if (whatsappClient && (await whatsappClient.isConnected())) {
            socket.emit('ready');
        } else if (lastQrCode) {
            socket.emit('qr', lastQrCode);
        } else {
            socket.emit('disconnected');
        }
    });

    socket.on('logout', async () => {
        if (whatsappClient) {
            await whatsappClient.close();
            whatsappClient = null;
        }
        lastQrCode = null;
        socket.emit('disconnected');
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Make io accessible
app.set('io', io);

// Session version control
const sessionVersionPath = path.join(__dirname, 'session_version.json');
let sessionVersion = 1;
try {
    if (fs.existsSync(sessionVersionPath)) {
        const data = JSON.parse(fs.readFileSync(sessionVersionPath, 'utf8'));
        sessionVersion = (data.version || 1) + 1;
    }
    fs.writeFileSync(sessionVersionPath, JSON.stringify({ version: sessionVersion }, null, 2));
    console.log(colors.yellow + `Sessão versão: ${sessionVersion}` + colors.reset);
} catch (err) {
    console.error(colors.red + 'Erro ao ler/incrementar session_version.json:' + colors.reset, err);
}

// Tornar a versão disponível globalmente
app.set('sessionVersion', sessionVersion);

// Mount the members router with /api prefix for all member operations
app.use('/api/members', require('./routes/members'));
app.use('/api/members', require('./routes/members'));

// --- INÍCIO: Rotas REST CRUD de contatos (JSON) ---
const contactsPath = path.join(__dirname, 'db', 'contacts.json');

// Listar contatos
app.get('/api/contacts', async (req, res) => {
    try {
        let contacts = JSON.parse(await fs.readFile(contactsPath, 'utf8'));
        // Garante que todos os contatos tenham o campo status
        contacts = contacts.map(c => ({ ...c, status: c.status || 'novo' }));
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar contatos' });
    }
});

// Criar contato
app.post('/api/contacts', async (req, res) => {
    try {
        let contacts = JSON.parse(await fs.readFile(contactsPath, 'utf8'));
        const newContact = {
            _id: Date.now().toString(),
            name: req.body.name,
            phone: req.body.phone.replace(/\D/g, ''),
            owner: req.body.owner || req.body.username || 'admin',
            username: req.body.username || 'admin',
            birthday: req.body.birthday || null,
            receivedMessage: false,
            createdAt: new Date().toISOString(),
            status: 'novo',
            __v: 0
        };
        contacts.push(newContact);
        await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
        res.json(newContact);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar contato' });
    }
});

// Excluir contato
app.delete('/api/contacts/:id', async (req, res) => {
    try {
        let contacts = JSON.parse(await fs.readFile(contactsPath, 'utf8'));
        const contactToDelete = contacts.find(c => c._id === req.params.id);
        contacts = contacts.filter(c => c._id !== req.params.id);
        await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
        res.json(contactToDelete || { message: 'Contato excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir contato' });
    }
});

// Editar contato
app.put('/api/contacts/:id', async (req, res) => {
    try {
        let contacts = JSON.parse(await fs.readFile(contactsPath, 'utf8'));
        const idx = contacts.findIndex(c => c._id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Contato não encontrado' });
        contacts[idx] = {
            ...contacts[idx],
            ...req.body,
            _id: req.params.id,
            phone: req.body.phone ? req.body.phone.replace(/\D/g, '') : contacts[idx].phone,
            updatedAt: new Date().toISOString()
        };
        await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
        res.json(contacts[idx]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao editar contato' });
    }
});

// Converter contato em membro
app.post('/api/contacts/:id/convert', async (req, res) => {
    try {
        let contacts = JSON.parse(await fs.readFile(contactsPath, 'utf8'));
        let members = JSON.parse(await fs.readFile(membersPath, 'utf8'));
        const idx = contacts.findIndex(c => c._id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Contato não encontrado' });
        const contact = contacts[idx];
        // Cria membro a partir do contato
        const newMember = {
            _id: Date.now().toString(),
            name: contact.name,
            phone: contact.phone,
            birthday: contact.birthday,
            owner: contact.owner,
            username: contact.username,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'novo',
            __v: 0
        };
        members.push(newMember);
        // Remove contato convertido
        contacts = contacts.filter(c => c._id !== req.params.id);
        await fs.writeFile(membersPath, JSON.stringify(members, null, 2));
        await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
        res.json(newMember);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao converter contato' });
    }
});
// --- FIM: Rotas REST CRUD de contatos (JSON) ---

// --- INÍCIO: Rotas de autenticação ---
app.use('/api/auth', require('./routes/auth'));
// --- FIM: Rotas de autenticação ---

// --- INÍCIO: Rotas REST CRUD de logs (JSON) ---
const logsRoutes = require('./routes/logs');
app.use('/api/logs', logsRoutes);
// --- FIM: Rotas REST CRUD de logs (JSON) ---

// --- INÍCIO: Rotas de usuários (deve vir ANTES do static e 404) ---
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);
// --- FIM: Rotas de usuários ---

// --- INÍCIO: Rotas de exportação ---
app.use('/api/export', require('./routes/export'));
// --- FIM: Rotas de exportação ---

// --- INÍCIO: Rotas de envio de mensagem WhatsApp (devem vir ANTES do static e 404) ---
app.post('/api/contacts/:id/message', async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        let contacts = JSON.parse(await fs.readFile(contactsPath, 'utf8'));
        const contactIndex = contacts.findIndex(c => c._id === id);
        if (contactIndex === -1) return res.status(404).json({ message: 'Contato não encontrado' });
        const contact = contacts[contactIndex];
        // Envio real da mensagem via Baileys
        await whatsapp.sendMessageBaileys(contact.phone, message);
        // Atualiza status para mensagem enviada
        contacts[contactIndex].receivedMessage = true;
        await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
        res.json({ success: true, receivedMessage: true, contact: contacts[contactIndex] });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao enviar mensagem', error: error.message });
    }
});

app.post('/api/members/:id/notify-absent', async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        let members = JSON.parse(await fs.readFile(membersPath, 'utf8'));
        const memberIndex = members.findIndex(m => m._id === id);
        if (memberIndex === -1) return res.status(404).json({ message: 'Membro não encontrado' });
        const member = members[memberIndex];
        // LOG para debug
        console.log('[NOTIFY-AUSENTE] Enviando para:', member.phone, 'Mensagem:', message);
        // Envio real da mensagem via Baileys
        await whatsapp.sendMessageBaileys(member.phone, message);
        // Atualiza status para mensagem enviada (se existir campo)
        members[memberIndex].receivedMessage = true;
        await fs.writeFile(membersPath, JSON.stringify(members, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('[NOTIFY-AUSENTE] Erro ao enviar para WhatsApp:', error);
        res.status(500).json({ message: 'Erro ao enviar lembrete', error: error.message });
    }
}); 
// Salvar lista de ausentes do dia (arquivo JSON)
app.post('/api/members/absent-list', async (req, res) => {
    try {
        const { date, absents } = req.body;
        if (!date || !Array.isArray(absents)) {
            return res.status(400).json({ message: 'Dados inválidos' });
        }
        const absentPath = path.join(__dirname, 'db', 'absentmembers.json');
        let data = [];
        if (fs.existsSync(absentPath)) {
            data = JSON.parse(await fs.readFile(absentPath, 'utf8'));
        }
        // Remove registros duplicados para a mesma data
        data = data.filter(item => item.date !== date);
        data.push({ date, absents });
        await fs.writeFile(absentPath, JSON.stringify(data, null, 2));
        res.json({ message: 'Chamada salva no sistema!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar chamada' });
    }
});

// Buscar lista de ausentes do dia (arquivo JSON)
app.get('/api/members/absent-list', async (req, res) => {
    try {
        const { date } = req.query;
        const absentPath = path.join(__dirname, 'db', 'absentmembers.json');
        let data = [];
        if (fs.existsSync(absentPath)) {
            data = JSON.parse(await fs.readFile(absentPath, 'utf8'));
        }
        let found = data.find(item => item.date === date);
        if (!found) found = { date, absents: [] };
        res.json(found);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar chamada' });
    }
});

// Buscar histórico de ausências agrupado por membro e datas de falta (arquivo JSON)
app.get('/api/members/absent-list/history', async (req, res) => {
    try {
        const absentPath = path.join(__dirname, 'db', 'absentmembers.json');
        let data = [];
        if (fs.existsSync(absentPath)) {
            data = JSON.parse(await fs.readFile(absentPath, 'utf8'));
        }
        // Agrupa por membro
        const memberAbsences = {};
        data.forEach(entry => {
            const date = entry.date;
            (entry.absents || []).forEach(absent => {
                const key = absent.name + (absent.phone ? '|' + absent.phone : '');
                if (!memberAbsences[key]) {
                    memberAbsences[key] = { name: absent.name, phone: absent.phone || '', absences: [] };
                }
                memberAbsences[key].absences.push(date);
            });
        });
        // Ordena datas decrescente
        Object.values(memberAbsences).forEach(m => m.absences.sort((a,b) => b.localeCompare(a)));
        res.json(Object.values(memberAbsences));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar histórico de ausências' });
    }
});
// --- FIM: Rotas de ausentes ---

// Servir arquivos estáticos da pasta public (HTML, CSS, JS, imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Notificação direta para ausentes da chamada rápida (sem depender de ID do membro)
app.post('/api/notify-absent-direct', async (req, res) => {
    try {
        const { name, phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ message: 'Telefone e mensagem obrigatórios' });
        }
        // LOG para debug
        console.log('[NOTIFY-AUSENTE-DIRECT] Enviando para:', phone, 'Nome:', name, 'Mensagem:', message);
        // Checa se o Baileys está pronto (opcional, se função disponível)
        if (typeof whatsapp.isReady === 'function' && !whatsapp.isReady()) {
            console.error('[NOTIFY-AUSENTE-DIRECT] WhatsApp não está conectado (Baileys)');
            return res.status(503).json({ message: 'WhatsApp não está conectado. Tente novamente em instantes.' });
        }
        await whatsapp.sendMessageBaileys(phone, message);
        res.json({ success: true });
    } catch (error) {
        console.error('[NOTIFY-AUSENTE-DIRECT] Erro ao enviar para WhatsApp:', error);
        let msg = 'Erro ao enviar notificação direta';
        if (error.message && error.message.includes('não está conectado')) {
            msg = 'WhatsApp não está conectado. Tente novamente em instantes.';
        }
        res.status(500).json({ message: msg, error: error.message });
    }
});

// Rota 404 amigável (deve ser a última rota)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Global error handler
app.use(async (err, req, res, next) => {
    console.error('Server error:', err);

    // Log server errors
    await Log.logAction({
        type: 'system',
        action: 'server_error',
        description: err.message,
        username: req.userData?.email || 'system',
        source: 'server',
        details: {
            stack: err.stack,
            path: req.originalUrl,
            method: req.method
        }
    });

    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production' 
            ? 'Erro interno do servidor' 
            : err.message
    });
});

// No seu servidor
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com"
    );
    next();
});

// Middleware de manutenção (frontend)
app.use((req, res, next) => {
  // Permite acesso à página de manutenção e arquivos estáticos
  if (req.path === '/maintenance.html' || req.path.startsWith('/js/maintenance.js') || req.path.startsWith('/styles/')) {
    return next();
  }
  // Controle via variável de ambiente ou arquivo (pode ser melhorado para produção)
  const maintenanceMode = false; // Troque para true para ativar manutenção global
  if (maintenanceMode) {
    return res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
  }
  next();
});

// Função para iniciar o Ngrok e exibir a URL pública
async function startNgrok() {
    try {
        const url = await ngrok.connect({
            addr: port,
            authtoken: process.env.NGROK_AUTHTOKEN || undefined,
            proto: 'http',
            region: process.env.NGROK_REGION || 'sa', // South America (BR)
            domain: process.env.NGROK_DOMAIN || undefined // Permite domínio customizado
        });
        console.log(colors.yellow + `\n✓ Ngrok ativo: ${colors.cyan}${url}${colors.reset}`);
        // Salva a URL no arquivo ngrok.json para uso externo
        await fs.writeFile(ngrokConfigPath, JSON.stringify({ ngrokUrl: url }, null, 2));
        return url;
    } catch (err) {
        console.error(colors.red + 'Erro ao iniciar Ngrok:' + colors.reset, err);
    }
}

// Connect to MongoDB and start server
async function startServer() {
    try {
        showBanner();
        console.log(`${colors.yellow}⌛ Conectando ao MongoDB...${colors.reset}`);
        
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'boaparte', // Nome específico do banco
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4
        });

        // Listen on all interfaces with new configuration
        const host = '0.0.0.0';
        server.listen(port, host, async () => {
            const networkInterfaces = require('os').networkInterfaces();
            console.log(`${colors.green}✓ Servidor rodando em:${colors.reset}`);
            console.log(`  └─ Local:   ${colors.cyan}http://localhost:${port}${colors.reset}`);
            // Exibe apenas o primeiro IP de rede válido
            let firstNetwork = null;
            Object.keys(networkInterfaces).forEach((interfaceName) => {
                const interfaces = networkInterfaces[interfaceName];
                interfaces.forEach((iface) => {
                    if (
                        !firstNetwork &&
                        iface.family === 'IPv4' &&
                        !iface.internal &&
                        iface.address &&
                        iface.mac && iface.mac !== '00:00:00:00:00:00'
                    ) {
                        firstNetwork = iface.address;
                    }
                });
            });
            if (firstNetwork) {
                console.log(`  └─ Rede:    ${colors.cyan}http://${firstNetwork}:${port}${colors.reset}`);
            }
            console.log(`  └─ Modo:    ${colors.cyan}${process.env.NODE_ENV || 'development'}${colors.reset}`);
            console.log(`  └─ MongoDB: ${colors.cyan}Conectado${colors.reset}\n`);
            // Inicia o Ngrok se não estiver em produção
            if (process.env.NODE_ENV !== 'production') {
                await startNgrok();
            }
        });

        whatsapp.setupWhatsApp(io);
    } catch (error) {
        console.error(`${colors.red}❌ Erro ao iniciar servidor:${colors.reset}`, error);
        // Mostra stack trace detalhado
        if (error && error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// LOG DE INICIALIZAÇÃO E ERROS GLOBAIS
process.on('uncaughtException', async (err) => {
    console.error(colors.red + '❌ Erro não tratado:' + colors.reset, err);
    try {
        await Log.logError(err, { level: 'critical', source: 'server' });
    } catch (e) {
        console.error('Falha ao registrar erro não tratado:', e);
    }
    process.exit(1);
});

process.on('unhandledRejection', async (err) => {
    console.error(colors.red + '❌ Promise rejeitada:' + colors.reset, err);
    try {
        await Log.logError(err, { level: 'critical', source: 'server' });
    } catch (e) {
        console.error('Falha ao registrar promise rejeitada:', e);
    }
});

// Log de inicialização
console.log(colors.yellow + '[BOOT] Iniciando server.js em', new Date().toLocaleString() + colors.reset);

// Start the server
startServer();

printBanner();
printStatus({
    mongo: 'Conectado',
    mode: process.env.NODE_ENV,
    urls: (() => {
        const urls = [`Local:   http://localhost:${process.env.PORT || 3000}`];
        const nets = Object.values(require('os').networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal);
        if (nets.length > 0) urls.push(`Rede:    http://${nets[0].address}:${process.env.PORT || 3000}`);
        return urls;
    })(),
    browser: 'Chrome',
    venom: 'Aguardando QRCode',
    warnings: [
        'O uso de "headless: true" está depreciado. Use "headless: \'new\'" ou "headless: false".'
    ]
});

// Notificação direta para ausentes da chamada rápida (sem depender de ID do membro)
app.post('/api/notify-absent-direct', async (req, res) => {
    try {
        const { name, phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ message: 'Telefone e mensagem obrigatórios' });
        }
        // LOG para debug
        console.log('[NOTIFY-AUSENTE-DIRECT] Enviando para:', phone, 'Nome:', name, 'Mensagem:', message);
        // Checa se o Baileys está pronto (opcional, se função disponível)
        if (typeof whatsapp.isReady === 'function' && !whatsapp.isReady()) {
            console.error('[NOTIFY-AUSENTE-DIRECT] WhatsApp não está conectado (Baileys)');
            return res.status(503).json({ message: 'WhatsApp não está conectado. Tente novamente em instantes.' });
        }
        await whatsapp.sendMessageBaileys(phone, message);
        res.json({ success: true });
    } catch (error) {
        console.error('[NOTIFY-AUSENTE-DIRECT] Erro ao enviar para WhatsApp:', error);
        let msg = 'Erro ao enviar notificação direta';
        if (error.message && error.message.includes('não está conectado')) {
            msg = 'WhatsApp não está conectado. Tente novamente em instantes.';
        }
        res.status(500).json({ message: msg, error: error.message });
    }
});