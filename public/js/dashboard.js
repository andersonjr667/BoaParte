// Função para adicionar um contato
async function addContact() {
    const name = document.getElementById("contactName").value.trim();
    const phone = document.getElementById("contactPhone").value.trim();
    const addButton = document.querySelector('.add-button');

    if (!name || !phone) {
        showNotification("Por favor, preencha todos os campos.", "error");
        return;
    }

    try {
        setButtonLoading(addButton, true);

        const response = await fetch("/addContact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ name, phone })
        });

        if (!response.ok) {
            throw new Error('Erro ao adicionar contato');
        }

        const result = await response.json();
        showNotification("Contato adicionado com sucesso!", "success");
        
        // Limpa os campos
        document.getElementById("contactName").value = "";
        document.getElementById("contactPhone").value = "";
        
        // Recarrega a lista de contatos
        loadContacts();
    } catch (error) {
        console.error("Erro:", error);
        showNotification("Erro ao adicionar contato. Tente novamente.", "error");
    } finally {
        setButtonLoading(addButton, false);
    }
}

// Função para carregar contatos
async function loadContacts() {
    try {
        const response = await fetch("/getContacts", {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar contatos');
        }

        const contacts = await response.json();
        const contactsList = document.getElementById("contactsList");
        contactsList.innerHTML = "";

        // Mostra apenas os 5 contatos mais recentes
        const recentContacts = contacts.slice(0, 5);

        recentContacts.forEach(contact => {
            const li = document.createElement("li");
            li.className = "contact-card";
            li.innerHTML = `
                <div class="contact-info">
                    <strong>${contact.name}</strong>
                    <span>${contact.phone}</span>
                </div>
                <div class="contact-date">
                    <small>Adicionado em: ${new Date(contact.createdAt).toLocaleDateString()}</small>
                </div>
            `;
            contactsList.appendChild(li);
        });

        if (contacts.length > 5) {
            const viewAllButton = document.createElement("li");
            viewAllButton.className = "view-all-card";
            viewAllButton.innerHTML = `
                <a href="users.html" class="view-all-link">
                    <i class="fas fa-eye"></i>
                    Ver todos os ${contacts.length} contatos
                </a>
            `;
            contactsList.appendChild(viewAllButton);
        }
    } catch (error) {
        console.error("Erro:", error);
        showNotification("Erro ao carregar contatos. Tente novamente.", "error");
    }
}

// Função para logout
async function logout() {
    try {
        const response = await fetch("/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao fazer logout');
        }

        // Limpa dados do usuário
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        
        // Redireciona para a página inicial
        window.location.href = "index.html";
    } catch (error) {
        console.error("Erro no logout:", error);
        // Mesmo com erro, limpa o localStorage e redireciona
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "index.html";
    }
}

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

// Função para verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        window.location.href = "index.html";
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
    } catch (error) {
        console.error("Erro na verificação de auth:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "index.html";
    }
}

// Inicialização
window.onload = async () => {
    await checkAuth(); // Verifica autenticação primeiro
    loadContacts(); // Só carrega os contatos se estiver autenticado
    
    // Adicionar máscara para o telefone
    const phoneInput = document.getElementById("contactPhone");
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length <= 2) {
                value = `(${value}`;
            } else if (value.length <= 6) {
                value = `(${value.slice(0,2)}) ${value.slice(2)}`;
            } else if (value.length <= 10) {
                value = `(${value.slice(0,2)}) ${value.slice(2,6)}-${value.slice(6)}`;
            } else {
                value = `(${value.slice(0,2)}) ${value.slice(2,7)}-${value.slice(7,11)}`;
            }
        }
        e.target.value = value;
    });
};

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
