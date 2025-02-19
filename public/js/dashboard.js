// Variáveis globais
let contacts = [];
let isLoading = false;

// Função para formatar número de telefone
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
}

// Função para formatar data
function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Função para carregar contatos
async function loadContacts() {
    if (isLoading) return;
    
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const contactsList = document.getElementById('contacts-list');
    const loadButton = document.getElementById('load-contacts');
    
    try {
        isLoading = true;
        loadButton.disabled = true;
        loadButton.innerHTML = '<span class="spinner"></span> Carregando...';
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');

        const response = await fetch('/getContacts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar contatos');
        }

        contacts = await response.json();
        displayContacts(contacts);
        
        // Atualiza contagem de contatos
        updateContactCount();

    } catch (error) {
        console.error('Erro:', error);
        errorMessage.textContent = 'Erro ao carregar contatos. Por favor, tente novamente.';
        errorMessage.classList.remove('hidden');
        contactsList.innerHTML = '';
    } finally {
        isLoading = false;
        loadButton.disabled = false;
        loadButton.textContent = 'Atualizar Contatos';
        loadingIndicator.classList.add('hidden');
    }
}

// Função para exibir contatos
function displayContacts(contactsToShow) {
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';

    if (contactsToShow.length === 0) {
        contactsList.innerHTML = '<p class="empty-message">Nenhum contato encontrado.</p>';
        return;
    }

    contactsToShow.forEach(contact => {
        const li = document.createElement('li');
        li.className = 'contact-card';
        
        li.innerHTML = `
            <div class="contact-info">
                <span class="contact-name">${contact.name}</span>
                <span class="contact-phone">${formatPhoneNumber(contact.phone)}</span>
                <span class="contact-date">Adicionado em ${formatDate(contact.createdAt)}</span>
            </div>
        `;

        contactsList.appendChild(li);
    });
}

// Função para atualizar contagem de contatos
function updateContactCount() {
    const countElement = document.getElementById('contact-count');
    if (countElement) {
        countElement.textContent = contacts.length;
    }
}

// Função para adicionar contato
async function addContact(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    try {
        // Desabilita o botão e mostra loading
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner"></span> Salvando...';
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');

        const formData = new FormData(form);
        const contactData = {
            name: formData.get('name'),
            phone: formData.get('phone')
        };

        const response = await fetch('/addContact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(contactData)
        });

        if (!response.ok) {
            throw new Error('Erro ao adicionar contato');
        }

        // Limpa o formulário
        form.reset();
        
        // Mostra mensagem de sucesso
        successMessage.textContent = 'Contato adicionado com sucesso!';
        successMessage.classList.remove('hidden');
        
        // Recarrega a lista de contatos
        await loadContacts();

    } catch (error) {
        console.error('Erro:', error);
        errorMessage.textContent = 'Erro ao adicionar contato. Por favor, tente novamente.';
        errorMessage.classList.remove('hidden');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Adicionar Contato';
    }
}

// Função para pesquisar contatos
function searchContacts(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (!searchTerm) {
        displayContacts(contacts);
        return;
    }

    const filteredContacts = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm) ||
        contact.phone.includes(searchTerm)
    );

    displayContacts(filteredContacts);
}

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

// Função para verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("/verify-auth", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token inválido');
        }

        // Atualiza o nome do usuário na interface
        const username = localStorage.getItem("username");
        const userElement = document.getElementById("username");
        if (userElement && username) {
            userElement.textContent = username;
        }

    } catch (error) {
        console.error("Erro na verificação de auth:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "/index.html";
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    
    // Adiciona listeners
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', addContact);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', searchContacts);
    }

    // Carrega contatos iniciais
    loadContacts();
});

// Função para adicionar loading state aos botões
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Função para mostrar notificações
function showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add("show");
    }, 100);

    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Função para mostrar o formulário de redefinição de senha
function showChangePasswordForm() {
    const form = document.getElementById("changePasswordForm");
    if (form.style.display === "none") {
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }
}

// Função para alterar a senha
async function changePassword() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const submitButton = document.querySelector('#changePasswordForm button');

    if (!currentPassword || !newPassword) {
        showNotification("Por favor, preencha todos os campos.", "error");
        return;
    }

    try {
        setButtonLoading(submitButton, true);

        const response = await fetch("/changePassword", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            throw new Error('Erro ao alterar senha');
        }

        const result = await response.json();
        showNotification("Senha alterada com sucesso!", "success");
        
        // Limpa os campos
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        
        // Fecha o formulário
        document.getElementById("changePasswordForm").style.display = "none";
    } catch (error) {
        console.error("Erro:", error);
        showNotification("Erro ao alterar senha. Tente novamente.", "error");
    } finally {
        setButtonLoading(submitButton, false);
    }
}
