const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { auth } = require('../utils/auth');
const contactsPath = path.join(__dirname, '../db/contacts.json');

// Função simulada para envio de mensagem (substitua pelo Baileys ou integração real)
const whatsapp = require('../whatsapp');
// Mensagem padrão (pode ser personalizada)
const defaultMessage = (name) => `Olá ${name}, esta é uma mensagem automática do sistema Boa Parte.`;
async function sendMessageToContact(contact) {
  if (!contact.phone) throw new Error('Contato sem telefone');
  // Usa função do whatsapp.js
  await whatsapp.sendMessageBaileys(contact.phone, defaultMessage(contact.name || ''));
  return true;
}

// POST /api/messages/send
router.post('/send', auth, async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) return res.status(400).json({ message: 'contactId obrigatório' });
    // Busca contato no JSON
    const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
    const contact = contacts.find(c => c._id === contactId);
    if (!contact) return res.status(404).json({ message: 'Contato não encontrado' });
    // Envia mensagem (simulado)
    await sendMessageToContact(contact);
    // Marca como enviado
    contact.receivedMessage = true;
    fs.writeFileSync(contactsPath, JSON.stringify(contacts, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao enviar mensagem', error: error.message });
  }
});

module.exports = router;
