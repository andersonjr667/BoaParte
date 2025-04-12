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

async function deleteContact(contactId) {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para excluir contatos', true);
        return;
    }
    
    try {
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao excluir contato');
        }

        const result = await response.json();
        console.log('Contato excluído:', result);
        showNotification('✅ Contato excluído com sucesso!');
        await loadContacts(); // Recarregar a lista de contatos
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ Erro ao excluir contato', true);
    }
}

// Função para carregar contatos
async function loadContacts() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Token ausente. Não é possível carregar contatos.');
            return;
        }

        const response = await fetch('/api/contacts', {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn('Token inválido ou expirado.');
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('role');
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao carregar contatos');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Erro ao carregar dados dos contatos');
        }

        displayContacts(data.contacts);
        console.log('Contatos carregados:', data.contacts.length);
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
        showNotification('❌ Erro ao carregar contatos', true);
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('Token ausente ao gerar cabeçalhos de autenticação.');
        return {
            'Content-Type': 'application/json'
        };
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Função para exibir contatos
function displayContacts(contacts) {
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';

    if (!contacts || contacts.length === 0) {
        contactsList.innerHTML = '<p class="no-contacts" style="text-align: center; padding: 2rem; color: #666;">Nenhum contato encontrado.</p>';
        return;
    }

    contacts.forEach(contact => {
        const contactElement = createContactElement(contact);
        contactsList.appendChild(contactElement);
    });
}

// Função para criar contato
async function createContact(event) {
    event.preventDefault();
    
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para adicionar contatos', true);
        return;
    }
    
    try {
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value.replace(/\D/g, ''); // Remove tudo que não é número
        const birthday = document.getElementById('birthday').value;

        const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, phone, birthday })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao criar contato');
        }

        const data = await response.json();
        if (data.success) {
            showNotification('✅ Contato criado com sucesso!');
            document.getElementById('contact-form').reset();
            hideAddContactForm();
            await loadContacts(); // Recarregar a lista de contatos
        } else {
            throw new Error(data.message || 'Erro ao criar contato');
        }
    } catch (error) {
        console.error('Erro ao criar contato:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Função para criar o elemento de contato
function createContactElement(contact) {
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-card';

    const createdAt = new Date(contact.createdAt);
    const formattedDate = createdAt.toLocaleDateString('pt-BR') + ' ' + 
                         createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const birthdayDisplay = contact.birthday ? 
        `<p><i class="fas fa-birthday-cake"></i> ${new Date(contact.birthday).toLocaleDateString('pt-BR')}</p>` : '';

    // Determine message status with new class
    const messageStatus = contact.receivedMessage ? 'sent' : 'not-sent';
    const messageIcon = contact.receivedMessage ? 'fa-check-circle' : 'fa-times-circle';
    const messageText = contact.receivedMessage ? 'Mensagem Enviada' : 'Mensagem Não Enviada';

    contactElement.innerHTML = `
        <div class="contact-info">
            <h3>${contact.name}</h3>
            <p><i class="fas fa-phone"></i> ${contact.phone}</p>
            ${birthdayDisplay}
            <div class="message-status-indicator ${messageStatus}">
                <i class="fas ${messageIcon}"></i> ${messageText}
            </div>
            <div class="contact-metadata">
                <span>
                    <i class="fas fa-user"></i> ${contact.owner || 'N/A'}
                </span>
                <span>
                    <i class="fas fa-calendar"></i> ${formattedDate}
                </span>
            </div>
        </div>
        <div class="button-container">
            <button onclick="toggleActionMenu(this)" class="main-action-button">
                <i class="fas fa-ellipsis-v"></i> Ações
            </button>
            <div class="action-menu">
                <button onclick="sendWhatsAppMessage('${contact.phone}', '${contact.name}', '${contact._id}')" 
                        class="action-button send-button">
                    <i class="fab fa-whatsapp"></i> Enviar Mensagem
                </button>
                <button onclick="editContact('${contact._id}')" class="action-button edit-button">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="makeMember('${contact._id}')" class="action-button make-member-btn">
                    <i class="fas fa-user-plus"></i> Tornar Membro
                </button>
                <button onclick="deleteContact('${contact._id}')" class="action-button delete-button">
                    <i class="fas fa-trash"></i> Excluir
                </button>
                <button onclick="sendServiceReminder('${contact.phone}', '${contact.name}', '${contact._id}')" 
                        class="action-button reminder-btn">
                    <i class="fas fa-church"></i> Enviar Msg Lembrete
                </button>
                <button onclick="markAsNotSent('${contact._id}')" class="action-button not-messaged-button">
                    <i class="fas fa-times-circle"></i> Marcar como Não Enviada
                </button>
            </div>
        </div>
    `;

    return contactElement;
}

// Função para enviar mensagem via WhatsApp
async function sendWhatsAppMessage(phone, name, contactId) {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para enviar mensagens', true);
        return;
    }
    
    try {
        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ phone, name, contactId })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao enviar mensagem');
        }

        const data = await response.json();
        showNotification('✅ Mensagem enviada com sucesso!');
        await loadContacts(); // Atualiza a lista de contatos
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showNotification('❌ Erro ao enviar mensagem', true);
    }
}

