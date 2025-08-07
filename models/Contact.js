const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Telefone é obrigatório'],
        match: [/^\+?\d{10,14}$/, 'Número de telefone inválido']
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    birthday: Date,
    receivedMessage: {
        type: Boolean,
        default: false
    },
    lastContact: Date,
    notes: String,
    status: {
        type: String,
        enum: ['novo', 'em_acompanhamento', 'convertido', 'inativo'],
        default: 'novo'
    }
}, {
    timestamps: true
});

// Define indexes separately
ContactSchema.index({ name: 1 });
ContactSchema.index({ phone: 1 });
ContactSchema.index({ owner: 1 });
ContactSchema.index({ status: 1 });

// Middleware para limpar número de telefone
ContactSchema.pre('save', function(next) {
    if (this.phone) {
        this.phone = this.phone.replace(/\D/g, '').slice(-11);
    }
    next();
});

// Virtual para idade
ContactSchema.virtual('age').get(function() {
    if (!this.birthday) return null;
    const today = new Date();
    const birthDate = new Date(this.birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Método estático para buscar aniversariantes do mês
ContactSchema.statics.findBirthdaysInMonth = function(month) {
    return this.aggregate([
        {
            $match: {
                birthday: { $exists: true, $ne: null }
            }
        },
        {
            $project: {
                name: 1,
                birthday: 1,
                phone: 1,
                month: { $month: "$birthday" }
            }
        },
        {
            $match: {
                month: month || new Date().getMonth() + 1
            }
        },
        {
            $sort: { 
                month: 1,
                name: 1
            }
        }
    ]);
};

module.exports = mongoose.model('Contact', ContactSchema);
