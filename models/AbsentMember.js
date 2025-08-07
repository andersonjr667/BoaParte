const mongoose = require('mongoose');

const AbsentMemberSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    justified: {
        type: Boolean,
        default: false
    },
    justification: String,
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Índices
AbsentMemberSchema.index({ memberId: 1, date: -1 });
AbsentMemberSchema.index({ date: -1 });

module.exports = mongoose.model('AbsentMember', AbsentMemberSchema);
