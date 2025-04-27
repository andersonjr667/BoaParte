const Contact = require('../models/Contact');
const Log = require('../models/Log');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalContacts = await Contact.countDocuments({ owner: req.user.username });
        const messagesSent = await Contact.countDocuments({ 
            owner: req.user.username,
            receivedMessage: true 
        });
        const recentContacts = await Contact.find({ owner: req.user.username })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            stats: {
                totalContacts,
                messagesSent,
                recentContacts
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

exports.getAbsentMembers = async (req, res) => {
    try {
        const members = await Contact.find({
            owner: req.user.username,
            isAbsent: true
        }).sort({ lastAttendance: 1 });

        res.json({
            success: true,
            members
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
