const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
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
        required: false // Make birthday optional
    },
    isDisciple: {
        type: Boolean,
        default: false
    },
    discipleBy: {
        type: String,
        required: false
    },
    photo: {
        type: String,
        required: false
    }
}, { timestamps: true });

const Member = mongoose.model('Member', memberSchema, 'members');

module.exports = Member;
