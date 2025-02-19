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
        addButton.disabled = true;
        addButton.textContent = "Adicionando...";

        const response = await fetch("/addContact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ name, phone })
        });

        if (response.ok) {
            showNotification("Contato adicionado com sucesso!", "success");
            document.getElementById("contactName").value = "";
            document.getElementById("contactPhone").value = "";
            loadContacts();
        } else {
            const errorData = await response.json();
            showNotification(`Erro: ${errorData.error}`, "error");
        }
    } catch (error) {
        console.error("Erro ao adicionar contato:", error);
        showNotification("Erro ao adicionar contato. Tente novamente.", "error");
    } finally {
        addButton.disabled = false;
        addButton.textContent = "Adicionar";
    }
}

// Função para carregar contatos
async function loadContacts() {
    const contactsList = document.getElementById("contactsList");
    
    try {
        const response = await fetch("/getContacts", {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const contacts = await response.json();
            contactsList.innerHTML = "";

            contacts.forEach(contact => {
                const createdAt = new Date(contact.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });

                const li = document.createElement("li");
                li.className = "contact-card";
                li.innerHTML = `
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-phone">${contact.phone}</div>
                    <div class="contact-date">Adicionado em: ${createdAt}</div>
                `;
                contactsList.appendChild(li);
            });
        } else {
            showNotification("Erro ao carregar contatos.", "error");
        }
    } catch (error) {
        console.error("Erro ao carregar contatos:", error);
        showNotification("Erro ao carregar contatos. Verifique sua conexão.", "error");
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
        submitButton.disabled = true;
        submitButton.textContent = "Alterando...";

        const response = await fetch("/changePassword", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (response.ok) {
            showNotification("Senha alterada com sucesso!", "success");
            document.getElementById("changePasswordForm").style.display = "none";
            document.getElementById("currentPassword").value = "";
            document.getElementById("newPassword").value = "";
        } else {
            const errorData = await response.json();
            showNotification(`Erro: ${errorData.error}`, "error");
        }
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        showNotification("Erro ao alterar senha. Tente novamente.", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Alterar Senha";
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

// Inicialização
window.onload = () => {
    loadContacts();
    
    // Adicionar máscara para o telefone
    const phoneInput = document.getElementById("contactPhone");
    phoneInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length <= 11) {
            if (value.length > 2) {
                value = `(${value.slice(0,2)}) ${value.slice(2)}`;
            }
            if (value.length > 9) {
                value = `${value.slice(0,9)}-${value.slice(9)}`;
            }
            e.target.value = value;
        }
    });
};
