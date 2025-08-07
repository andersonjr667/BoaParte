const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

// POST /api/logs - Salva um log enviado pelo frontend no MongoDB
router.post('/', async (req, res) => {
    try {
        const log = await Log.logAction(req.body);
        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar log', error: error.message });
    }
});

// GET /api/logs - Retorna os logs salvos (opcional, para debug)
router.get('/', async (req, res) => {
    try {
        const fs = require('fs-extra');
        const path = require('path');
        const logsPath = path.join(__dirname, '..', 'db', 'logs.json');
        const logs = await fs.readJson(logsPath);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao ler logs', error: error.message });
    }
});

module.exports = router;
