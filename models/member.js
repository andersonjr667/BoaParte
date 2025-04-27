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
        type: Date
    },
    isDisciple: {
        type: Boolean,
        default: false
    },
    discipleBy: {
        type: String,
        default: null
    },
    photo: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
