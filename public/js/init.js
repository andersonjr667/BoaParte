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

    // Executa as verificações
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isRegisterPage = window.location.pathname.endsWith('register.html');
    if (!isLoginPage && !isRegisterPage) {
        window.checkAuth();
    }
    window.loadUserName();


});
