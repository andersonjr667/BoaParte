// Função para login
async function login(event) {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const loginButton = document.querySelector('button[type="submit"]');

    if (!username || !password) {
        errorHandling.showErrorNotification('Por favor, preencha todos os campos.');
        return;
    }

    try {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'auth/invalid-credentials');
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        window.location.href = "dashboard.html";

    } catch (error) {
        const errorCode = error.message || 'error/unknown';
        errorHandling.showErrorNotification(errorHandling.getErrorMessage(errorCode), 5000);
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = 'Entrar';
    }
}

// Função para registro
async function register(event) {
    event.preventDefault();
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const inviteCode = document.getElementById("inviteCode").value.trim();
    const registerButton = document.querySelector('#registerForm button[type="submit"]');

    // Validações
    if (!username || !password || !confirmPassword || !inviteCode) {
        errorHandling.showErrorNotification(errorHandling.getErrorMessage('auth/missing-fields'));
        return;
    }

    if (password !== confirmPassword) {
        errorHandling.showErrorNotification(errorHandling.getErrorMessage('password/mismatch'));
        return;
    }

    if (password.length < 6) {
        errorHandling.showErrorNotification(errorHandling.getErrorMessage('auth/weak-password'));
        return;
    }

    try {
        registerButton.disabled = true;
        registerButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

        const response = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, inviteCode })
        });

        const data = await response.json();

        if (!response.ok) {
            let errorCode = 'error/unknown';
            if (response.status === 409) errorCode = 'auth/username-exists';
            if (response.status === 403) errorCode = 'auth/invalid-invite';
            if (response.status === 400) errorCode = 'auth/validation';
            throw new Error(errorCode);
        }

        errorHandling.showSuccessNotification('Conta criada com sucesso! Você já pode fazer login.');
        
        // Limpar campos e mostrar formulário de login
        document.getElementById("newUsername").value = '';
        document.getElementById("newPassword").value = '';
        document.getElementById("confirmPassword").value = '';
        document.getElementById("inviteCode").value = '';
        showLoginForm();

    } catch (error) {
        const errorCode = error.message || 'error/unknown';
        errorHandling.showErrorNotification(errorHandling.getErrorMessage(errorCode), 5000);
    } finally {
        registerButton.disabled = false;
        registerButton.innerHTML = 'Registrar';
    }
}

// Função para mostrar formulário de login
function showLoginForm() {
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("registerForm").style.display = "none";
}

// Função para mostrar formulário de registro
function showRegisterForm() {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerForm").style.display = "block";
}

// Função para verificar token expirado
function checkTokenExpiration() {
    const token = localStorage.getItem("token");
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.exp * 1000 < Date.now()) {
                // Token expirado
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                window.location.href = "index.html";
            }
        } catch (error) {
            console.error("Erro ao verificar token:", error);
        }
    }
}

// Verifica o token a cada minuto
setInterval(checkTokenExpiration, 60000);

// Verifica o token quando a página carrega
document.addEventListener("DOMContentLoaded", checkTokenExpiration);

// Função para logout
async function logout() {
    try {
        const response = await fetch("/logout", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao fazer logout');
        }

        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "/";
    } catch (error) {
        console.error("Erro no logout:", error);
        // Mesmo com erro, limpa o localStorage e redireciona
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "/";
    }
}

// Função para verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem("token");
    const protectedPages = ['/dashboard.html', '/users.html'];
    const currentPath = window.location.pathname;

    if (!token && protectedPages.includes(currentPath)) {
        window.location.href = "/";
        return;
    }

    if (token) {
        try {
            const response = await fetch("/verify-auth", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Token inválido');
            }

            // Se estiver na página inicial e estiver autenticado, redireciona para o dashboard
            if (currentPath === "/" || currentPath === "/index.html") {
                window.location.href = "/dashboard.html";
            }
        } catch (error) {
            console.error("Erro na verificação de auth:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            if (protectedPages.includes(currentPath)) {
                window.location.href = "/";
            }
        }
    }
}

// Verificar autenticação quando a página carrega
document.addEventListener('DOMContentLoaded', checkAuth);

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar script de tratamento de erros
    const errorScript = document.createElement('script');
    errorScript.src = 'js/errorMessages.js';
    document.head.appendChild(errorScript);

    // Adicionar Font Awesome se ainda não estiver presente
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fontAwesome);
    }

    // Configurar event listeners
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) loginForm.addEventListener('submit', login);
    if (registerForm) registerForm.addEventListener('submit', register);
});
