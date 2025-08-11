const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { auth } = require('../utils/auth');
const Log = require('../models/Log');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Função utilitária para buscar usuário no JSON
function findUserInJson(username) {
    const usersPath = path.join(__dirname, '../db/users.json');
    if (!fs.existsSync(usersPath)) return null;
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    return users.find(u => u.username.trim().toLowerCase() === username.trim().toLowerCase());
}

// Utilitário para obter a versão da sessão atual do app
function getSessionVersion(req) {
  // Tenta pegar do app, se não, lê do arquivo
  if (req && req.app && req.app.get) {
    return req.app.get('sessionVersion') || 1;
  }
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../session_version.json'), 'utf8'));
    return data.version || 1;
  } catch {
    return 1;
  }
}

// Login route
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        let user = null;

        // 1. Tenta buscar no MongoDB
        try {
            user = await User.findOne({ 
                $or: [
                    { username: new RegExp('^' + login + '$', 'i') },
                    { email: new RegExp('^' + login + '$', 'i') }
                ] 
            }).select('+password');
        } catch (err) {
            console.error('MongoDB error:', err);
        }

        // 2. Se não achou, tenta no JSON
        if (!user) {
            user = findUserInJson(login);
            if (user) {
                // Simula objeto mongoose para compatibilidade
                user.comparePassword = async (pw) => bcrypt.compare(pw, user.password);
            }
        }

        // 3. Se não achou em nenhum lugar
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário ou senha inválidos'
            });
        }

        // 4. Verifica senha
        const isMatch = await (user.comparePassword ? user.comparePassword(password) : bcrypt.compare(password, user.password));
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Usuário ou senha inválidos'
            });
        }

        // 5. Generate token with role information
        const sessionVersion = getSessionVersion(req);
        const token = jwt.sign(
            { 
                userId: user._id || user.id, 
                username: user.username,
                role: user.role || 'user',
                sessionVersion
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 6. Send response with role information
        res.json({
            success: true,
            token,
            user: {
                username: user.username,
                role: user.role || 'user'
            }
        });

        // Log login action
        await Log.logAction({
            type: 'system',
            action: 'user_login',
            username: user.username || user.email || 'anonymous',
            description: 'Login realizado',
            source: 'auth'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro no servidor'
        });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
        }
        // Verifica se já existe no MongoDB
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email já cadastrado' });
        }
        // Verifica se já existe no JSON
        const usersPath = path.join(__dirname, '../db/users.json');
        let users = [];
        if (fs.existsSync(usersPath)) {
            users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
                return res.status(400).json({ success: false, message: 'Email já cadastrado' });
            }
        }
        // Cria no MongoDB
        const user = new User({ username: name, email, password });
        await user.save();
        // Cria no JSON
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserJson = {
            _id: user._id.toString(),
            username: name,
            email: email,
            password: hashedPassword,
            role: user.role || 'user',
            createdAt: new Date().toISOString()
        };
        users.push(newUserJson);
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
        // Gera token JWT
        const sessionVersion = getSessionVersion(req);
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                role: user.role || 'user',
                sessionVersion
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        // Log user registration
        await Log.logAction({
            type: 'system',
            action: 'user_register',
            username: user.email,
            description: 'Novo usuário registrado',
            source: 'auth'
        });
        res.status(201).json({
            success: true,
            token,
            user: {
                username: user.username,
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar usuário' });
    }
});

// Verify token route
router.get('/verify', auth, async (req, res) => {
    try {
        // 1. Tenta buscar no MongoDB
        let user = null;
        try {
            user = await User.findById(req.userData.userId).select('-password');
        } catch (err) {
            user = null;
        }

        // 2. Se não achou, tenta no JSON
        if (!user) {
            const usersPath = path.join(__dirname, '../db/users.json');
            if (fs.existsSync(usersPath)) {
                const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
                user = users.find(u => 
                    (u._id === req.userData.userId || u.id === req.userData.userId) &&
                    u.username === req.userData.username
                );
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }

        res.json({ user: { username: user.username, role: user.role || 'user' } });
    } catch (error) {
        res.status(401).json({ message: 'Token inválido' });
    }
});

// Forgot password route
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Generate reset token
        const resetToken = user.getResetPasswordToken();
        await user.save();

        // Here you would typically send an email with the reset token
        // For now, we'll just return it in the response
        res.json({ 
            message: 'Token de recuperação gerado com sucesso',
            resetToken 
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Erro ao processar solicitação' });
    }
});

// Reset password route
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token inválido ou expirado' });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Log password reset
        await Log.logAction({
            type: 'system',
            action: 'password_reset',
            username: user.email,
            description: 'Senha redefinida com sucesso',
            source: 'auth'
        });

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Erro ao redefinir senha' });
    }
});

// Logout route
router.post('/logout', auth, async (req, res) => {
    try {
        // Log logout action
        await Log.logAction({
            type: 'system',
            action: 'user_logout',
            username: req.userData.email,
            description: 'Logout realizado',
            source: 'auth'
        });

        res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Erro ao realizar logout' });
    }
});

module.exports = router;
