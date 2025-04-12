// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config({ path: './.env' });

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const multer = require('multer');
const { connectToWhatsApp, getConnectionStatus, sendMessage } = require('./whatsapp');
const webpush = require('web-push');
const { welcomeMessage, getMessageByDay, serviceReminderMessage, bulkReminderMessage } = require('./utils/messages');
const messages = require('./utils/messages');

// Adicione no início do server.js, após as importações
const authPath = './auth_info.json';

// Verifica se o arquivo de autenticação existe
if (!fs.existsSync(authPath)) {
    fs.writeFileSync(authPath, JSON.stringify({}));
    console.log('Arquivo de autenticação criado');
}

// Função para salvar o estado
const saveState = async (state) => {
    try {
        fs.writeFileSync(authPath, JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('Erro ao salvar estado:', error);
    }
};

const app = express();

// Agora, as variáveis de ambiente são carregadas a partir do .env
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const VALID_REGISTRATION_CODE = process.env.REGISTRATION_CODE;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '7d'; // Usando a variável de ambiente para expiração

let whatsappClient = null;
let isInitializing = false;
let state = null;

// API Base URL
const API_BASE_URL = '/api'; // Mantenha o valor que você precisa
console.log('API Base URL:', API_BASE_URL);

// Continue com o restante do código para inicialização do app e configuração do servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Replace the vapidKeys and webpush configuration with:
const vapidDetails = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: `mailto:${process.env.VAPID_EMAIL}`
};

// Log VAPID details to verify they're loaded
console.log('VAPID Configuration:', {
    publicKey: vapidDetails.publicKey ? 'Present' : 'Missing',
    privateKey: vapidDetails.privateKey ? 'Present' : 'Missing',
    subject: vapidDetails.subject
});

if (!vapidDetails.publicKey || !vapidDetails.privateKey) {
    console.error('VAPID keys are missing! Please check your .env file');
} else {
    webpush.setVapidDetails(
        vapidDetails.subject,
        vapidDetails.publicKey,
        vapidDetails.privateKey
    );
}

// Exponha a chave pública através de uma rota
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidDetails.publicKey });
});

// Armazena as inscrições push (em produção, use um banco de dados)
let pushSubscriptions = new Set();

// Middleware
app.use(cors({
    origin: 'http://localhost:5000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Lista de tokens inválidos
let invalidTokens = new Set();

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token não fornecido'
            });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: 'Token inválido ou expirado'
                });
            }

            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno de autenticação'
        });
    }
};

// Middleware para verificar status do WhatsApp
const checkWhatsAppStatus = async (req, res, next) => {
    if (!whatsappClient) {
        try {
            whatsappClient = await connectToWhatsApp();
        } catch (error) {
            console.error('Erro ao reconectar WhatsApp:', error);
        }
    }
    next();
};

// Endpoint /ping
app.get('/ping', (req, res) => {
    res.send('OK');
});

// MongoDB Connection with retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado ao MongoDB - Database: test');
    } catch (err) {
        console.error('Erro ao conectar ao MongoDB:', err);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// Update the WhatsApp initialization
async function initializeWhatsAppClient() {
    if (isInitializing) return;

    try {
        isInitializing = true;
        whatsappClient = await connectToWhatsApp();
        console.log('WhatsApp client initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize WhatsApp client:', error);
        whatsappClient = null;
    } finally {
        isInitializing = false;
    }
}

// Initialize WhatsApp client when the server starts
initializeWhatsAppClient().catch(error => {
    console.error('Error initializing WhatsApp client:', error);
});

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add this function after initial configurations
function getBrazilTimestamp() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Add these date utility functions after the initial configurations
function getBrazilDateTime() {
    const date = new Date();
    // Convert to Brazil timezone
    const brazilTime = date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    return new Date(brazilTime);
}

// Contact Schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    owner: {
        type: String
    },
    username: {
        type: String
    },
    birthday: {
        type: Date
    },
    receivedMessage: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add this after your other mongoose schemas
const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    birthday: {
        type: Date,
        required: false // Make birthday optional
    },
    isDisciple: {
        type: Boolean,
        default: false
    },
    discipleBy: {
        type: String,
        required: false
    }
}, { timestamps: true });

const Member = mongoose.model('Member', memberSchema, 'members');

const User = mongoose.model('User', userSchema, 'users');
const Contact = mongoose.model('Contact', contactSchema, 'contacts');

// Add this after your other mongoose schemas
const logSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete', 'system', 'auth', 'message']
    },
    action: String,
    description: String,
    username: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    details: Object
});

const Log = mongoose.model('Log', logSchema);

// Atualizar a rota de login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', { username });

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username e senha são obrigatórios'
            });
        }

        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Senha incorreta'
            });
        }

        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );

        console.log('Login successful:', { username, role: user.role });
        
        res.json({
            success: true,
            token,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para criar usuário de teste (temporária)
app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, password, registrationCode } = req.body;

        // Verificar código de registro
        if (registrationCode !== VALID_REGISTRATION_CODE) {
            return res.status(400).json({
                success: false,
                message: 'Código de registro inválido'
            });
        }

        // Verificar se usuário já existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Usuário já existe'
            });
        }

        // Criar hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Criar novo usuário
        const user = new User({
            username,
            password: hashedPassword,
            role: username.toLowerCase() === 'admin' ? 'admin' : 'user'
        });

        await user.save();

        res.json({
            success: true,
            message: 'Usuário criado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota de registro
app.post("/api/register", async (req, res) => {
    try {
        if (!mongoose.connection.readyState) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar com o banco de dados'
            });
        }

        const { username, password, registrationCode } = req.body;

        if (!username || !password || !registrationCode) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios'
            });
        }

        if (registrationCode !== VALID_REGISTRATION_CODE) {
            return res.status(401).json({
                success: false,
                message: 'Código de registro inválido'
            });
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username já está em uso'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            username,
            password: hashedPassword
        });

        await user.save();

        res.json({
            success: true,
            message: 'Usuário registrado com sucesso'
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para obter contatos
app.get('/api/contacts', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            contacts
        });
    } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos'
        });
    }
});

