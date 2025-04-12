// Função para verificar autenticação
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.warn('Token ausente.');
        return false;
    }

    try {
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Token inválido ou expirado');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Falha na verificação do token');
        }

        console.log('Usuário autenticado:', data.username);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);
        return true;
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        localStorage.clear();
        return false;
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
    localStorage.clear(); // Limpa todos os itens do localStorage
    console.warn('Redirecionamento para login removido.');
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

        const response = await fetch('/api/auth/login', {
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

        if (data.success) {
            localStorage.setItem('token', data.token); // Armazenar o token no localStorage
            window.location.href = 'dashboard.html'; // Redirecionar para o dashboard
        } else {
            throw new Error(data.message || 'Erro ao fazer login');
        }

    } catch (error) {
        console.error('Erro no login:', error);
        showNotification(error.message || 'Falha no login. Tente novamente.', true);
        localStorage.clear();
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

// Auth helper functions
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No token found');
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    console.log('Logout realizado. Redirecionamento para login removido.');
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getAuthHeaders,
        logout
    };
}
