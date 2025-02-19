require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite de 100 requisições por IP
});

// Aplicar rate limiting em todas as rotas
app.use(limiter);

// Configurações básicas
app.use(express.json({ limit: '10kb' })); // Limita o tamanho do body
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : '*',
    credentials: true
}));
app.use(cookieParser());
app.use(helmet()); // Adiciona headers de segurança

// Middleware para logs de requisição
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rate limiting mais específico
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // limite de 5 tentativas
    message: { error: "Muitas tentativas de login. Tente novamente mais tarde." }
});

// Aplicar rate limiting específico para rotas de autenticação
app.use('/login', authLimiter);
app.use('/register', authLimiter);

// Middleware para verificar autenticação em páginas protegidas
app.use(['/dashboard.html', '/users.html'], (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
        return res.redirect('/');
    }

    try {
        if (invalidTokens.has(token)) {
            return res.redirect('/');
        }

        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.redirect('/');
    }
});

app.use(express.static("public"));

// Headers de segurança
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Lista de tokens inválidos (para logout)
const invalidTokens = new Set();

// Limpar tokens inválidos periodicamente (a cada 1 hora)
setInterval(() => {
    invalidTokens.clear();
}, 3600000);

// ================== CONEXÃO COM MONGODB ==================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB conectado com sucesso"))
.catch(err => {
    console.error("❌ Falha na conexão com MongoDB:", err);
    process.exit(1);
});

// ================== MODELOS DE DADOS ==================
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model("User", UserSchema);

const ContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    username: { type: String, required: true }, // Vinculado ao usuário
    createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model("Contact", ContactSchema);

// ================== MIDDLEWARE DE AUTENTICAÇÃO ==================
const authenticateToken = (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
        if (req.path.endsWith('.html')) {
            return res.redirect('/');
        }
        return res.status(401).json({ error: "Acesso não autorizado" });
    }

    if (invalidTokens.has(token)) {
        if (req.path.endsWith('.html')) {
            return res.redirect('/');
        }
        return res.status(401).json({ error: "Sessão expirada" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (req.path.endsWith('.html')) {
                return res.redirect('/');
            }
            return res.status(403).json({ error: "Token inválido" });
        }
        req.user = user;
        next();
    });
};

// ================== TRATAMENTO DE ERROS GLOBAIS ==================
process.on("unhandledRejection", (err) => {
    console.error("⚠️ Erro não tratado:", err);
    process.exit(1);
});

process.on("uncaughtException", (err) => {
    console.error("⚠️ Exceção não capturada:", err);
    process.exit(1);
});

// ================== ROTAS ==================

// ---------- Autenticação ----------
app.post("/register", async (req, res) => {
    try {
        const { username, password, inviteCode } = req.body;

        // Validações
        if (!username || !password || !inviteCode) {
            return res.status(400).json({ error: "Todos os campos são obrigatórios" });
        }

        // Verifica o código de convite
        if (inviteCode !== process.env.INVITE_CODE) {
            return res.status(403).json({ error: "Código de convite inválido" });
        }

        if (username.length < 3 || password.length < 6) {
            return res.status(400).json({ 
                error: "Usuário (mín. 3 caracteres) e senha (mín. 6 caracteres) inválidos" 
            });
        }

        // Verifica se usuário já existe
        if (await User.findOne({ username })) {
            return res.status(409).json({ error: "Usuário já cadastrado" });
        }

        // Cria novo usuário
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });
        res.status(201).json({ message: "Usuário criado com sucesso!" });

    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validação dos campos
        if (!username || !password) {
            return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
        }

        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Usuário ou senha inválidos" });
        }

        // Gera token JWT válido por 1 hora
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1h" });
        
        // Define o token como cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000 // 1 hora
        });
        
        res.json({ token, username });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

app.post("/logout", (req, res) => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (token) {
        invalidTokens.add(token);
        res.clearCookie('token');
    }
    res.json({ message: "Logout realizado com sucesso" });
});

// ---------- Contatos ----------
app.post("/addContact", authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const username = req.user.username;

        // Validações
        if (!name || !phone) {
            return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
        }

        // Validação do formato do telefone usando regex
        const phoneRegex = /^[0-9\s()+\-]+$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: "Formato de telefone inválido" });
        }

        // Verifica duplicatas para o mesmo usuário
        if (await Contact.findOne({ name, phone, username })) {
            return res.status(409).json({ error: "Contato já existe" });
        }

        // Adiciona novo contato
        const newContact = await Contact.create({ name, phone, username });
        res.status(201).json(newContact);

    } catch (error) {
        console.error("Erro ao adicionar contato:", error);
        res.status(500).json({ error: "Erro ao salvar contato" });
    }
});

app.get("/getContacts", authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find({ username: req.user.username })
            .sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        console.error("Erro ao buscar contatos:", error);
        res.status(500).json({ error: "Erro ao carregar contatos" });
    }
});

// ---------- Páginas ----------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/dashboard.html", authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/users", authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "users.html"));
});

// Rota para listar todos os contatos (agora com autenticação)
app.get("/contatos", authenticateToken, async (req, res) => {
    try {
        const contatos = await Contact.find().sort({ createdAt: -1 });
        res.json(contatos);
    } catch (error) {
        console.error("Erro ao buscar contatos:", error);
        res.status(500).json({ error: "Erro ao carregar contatos" });
    }
});

// Rota para verificar token
app.get('/verify-token', authenticateToken, (req, res) => {
    res.json({ valid: true });
});

// Rota para verificar autenticação
app.get("/verify-auth", authenticateToken, (req, res) => {
    res.json({ valid: true, username: req.user.username });
});

// Rota para verificar status do servidor
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        time: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Erro interno no servidor' 
            : err.message 
    });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ============ ROTA PARA ALTERAR SENHA ==============
app.post("/changePassword", authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const username = req.user.username;

        // Busca o usuário no banco de dados
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Verifica se a senha atual está correta
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Senha atual incorreta" });
        }

        // Verifica se a nova senha é válida
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" });
        }

        // Criptografa a nova senha e atualiza no banco de dados
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Senha alterada com sucesso!" });
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// ================== INICIAR SERVIDOR ==================
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`
====================================
🚀 Servidor rodando!
📍 Local: http://localhost:${PORT}
⚙️ Ambiente: ${process.env.NODE_ENV || 'development'}
====================================
    `);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`
❌ Erro: A porta ${PORT} já está em uso!
💡 Soluções possíveis:
   1. Use uma porta diferente (altere no .env)
   2. Feche outros processos usando a porta ${PORT}
   3. Execute: taskkill /F /IM node.exe
        `);
    } else {
        console.error('❌ Erro ao iniciar servidor:', err);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Recebido sinal SIGTERM. Fechando servidor...');
    server.close(() => {
        console.log('✅ Servidor fechado com sucesso');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('👋 Recebido sinal SIGINT. Fechando servidor...');
    server.close(() => {
        console.log('✅ Servidor fechado com sucesso');
        process.exit(0);
    });
});