// Rota para obter contatos do mês atual (removida duplicata e padronizado response)
app.get('/api/contacts/month', authenticateToken, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const contacts = await Contact.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Contatos do mês atual obtidos com sucesso',
            data: contacts
        });
    } catch (error) {
        console.error('Erro ao buscar contatos do mês:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos do mês',
            error: error.message
        });
    }
});

// Rota para obter contatos por mês específico
app.get('/api/contacts/month/:month', authenticateToken, async (req, res) => {
    try {
        const month = parseInt(req.params.month);
        const year = new Date().getFullYear();
        
        if (isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: 'Mês inválido'
            });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const query = {
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        // Add user filter if not admin
        if (req.user.role !== 'admin') {
            query.username = req.user.username;
        }

        const contacts = await Contact.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            contacts: contacts
        });
    } catch (error) {
        console.error('Erro ao buscar contatos do mês:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos do mês'
        });
    }
});

// Rota para adicionar contato (adicionadas validações e padronizado response)
app.post('/api/contacts', authenticateToken, async (req, res) => {
    try {
        const { name, phone, birthday } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nome é obrigatório e deve ser uma string válida'
            });
        }

        if (!phone || typeof phone !== 'string' || !/^\d{10,11}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Telefone é obrigatório e deve conter 10 ou 11 dígitos'
            });
        }

        const contact = new Contact({
            name: name.trim(),
            phone: phone.trim(),
            birthday: birthday ? new Date(birthday) : null,
            owner: req.user.username,
            createdAt: new Date()
        });

        await contact.save();

        res.status(201).json({
            success: true,
            message: 'Contato adicionado com sucesso',
            data: contact
        });
    } catch (error) {
        console.error('Erro ao adicionar contato:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar contato',
            error: error.message
        });
    }
});

// Rota para atualizar contato (adicionadas validações e padronizado response)
app.put("/api/contacts/:id", authenticateToken, async (req, res) => {
    try {
        const { name, phone, birthday } = req.body;
        const contactId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do contato inválido'
            });
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nome é obrigatório e deve ser uma string válida'
            });
        }

        if (!phone || typeof phone !== 'string' || !/^\d{10,11}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Telefone é obrigatório e deve conter 10 ou 11 dígitos'
            });
        }

        const contact = await Contact.findById(contactId);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contato não encontrado'
            });
        }

        if (contact.owner !== req.user.username && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Não autorizado a editar este contato'
            });
        }

        contact.name = name.trim();
        contact.phone = phone.trim();
        contact.birthday = birthday ? new Date(birthday) : contact.birthday;

        await contact.save();

        res.json({
            success: true,
            message: 'Contato atualizado com sucesso',
            data: contact
        });
    } catch (error) {
        console.error('Erro ao atualizar contato:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar contato',
            error: error.message
        });
    }
});

// Rota para deletar contato (adicionadas validações e padronizado response)
app.delete("/api/contacts/:id", authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do contato inválido'
            });
        }

        const contact = await Contact.findById(contactId);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contato não encontrado'
            });
        }

        if (contact.owner !== req.user.username && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Não autorizado a deletar este contato'
            });
        }

        await Contact.findByIdAndDelete(contactId);

        res.json({
            success: true,
            message: 'Contato deletado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar contato:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar contato',
            error: error.message
        });
    }
});

// Rota para obter todos os contatos (removida duplicata e padronizado response)
app.get('/api/contacts/all', authenticateToken, async (req, res) => {
    try {
        console.log('Buscando todos os contatos...');
        const contacts = await Contact.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            contacts: contacts
        });
    } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos'
        });
    }
});

// Rota para listar usuários (apenas admin)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário tem role admin
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - apenas administradores podem listar usuários'
            });
        }

        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar usuários'
        });
    }
});

// Rota para deletar usuário (apenas admin)
app.delete('/api/users/:username', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário tem role admin no token
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const username = req.params.username;

        if (username.toLowerCase() === 'anderson') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível deletar o usuário administrador'
            });
        }

        const result = await User.findOneAndDelete({ username: username });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuário deletado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar usuário'
        });
    }
});

// Rota de logout
app.post('/logout', (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        invalidTokens.add(token);

        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    } catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar logout'
        });
    }
});

// Add this with your other API routes
app.post('/api/auth/logout', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
            invalidTokens.add(token);
        }
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
});

// Rota temporária para atualizar roles dos usuários
app.get('/update-user-roles', async (req, res) => {
    try {
        // Atualiza todos os usuários para role 'user'
        await User.updateMany({}, { role: 'user' });

        // Atualiza o Anderson para role 'admin'
        await User.findOneAndUpdate(
            { username: 'Anderson' },
            { role: 'admin' },
            { new: true }
        );

        res.json({ success: true, message: 'Roles atualizados com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar roles:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar roles dos usuários'
        });
    }
});

// Rota para estatísticas do admin
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é admin
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado'
            });
        }

        // Total de usuários
        const totalUsers = await User.countDocuments();

        // Total de contatos
        const totalContacts = await Contact.countDocuments();

        // Contatos hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const contactsToday = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        // Dados para o gráfico (contatos por mês)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const contactsByMonth = await Contact.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ]);

        // Preparar dados do gráfico
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const chartData = {
            labels: [],
            data: []
        };

        // Preencher os últimos 6 meses
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            const monthIndex = date.getMonth();
            const year = date.getFullYear();

            const monthData = contactsByMonth.find(item =>
                item._id.year === year && item._id.month === (monthIndex + 1)
            );

            chartData.labels.push(months[monthIndex]);
            chartData.data.push(monthData ? monthData.count : 0);
        }

        res.json({
            success: true,
            totalUsers,
            totalContacts,
            contactsToday,
            chartData
        });

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar estatísticas'
        });
    }
});

