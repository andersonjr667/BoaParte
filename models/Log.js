const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['auth', 'message', 'contact', 'error']
    },
    action: {
        type: String,
        required: true
    },
    description: String,
    username: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Log', logSchema);
