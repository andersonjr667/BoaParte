document.addEventListener('DOMContentLoaded', function() {
    const statusMessage = document.querySelector('.status-message');
    const errorMessage = document.getElementById('errorMessage');



    // Função global para obter headers de autenticação
    window.getAuthHeaders = function() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };
    };

    // Função global para verificar autenticação e atualizar usuário
    window.checkAuth = async function() {
        const token = localStorage.getItem('token');
        if (!token) {
            if (
                window.location.pathname.endsWith('index.html') ||
                window.location.pathname === '/' ||
                window.location.pathname.endsWith('/')
            ) {
                // Não faz nada, está na tela de loading
            } else {
                window.location.href = '/pages/login.html';
            }
            return false;
        }
        try {
            const res = await fetch('/api/auth/verify', {
                headers: window.getAuthHeaders()
            });
            if (!res.ok) throw new Error('Token inválido');
            const data = await res.json();
            // Atualiza nome do usuário e role no localStorage
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                document.body.setAttribute('data-role', data.user.role);
            }
            // Atualiza nome na UI se existir
            const userNameElement = document.getElementById('userName');
            if (userNameElement && data.user && data.user.username) {
                userNameElement.textContent = data.user.username;
            }
            return true;
        } catch (err) {
            localStorage.clear();
            if (
                window.location.pathname.endsWith('index.html') ||
                window.location.pathname === '/' ||
                window.location.pathname.endsWith('/')
            ) {
                if (statusMessage) statusMessage.textContent = 'Sessão expirada. Redirecionando para login...';
                setTimeout(() => window.location.href = '/pages/login.html', 1200);
            } else {
                window.location.href = '/pages/login.html';
            }
            return false;
        }
    };

    // Função para carregar nome do usuário na UI
    window.loadUserName = function() {
        const userNameElement = document.getElementById('userName');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (userNameElement && user && user.username) {
            userNameElement.textContent = user.username;
        }
    };

    // Add logging utility
    window.logAction = async function(action, description, level = 'info') {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const logEntry = {
                action,
                description,
                level,
                user: user.username || 'anonymous',
                page: window.location.pathname,
                userAgent: navigator.userAgent
            };

            const response = await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logEntry)
            });

            if (!response.ok) throw new Error('Failed to save log');
            
            return await response.json();
        } catch (error) {
            console.error('Error logging action:', error);
        }
    };

    // Add event logging for page load
    document.addEventListener('DOMContentLoaded', () => {
        const pageName = window.location.pathname.split('/').pop() || 'index';
        window.logAction('page_load', `Page ${pageName} loaded`);
    });


        // Executa as verificações apenas em páginas protegidas
        const publicPages = [
            'login.html',
            'register.html',
            'access-denied.html',
            'index.html',
            '', // root
        ];
        const currentPage = window.location.pathname.split('/').pop();
        if (!publicPages.includes(currentPage)) {
                window.checkAuth();
        }
        window.loadUserName();

    // Esconde links de admin para usuários comuns
    // IDs de admin válidos (adicione todos os _id de admin do users.json)
    const ADMIN_IDS = [
        '67b25735991707f4588cf3b2' // Anderson
        // Adicione outros IDs de admin aqui se necessário
    ];
    document.addEventListener('DOMContentLoaded', function() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const isAdmin = user && (user.role === 'admin' || ADMIN_IDS.includes(user._id));
        if (!isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    });


});
