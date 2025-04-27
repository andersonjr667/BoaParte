const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Import models (only once)
const Contact = require('./models/Contact');
const User = require('./models/User');

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boaparte', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// API Routes
// Stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalContacts, todayContacts] = await Promise.all([
            Contact.countDocuments(),
            Contact.countDocuments({
                createdAt: { $gte: today }
            })
        ]);

        res.json({
            totalUsers: 1,
            totalContacts,
            todayContacts
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

// Monthly stats endpoint
app.get('/api/contacts/monthly-stats', async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const stats = await Contact.aggregate([
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
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: 1
                        }
                    },
                    count: 1
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ error: 'Error fetching monthly stats' });
    }
});

// Rota para obter todos os membros
app.get('/api/members', async (req, res) => {
    try {
        const members = await Member.find().sort({ name: 1 });
        res.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching members',
            error: error.message
        });
    }
});

// Rota para adicionar novo membro
app.post('/api/members', async (req, res) => {
    try {
        const newMember = new Member(req.body);
        await newMember.save();
        res.json({
            success: true,
            message: 'Member added successfully',
            member: newMember
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding member',
            error: error.message
        });
    }
});

// Rota para atualizar membro
app.put('/api/members/:id', async (req, res) => {
    try {
        const member = await Member.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json({
            success: true,
            message: 'Member updated successfully',
            member
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating member',
            error: error.message
        });
    }
});

// Rota para excluir membro
app.delete('/api/members/:id', async (req, res) => {
    try {
        await Member.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Member deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting member',
            error: error.message
        });
    }
});

// Rota para alternar status de discipulado
app.put('/api/members/:id/toggle-disciple', async (req, res) => {
    try {
        const member = await Member.findByIdAndUpdate(
            req.params.id,
            {
                isDisciple: req.body.isDisciple,
                discipleBy: req.body.discipleBy
            },
            { new: true }
        );
        res.json({
            success: true,
            message: 'Disciple status updated',
            member
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating disciple status',
            error: error.message
        });
    }
});

// Add these route handlers right after MongoDB connection
app.get('/api/contacts/table', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        console.log('Found contacts:', contacts.length);
        res.json({
            success: true,
            contacts: contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts',
            error: error.message
        });
    }
});

app.get('/api/contacts', async (req, res) => {
    try {
        console.log('Fetching contacts...');
        const contacts = await Contact.find().sort({ createdAt: -1 });
        console.log(`Found ${contacts.length} contacts`);
        
        res.json({
            success: true,
            contacts: contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts',
            error: error.message
        });
    }
});

app.post('/api/contacts', async (req, res) => {
    try {
        const { name, phone, birthday } = req.body;
        
        const contact = new Contact({
            name,
            phone,
            birthday: birthday ? new Date(birthday) : undefined,
            owner: req.user?.username
        });

        await contact.save();
        
        res.status(201).json({
            success: true,
            contact
        });
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating contact',
            error: error.message
        });
    }
});

// Add specific route for admin panel
app.get('/api/admin/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find()
            .sort({ createdAt: -1 })
            .select('-__v');
        
        res.json({
            success: true,
            contacts: contacts
        });
    } catch (error) {
        console.error('Admin contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admin contacts'
        });
    }
});

// Admin stats endpoint with error handling
app.get('/api/admin/stats', async (req, res) => {
    try {
        // Fetch basic stats
        const [
            totalUsers,
            totalContacts,
            totalMembers
        ] = await Promise.all([
            User.countDocuments(),
            Contact.countDocuments(),
            Member.countDocuments()
        ]);

        // Get today's contacts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const contactsToday = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        // Get monthly data
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

        // Get user activity
        const userActivity = await Contact.aggregate([
            {
                $group: {
                    _id: "$owner",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                totalContacts,
                totalMembers,
                contactsToday,
                monthlyData,
                userActivity
            }
        });

    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admin statistics',
            error: error.message
        });
    }
});

// Middleware para verificar autenticação e permissões
const checkAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso negado' });
    }
};

// Protege rotas admin
app.get('/admin.html', checkAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin-panel.html', checkAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-panel.html'));
});

// Authentication Middleware - Add this before any routes that use authenticateToken
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid token'
            });
        }
        req.user = user;
        next();
    });
};

// Admin dashboard route - Make sure this comes after the middleware definition
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    try {
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Fetch dashboard data
        const totalUsers = await User.countDocuments();
        const totalContacts = await Contact.countDocuments();
        const totalMembers = await Member.countDocuments();

        res.json({
            success: true,
            data: {
                totalUsers,
                totalContacts,
                totalMembers
            }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admin data'
        });
    }
});

// Contact routes
app.post('/api/contacts/:id/send-message', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contato não encontrado' 
            });
        }

        const message = window.welcomeMessage(contact.name);
        await sendMessage(contact.phone, message);

        contact.receivedMessage = true;
        await contact.save();

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso'
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar mensagem'
        });
    }
});

app.post('/api/contacts/:id/send-reminder', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contato não encontrado' 
            });
        }

        const reminderMessage = `Oi ${contact.name}! Tudo bem?\nQueria dizer que senti sua falta no culto. Você faz muita diferença entre a gente! Espero que esteja tudo bem com você. Se precisar de algo, estou aqui. Que Deus te abençoe! 🙏🏼✨`;
        await sendMessage(contact.phone, reminderMessage);

        res.json({
            success: true,
            message: 'Lembrete enviado com sucesso'
        });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar lembrete'
        });
    }
});

app.post('/api/contacts/:id/make-member', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) throw new Error('Contato não encontrado');

        // Criar novo membro
        const member = new Member({
            name: contact.name,
            phone: contact.phone,
            birthday: contact.birthday
        });
        await member.save();

        // Deletar contato
        await Contact.findByIdAndDelete(req.params.id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/contacts/:id', async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Endpoint para marcar mensagem como enviada
app.post('/api/contacts/:id/mark-sent', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contato não encontrado'
            });
        }

        contact.receivedMessage = true;
        await contact.save();

        res.json({
            success: true,
            message: 'Mensagem marcada como enviada'
        });
    } catch (error) {
        console.error('Error marking message as sent:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar mensagem como enviada'
        });
    }
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    try {
        console.log('Received login request:', req.body);
        const { username, password } = req.body;

        // Updated mock users with correct credentials
        const users = [
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'Anderson', password: '152070an', role: 'admin' }
        ];

        const user = users.find(u => 
            u.username === username && 
            u.password === password
        );

        console.log('Found user:', user);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário ou senha inválidos'
            });
        }

        res.json({
            success: true,
            token: 'mock-token-' + Date.now(),
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

app.get('/api/visitors/stats', async (req, res) => {
    try {
        const stats = await Contact.aggregate([
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    count: { $sum: 1 }
                }
            },
            { 
                $sort: { "_id.date": 1 } 
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id.date",
                    count: 1
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching visitor stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar estatísticas' 
        });
    }
});

// Adicione esta nova rota para estatísticas mensais
app.get('/api/visitors/monthly-stats', async (req, res) => {
    try {
        // Pega a data atual
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

        const stats = await Contact.aggregate([
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
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: 1
                        }
                    },
                    count: 1
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching monthly visitor stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar estatísticas mensais' 
        });
    }
});

// Add new endpoint for stats
app.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalContacts = await Contact.countDocuments();
        
        // Get today's contacts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayContacts = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            totalUsers,
            totalContacts,
            todayContacts
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

// Add new endpoint for daily stats
app.get('/api/contacts/daily-stats', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stats = await Contact.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id",
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { date: 1 } }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching daily stats' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