// Rota para obter estatísticas do sistema (apenas admin)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // Obter total de usuários
        const totalUsers = await User.countDocuments();

        // Obter total de contatos
        const totalContacts = await Contact.countDocuments();

        // Obter contatos criados hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const contactsToday = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            success: true,
            totalUsers,
            totalContacts,
            contactsToday
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas'
        });
    }
});

// Rota para alterar o papel de um usuário (apenas admin)
app.put('/api/users/:username/role', authenticateToken, async (req, res) => {
    try {
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const { username } = req.params;
        const { role } = req.body;

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Papel inválido'
            });
        }

        // Não permitir alterar o papel do Anderson
        if (username.toLowerCase() === 'anderson') {
            return res.status(403).json({
                success: false,
                message: 'Não é permitido alterar o papel deste usuário'
            });
        }

        const user = await User.findOneAndUpdate(
            { username },
            { role },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Papel do usuário atualizado com sucesso',
            user: {
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Erro ao alterar papel do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar papel do usuário'
        });
    }
});

// Rota para obter estatísticas de contatos por usuário (apenas admin)
app.get('/api/admin/contacts-by-user', authenticateToken, async (req, res) => {
    try {
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // Agrupa os contatos por usuário e conta quantos cada um tem
        const contactStats = await Contact.aggregate([
            {
                $group: {
                    _id: '$username',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            success: true,
            stats: contactStats
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas de contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas de contatos'
        });
    }
});

// Rota para obter perfil do usuário
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar perfil do usuário'
        });
    }
});

// Rota para verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    try {
        res.json({
            success: true,
            username: req.user.username,
            role: req.user.role
        });
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar token'
        });
    }
});

// Replace the /api/send-whatsapp route
app.post('/api/send-whatsapp', [authenticateToken, checkWhatsAppStatus], async (req, res) => {
    const { phone, name, message: customMessage, contactId } = req.body;
    const timestamp = getBrazilTimestamp();

    try {
        console.log(`[${timestamp}] Request received:`, { phone, name, contactId });

        // Validate phone number
        if (!phone) {
            throw new Error('Número de telefone é obrigatório');
        }

        // Format phone number
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11 && cleanPhone[2] === '9') {
            cleanPhone = cleanPhone.slice(0, 2) + cleanPhone.slice(3);
        }
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // Generate or use provided message
        let messageToSend;
        if (customMessage) {
            messageToSend = customMessage;
        } else if (name) {
            messageToSend = messages.welcomeMessage(name);
            if (!messageToSend) {
                throw new Error('Erro ao gerar mensagem de boas-vindas');
            }
        } else {
            throw new Error('Nome ou mensagem personalizada é obrigatório');
        }

        console.log(`[${timestamp}] Sending message to ${formattedPhone}`);

        // Send message using WhatsApp client
        const sent = await sendMessage(formattedPhone, messageToSend);
        if (!sent) {
            throw new Error('Falha ao enviar mensagem');
        }

        // Update contact status if ID provided
        if (contactId) {
            await Contact.findByIdAndUpdate(contactId, { 
                receivedMessage: true,
                lastMessageDate: new Date()
            });
        }

        // Log de sucesso
        await Log.create({
            type: 'message',
            action: 'Mensagem WhatsApp',
            description: `Mensagem enviada para ${name}`,
            username: req.user.username,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso'
        });

    } catch (error) {
        console.error(`[${timestamp}] Error:`, error);
        
        // Log de erro
        await Log.create({
            type: 'error',
            action: 'Erro WhatsApp',
            description: error.message,
            username: req.user.username,
            timestamp: new Date()
        });

        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao enviar mensagem'
        });
    }
});

// Add these routes after your other routes

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        console.log('Rota /api/members acessada');
        const members = await Member.find({}).sort({ name: 1 });
        console.log('Membros encontrados:', members.length);
        res.status(200).json(members);
    } catch (error) {
        console.error('Erro ao listar membros:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar membros',
            error: error.message
        });
    }
});

// Add new member
app.post('/api/members', upload.single('photo'), async (req, res) => {
    try {
        const memberData = {
            name: req.body.name,
            phone: req.body.phone,
            isDisciple: false
        };

        // Only add birthday if it's provided
        if (req.body.birthday) {
            memberData.birthday = new Date(req.body.birthday);
        }

        const member = new Member(memberData);
        await member.save();

        res.status(201).json(member);
    } catch (error) {
        console.error('Erro ao criar membro:', error);
        res.status(500).json({
            message: 'Erro ao criar membro',
            error: error.message
        });
    }
});

// Get a specific member
app.get('/api/members/:id', async (req, res) => {
    try {
        const memberId = req.params.id;
        const member = await Member.findById(memberId);

        if (!member) {
            return res.status(404).json({ message: 'Membro não encontrado' });
        }

        res.status(200).json(member);
    } catch (error) {
        console.error('Erro ao obter membro:', error);
        res.status(500).json({
            message: 'Erro ao obter membro',
            error: error.message
        });
    }
});

// Update a member
app.put('/api/members/:id', upload.single('photo'), async (req, res) => {
    try {
        const memberId = req.params.id;
        const { name, phone, birthday } = req.body;
        const photo = req.file ? req.file.filename : null;

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios' });
        }

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Membro não encontrado' });
        }

        member.name = name;
        member.phone = phone;
        member.birthday = birthday || member.birthday;
        if (photo) {
            member.photo = photo;
        }

        await member.save();

        res.json({ success: true, message: 'Membro atualizado com sucesso', member });
    } catch (error) {
        console.error('Erro ao atualizar membro:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar membro' });
    }
});

