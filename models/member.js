const mongoose = require('mongoose');

// Adicionar opção de collection
const MemberSchema = new mongoose.Schema({
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
    birthday: {
        type: Date,
        validate: {
            validator: function(date) {
                return !date || date <= new Date();
            },
            message: 'Data de nascimento não pode ser futura'
        }
    },
    isDisciple: {
        type: Boolean,
        default: false
    },
    discipleBy: {
        type: String,
        required: function() {
            return this.isDisciple;
        }
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    status: {
        type: String,
        enum: ['ativo', 'inativo', 'visitante'],
        default: 'ativo'
    },
    attendance: {
        lastAttendance: Date,
        history: [{
            date: {
                type: Date,
                required: true
            },
            present: {
                type: Boolean,
                default: true
            },
            recordedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        }],
        consecutiveAbsences: {
            type: Number,
            default: 0
        }
    },
    notificationPreferences: {
        whatsapp: {
            type: Boolean,
            default: true
        },
        email: {
            type: Boolean,
            default: false
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
}, {
    timestamps: true,
    collection: 'members' // Força o nome da collection
});

// Define indexes only once
MemberSchema.index({ name: 1 });
MemberSchema.index({ phone: 1 }, { unique: true });
MemberSchema.index({ 'attendance.lastAttendance': 1 });
MemberSchema.index({ birthday: 1 });

// Middleware para limpar número de telefone
MemberSchema.pre('save', function(next) {
    if (this.phone) {
        this.phone = this.phone.replace(/\D/g, '').slice(-11);
    }
    next();
});

// Virtual para idade
MemberSchema.virtual('age').get(function() {
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

// Método para registrar presença
MemberSchema.methods.recordAttendance = async function(date, present, recordedBy) {
    let attendanceDate = date || new Date();
    // Se for string no formato YYYY-MM-DD, parse como data local
    if (typeof attendanceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
        const [year, month, day] = attendanceDate.split('-').map(Number);
        attendanceDate = new Date(year, month - 1, day); // Local time midnight
    }

    // Se for falta (present == false), salva para o dia seguinte (corrigido para garantir data local)
    if (!present) {
        let year = attendanceDate.getFullYear();
        let month = attendanceDate.getMonth();
        let day = attendanceDate.getDate() + 1;
        attendanceDate = new Date(year, month, day); // sempre local
    }

    const attendance = {
        date: attendanceDate,
        present,
        recordedBy
    };

    this.attendance.history.push(attendance);
    if (present) {
        this.attendance.lastAttendance = attendance.date;
        this.attendance.consecutiveAbsences = 0;
    } else {
        this.attendance.consecutiveAbsences++;
    }

    await this.save();
};

// Método estático para buscar aniversariantes do mês
MemberSchema.statics.findBirthdaysInMonth = function(month) {
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

// Método estático para buscar membros ausentes
MemberSchema.statics.findAbsentMembers = async function(daysThreshold = 14) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    // Busca membros com lastAttendance menor que o cutoff OU nulo (nunca vieram)
    return this.find({
        $or: [
            { 'attendance.lastAttendance': { $lt: cutoffDate } },
            { 'attendance.lastAttendance': { $exists: false } },
            { 'attendance.lastAttendance': null }
        ],
        status: 'ativo'
    }).select('name phone attendance notificationPreferences');
};

module.exports = mongoose.model('Member', MemberSchema);
