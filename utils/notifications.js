
const Member = require('../models/Member');
const Contact = require('../models/Contact');
const MessageStatus = require('../models/MessageStatus');
const Log = require('../models/Log');

async function handleMessageStatus(message) {
    try {
        const status = message.ack; // 0: sent, 1: delivered, 2: read
        const statusMap = {
            0: 'sent',
            1: 'delivered',
            2: 'read'
        };

        if (status && message.id) {
            await MessageStatus.findOneAndUpdate(
                { messageId: message.id },
                { 
                    status: statusMap[status],
                    ...(status === 1 ? { deliveredAt: new Date() } : {}),
                    ...(status === 2 ? { readAt: new Date() } : {})
                }
            );
        }
    } catch (error) {
        console.error('Error handling message status:', error);
    }
}


// Função de envio de mensagem desativada: utilize o Baileys do backend principal
async function sendMessage(/*recipient, message, type = 'custom'*/) {
    throw new Error('Envio de mensagem WhatsApp deve ser feito via Baileys no backend principal.');
}

module.exports = {
    sendMessage
};