// Delete a member
app.delete('/api/members/:id', async (req, res) => {
    try {
        const memberId = req.params.id;
        const result = await Member.findByIdAndDelete(memberId);

        if (!result) {
            return res.status(404).json({ message: 'Membro não encontrado' });
        }

        res.status(200).json({ message: 'Membro excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir membro:', error);
        res.status(500).json({
            message: 'Erro ao excluir membro',
            error: error.message
        });
    }
});

// Add these routes after your other routes

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        console.log('Buscando membros...'); // Log para debug
        const members = await Member.find({}).sort({ name: 1 });
        console.log('Membros encontrados:', members.length); // Log para debug
        res.status(200).json(members);
    } catch (error) {
        console.error('Erro ao listar membros:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar membros',
            error: error.message
        });
    }
});

// Add new member
app.post('/api/members', async (req, res) => {
    try {
        const memberData = {
            name: req.body.name,
            phone: req.body.phone,
            isDisciple: false
        };

        // Only add birthday if it's provided
        if (req.body.birthday) {
            memberData.birthday = new Date(req.body.birthday);
        }

        const member = new Member(memberData);
        await member.save();

        res.status(201).json(member);
    } catch (error) {
        console.error('Erro ao criar membro:', error);
        res.status(500).json({
            message: 'Erro ao criar membro',
            error: error.message
        });
    }
});

// Toggle disciple status
app.put('/api/members/:id/toggle-disciple', async (req, res) => {
    try {
        const { discipleBy, isDisciple } = req.body;
        const memberId = req.params.id;

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Membro não encontrado' });
        }

        member.isDisciple = isDisciple;
        member.discipleBy = discipleBy;
        await member.save();

        res.json(member);
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ message: 'Erro ao atualizar status' });
    }
});

// This should be in your backend server file
app.delete('/api/members/:id', async (req, res) => {
    try {
        const memberId = req.params.id;
        // Add console.log for debugging
        console.log('Received delete request for member:', memberId);

        const result = await Member.findByIdAndDelete(memberId);

        if (!result) {
            return res.status(404).json({ message: 'Membro não encontrado' });
        }

        res.status(200).json({ message: 'Membro excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ message: 'Erro ao excluir membro', error: error.message });
    }
});

// Rota para obter logs do sistema
app.get('/admin/logs', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const { type, date } = req.query;
        let query = {};

        if (type && type !== 'all') {
            query.type = type;
        }

        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.timestamp = { $gte: startDate, $lt: endDate };
        }

        // Aqui você precisaria ter um modelo Log definido
        const logs = await Log.find(query).sort({ timestamp: -1 }).limit(100);
        
        res.json({
            success: true,
            logs: logs
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar logs' });
    }
});

// Rota para obter usuários com stats
app.get('/admin/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const users = await User.aggregate([
            {
                $lookup: {
                    from: 'contacts',
                    localField: 'username',
                    foreignField: 'owner',
                    as: 'contacts'
                }
            },
            {
                $project: {
                    username: 1,
                    role: 1,
                    createdAt: 1,
                    contactCount: { $size: '$contacts' },
                    lastActive: { $max: '$contacts.createdAt' }
                }
            }
        ]);

        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
});

// Rota para estatísticas detalhadas
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const totalUsers = await User.countDocuments();
        const totalContacts = await Contact.countDocuments();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const contactsToday = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        // Calcula usuários ativos (que fizeram alguma ação nos últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers = await Contact.distinct('owner', {
            createdAt: { $gte: sevenDaysAgo }
        }).then(users => users.length);

        // Dados para o gráfico de contatos por mês
        const contactsByMonth = await Contact.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const contactsByMonthData = {
            labels: [],
            values: []
        };

        contactsByMonth.forEach(data => {
            contactsByMonthData.labels.push(`${monthNames[data._id.month - 1]} ${data._id.year}`);
            contactsByMonthData.values.push(data.count);
        });

        // Dados para o gráfico de usuários ativos
        const activeUsersData = {
            labels: ['Ativos', 'Inativos'],
            values: [activeUsers, totalUsers - activeUsers]
        };

        // Dados para o gráfico de contatos por usuário
        const contactsByUser = await Contact.aggregate([
            {
                $group: {
                    _id: '$username',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const contactsByUserData = {
            labels: contactsByUser.map(item => item._id),
            values: contactsByUser.map(item => item.count)
        };

        res.json({
            success: true,
            totalUsers,
            totalContacts,
            contactsToday,
            activeUsers,
            contactsByMonth: contactsByMonthData,
            activeUsersData,
            contactsByUser: contactsByUserData
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar estatísticas' });
    }
});

// Rota para buscar dados da tabela Excel
app.get('/api/table-data', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        
        const formattedContacts = contacts.map(contact => ({
            id: contact._id,
            name: contact.name,
            phone: contact.phone,
            createdAt: contact.createdAt,
            week1Sent: contact.week1Sent || false,
            week2Sent: contact.week2Sent || false,
            week3Sent: contact.week3Sent || false,
            week4Sent: contact.week4Sent || false
        }));

        res.json({ success: true, data: formattedContacts });
    } catch (error) {
        console.error('Erro ao buscar dados da tabela:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados' });
    }
});

// Rota para buscar dados da tabela
app.get('/api/table-data', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        
        const formattedData = contacts.map(contact => ({
            id: contact._id,
            name: contact.name,
            phone: contact.phone,
            createdAt: contact.createdAt,
            week1Sent: contact.week1Sent || false,
            week2Sent: contact.week2Sent || false,
            week3Sent: contact.week3Sent || false,
            week4Sent: contact.week4Sent || false
        }));

        res.json({ 
            success: true, 
            data: formattedData 
        });
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar dados'
        });
    }
});

