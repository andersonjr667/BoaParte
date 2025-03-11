const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const multer = require('multer');

const whatsapp = require('./whatsapp');

// WhatsApp initialization constants and state
const authPath = './auth_info.json';
const AUTH_FOLDER = path.join(__dirname, 'auth');
const AUTH_FILE = path.join(AUTH_FOLDER, 'auth_info.json');
const MAX_RETRIES = 5;

let sock;
let retries = 0;
let state = {
    creds: {
        me: {},
        registered: false
    },
    keys: {}
};

// Save state function
const saveState = async () => {
    try {
        fs.writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2));
    } catch (err) {
        console.error('Error saving auth:', err);
    }
};

// Initialize auth
async function initAuth() {
    try {
        if (!fs.existsSync(AUTH_FOLDER)) {
            await mkdir(AUTH_FOLDER);
        }
        
        if (fs.existsSync(AUTH_FILE)) {
            state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('Error initializing auth:', err);
    }
}

// WhatsApp connection function
async function connectToWhatsApp() {
    const { makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
    
    try {
        await initAuth();

        sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            browser: ['Boa Parte', 'Chrome', '1.0.0']
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect && retries < MAX_RETRIES) {
                    retries++;
                    console.log(`INFO: Tentando reconectar... Tentativa ${retries}`);
                    await connectToWhatsApp();
                } else {
                    console.log('INFO: Não foi possível reconectar. Verifique as credenciais e tente novamente.');
                }
            } else if (connection === 'open') {
                retries = 0;
                console.log('INFO: Conexão estabelecida com sucesso!');
            }
        });

        sock.ev.on('creds.update', saveState);
        
        return sock;
    } catch (err) {
        console.error('Error in WhatsApp connection:', err);
        throw err;
    }
}

// Initialize WhatsApp connection
connectToWhatsApp().catch(err => {
    console.error('Failed to start WhatsApp client:', err);
});

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anderson:152070@database.o6gmd.mongodb.net/test?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'WPYvz*z_ZC5L:?mW.:,MPJ$_U?RD8X';
const VALID_REGISTRATION_CODE = process.env.REGISTRATION_CODE || 'BOAPARTE2024';
const TOKEN_EXPIRATION = '7d'; // Aumentado para 7 dias

let whatsappClient = null;
let isInitializing = false;

// Add this at the top of your script
const API_BASE_URL = '/api'; // Change this to match your API URL
console.log('API Base URL:', API_BASE_URL);

// Middleware
app.use(cors());
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

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadsDir));

// Lista de tokens inválidos
let invalidTokens = new Set();

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token não encontrado' });
    }

    if (invalidTokens.has(token)) {
        return res.status(401).json({ message: 'Token inválido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
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

// Initialize WhatsApp Client
async function initializeWhatsAppClient() {
    if (isInitializing) return;

    try {
        isInitializing = true;
        const WhatsAppClient = require('./whatsapp'); // Move this require here
        whatsappClient = new WhatsAppClient();
        await whatsappClient.initialize();
        console.log('WhatsApp client initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize WhatsApp client:', error);
        whatsappClient = null;
    } finally {
        isInitializing = false;
    }
}

// Initialize WhatsApp client when the server starts
initializeWhatsAppClient();

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

// Rota de login simplificada
app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuário e senha são obrigatórios'
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
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );
        console.log('Token gerado:', token); // Log para verificar o token gerado
        console.log('Token enviado:', token); // Log para verificar o token enviado
        res.json({
            success: true,
            username: user.username,
            role: user.role,
            token // Inclui o token na resposta
        });
    } catch (error) {
        console.error('Erro no login:', error); // Log de erro
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find();
        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Erro ao listar contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar contatos'
        });
    }
});

// Rota para obter contatos do mês atual
app.get('/api/contacts/month', async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const contacts = await Contact.find({
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        }).sort({ createdAt: -1 });

        res.json(contacts);
    } catch (error) {
        console.error('Erro ao buscar contatos do mês:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contatos do mês'
        });
    }
});

// Rota para obter contatos por mês específico
app.get('/api/contacts/month/:month', async (req, res) => {
    try {
        const month = parseInt(req.params.month);

        if (isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: 'Mês inválido'
            });
        }

        const year = new Date().getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        let query = {
            birthday: {
                $gte: startDate,
                $lte: endDate
            }
        };

        // Se não for admin, filtrar apenas os contatos do usuário
        if (req.user.role !== 'admin') {
            query.username = req.user.username;
        }

        const contacts = await Contact.find(query).sort({ birthday: 1 });

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

// Rota para adicionar contato
app.post("/api/contacts", authenticateToken, async (req, res) => {
    try {
        const { name, phone, birthday } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Nome e telefone são obrigatórios'
            });
        }

        const contact = new Contact({
            name,
            phone,
            birthday: birthday || null,
            owner: req.user.username,
            username: req.user.username
        });

        await contact.save();

        res.json({
            success: true,
            message: 'Contato adicionado com sucesso',
            contact
        });
    } catch (error) {
        console.error('Erro ao adicionar contato:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar contato'
        });
    }
});

// Rota para atualizar contato
app.put("/api/contacts/:id", async (req, res) => {
    try {
        const { name, phone, birthday } = req.body;
        const contactId = req.params.id;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Nome e telefone são obrigatórios'
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

        contact.name = name;
        contact.phone = phone;
        contact.birthday = birthday || contact.birthday;

        await contact.save();

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

// Rota para deletar contato
app.delete("/api/contacts/:id", authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
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
            message: 'Erro ao deletar contato'
        });
    }
});

// Rota para listar usuários (apenas admin)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário tem role admin no token
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const users = await User.find({}, { password: 0 });
        res.json({
            success: true,
            users
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
app.get('/api/auth/verify', (req, res) => {
    try {
        res.json({
            success: true,
            username: req.user.username,
            role: req.user.role
        });
    } catch (error) {
        console.error('Erro na verificação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar token'
        });
    }
});

// Route to send WhatsApp message
app.post('/api/send-whatsapp', async (req, res) => {
    try {
        const { phone, message, contactId } = req.body;

        if (!phone || !message || !contactId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parâmetros inválidos' 
            });
        }

        if (!whatsapp.isConnected) {
            return res.status(503).json({ 
                success: false, 
                message: 'WhatsApp não está conectado',
                shouldReconnect: true
            });
        }

        // Log do número antes do envio
        console.log('Número original:', phone);

        await whatsapp.sendMessage(phone, message);
        await Contact.findByIdAndUpdate(contactId, { receivedMessage: true });

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

        // Add photo if it's provided
        if (req.file) {
            memberData.photo = `/uploads/${req.file.filename}`;
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
        const photo = req.file ? `/uploads/${req.file.filename}` : null;

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

// Add WhatsApp status endpoint
app.get('/api/whatsapp/status', (req, res) => {
    const status = whatsapp.getConnectionStatus();
    res.json(status);
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

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
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

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
