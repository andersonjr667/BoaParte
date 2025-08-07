const mongoose = require('mongoose');

// Adicionar opção de collection
const LogSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['create', 'update', 'delete', 'message', 'attendance', 'system'],
        required: true
    },
    action: {
        type: String,
        required: true
    },
    description: String,
    username: {
        type: String,
        required: true,
        index: true
    },
    details: {
        contactId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contact'
        },
        memberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member'
        },
        name: String,
        phone: String,
        messageType: {
            type: String,
            enum: ['reminder', 'birthday', 'absence', 'custom']
        },
        oldValues: Object,
        newValues: Object
    },
    level: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info'
    },
    source: {
        type: String,
        enum: ['system', 'whatsapp', 'database', 'auth', 'user', 'api', 'server'],
        required: true
    },
    errorCode: String,
    stackTrace: String,
    metadata: {
        ip: String,
        userAgent: String,
        endpoint: String,
        method: String,
        responseTime: Number,
        statusCode: Number
    }
}, {
    timestamps: true,
    collection: 'logs' // Força o nome da collection
});

// Índices
LogSchema.index({ createdAt: -1 });
LogSchema.index({ type: 1, createdAt: -1 });
LogSchema.index({ username: 1, createdAt: -1 });

// Método estático para registro de log
LogSchema.statics.logAction = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Error logging action:', error);
        throw error;
    }
};

// Método estático para buscar logs por período
LogSchema.statics.findByDateRange = function(startDate, endDate, type = null) {
    const query = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        }
    };

    if (type) {
        query.type = type;
    }

    return this.find(query)
        .sort({ createdAt: -1 });
};

// Método estático para buscar logs por usuário
LogSchema.statics.findByUser = function(username, limit = 50) {
    return this.find({ username })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Método estático para log de erro
LogSchema.statics.logError = async function(error, metadata = {}) {
    try {
        const log = new this({
            type: 'system',
            action: 'error',
            level: metadata.level || 'error',
            source: metadata.source || 'system',
            description: error.message,
            username: metadata.username || 'system',
            errorCode: error.code,
            stackTrace: error.stack,
            metadata: {
                ...metadata,
                timestamp: new Date()
            }
        });
        await log.save();
        return log;
    } catch (err) {
        console.error('Failed to save error log:', err);
    }
};

module.exports = mongoose.model('Log', LogSchema);
