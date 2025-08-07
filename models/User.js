const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Adicionar opção de collection
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Nome de usuário é obrigatório'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    password: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        select: false,
        minlength: [6, 'A senha deve ter no mínimo 6 caracteres']
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    active: {
        type: Boolean,
        default: true
    },
    lastLogin: Date
}, {
    timestamps: true,
    collection: 'users' // Força o nome da collection
});

// Define indexes separately
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Verify password
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Increment login attempts and lock account if needed
UserSchema.methods.incLoginAttempts = async function() {
    // If account was locked and lock has expired, reset attempts and lock
    if (this.lockUntil && this.lockUntil < Date.now()) {
        this.loginAttempts = 1;
        this.lockUntil = undefined;
    } else {
        this.loginAttempts += 1;
        // Lock account after 5 attempts
        if (this.loginAttempts >= 5) {
            // Lock for 30 minutes
            this.lockUntil = Date.now() + 30 * 60 * 1000;
        }
    }
    await this.save();
};

// Reset login attempts
UserSchema.methods.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    await this.save();
};

// Generate password reset token
UserSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
