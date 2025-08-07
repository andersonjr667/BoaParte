const express = require('express');
const router = express.Router();
const { auth } = require('../utils/auth');
const path = require('path');
const fs = require('fs');
const Log = require('../models/Log');

const contactsPath = path.join(__dirname, '../db/contacts.json');

// Ensure contacts.json exists
if (!fs.existsSync(path.dirname(contactsPath))) {
    fs.mkdirSync(path.dirname(contactsPath), { recursive: true });
}
if (!fs.existsSync(contactsPath)) {
    fs.writeFileSync(contactsPath, '[]', 'utf8');
}

// Get all contacts
router.get('/', auth, (req, res) => {
    try {
        let contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
        // Garante que todos os contatos tenham o campo status
        contacts = contacts.map(c => ({ ...c, status: c.status || 'novo' }));
        res.json(contacts);
    } catch (error) {
        console.error('Error reading contacts:', error);
        res.status(500).json({ message: 'Error fetching contacts' });
    }
});

// Add new contact
router.post('/', auth, async (req, res) => {
    try {
        const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
        const newContact = {
            _id: Date.now().toString(),
            name: req.body.name,
            phone: req.body.phone.replace(/\D/g, ''),
            owner: req.body.owner || req.user.username,
            username: req.body.username || req.user.username,
            birthday: req.body.birthday || null,
            receivedMessage: false,
            createdAt: new Date().toISOString(),
            status: 'novo', // Garante o campo status
            __v: 0
        };
        
        contacts.push(newContact);
        fs.writeFileSync(contactsPath, JSON.stringify(contacts, null, 2));
        // Log de criação de contato
        await Log.logAction({
            type: 'create',
            action: 'create_contact',
            username: req.user.username,
            description: `Contato criado: ${newContact.name}`,
            details: {
                contactId: newContact._id,
                name: newContact.name,
                phone: newContact.phone
            },
            source: 'user',
            level: 'info'
        });
        res.status(201).json(newContact);
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ message: 'Error creating contact' });
    }
});

// Delete contact
router.delete('/:id', auth, async (req, res) => {
    try {
        let contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
        const contactIndex = contacts.findIndex(c => c._id === req.params.id);
        if (contactIndex === -1) {
            return res.status(404).json({ message: 'Contato não encontrado' });
        }
        const [deletedContact] = contacts.splice(contactIndex, 1);
        fs.writeFileSync(contactsPath, JSON.stringify(contacts, null, 2));
        // Log de exclusão de contato
        await Log.logAction({
            type: 'delete',
            action: 'delete_contact',
            username: req.user.username,
            description: `Contato removido: ${deletedContact.name}`,
            details: {
                contactId: deletedContact._id,
                name: deletedContact.name,
                phone: deletedContact.phone
            },
            source: 'user',
            level: 'info'
        });
        res.json({ message: 'Contato removido com sucesso' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ message: 'Erro ao remover contato' });
    }
});

module.exports = router;
