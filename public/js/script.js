// Função para exibir mensagens de erro/sucesso
function showMessage(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notification && notificationMessage) {
        notification.className = `notification ${isError ? 'error' : 'success'}`;
        notificationMessage.textContent = message;
        notification.style.display = 'flex';
        
        // Esconder após 5 segundos
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    } else {
        // Fallback para alert se os elementos não existirem
        if (isError) {
            alert(`Erro: ${message}`);
        } else {
            alert(message);
        }
    }
}

// Login
async function login() {
    try {
        const username = document.getElementById("username")?.value?.trim();
        const password = document.getElementById("password")?.value?.trim();

        if (!username || !password) {
            showMessage("Preencha todos os campos.", true);
            return;
        }

        const button = document.querySelector(".login-box button");
        if (button) {
            button.disabled = true;
            button.textContent = "Entrando...";
        }

        const response = await fetch("/login", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        console.log("Resposta do servidor:", response); // Log da resposta

        if (response.ok) {
            const data = await response.json();
            // Lógica para redirecionar ou armazenar token
            localStorage.setItem('token', data.token); // Armazenar token se necessário
            window.location.href = 'admin-dashboard.html'; // Redirecionar para o dashboard
        } else {
            const error = await response.json();
            showMessage(error.message || "Erro ao fazer login.", true);
        }
    } catch (error) {
        console.error("Erro:", error);
        showMessage("Erro ao fazer login.", true);
    } finally {
        const button = document.querySelector(".login-box button");
        if (button) {
            button.disabled = false;
            button.textContent = "Entrar";
        }
    }
}

// Registro
async function register() {
    try {
        const username = document.getElementById("registerUser")?.value?.trim();
        const password = document.getElementById("registerPass")?.value?.trim();
        const registrationCode = document.getElementById("registrationCode")?.value?.trim();

        if (!username || !password || !registrationCode) {
            showMessage("Preencha todos os campos.", true);
            return;
        }

        const button = document.querySelector(".register-container button");
        if (button) {
            button.disabled = true;
            button.textContent = "Criando conta...";
        }

        console.log('Iniciando registro para usuário:', username);
        const response = await fetch("/register", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password, registrationCode })
        });

        let data;
        try {
            data = await response.json();
            console.log('Resposta do servidor:', data);
        } catch (jsonError) {
            console.error('Erro ao processar resposta do servidor:', jsonError);
            showMessage("Erro inesperado ao processar dados do servidor.", true);
            return;
        }

        if (!response.ok || !data.valid) {
            const errorMessage = data?.message || "Erro desconhecido durante o registro";
            console.error('Erro no registro:', errorMessage);
            showMessage(errorMessage, true);
            return;
        }

        showMessage(data.message || "Conta criada com sucesso!", false);
        setTimeout(() => {
            toggleForms();
        }, 1000);

    } catch (error) {
        console.error('Erro durante o processo de registro:', error);
        showMessage("Erro no registro. Tente novamente.", true);
    } finally {
        const button = document.querySelector(".register-container button");
        if (button) {
            button.disabled = false;
            button.textContent = "Criar Conta";
        }
    }
}

// Toggle entre formulários de login e registro
function toggleForms() {
    const loginContainer = document.querySelector('.login-container');
    const registerContainer = document.querySelector('.register-container');
    
    if (loginContainer.style.display === 'none') {
        loginContainer.style.display = 'block';
        registerContainer.style.display = 'none';
    } else {
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
    }
}

// Toggle visibilidade da senha
function togglePasswordVisibility(element) {
    const input = element.parentElement.querySelector('input');
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    element.classList.toggle('fa-eye');
    element.classList.toggle('fa-eye-slash');
}

// Função para validar token
async function validateToken() {
    console.log('Validando token...');
    const token = localStorage.getItem("token");
    
    if (!token) {
        console.log('Token não encontrado');
        return false;
    }

    try {
        console.log('Fazendo requisição para validar token...');
        const response = await fetch("/validate-token", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('Erro ao processar resposta do servidor:', jsonError);
            localStorage.removeItem("token");
            return false;
        }

        if (!response.ok || !data.valid) {
            console.error('Token inválido:', data?.message);
            localStorage.removeItem("token");
            return false;
        }

        console.log('Token validado com sucesso:', data);
        return true;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        localStorage.removeItem("token");
        return false;
    }
}

// Carregar contatos
async function loadContacts() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/contacts/all', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Erro ao carregar contatos');
        }

        const data = await response.json();
        
        // Se não houver contatos, mostrar estado vazio
        if (!data.contacts || data.contacts.length === 0) {
            const contactsList = document.getElementById('contacts-list');
            const emptyState = document.getElementById('empty-state');
            
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            
            if (contactsList) {
                contactsList.innerHTML = '';
                if (emptyState) {
                    contactsList.appendChild(emptyState);
                }
            }
            return;
        }

        // Mostrar os contatos
        displayContacts(data);

    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
        showNotification('❌ Erro ao carregar contatos: ' + error.message, true);
    }
}

// Atualizar a função displayContacts para ser mais robusta
function displayContacts(data) {
    const contactsList = document.getElementById('contacts-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!contactsList) {
        console.error('Elemento contacts-list não encontrado');
        return;
    }

    // Limpar lista atual
    contactsList.innerHTML = '';

    if (!data.contacts || data.contacts.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
            contactsList.appendChild(emptyState);
        }
        return;
    }

    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Ordenar contatos por data de criação (mais recentes primeiro)
    const sortedContacts = data.contacts.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    sortedContacts.forEach(contact => {
        try {
            const contactElement = createContactElement(contact);
            contactsList.appendChild(contactElement);
        } catch (error) {
            console.error('Erro ao criar elemento de contato:', error);
        }
    });
}

