const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
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
        required: false
    },
    owner: String,
    receivedMessage: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;