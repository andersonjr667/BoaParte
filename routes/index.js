const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const membersRoutes = require('./members');
const contactsRoutes = require('./contacts');
// const adminRoutes = require('./admin');
// const statsRoutes = require('./stats');
// const whatsapp = require('../whatsapp');

// Mount routes with explicit paths
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/members', membersRoutes);
router.use('/contacts', contactsRoutes);
// router.use('/admin', adminRoutes);
// router.use('/stats', statsRoutes);
// if (whatsapp && typeof whatsapp.router === 'function') {
//     router.use('/whatsapp', whatsapp.router);
// } else if (whatsapp && whatsapp.router) {
//     router.use('/whatsapp', whatsapp.router);
// } else {
//     console.error('WhatsApp router is not defined or invalid!');
// }

module.exports = router;
