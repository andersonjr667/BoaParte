const express = require('express');
const router = express.Router();
const { adminOnly } = require('../utils/auth');
const User = require('../models/User');
const Member = require('../models/Member');
const Contact = require('../models/Contact');
const Log = require('../models/Log');

// Get admin dashboard stats
router.get('/stats', adminOnly, async (req, res) => {
    try {
        const [totalUsers, totalContacts, totalMembers] = await Promise.all([
            User.countDocuments(),
            Contact.countDocuments(),
            Member.countDocuments()
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const contactsToday = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalContacts,
                totalMembers,
                contactsToday
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching admin statistics'
        });
    }
});

// Get system logs
router.get('/logs', adminOnly, async (req, res) => {
    try {
        const logs = await Log.find()
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(logs);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching system logs'
        });
    }
});

// Get all contacts for admin
router.get('/contacts', adminOnly, async (req, res) => {
    try {
        const contacts = await Contact.find()
            .sort({ createdAt: -1 })
            .populate('owner', 'name email');

        res.json({
            success: true,
            contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts'
        });
    }
});

module.exports = router;
