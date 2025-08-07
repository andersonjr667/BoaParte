const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Log = require('../models/Log');
const { auth, adminOnly } = require('../utils/auth');
const fs = require('fs/promises');
const path = require('path');

const usersFilePath = path.join(__dirname, '../db/users.json');

// Get all users (autenticado, busca do arquivo JSON)
router.get('/', auth, async (req, res) => {
    try {
        const data = await fs.readFile(usersFilePath, 'utf8');
        const users = JSON.parse(data);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userData.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
});

// Create new user
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        const user = new User(req.body);
        await user.save();

        // Log de criação de usuário
        await Log.logAction({
            type: 'create',
            action: 'create_user',
            username: req.body.username || req.body.email,
            description: `Usuário criado: ${user.username || user.email}`,
            details: {
                userId: user._id,
                username: user.username,
                email: user.email
            },
            source: 'user',
            level: 'info'
        });

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar usuário' });
    }
});

// Update user (admin or self only)
router.put('/:id', auth, async (req, res) => {
    try {
        // Check if user is updating their own profile or is admin
        if (req.userData.role !== 'admin' && req.userData.userId !== req.params.id) {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        const updates = { ...req.body };
        
        // Only admin can change roles
        if (req.userData.role !== 'admin') {
            delete updates.role;
        }

        // If updating password, hash it
        if (updates.password) {
            const user = await User.findById(req.params.id);
            user.password = updates.password;
            await user.save();
            delete updates.password;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json({
            message: 'Usuário atualizado com sucesso',
            user
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
});

// Delete user (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Prevent deleting the last admin
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Não é possível excluir o último administrador' });
            }
        }

        await user.remove();
        // Log de exclusão de usuário
        await Log.logAction({
            type: 'delete',
            action: 'delete_user',
            username: req.userData.username,
            description: `Usuário excluído: ${user.username}`,
            source: 'user',
            details: {
                userId: user._id,
                username: user.username,
                email: user.email
            },
            level: 'info'
        });
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir usuário' });
    }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.userData.userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const isValid = await user.matchPassword(currentPassword);
        if (!isValid) {
            return res.status(400).json({ message: 'Senha atual incorreta' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao alterar senha' });
    }
});

// Alterar papel do usuário
router.put('/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        // Lê o arquivo atual
        const data = await fs.readFile(usersFilePath, 'utf8');
        const users = JSON.parse(data);
        
        // Encontra e atualiza o usuário
        const userIndex = users.findIndex(u => u._id === id);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        users[userIndex].role = role;
        
        // Salva as alterações
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        
        res.json({ message: 'Papel atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar papel:', error);
        res.status(500).json({ message: 'Erro ao atualizar papel' });
    }
});

// ROTA CUSTOMIZADA: Excluir usuário do arquivo JSON (sem autenticação)
router.delete('/json/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await fs.readFile(usersFilePath, 'utf8');
        let users = JSON.parse(data);
        const before = users.length;
        users = users.filter(u => u._id !== id && u.username !== id);
        if (users.length === before) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir usuário', error: error.message });
    }
});

module.exports = router;