// Editar contato
async function editContact(contactId) {
    try {
        // Buscar dados atuais do contato
        const response = await fetch(`/contacts/${contactId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const contact = await response.json();
        
        // Preencher modal de edição
        document.getElementById('edit-name').value = contact.name;
        document.getElementById('edit-phone').value = contact.phone;
        document.getElementById('edit-id').value = contactId;
        
        // Mostrar modal
        document.getElementById('edit-modal').style.display = 'block';
        
    } catch (error) {
        showMessage('Erro ao carregar contato para edição', true);
    }
}

// Atualizar contato
async function updateContact(event) {
    event.preventDefault();
    
    const contactId = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;

    try {
        const response = await fetch(`/contacts/${contactId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, phone })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar contato');
        }

        document.getElementById('edit-modal').style.display = 'none';
        loadContacts();
        showMessage('Contato atualizado com sucesso!', false);
        
    } catch (error) {
        showMessage(error.message, true);
    }
}

// Excluir contato
async function deleteContact(contactId) {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
        const response = await fetch(`/contacts/${contactId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir contato');
        }

        loadContacts();
        showMessage('Contato excluído com sucesso!', false);
        
    } catch (error) {
        showMessage(error.message, true);
    }
}

// Função para enviar mensagem WhatsApp
async function sendWhatsAppMessage(phone, name, contactId) {
    try {
        const cleanPhone = phone.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
        
        // Determina a saudação com base na hora
        const hora = new Date().getHours();
        let saudacao;
        if (hora >= 5 && hora < 12) {
            saudacao = "Bom dia";
        } else if (hora >= 12 && hora < 18) {
            saudacao = "Boa tarde";
        } else {
            saudacao = "Boa noite";
        }

        const message = `${saudacao}, ${name}! Graça e Paz do Senhor Jesus!\n\n` +
            "Seja muito bem-vindo(a) à Igreja Batista Solidária! A Juventude da Igreja Batista Solidária (JIBS) também celebra a sua chegada e se alegra em recebê-lo(a). " +
            "É uma honra tê-lo(a) conosco e agradecemos por compartilhar seu contato.\n\n" +
            "Que este momento seja especial em sua vida e que você se sinta acolhido(a) e abençoado(a) por Deus. " +
            "Estamos aqui para caminhar ao seu lado e auxiliar no que for preciso.\n\n" +
            "Que o Senhor renove sua paz, sua alegria e sua esperança hoje e sempre!\n\n" +
            "Com carinho,\nJuventude da Igreja Batista Solidária (JIBS) e Igreja Batista Solidária";
        
        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                phone: cleanPhone,
                message: message,
                contactId: contactId
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Mensagem enviada com sucesso!');
            // Recarrega a lista de contatos para atualizar o status
            await loadContacts();
        } else if (data.message === 'Mensagem já enviada') {
            showNotification('⚠️ Mensagem já foi enviada anteriormente. Não é recomendado reenviar.', true);
        } else {
            showNotification('❌ ' + (data.message || 'Erro ao enviar mensagem'), true);
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ Erro ao enviar mensagem', true);
    }
}

// Event Listeners e Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            register();
        });
    }

    // Toggle form links
    const registerLink = document.getElementById('register-link');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleForms();
        });
    }

    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleForms();
        });
    }

    // Password visibility toggles
    const passwordToggles = document.querySelectorAll('.toggle-password');
    if (passwordToggles) {
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', () => togglePasswordVisibility(toggle));
        });
    }

    // Close notification button
    const closeNotificationButton = document.getElementById('close-notification');
    if (closeNotificationButton) {
        closeNotificationButton.addEventListener('click', () => {
            document.getElementById('notification').style.display = 'none';
        });
    }

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        validateToken().then(isValid => {
            if (isValid) {
                window.location.href = 'dashboard.html';
            }
        }).catch(error => {
            console.error('Erro ao validar token:', error);
            localStorage.removeItem("token");
        });
    }

    // Carregar contatos
    const monthFilter = document.getElementById('month-filter');
    if (monthFilter) {
        monthFilter.addEventListener('change', loadContacts);
    }

    // Editar contato
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', updateContact);
    }

    // Remova qualquer chamada automática para abrir o modal
    // Exemplo: document.getElementById('myModal').style.display = 'block';

    // Adicione um evento de clique para abrir o modal
    document.getElementById('openModalButton').addEventListener('click', function() {
        document.getElementById('myModal').style.display = 'block';
    });

    // Adicione um evento de clique para fechar o modal
    document.getElementById('closeModalButton').addEventListener('click', function() {
        document.getElementById('myModal').style.display = 'none';
    });
});

// Função para adicionar usuário
async function addUser() {
    try {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const code = document.getElementById('register-code').value;

        if (!username || !password || !code) {
            showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }

        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, code })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao registrar usuário');
        }

        // Limpar os campos do formulário
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-code').value = '';

        showNotification('Usuário registrado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        showNotification(error.message, 'error');
    }
}

// Função para deletar usuário
async function adminDeleteUser(username) {
    try {
        // Confirmação antes de deletar
        if (!confirm(`Tem certeza que deseja deletar o usuário ${username}?`)) {
            return;
        }

        const response = await fetch(`/admin/users/${username}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao deletar usuário');
        }

        showNotification('Usuário deletado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        showNotification(error.message, 'error');
    }
}