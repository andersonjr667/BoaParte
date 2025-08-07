const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Função para obter a versão da sessão atual
function getSessionVersion() {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../session_version.json'), 'utf8'));
        return data.version || 1;
    } catch {
        return 1;
    }
}

// Middleware for basic authentication
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Autenticação necessária' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Checa versão da sessão
        const currentSessionVersion = getSessionVersion();
        if (!decoded.sessionVersion || decoded.sessionVersion !== currentSessionVersion) {
            return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
        }
        req.userData = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Autenticação falhou' });
    }
};

// Middleware for admin-only routes
const adminOnly = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Autenticação necessária' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentSessionVersion = getSessionVersion();
        if (!decoded.sessionVersion || decoded.sessionVersion !== currentSessionVersion) {
            return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
        }
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
        }
        req.userData = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Autenticação falhou' });
    }
};

// Middleware factory for role-based authorization
const requireRole = (roles) => {
    return (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Autenticação necessária' });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const currentSessionVersion = getSessionVersion();
            if (!decoded.sessionVersion || decoded.sessionVersion !== currentSessionVersion) {
                return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
            }
            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Acesso negado. Permissão insuficiente.' });
            }
            req.userData = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Autenticação falhou' });
        }
    };
};

module.exports = {
    auth,
    adminOnly,
    requireRole
};