// Rota para buscar dados da tabela
app.get('/api/table-data', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        
        const formattedData = contacts.map(contact => ({
            id: contact._id,
            name: contact.name,
            phone: contact.phone,
            createdAt: contact.createdAt,
            week1Sent: Boolean(contact.week1Sent),
            week2Sent: Boolean(contact.week2Sent),
            week3Sent: Boolean(contact.week3Sent),
            week4Sent: Boolean(contact.week4Sent)
        }));

        res.json({ 
            success: true, 
            data: formattedData 
        });
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar dados'
        });
    }
});

app.get('/api/contacts/table', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        
        const formattedContacts = contacts.map(contact => ({
            id: contact._id,
            name: contact.name || '',
            phone: contact.phone || '',
            createdAt: contact.createdAt,
            week1Sent: false,
            week2Sent: false,
            week3Sent: false,
            week4Sent: false
        }));

        res.json({ success: true, contacts: formattedContacts });
    } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos'
        });
    }
});

// Adicione esta nova rota para notificações
app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
    try {
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado'
            });
        }

        const notifications = await Log.find({})
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        const formattedNotifications = notifications.map(log => ({
            type: log.type === 'error' ? 'error' : 'success',
            title: log.type.charAt(0).toUpperCase() + log.type.slice(1),
            message: log.message,
            createdAt: log.timestamp
        }));

        res.json({
            success: true,
            notifications: formattedNotifications
        });
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar notificações'
        });
    }
});

// Atualize a rota de status do WhatsApp
app.get('/api/whatsapp/status', authenticateToken, (req, res) => {
    try {
        const status = getConnectionStatus();
        res.json({
            status: status.status,
            qr: status.qr
        });
    } catch (error) {
        console.error('Erro ao obter status do WhatsApp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao obter status do WhatsApp' 
        });
    }
});

// Atualiza a rota de conexão do WhatsApp
app.post('/api/whatsapp/connect', authenticateToken, async (req, res) => {
    try {
        await connectToWhatsApp();
        res.json({ 
            success: true, 
            message: 'Iniciando conexão com WhatsApp' 
        });
    } catch (error) {
        console.error('Erro ao conectar WhatsApp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao conectar WhatsApp' 
        });
    }
});

// Adicione a rota para enviar mensagens
app.post('/api/send-whatsapp', authenticateToken, async (req, res) => {
    const { phone, name, contactId } = req.body;

    try {
        console.log(`Enviando mensagem para o contato ${contactId} com o número ${phone}`);
        await sendMessage(phone, name, contactId);

        // Update contact message status if contactId is provided
        if (contactId) {
            await Contact.findByIdAndUpdate(contactId, { receivedMessage: true });
        }

        res.json({ 
            success: true, 
            message: 'Mensagem enviada com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao enviar mensagem',
            error: error.message
        });
    }
});

// Add new route for sending service reminders
app.post('/api/send-reminder', authenticateToken, async (req, res) => {
    const { phone, name, contactId } = req.body;
    const timestamp = getBrazilDateTime();

    try {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11 && cleanPhone[2] === '9') {
            cleanPhone = cleanPhone.slice(0, 2) + cleanPhone.slice(3);
        }
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // Get the reminder message
        const reminderMessage = serviceReminderMessage(name);
        if (!reminderMessage) {
            throw new Error('Não há culto programado para enviar lembrete agora');
        }

        // Use the sendMessage function from whatsapp.js
        await sendMessage(formattedPhone, reminderMessage);
        
        // Log the reminder message
        await Log.create({
            type: 'message',
            action: 'Lembrete de Culto',
            description: `Lembrete enviado para ${name}`,
            username: req.user.username,
            timestamp: new Date(),
            details: { contactId, messageType: 'reminder' }
        });

        res.json({ 
            success: true, 
            message: 'Lembrete enviado com sucesso' 
        });
    } catch (error) {
        console.error(`[${timestamp}] Erro ao enviar lembrete:`, error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Erro ao enviar lembrete' 
        });
    }
});

// Add new route for sending bulk messages
app.post('/api/send-bulk-reminder', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find({ receivedMessage: false });
        const results = {
            success: [],
            failed: []
        };

        for (const contact of contacts) {
            try {
                const reminderMessage = bulkReminderMessage(contact.name);
                let cleanPhone = contact.phone.replace(/\D/g, '');
                if (cleanPhone.length === 11 && cleanPhone[2] === '9') {
                    cleanPhone = cleanPhone.slice(0, 2) + cleanPhone.slice(3);
                }
                const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

                await sendMessage(formattedPhone, reminderMessage);
                
                // Update contact status
                contact.receivedMessage = true;
                await contact.save();
                
                results.success.push(contact.name);
            } catch (error) {
                results.failed.push({ name: contact.name, error: error.message });
            }
        }

        res.json({
            success: true,
            message: `Mensagens enviadas com sucesso para ${results.success.length} contatos`,
            results
        });
    } catch (error) {
        console.error('Erro ao enviar mensagens em massa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar mensagens em massa',
            error: error.message
        });
    }
});

// Add route to mark all contacts as messaged
app.post('/api/mark-all-messaged', authenticateToken, async (req, res) => {
    try {
        await Contact.updateMany(
            { receivedMessage: false },
            { $set: { receivedMessage: true } }
        );

        res.json({
            success: true,
            message: 'Todos os contatos foram marcados como mensagem enviada'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar contatos',
            error: error.message
        });
    }
});

// Rota para atualizar o status da mensagem
app.put('/api/contacts/:id/message-status', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const { receivedMessage } = req.body;

        const updatedContact = await Contact.findByIdAndUpdate(
            contactId,
            { receivedMessage },
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contato não encontrado' 
            });
        }

        res.json({
            success: true,
            message: 'Status atualizado com sucesso',
            contact: updatedContact
        });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status da mensagem'
        });
    }
});

// Rota para buscar um contato específico
app.get('/api/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const contact = await Contact.findById(contactId);
        
        if (!contact) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contato não encontrado' 
            });
        }

        res.json({ 
            success: true, 
            contact 
        });
    } catch (error) {
        console.error('Erro ao buscar contato:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar contato' 
        });
    }
});

