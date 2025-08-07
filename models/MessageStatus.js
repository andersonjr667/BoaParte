const mongoose = require('mongoose');

const MessageStatusSchema = new mongoose.Schema({
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Log',
        required: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'recipientType'
    },
    recipientType: {
        type: String,
        enum: ['Member', 'Contact'],
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
        default: 'queued'
    },
    error: String,
    attempts: {
        type: Number,
        default: 0
    },
    lastAttempt: Date,
    deliveredAt: Date,
    readAt: Date
}, {
    timestamps: true
});

// Índices
MessageStatusSchema.index({ messageId: 1 });
MessageStatusSchema.index({ recipientId: 1, recipientType: 1 });
MessageStatusSchema.index({ status: 1, createdAt: -1 });
MessageStatusSchema.index({ phone: 1 });

// Método para atualizar status
MessageStatusSchema.methods.updateStatus = async function(newStatus, error = null) {
    const update = {
        status: newStatus,
        $inc: { attempts: 1 },
        lastAttempt: new Date()
    };

    if (error) {
        update.error = error;
    }

    if (newStatus === 'delivered') {
        update.deliveredAt = new Date();
    } else if (newStatus === 'read') {
        update.readAt = new Date();
    }

    return this.updateOne(update);
};

// Método estático para buscar mensagens pendentes
MessageStatusSchema.statics.findPendingMessages = function(limit = 50) {
    return this.find({
        status: { $in: ['queued', 'failed'] },
        attempts: { $lt: 3 }
    })
    .sort({ createdAt: 1 })
    .limit(limit);
};

// Método estático para relatórios
MessageStatusSchema.statics.getDeliveryStats = async function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgAttempts: { $avg: '$attempts' }
            }
        }
    ]);
};

module.exports = mongoose.model('MessageStatus', MessageStatusSchema);
