// Função para adicionar loading state aos botões
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// Função para login
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const submitButton = event.target.querySelector('button[type="submit"]');

    if (!username || !password) {
        showNotification("Por favor, preencha todos os campos.", "error");
        return;
    }

    try {
        setButtonLoading(submitButton, true);

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("username", username);
        
        showNotification("Login realizado com sucesso!", "success");
        
        // Redireciona após um breve delay para mostrar a mensagem de sucesso
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 500);
    } catch (error) {
        console.error("Erro:", error);
        showNotification(error.message || "Erro ao fazer login. Tente novamente.", "error");
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// Função para registro
async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const inviteCode = document.getElementById("inviteCode").value.trim();
    const submitButton = event.target.querySelector('button[type="submit"]');

    if (!username || !password || !confirmPassword || !inviteCode) {
        showNotification("Por favor, preencha todos os campos.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showNotification("As senhas não coincidem.", "error");
        return;
    }

    if (password.length < 6) {
        showNotification("A senha deve ter pelo menos 6 caracteres.", "error");
        return;
    }

    try {
        setButtonLoading(submitButton, true);

        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password, inviteCode })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao registrar');
        }

        showNotification("Registro realizado com sucesso! Faça login para continuar.", "success");
        
        // Limpa os campos
        document.getElementById("newUsername").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        document.getElementById("inviteCode").value = "";
        
        // Volta para o formulário de login
        setTimeout(() => {
            showLoginForm();
        }, 1000);
    } catch (error) {
        console.error("Erro:", error);
        showNotification(error.message || "Erro ao registrar. Tente novamente.", "error");
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// Função para mostrar formulário de login
function showLoginForm() {
    document.getElementById("registerForm").style.display = "none";
    document.getElementById("loginForm").style.display = "block";
    
    // Limpa os campos do registro
    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    document.getElementById("inviteCode").value = "";
}

// Função para mostrar formulário de registro
function showRegisterForm() {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerForm").style.display = "block";
    
    // Limpa os campos do login
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}

// Função para verificar token expirado
async function checkTokenExpiration() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch("/verify-auth", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Erro ao verificar token:", error);
    }
}

// Função para mostrar notificações
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Adiciona a classe show após um pequeno delay para ativar a animação
    setTimeout(() => {
        notification.classList.add("show");
    }, 10);

    // Remove a notificação após 3 segundos
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Verifica o token a cada minuto
setInterval(checkTokenExpiration, 60000);

// Verifica o token quando a página carrega
document.addEventListener('DOMContentLoaded', checkTokenExpiration);

// Função para logout
async function logout() {
    try {
        // Limpa dados do usuário
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        
        // Redireciona para a página inicial
        window.location.href = "/index.html";
        
        // Faz a requisição de logout após redirecionar
        await fetch("/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include'
        });
    } catch (error) {
        console.error("Erro no logout:", error);
    }
}

// Função para redefinir senha
async function resetPassword() {
    const email = document.getElementById('email').value;
    const resetButton = document.getElementById('resetButton');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    if (!email) {
        errorMessage.textContent = 'Por favor, insira seu email.';
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        return;
    }

    try {
        resetButton.disabled = true;
        resetButton.innerHTML = '<span class="spinner"></span> Enviando...';
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');

        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            successMessage.textContent = 'Email de redefinição de senha enviado com sucesso!';
            successMessage.classList.remove('hidden');
            document.getElementById('email').value = '';
        } else {
            throw new Error(data.message || 'Erro ao enviar email de redefinição');
        }
    } catch (error) {
        errorMessage.textContent = error.message || 'Erro ao processar sua solicitação';
        errorMessage.classList.remove('hidden');
    } finally {
        resetButton.disabled = false;
        resetButton.textContent = 'Redefinir Senha';
    }
}

// Verifica autenticação
async function checkAuth() {
    const token = localStorage.getItem("token");
    const protectedPages = ['/dashboard.html', '/users.html'];
    const currentPath = window.location.pathname;

    if (!token && protectedPages.includes(currentPath)) {
        window.location.href = "index.html";
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
                window.location.href = "dashboard.html";
            }
        } catch (error) {
            console.error("Erro na verificação de auth:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            if (protectedPages.includes(currentPath)) {
                window.location.href = "index.html";
            }
        }
    }
}

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
