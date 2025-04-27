// Verificar token antes de qualquer coisa
(function checkToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Token não encontrado. Redirecionando para login.');
        // Redirecionar para login.html com parâmetro de não autorizado
        window.location.href = 'login.html?unauthorized=true';
        return;
    }
})();

// Inicialização do dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar se o token existe
        const token = localStorage.getItem('token');
        
        // Obter elementos principais
        const dashboardContainer = document.querySelector('.dashboard-container');
        const contactsList = document.getElementById('contacts-list');
        const visitorContainer = document.querySelector('.visitor-container');
        const filterContainer = document.querySelector('.filter-container');
        const monthResult = document.getElementById('month-result');
        const addContactButton = document.querySelector('.add-contact-button');
        const dashboardButtons = document.querySelectorAll('.dashboard-btn');
        const userInfo = document.querySelector('.user-info');
        
        // Se não houver token, redirecionar para login
        if (!token) {
            console.log('Token não encontrado. Redirecionando para login.');
            window.location.href = 'login.html';
            return;
        }
        
        // Verificar se o token é válido
        const isAuthenticated = await verifyToken(token);
        
        if (!isAuthenticated) {
            console.log('Token inválido. Exibindo mensagem de acesso negado.');
            
            // Mostrar mensagem de erro
            const authMessage = document.createElement('div');
            authMessage.className = 'auth-message';
            authMessage.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #ffebee; border-radius: 8px; margin: 2rem auto; max-width: 600px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #d32f2f; margin-bottom: 1rem;"></i>
                    <h2 style="color: #d32f2f; margin-bottom: 1rem;">Sessão Expirada</h2>
                    <p style="margin-bottom: 1.5rem; font-size: 1.1rem;">Sua sessão expirou ou é inválida. Por favor, faça login novamente.</p>
                    <a href="login.html" style="display: inline-block; background: #2e7d32; color: white; padding: 0.8rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 500; transition: all 0.3s ease;">
                        <i class="fas fa-sign-in-alt"></i> Ir para Login
                    </a>
                </div>
            `;
            
            // Esconder elementos
            if (contactsList) contactsList.style.display = 'none';
            if (visitorContainer) visitorContainer.style.display = 'none';
            if (filterContainer) filterContainer.style.display = 'none';
            if (monthResult) monthResult.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
            
            // Esconder todos os botões do dashboard
            dashboardButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            
            // Adicionar mensagem ao container
            dashboardContainer.appendChild(authMessage);
            
            // Limpar localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            
            return; // Parar execução
        }
        
        // Se autenticado, continuar com a inicialização normal
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        
        // Exibir nome do usuário
        if (username) {
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.innerHTML = `<i class="fas fa-user"></i> ${username}`;
            }
        }
        
        // Exibir botões de administrador, se aplicável
        if (role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(btn => btn.style.display = 'block');
        }
        
        // Exibir botão específico para "Anderson"
        if (username === 'Anderson') {
            const andersonButton = document.querySelector('.anderson-only');
            if (andersonButton) andersonButton.style.display = 'block';
        }
        
        // Carregar contatos
        await loadContacts();
        
        // Configurar mês atual no filtro
        const currentMonth = new Date().getMonth() + 1;
        const monthSelect = document.getElementById('month-select');
        if (monthSelect) {
            monthSelect.value = currentMonth;
            await handleMonthFilter();
        }
        
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
        showNotification('❌ Erro ao carregar o dashboard', true);
    }
});

// Funções de autenticação e headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Carregar contatos
async function loadContacts(month = 0) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/contacts', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load contacts');
        }

        displayContacts(data.contacts, month);
    } catch (error) {
        console.error('Error loading contacts:', error);
        showNotification('Erro ao carregar contatos: ' + error.message, true);
    }
}

function displayContacts(contacts, month) {
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';

    if (!contacts || contacts.length === 0) {
        contactsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Nenhum contato encontrado</p>
            </div>`;
        return;
    }

    // Filter contacts by month if specified
    const filteredContacts = month > 0 ? contacts.filter(contact => {
        const contactDate = new Date(contact.createdAt);
        return contactDate.getMonth() + 1 === parseInt(month);
    }) : contacts;

    filteredContacts.forEach(contact => {
        const card = createContactCard(contact);
        contactsList.appendChild(card);
    });
}