// Rota para atualizar um contato
app.put('/api/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const updates = req.body;
        
        const contact = await Contact.findByIdAndUpdate(
            contactId, 
            updates,
            { new: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contato não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Contato atualizado com sucesso',
            contact
        });
    } catch (error) {
        console.error('Erro ao atualizar contato:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar contato'
        });
    }
});

// Rota para atualizar o status da mensagem
app.put('/api/contacts/:id/update-status', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const { receivedMessage } = req.body;

        console.log('Atualizando status para contato:', {
            contactId,
            receivedMessage
        });

        const updatedContact = await Contact.findByIdAndUpdate(
            contactId,
            { receivedMessage },
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({
                success: false,
                message: 'Contato não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Status atualizado com sucesso',
            contact: updatedContact
        });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status da mensagem'
        });
    }
});

// Rota específica para marcar mensagem como não enviada
app.post('/api/contacts/:id/mark-not-sent', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        
        const updatedContact = await Contact.findByIdAndUpdate(
            contactId,
            { receivedMessage: false },
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({
                success: false,
                message: 'Contato não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Mensagem marcada como não enviada',
            contact: updatedContact
        });
    } catch (error) {
        console.error('Erro ao marcar mensagem como não enviada:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar mensagem como não enviada'
        });
    }
});

app.post('/api/contacts/:id/mark-not-messaged', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const updatedContact = await Contact.findByIdAndUpdate(
            contactId,
            { receivedMessage: false },
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({
                success: false,
                message: 'Contato não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Status da mensagem atualizado com sucesso',
            contact: updatedContact
        });
    } catch (error) {
        console.error('Erro ao atualizar status da mensagem:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status da mensagem'
        });
    }
});

// Add bulk reminder endpoint
app.post('/api/contacts/send-reminder-all', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find({ receivedMessage: false });
        const reminderMessage = "Olá! Este é um lembrete do seu convite para nossa igreja. Esperamos você! 🙏";
        
        let successCount = 0;
        let failureCount = 0;

        for (const contact of contacts) {
            try {
                await sendMessage(contact.phone, reminderMessage);
                await Contact.findByIdAndUpdate(contact._id, { receivedMessage: true });
                successCount++;
            } catch (err) {
                console.error(`Erro ao enviar mensagem para ${contact.phone}:`, err);
                failureCount++;
            }
            // Add small delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.json({
            success: true,
            message: `Lembretes enviados: ${successCount} sucesso, ${failureCount} falhas`,
            details: { successCount, failureCount }
        });
    } catch (error) {
        console.error('Erro ao enviar lembretes em massa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar lembretes'
        });
    }
});

// Servir arquivos estáticos depois das rotas da API
app.use(express.static(path.join(__dirname, 'public')));

// Rota específica para a página de registro
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Error handling middleware por último
app.use((err, req, res, next) => {
    console.error('Erro no middleware:', err);
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'Dados inválidos na requisição'
        });
    }
    next();
});

// Serve o arquivo index.html para todas as rotas não encontradas
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const os = require('os');
const port = 8080;

const interfaces = os.networkInterfaces();
const localIPs = [];

for (let iface of Object.values(interfaces)) {
    for (let config of iface) {
        if (config.family === 'IPv4' && !config.internal) {
            localIPs.push(config.address);
        }
    }
}

