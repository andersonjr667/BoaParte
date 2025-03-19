const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['user', 'system', 'error']
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    user: {
        type: String
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    }
});

module.exports = mongoose.model('Log', logSchema);
