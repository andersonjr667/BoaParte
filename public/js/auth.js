// Função para verificar autenticação
async function checkAuthentication() {
    console.log('Verificando autenticação...');
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname;
    
    console.log('Token encontrado:', token ? 'Sim' : 'Não');
    console.log('Página atual:', currentPage);

    if (!token) {
        if (currentPage !== '/login.html') {
            console.log('Redirecionando para login por falta de token');
            window.location.href = 'login.html';
        }
        return;
    }

    const isValid = await verifyToken(token);
    
    if (!isValid && currentPage !== '/login.html') {
        console.log('Redirecionando para login por token inválido');
        window.location.href = 'login.html';
    }
}

// Function to verify the token with the server
async function verifyToken(token) {
    try {
        console.log('Verificando token...');
        const response = await fetch('/api/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.log('Resposta não ok na verificação do token');
            throw new Error('Token verification failed');
        }

        const data = await response.json();
        console.log('Resposta da verificação:', data);
        
        if (!data.valid) {
            console.log('Token inválido');
            throw new Error('Invalid token');
        }

        console.log('Token válido');
        return true;
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        localStorage.clear();
        return false;
    }
}

// Function to redirect to the login page
function redirectToLogin() {
    localStorage.clear(); // Clear all tokens and local storage items
    window.location.href = 'login.html';
}

// Call checkAuthentication on page load
window.addEventListener('load', checkAuthentication);

async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');

    try {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao fazer login');
        }

        // Ensure we have all required data
        if (!data.token || !data.username) {
            throw new Error('Resposta inválida do servidor');
        }

        // Clear any existing auth data first
        localStorage.clear();
        
        // Store new auth data
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role || 'user');
        
        // Log successful storage
        console.log('Auth data stored:', {
            token: data.token ? 'present' : 'missing',
            username: data.username,
            role: data.role || 'user'
        });

        // Redirect with a small delay to ensure storage is complete
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 100);

    } catch (error) {
        console.error('Erro no login:', error);
        showNotification(error.message || 'Falha no login. Tente novamente.', true);
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    }
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notification.className = 'notification ' + (isError ? 'error' : 'success');
    notificationMessage.textContent = message;
    notification.style.display = 'flex';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Adicione este código para criar um usuário inicial se necessário
async function createInitialUser() {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123',
                registrationCode: 'BOAPARTE2024'
            })
        });

        const data = await response.json();
        console.log('Initial user creation:', data);
    } catch (error) {
        console.error('Error creating initial user:', error);
    }
}

// Chama a função quando a página carrega
document.addEventListener('DOMContentLoaded', createInitialUser);

function isTokenValid() {
    const token = localStorage.getItem('token');
    if (!token) {
        return false;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000;
    return Date.now() < expiry;
}
