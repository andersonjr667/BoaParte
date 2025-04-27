const { connectToWhatsApp, sendMessage } = require('./whatsapp');

// Example of how to connect and handle QR code
async function startWhatsApp() {
    await connectToWhatsApp((qr) => {
        if (qr) {
            // Handle QR code here
            console.log('New QR Code:', qr);
        } else {
            console.log('Connected successfully!');
        }
    });
}

// Example of how to send a message
async function sendTestMessage() {
    try {
        await sendMessage('5511999999999', 'Test message');
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

startWhatsApp();