function createContactCard(contact) {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
        <div class="contact-info">
            <h3>${contact.name}</h3>
            <p><i class="fas fa-phone"></i> ${contact.phone}</p>
            ${contact.birthday ? `<p><i class="fas fa-birthday-cake"></i> ${new Date(contact.birthday).toLocaleDateString()}</p>` : ''}
            <div class="contact-metadata">
                <span><i class="fas fa-calendar"></i> Adicionado em: ${new Date(contact.createdAt).toLocaleDateString()}</span>
                <span class="message-status ${contact.receivedMessage ? 'status-sent' : 'status-pending'}">
                    <i class="fas ${contact.receivedMessage ? 'fa-check-circle' : 'fa-clock'}"></i>
                    ${contact.receivedMessage ? 'Mensagem Enviada' : 'Mensagem Pendente'}
                </span>
            </div>
        </div>
        <div class="button-container">
            <button class="main-action-button" onclick="toggleActions(this)">
                <i class="fas fa-ellipsis-v"></i> Ações
            </button>
            <div class="action-menu">
                <button class="action-button send-button" onclick="sendMessage('${contact._id}')">
                    <i class="fas fa-paper-plane"></i> Enviar Mensagem
                </button>
                <button class="action-button reminder-btn" onclick="sendReminder('${contact._id}')">
                    <i class="fas fa-bell"></i> Enviar Lembrete
                </button>
                <button class="action-button edit-button" onclick="editContact('${contact._id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-button delete-button" onclick="deleteContact('${contact._id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `;
    return card;
}

function toggleActions(button) {
    // Close all other open menus first
    const allMenus = document.querySelectorAll('.action-menu.show');
    allMenus.forEach(menu => {
        if (menu !== button.nextElementSibling) {
            menu.classList.remove('show');
        }
    });

    const menu = button.nextElementSibling;
    menu.classList.toggle('show');
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.button-container')) {
        document.querySelectorAll('.action-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Action functions
async function sendMessage(contactId) {
    try {
        showNotification('Enviando mensagem...', false);
        const response = await fetch(`/api/contacts/${contactId}/send-welcome`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao enviar mensagem');
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Mensagem enviada com sucesso!');
            await loadContacts(); // Recarrega os contatos
        } else {
            throw new Error(data.message || 'Erro ao enviar mensagem');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ ' + error.message, true);
    }
}

async function editContact(contactId) {
    try {
        const response = await fetch(`/api/contacts/${contactId}`);
        if (!response.ok) throw new Error('Erro ao carregar contato');
        
        const contact = await response.json();
        
        // Preenche o formulário de edição
        document.getElementById('edit-member-id').value = contactId;
        document.getElementById('edit-name').value = contact.name;
        document.getElementById('edit-phone').value = contact.phone;
        if (contact.birthday) {
            document.getElementById('edit-birthday').value = contact.birthday.split('T')[0];
        }
        
        // Mostra o modal
        document.getElementById('edit-member-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Erro ao carregar dados do contato', true);
    }
}

async function makeMember(contactId) {
    try {
        const response = await fetch(`/api/contacts/${contactId}/make-member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao tornar membro');
        
        await loadContacts();
        showNotification('✅ Contato transformado em membro com sucesso!');
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Erro ao tornar membro: ' + error.message, true);
    }
}

async function deleteContact(contactId) {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;
    
    try {
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao excluir contato');
        
        await loadContacts();
        showNotification('✅ Contato excluído com sucesso!');
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Erro ao excluir contato: ' + error.message, true);
    }
}

async function sendReminder(contactId) {
    try {
        const response = await fetch(`/api/contacts/${contactId}/send-reminder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao enviar lembrete');
        }

        const result = await response.json();
        if (result.success) {
            showNotification('✅ Lembrete enviado com sucesso!');
            await loadContacts(); // Recarrega a lista para atualizar status
        } else {
            throw new Error(result.message || 'Erro ao enviar lembrete');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ ' + error.message, true);
    }
}

async function markAsNotSent(contactId) {
    try {
        const response = await fetch(`/api/contacts/${contactId}/mark-not-sent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao marcar como não enviada');
        }

        const data = await response.json();
        await loadContacts();
        showNotification('✅ Mensagem marcada como não enviada');
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Erro ao marcar como não enviada: ' + error.message, true);
    }
}

async function executeBulkAction() {
    const action = document.getElementById('bulk-action').value;
    if (!action) {
        showNotification('❌ Selecione uma ação', true);
        return;
    }

    try {
        showNotification('Executando ação...', false);
        
        const endpoint = {
            'send-all-pending': '/api/contacts/bulk/send-pending',
            'send-all-reminders': '/api/contacts/bulk/send-reminders',
            'mark-all-sent': '/api/contacts/bulk/mark-all-sent',
            'mark-all-not-sent': '/api/contacts/bulk/mark-all-not-sent'
        }[action];

        if (!endpoint) {
            throw new Error('Ação inválida');
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao executar ação');

        const data = await response.json();
        showNotification('✅ ' + data.message);
        await loadContacts(); // Recarrega a lista
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Mostrar/ocultar ações em massa para admin
document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role');
    const bulkActions = document.querySelector('.bulk-actions');
    if (role === 'admin' && bulkActions) {
        bulkActions.style.display = 'block';
    }
});
