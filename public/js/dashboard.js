// ...existing code...

async function deleteContact(contactId) {
    try {
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`, // Ensure the token is included
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Unauthorized: Please log in again.');
                // Redirect to login page or handle re-authentication
                window.location.href = '/login.html';
            } else {
                throw new Error('Error deleting contact');
            }
        }

        const result = await response.json();
        console.log('Contact deleted:', result);
        // Refresh the contact list or update the UI accordingly
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting contact');
    }
}

// ...existing code...

async function loadContacts() {
    try {
        const response = await fetch('/api/contacts/');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Erro ao carregar contatos');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Erro ao carregar dados dos contatos');
        }

        // Sort contacts in reverse order (latest added at the top)
        data.contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        displayContacts(data);
        console.log('Contatos carregados:', data.contacts.length);

    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
        showNotification('❌ Erro ao carregar contatos', true);
    }
}

// Updated sendWhatsAppMessage function
async function sendWhatsAppMessage(phone, name, contactId) {
    try {
        let cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length === 11) {
            const ddd = cleanPhone.slice(0, 2);
            const remainder = cleanPhone.slice(3);
            if (cleanPhone[2] === '9') {
                cleanPhone = ddd + remainder;
            }
        }
        
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        
        // Use the imported welcomeMessage function
        const message = welcomeMessage(name);
        
        console.log('Enviando mensagem para:', name);
        console.log('Número formatado:', formattedPhone);
        console.log('Mensagem:', message);

        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                phone: formattedPhone,
                name: name,
                message: message,
                contactId: contactId
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao enviar mensagem');
        }

        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Mensagem enviada com sucesso!');
            await loadContacts(); // Reload to update status
        } else {
            throw new Error(data.message || 'Erro ao enviar mensagem');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

// ...existing code...

async function sendFollowUpMessage(phone, name, contactId) {
    try {
        let cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length === 11) {
            const ddd = cleanPhone.slice(0, 2);
            const remainder = cleanPhone.slice(3);
            if (cleanPhone[2] === '9') {
                cleanPhone = ddd + remainder;
            }
        }
        
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        
        // Use a função welcomeMessage do messages.js
        const message = welcomeMessage(name);

        console.log('Enviando mensagem para:', name);
        console.log('Número formatado:', formattedPhone);
        console.log('Mensagem:', message);

        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                phone: formattedPhone,
                name: name,
                message: message, // Usando a mensagem de boas-vindas
                contactId: contactId
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao enviar mensagem');
        }

        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Mensagem enviada com sucesso!');
            await loadContacts(); // Reload to update status
        } else {
            throw new Error(data.message || 'Erro ao enviar mensagem');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

// ...existing code...

// Function to create contact element
function createContactElement(contact) {
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-card';
    contactElement.setAttribute('data-id', contact._id); // Adiciona o ID como atributo data

    // Handle MongoDB date format
    const createdAt = new Date(contact.createdAt.$date ? contact.createdAt.$date.$numberLong : contact.createdAt);
    const formattedCreatedAt = createdAt.toLocaleDateString('pt-BR') + ' às ' + 
        createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Handle birthday (if exists)
    const birthdayDisplay = contact.birthday ? 
        `<p class="birthday-info">
            <i class="fas fa-birthday-cake"></i> 
            ${new Date(contact.birthday).toLocaleDateString('pt-BR')}
        </p>` : '';

    // Handle owner/username display
    const ownerDisplay = contact.owner || contact.username || 'Usuário';

    // Handle message status
    const messageStatus = contact.receivedMessage ? 'read' : 'unread';
    const messageIcon = contact.receivedMessage ? 'fa-check-circle' : 'fa-circle';
    const messageText = contact.receivedMessage ? 'Mensagem Lida' : 'Mensagem Não Lida';
    const messageButtonDisabled = contact.receivedMessage ? 'disabled' : '';

    contactElement.innerHTML = `
        <div class="contact-info">
            <h3>${contact.name}</h3>
            <p><i class="fas fa-phone"></i> ${contact.phone}</p>
            ${birthdayDisplay}
            <div class="contact-metadata">
                <span>
                    <i class="fas fa-user-plus"></i>
                    Adicionado por: ${ownerDisplay}
                </span>
                <span>
                    <i class="far fa-clock"></i>
                    ${formattedCreatedAt}
                </span>
            </div>
            <div class="message-status ${messageStatus}">
                <button onclick="toggleMessageStatus('${contact._id}', ${!contact.receivedMessage})" class="status-toggle">
                    <i class="fas ${messageIcon}"></i>
                    ${messageText}
                </button>
            </div>
        </div>
        <div class="button-container">
            <div class="main-button">
                <button onclick="toggleActionMenu(this)" class="action-button primary-action">
                    <i class="fas fa-ellipsis-v"></i> Ações
                </button>
            </div>
            <div class="action-menu">
                <button onclick="makeMember('${contact._id.$oid || contact._id}')" class="action-button make-member-btn">
                    <i class="fas fa-user-plus"></i> Tornar Membro
                </button>
                <button onclick="sendFollowUpMessage('${contact.phone}', '${contact.name}', '${contact._id.$oid || contact._id}')" 
                        class="action-button send-button ${messageStatus}"
                        ${messageButtonDisabled}>
                    <i class="fab fa-whatsapp"></i> Enviar Mensagem
                </button>
                ${contact.receivedMessage ? `
                <button onclick="markAsNotSent('${contact._id.$oid || contact._id}')" class="action-button mark-not-sent-btn">
                    <i class="fas fa-times-circle"></i> Marcar como Não Enviada
                </button>
                ` : ''}
                <button onclick="editContact('${contact._id.$oid || contact._id}')" class="action-button edit-button">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="deleteContact('${contact._id.$oid || contact._id}')" class="action-button delete-button">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `;
    return contactElement;
}

async function toggleMessageStatus(contactId, newStatus) {
    try {
        const response = await fetch(`/api/contacts/${contactId}/message-status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ receivedMessage: newStatus })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Erro ao atualizar status da mensagem');
        }

        showNotification(`✅ Status da mensagem ${newStatus ? 'marcado como lido' : 'marcado como não lido'}`);
        await loadContacts(); // Recarrega a lista de contatos
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

// Function to mark message as not sent (corrigido)
async function markAsNotSent(contactId) {
    try {
        const response = await fetch(`/api/contacts/${contactId}/message-status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receivedMessage: false })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Erro ao marcar mensagem como não enviada');
        }

        await loadContacts(); // Recarrega a lista de contatos
        showNotification('✅ Mensagem marcada como não enviada');
    } catch (error) {
        console.error('Erro ao marcar mensagem como não enviada:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

// Function to edit contact
async function editContact(contactId) {
    try {
        console.log('Editando contato:', contactId);
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('Status da resposta:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
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
        showNotification('❌ ' + error.message, 'error');
    }
}

// Function to update contact
async function updateContact(event) {
    event.preventDefault();
    
    const contactId = document.getElementById('edit-contact-id').value;
    const formData = {
        name: document.getElementById('edit-name').value,
        phone: document.getElementById('edit-phone').value,
        birthday: document.getElementById('edit-birthday').value
    };

    try {
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar contato');
        }

        showNotification('✅ Contato atualizado com sucesso');
        document.getElementById('edit-modal').style.display = 'none';
        await loadContacts(); // Recarrega a lista de contatos
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

// ...existing code...

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}