app.listen(port, '0.0.0.0', () => {
    console.log('Servidor rodando nos seguintes endereços:');
    for (let ip of localIPs) {
        console.log(`→ http://${ip}:${port}`);
    }
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Porta ${port} já está em uso`);
    } else {
        console.error('Erro ao iniciar servidor:', err);
    }
});


// Modifique a rota de validação de token
app.get('/api/auth/validate-token', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token não encontrado'
            });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                // Se o token estiver expirado, gera um novo
                if (err.name === 'TokenExpiredError') {
                    const oldPayload = jwt.decode(token);
                    if (!oldPayload) {
                        return res.status(401).json({
                            success: false,
                            message: 'Token inválido'
                        });
                    }

                    const newToken = jwt.sign(
                        {
                            userId: oldPayload.userId,
                            username: oldPayload.username,
                            role: oldPayload.role
                        },
                        JWT_SECRET,
                        { expiresIn: TOKEN_EXPIRATION }
                    );

                    return res.json({
                        success: true,
                        username: oldPayload.username,
                        role: oldPayload.role,
                        token: newToken
                    });
                }

                return res.status(401).json({
                    success: false,
                    message: 'Token inválido'
                });
            }

            res.json({
                success: true,
                username: decoded.username,
                role: decoded.role
            });
        });
    } catch (error) {
        console.error('Erro na validação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao validar token'
        });
    }
});

// Add the new login and token verification routes
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Tentativa de login:', { username }); // Debug log

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuário e senha são obrigatórios'
            });
        }

        const user = await User.findOne({ username });
        
        if (!user) {
            console.log('Usuário não encontrado:', username);
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('Senha inválida para usuário:', username);
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );

        console.log('Login bem-sucedido:', { username, role: user.role });
        
        res.json({
            success: true,
            token,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Token verification route
app.post('/api/verify-token', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ valid: false });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            res.status(401).json({ valid: false });
        } else {
            res.json({ valid: true });
        }
    });
});

// Rota para exportar usuários para Excel
app.get('/api/admin/export/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const users = await User.find({}, '-password');
        const csvContent = [
            ['Nome', 'Data de Criação', 'Papel'],
            ...users.map(user => [
                user.username,
                new Date(user.createdAt).toLocaleDateString('pt-BR'),
                user.role
            ])
        ];

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=usuarios.csv');
        res.send(csvContent.map(row => row.join(',')).join('\n'));

    } catch (error) {
        res.status(500).json({ message: 'Erro ao exportar usuários' });
    }
});

// Rota para exportar membros para Excel
app.get('/api/admin/export/members', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const members = await Member.find({});
        const csvContent = [
            ['Nome', 'Telefone', 'Data de Nascimento', 'É Discípulo', 'Discipulado por'],
            ...members.map(member => [
                member.name,
                member.phone,
                member.birthday ? new Date(member.birthday).toLocaleDateString('pt-BR') : 'Não informado',
                member.isDisciple ? 'Sim' : 'Não',
                member.discipleBy || 'Não informado'
            ])
        ];

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=membros.csv');
        res.send(csvContent.map(row => row.join(',')).join('\n'));

    } catch (error) {
        res.status(500).json({ message: 'Erro ao exportar membros' });
    }
});

// Rota para exportar visitantes (contatos) para Excel
app.get('/api/admin/export/contacts', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const contacts = await Contact.find({});
        const csvContent = [
            ['Nome', 'Telefone', 'Data de Nascimento', 'Adicionado por', 'Data de Criação', 'Mensagem Enviada'],
            ...contacts.map(contact => [
                contact.name,
                contact.phone,
                contact.birthday ? new Date(contact.birthday).toLocaleDateString('pt-BR') : 'Não informado',
                contact.owner || 'Não informado',
                new Date(contact.createdAt).toLocaleDateString('pt-BR'),
                contact.receivedMessage ? 'Sim' : 'Não'
            ])
        ];

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=visitantes.csv');
        res.send(csvContent.map(row => row.join(',')).join('\n'));

    } catch (error) {
        res.status(500).json({ message: 'Erro ao exportar visitantes' });
    }
});

// Adicione esta rota para verificar o status do WhatsApp
app.get('/api/whatsapp/status', authenticateToken, (req, res) => {
    const status = getConnectionStatus();
    res.json(status);
});

// Rota para iniciar conexão do WhatsApp
app.post('/api/whatsapp/connect', authenticateToken, async (req, res) => {
    try {
        await connectToWhatsApp();
        res.json({ success: true, message: 'Iniciando conexão com WhatsApp' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao conectar WhatsApp' });
    }
});

// Rota para redefinir a senha do usuário (apenas admin)
app.put('/api/users/:username/reset-password', authenticateToken, async (req, res) => {
    try {
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const { username } = req.params;
        const defaultPassword = 'senhaPadrao123'; // Defina a senha padrão aqui

        const user = await User.findOneAndUpdate(
            { username },
            { password: defaultPassword },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Senha redefinida com sucesso'
        });
    } catch (error) {
        console.error('Erro ao redefinir senha do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao redefinir senha do usuário'
        });
    }
});

// Rota para fazer upload da imagem de perfil do usuário (apenas admin)
app.post('/api/users/:username/profile-image', authenticateToken, async (req, res) => {
    try {
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const { username } = req.params;
        const profileImage = req.files.profileImage;

        if (!profileImage) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma imagem enviada'
            });
        }

        const imagePath = `./public/perfils/${username}-${profileImage.name}`;
        await profileImage.mv(imagePath);

        const user = await User.findOneAndUpdate(
            { username },
            { profileImage: imagePath },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Imagem de perfil atualizada com sucesso',
            profileImage: imagePath
        });
    } catch (error) {
        console.error('Erro ao fazer upload da imagem de perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao fazer upload da imagem de perfil'
        });
    }
});

// Update the stats route
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Acesso negado' 
            });
        }

        // Total users and contacts
        const totalUsers = await User.countDocuments();
        const totalContacts = await Contact.countDocuments();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const contactsToday = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        // Active users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers = await Contact.distinct('owner', {
            createdAt: { $gte: sevenDaysAgo }
        }).then(users => users.length);

        // Activity chart data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activityData = await Contact.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        const chartData = {
            labels: activityData.map(d => d._id.date),
            values: activityData.map(d => d.count)
        };

        // Monthly contacts data
        const monthlyData = await Contact.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const contactsByMonth = {
            labels: monthlyData.map(d => `${monthNames[d._id.month - 1]} ${d._id.year}`),
            values: monthlyData.map(d => d.count)
        };

        // User contacts data
        const userContactsData = await Contact.aggregate([
            {
                $group: {
                    _id: "$username",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const contactsByUser = {
            labels: userContactsData.map(d => d._id || 'Anônimo'),
            values: userContactsData.map(d => d.count)
        };

        res.json({
            success: true,
            totalUsers,
            totalContacts,
            contactsToday,
            activeUsers,
            chartData,
            contactsByMonth,
            activeUsersData: {
                labels: ['Ativos', 'Inativos'],
                values: [activeUsers, totalUsers - activeUsers]
            },
            contactsByUser
        });

    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao carregar estatísticas',
            error: error.message 
        });
    }
});

// Add new route for detailed stats
app.get('/api/admin/detailed-stats', authenticateToken, async (req, res) => {
    try {
        // Set proper headers
        res.setHeader('Content-Type', 'application/json');

        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Admin privileges required'
            });
        }

        const totalUsers = await User.countDocuments();
        const totalContacts = await Contact.countDocuments();
        
        res.json({
            success: true,
            totalUsers,
            totalContacts,
            username: req.user.username,
            role: req.user.role
        });
    } catch (error) {
        console.error('Erro ao carregar estatísticas detalhadas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao carregar estatísticas detalhadas'
        });
    }
});

app.get('/api/contacts/all', authenticateToken, async (req, res) => {
    try {
        // Busca todos os contatos no banco de dados, ordenados por data de criação (mais recentes primeiro)
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar contatos' });
    }
});

// Rota para obter todos os contatos sem restrição de usuário
app.get('/api/contacts/all', authenticateToken, async (req, res) => {
    try {
        console.log('Buscando todos os contatos...');
        const contacts = await Contact.find()
            .sort({ createdAt: -1 })
            .lean(); // Adiciona .lean() para melhor performance

        console.log(`Encontrados ${contacts.length} contatos`);

        res.json({
            success: true,
            contacts: contacts
        });
    } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos',
            error: error.message
        });
    }
});

// Substitua ou adicione a rota /api/contacts/all
app.get('/api/contacts/all', authenticateToken, async (req, res) => {
    try {
        console.log('Buscando contatos...');
        const contacts = await Contact.find().sort({ createdAt: -1 });
        console.log(`Encontrados ${contacts.length} contatos`);

        res.json({ 
            success: true, 
            contacts: contacts 
        });
    } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos',
            error: error.message
        });
    }
});

// Rota para enviar mensagem via WhatsApp
app.post('/api/send-whatsapp', authenticateToken, async (req, res) => {
    const { phone, name, contactId } = req.body;

    try {
        // Simula o envio de mensagem (substitua pela lógica real)
        console.log(`Enviando mensagem para ${phone} (${name})`);

        // Atualiza o status do contato
        if (contactId) {
            await Contact.findByIdAndUpdate(contactId, { receivedMessage: true });
        }

        res.json({ success: true, message: 'Mensagem enviada com sucesso' });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
    }
});

// Rota para atualizar o status da mensagem
app.put('/api/contacts/:id/message-status', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const { receivedMessage } = req.body;

        const updatedContact = await Contact.findByIdAndUpdate(
            contactId,
            { receivedMessage },
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({ success: false, message: 'Contato não encontrado' });
        }

        res.json({ success: true, message: 'Status atualizado com sucesso', contact: updatedContact });
    } catch (error) {
        console.error('Erro ao atualizar status da mensagem:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar status da mensagem' });
    }
});

// Rota para enviar mensagem
app.post('/api/send-whatsapp', authenticateToken, async (req, res) => {
    const { phone, name, contactId, messageType = 'welcome' } = req.body;
    const timestamp = getBrazilTimestamp();

    try {
        let messageToSend;
        if (messageType === 'reminder') {
            messageToSend = serviceReminderMessage(name);
        } else {
            messageToSend = welcomeMessage(name);
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        const sent = await sendMessage(formattedPhone, messageToSend);
        
        if (!sent) {
            throw new Error('Falha ao enviar mensagem');
        }

        if (contactId) {
            await Contact.findByIdAndUpdate(contactId, { 
                receivedMessage: true,
                lastMessageDate: new Date()
            });
        }

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso'
        });

    } catch (error) {
        console.error(`[${timestamp}] Error:`, error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Rota para tornar contato membro
app.post('/api/contacts/:id/make-member', authenticateToken, async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contato não encontrado' });
        }

        const member = new Member({
            name: contact.name,
            phone: contact.phone,
            birthday: contact.birthday
        });

        await member.save();
        await Contact.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Contato transformado em membro com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ... existing code ...

// Rota para enviar lembrete
app.post('/api/send-reminder', [authenticateToken, checkWhatsAppStatus], async (req, res) => {
    const { phone, name } = req.body;
    const timestamp = getBrazilTimestamp();

    try {
        // Format phone number
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11 && cleanPhone[2] === '9') {
            cleanPhone = cleanPhone.slice(0, 2) + cleanPhone.slice(3);
        }
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // Get reminder message
        const reminderMessage = serviceReminderMessage(name);
        
        console.log(`[${timestamp}] Sending reminder to ${formattedPhone}`);

        // Send message using WhatsApp client
        const sent = await sendMessage(formattedPhone, reminderMessage);
        if (!sent) {
            throw new Error('Falha ao enviar lembrete');
        }

        // Log reminder sent
        await Log.create({
            type: 'message',
            action: 'Lembrete',
            description: `Lembrete enviado para ${name}`,
            username: req.user.username,
            timestamp: new Date(),
            details: { messageType: 'reminder' }
        });

        res.json({
            success: true,
            message: 'Lembrete enviado com sucesso'
        });

    } catch (error) {
        console.error(`[${timestamp}] Error:`, error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao enviar lembrete'
        });
    }
});

// ... existing code ...

// Rota para estatísticas detalhadas do admin
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Busca dados das estatísticas
        const stats = await Promise.all([
            // Total de usuários
            User.countDocuments(),
            
            // Total de contatos
            Contact.countDocuments(),
            
            // Contatos hoje
            Contact.countDocuments({
                createdAt: { 
                    $gte: new Date().setHours(0,0,0,0) 
                }
            }),

            // Contatos por usuário
            Contact.aggregate([
                {
                    $group: {
                        _id: '$owner',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Contatos por mês
            Contact.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { 
                        '_id.year': 1, 
                        '_id.month': 1 
                    }
                }
            ]),

            // Status das mensagens
            Contact.aggregate([
                {
                    $group: {
                        _id: '$receivedMessage',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Horários de atividade
            Contact.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $hour: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id': 1 }
                }
            ])
        ]);

        // Calcula taxa de crescimento
        const previousPeriodContacts = await Contact.countDocuments({
            createdAt: {
                $gte: new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000)),
                $lt: startDate
            }
        });

        const currentPeriodContacts = await Contact.countDocuments({
            createdAt: { $gte: startDate }
        });

        const growthRate = previousPeriodContacts === 0 ? 
            100 : // Se não havia contatos antes, crescimento é 100%
            ((currentPeriodContacts - previousPeriodContacts) / previousPeriodContacts) * 100;

        // Organiza os dados para retornar
        const [
            totalUsers,
            totalContacts,
            contactsToday,
            contactsByUser,
            contactsByMonth,
            messageStats,
            activityHours
        ] = stats;

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalContacts,
                contactsToday,
                growthRate: Math.round(growthRate * 100) / 100, // Arredonda para 2 casas decimais
                contactsByUser,
                contactsByMonth,
                messageStats,
                activityHours
            }
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar estatísticas',
            error: error.message 
        });
    }
});

// ...existing code...

