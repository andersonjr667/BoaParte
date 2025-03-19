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

// Function to load contacts and sort them in reverse order
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

// Function to send WhatsApp message using the message defined in mensages.js
async function sendWhatsAppMessage(phone, name, contactId) {
    try {
        const cleanPhone = phone.replace(/\D/g, ''); // Remove all non-numeric characters
        
        // Use the message defined in mensages.js
        const message = welcomeMessage(name);

        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
            // Reload contacts to update the status
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
    const messageStatus = contact.receivedMessage ? 'sent' : 'not-sent';
    const messageStatusText = contact.receivedMessage ? 'Mensagem já enviada' : 'Mensagem não foi mandada';
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
            <div class="message-status ${messageStatus}">${messageStatusText}</div>
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

// ...existing code...