// Add bulk action functions
async function sendBulkMessages() {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para enviar mensagens em massa', true);
        return;
    }
    
    if (!confirm('Deseja enviar mensagens para todos os contatos que ainda não receberam?')) {
        return;
    }

    try {
        const response = await fetch('/api/send-bulk-messages', {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao enviar mensagens em massa');
        }

        const data = await response.json();
        if (data.success) {
            showNotification('✅ Mensagens enviadas com sucesso!');
            await loadContacts();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Add markAllMessaged and markAllNotMessaged functions
async function markAllMessaged() {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para atualizar status', true);
        return;
    }
    
    if (!confirm('Deseja marcar todos os contatos como "mensagem enviada"?')) {
        return;
    }
    await updateAllMessageStatus(true);
}

async function markAllNotMessaged() {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para atualizar status', true);
        return;
    }
    
    if (!confirm('Deseja marcar todos os contatos como "mensagem não enviada"?')) {
        return;
    }
    await updateAllMessageStatus(false);
}

async function updateAllMessageStatus(status) {
    try {
        const response = await fetch('/api/contacts/update-all-status', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ receivedMessage: status })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao atualizar status');
        }

        const data = await response.json();
        showNotification('✅ ' + data.message);
        await loadContacts();
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Função para atualizar o status da mensagem
async function toggleMessageStatus(contactId, newStatus) {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para atualizar status', true);
        return;
    }
    
    try {
        const response = await fetch(`/api/contacts/${contactId}/message-status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ receivedMessage: newStatus })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao atualizar status da mensagem');
        }

        const data = await response.json();
        showNotification('✅ Status da mensagem atualizado com sucesso!');
        await loadContacts(); // Atualiza a lista de contatos
    } catch (error) {
        console.error('Erro ao atualizar status da mensagem:', error);
        showNotification('❌ Erro ao atualizar status da mensagem', true);
    }
}

// Função para controlar o menu de ações
function toggleActionMenu(button) {
    const actionMenu = button.nextElementSibling;
    const allMenus = document.querySelectorAll('.action-menu');
    
    // Fecha outros menus
    allMenus.forEach(menu => {
        if (menu !== actionMenu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    });
    
    // Calcula posição dinamicamente
    const buttonRect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Verifica espaço vertical
    if ((buttonRect.bottom + 250) > viewportHeight) {
        actionMenu.style.top = 'auto';
        actionMenu.style.bottom = '100%';
    } else {
        actionMenu.style.top = '100%';
        actionMenu.style.bottom = 'auto';
    }
    
    actionMenu.classList.toggle('show');
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    // Only close if the click is outside any button container
    if (!e.target.closest('.button-container')) {
        document.querySelectorAll('.action-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Also close menus when pressing Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.action-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Função para carregar contatos do mês
async function handleMonthFilter() {
    try {
        const monthSelect = document.getElementById('month-select');
        const selectedMonth = monthSelect.value;
        const monthResult = document.getElementById('month-result');
        
        // Oculta a mensagem se for "Todos os meses"
        if (selectedMonth === "0") {
            monthResult.style.display = 'none';
            const response = await fetch('/api/contacts/all', {
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error('Erro ao carregar contatos');
            const data = await response.json();
            if (data.success) {
                displayContacts(data.contacts);
            }
            return;
        }

        // Mostra a mensagem apenas quando um mês específico é selecionado
        const monthName = monthNames[parseInt(selectedMonth) - 1];
        monthResult.style.display = 'block';
        document.getElementById('selected-month').textContent = monthName;
        
        const response = await fetch(`/api/contacts/month/${selectedMonth}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Erro ao filtrar contatos');

        const data = await response.json();
        if (!data.success) throw new Error('Erro ao carregar dados dos contatos filtrados');

        displayContacts(data.contacts);
        showNotification(`✅ Mostrando contatos de ${monthName}`);

    } catch (error) {
        console.error('Erro ao filtrar contatos:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Atualiza o cabeçalho do mês
function updateMonthHeading(month) {
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const heading = document.querySelector('.month-result h3');
    if (heading) {
        const selectedMonth = document.getElementById('selected-month');
        if (selectedMonth) {
            selectedMonth.textContent = monthNames[month - 1];
        } else {
            heading.textContent = `Contatos de ${monthNames[month - 1]}`;
        }
    }
}

// Function to mark message as not sent
async function markAsNotSent(contactId) {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para atualizar status', true);
        return;
    }
    
    try {
        const response = await fetch(`/api/contacts/${contactId}/message-status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ receivedMessage: false })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao marcar mensagem como não enviada');
        }

        await loadContacts(); // Recarrega a lista de contatos
        showNotification('✅ Mensagem marcada como não enviada');
    } catch (error) {
        console.error('Erro ao marcar mensagem como não enviada:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Function to edit contact
async function editContact(contactId) {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para editar contatos', true);
        return;
    }
    
    try {
        console.log('Editando contato:', contactId);
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao carregar dados do contato');
        }

        const contact = await response.json();
        console.log('Dados do contato:', contact);

        if (!contact) {
            throw new Error('Contato não encontrado');
        }

        // Preenche o formulário de edição
        document.getElementById('edit-contact-id').value = contactId;
        document.getElementById('edit-name').value = contact.name || '';
        document.getElementById('edit-phone').value = contact.phone || '';
        if (contact.birthday) {
            const birthday = new Date(contact.birthday);
            document.getElementById('edit-birthday').value = birthday.toISOString().split('T')[0];
        } else {
            document.getElementById('edit-birthday').value = '';
        }

        // Mostra o modal de edição
        const modal = document.getElementById('edit-modal');
        if (!modal) {
            throw new Error('Modal de edição não encontrado');
        }
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Erro ao editar contato:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Function to update contact
async function updateContact(event) {
    event.preventDefault();
    
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para atualizar contatos', true);
        return;
    }
    
    const contactId = document.getElementById('edit-contact-id').value;
    const formData = {
        name: document.getElementById('edit-name').value,
        phone: document.getElementById('edit-phone').value,
        birthday: document.getElementById('edit-birthday').value
    };

    try {
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao atualizar contato');
        }

        showNotification('✅ Contato atualizado com sucesso');
        document.getElementById('edit-modal').style.display = 'none';
        await loadContacts(); // Recarrega a lista de contatos
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Adicione estas funções que estavam faltando
async function makeMember(contactId) {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para tornar um contato membro', true);
        return;
    }
    
    try {
        const response = await fetch(`/api/contacts/${contactId}/make-member`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao tornar membro');
        }

        showNotification('✅ Contato transformado em membro com sucesso!');
        await loadContacts();
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, true);
    }
}

async function sendServiceReminder(phone, name, contactId) {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para enviar lembretes', true);
        return;
    }
    
    try {
        const response = await fetch('/api/send-reminder', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ phone, name, contactId })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao enviar lembrete');
        }

        const data = await response.json();
        if (data.success) {
            showNotification('✅ Lembrete enviado com sucesso!');
            await loadContacts();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erro ao enviar lembrete:', error);
        showNotification('❌ ' + error.message, true);
    }
}

// Add new function to handle contact addition
async function addContact(event) {
    event.preventDefault();

    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para adicionar contatos', true);
        return;
    }

    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const birthday = document.getElementById('birthday').value;

    try {
        const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, phone, birthday })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('❌ Não autorizado. Faça login novamente.', true);
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Erro ao adicionar contato');
        }

        const data = await response.json();
        showNotification('✅ Contato adicionado com sucesso!');
        document.getElementById('contact-form').reset();
        hideAddContactForm();
        await loadContacts(); // Recarrega a lista de contatos
    } catch (error) {
        console.error('Erro ao adicionar contato:', error);
        showNotification('❌ Erro ao adicionar contato. Tente novamente.', true);
    }
}

// Função para exibir notificações no canto superior direito
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Funções para mostrar/esconder o formulário de adicionar contato
function showAddContactForm() {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ Você precisa estar autenticado para adicionar contatos', true);
        return;
    }
    
    const modal = document.getElementById('add-contact-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideAddContactForm() {
    const modal = document.getElementById('add-contact-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        const form = document.getElementById('contact-form');
        if (form) form.reset();
    }
}

// Função para formatar número de telefone
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length === 0) {
        input.value = '(';
        return;
    }
    
    if (value.length <= 2) {
        input.value = `(${value}`;
        return;
    }
    
    if (value.length <= 7) {
        input.value = `(${value.slice(0,2)}) ${value.slice(2)}`;
        return;
    }
    
    if (value.length <= 11) {
        input.value = `(${value.slice(0,2)}) ${value.slice(2,7)}-${value.slice(7)}`;
        return;
    }
    
    input.value = `(${value.slice(0,2)}) ${value.slice(2,7)}-${value.slice(7,11)}`;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('add-contact-modal');
    if (event.target === modal) {
        hideAddContactForm();
    }
}

// Função de logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const confirmed = window.confirm(message);
        resolve(confirmed);
    });
}

async function executeBulkAction() {
    const action = document.getElementById('bulk-action').value;
    if (!action) return;

    try {
        const confirmed = await showConfirmDialog('Tem certeza que deseja executar esta ação em massa?');
        if (!confirmed) return;

        showLoading();
        const response = await fetch(`/api/contacts/bulk/${action}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Falha ao executar ação');

        const data = await response.json();
        showNotification(data.message || 'Ação executada com sucesso!');
        await loadContacts(); // Recarrega a lista
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, true);
    } finally {
        hideLoading();
        document.getElementById('bulk-action').value = ''; // Reset select
    }
}

// Configurações Globais
const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Export functions that need to be accessible globally
window.handleMonthFilter = handleMonthFilter;
window.showAddContactForm = showAddContactForm;
window.hideAddContactForm = hideAddContactForm;
window.createContact = createContact;
window.editContact = editContact;
window.deleteContact = deleteContact;
window.updateMember = updateMember;
window.closeModal = closeModal;
window.sendWhatsAppMessage = sendWhatsAppMessage;
window.makeMember = makeMember;
window.markAsNotSent = markAsNotSent;
window.sendServiceReminder = sendServiceReminder;
window.executeBulkAction = executeBulkAction;
window.toggleActionMenu = toggleActionMenu;
window.formatPhoneNumber = formatPhoneNumber;
window.logout = logout;
