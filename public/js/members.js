// Garante que window.getAuthHeaders existe
if (typeof window.getAuthHeaders !== 'function') {
    window.getAuthHeaders = () => ({});
}

let members = [];
let currentMemberId = null;

// DOM Elements
const membersGrid = document.querySelector('.members-grid');
const modal = document.getElementById('memberModal');
const modalTitle = document.getElementById('modalTitle');
const memberForm = document.getElementById('memberForm');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const attendanceFilter = document.getElementById('attendanceFilter');
const memberDetailsCard = document.getElementById('memberDetailsCard');
const closeDetailsBtn = document.querySelector('.close-details');

// Load members
async function loadMembers() {
    try {
        const response = await fetch('/api/members', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('Erro ao carregar membros');
        members = await response.json();
        // Ordena membros por nome (alfabético, ignorando acentuação)
        members.sort((a, b) => {
            return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        });
        filterAndRenderMembers();
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar membros', 'error');
    }
}

// Record attendance for a member
async function recordAttendance(memberId, present) {
    try {
        const response = await fetch(`/api/members/${memberId}/attendance`, {
            method: 'POST',
            headers: window.getAuthHeaders(),
            body: JSON.stringify({
                date: new Date(),
                present
            })
        });

        if (!response.ok) throw new Error('Falha ao registrar presença');
        
        const updatedMember = await response.json();
        const memberIndex = members.findIndex(m => m._id === memberId);
        if (memberIndex !== -1) {
            members[memberIndex] = updatedMember;
            renderMembers(members);
        }

        showToast(present ? 'Presença registrada com sucesso' : 'Ausência registrada com sucesso');
        await window.logAction('record_attendance', 
            `Presença registrada para membro ID ${memberId}: ${present ? 'Presente' : 'Ausente'}`);
    } catch (error) {
        console.error('Erro ao registrar presença:', error);
        showToast('Erro ao registrar presença', 'error');
        await window.logAction('error', `Erro ao registrar presença: ${error.message}`, 'error');
    }
}

// Get attendance statistics for a member
async function getAttendanceStats(memberId) {
    try {
        const response = await fetch(`/api/members/${memberId}/attendance`, { headers: window.getAuthHeaders() });
        if (!response.ok) throw new Error('Falha ao carregar estatísticas');
        
        const stats = await response.json();
        return stats;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        return null;
    }
}

// Export members to CSV
function exportMembersToCSV() {
    if (!members || members.length === 0) {
        showToast('Nenhum membro para exportar', 'error');
        return;
    }
    const headers = ['Nome', 'Telefone', 'Email', 'Status', 'Discipulador', 'Data de Nascimento', 'Endereço', 'Data de Cadastro'];
    const rows = members.map(m => [
        m.name || '',
        formatPhone(m.phone) || '',
        m.email || '',
        m.status || '',
        m.discipleBy || '',
        m.birthDate ? new Date(m.birthDate).toLocaleDateString() : '',
        typeof m.address === 'object' && m.address !== null ? Object.values(m.address).filter(Boolean).join(', ') : (m.address || ''),
        m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''
    ]);
    let csv = headers.join(';') + '\n';
    rows.forEach(r => {
        csv += r.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(';') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'membros.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Render members grid (corrigido: mais campos, address, discipulador, data de cadastro)
function renderMembers(membersToRender) {
    if (!membersGrid) return;
    
    if (!membersToRender || membersToRender.length === 0) {
        membersGrid.innerHTML = '<p>Nenhum membro encontrado.</p>';
        return;
    }

    membersGrid.innerHTML = membersToRender.map(member => {
        const address = typeof member.address === 'object' && member.address !== null
            ? Object.values(member.address).filter(Boolean).join(', ')
            : (member.address || '');
        return `
        <div class="member-card" data-member-id="${member._id}" data-status="${member.status || 'ativo'}">
            <div class="member-header">
                <h3 class="member-name">${member.name || ''}</h3>
                <span class="member-status ${member.status || 'ativo'}">${member.status || 'ativo'}</span>
            </div>
            <div class="member-info">
                <p><i class="fas fa-phone"></i> ${formatPhone(member.phone) || 'Não informado'}</p>
                ${member.email ? `<p><i class='fas fa-envelope'></i> ${member.email}</p>` : ''}
                ${address ? `<p><i class='fas fa-map-marker-alt'></i> ${address}</p>` : ''}
                ${member.birthDate ? `<p><i class='fas fa-birthday-cake'></i> ${new Date(member.birthDate).toLocaleDateString()}</p>` : ''}
                ${member.discipleBy ? `<p><i class='fas fa-user-graduate'></i> Discipulador: ${member.discipleBy}</p>` : ''}
                ${member.createdAt ? `<p><i class='fas fa-calendar-plus'></i> Cadastro: ${new Date(member.createdAt).toLocaleDateString()}</p>` : ''}
            </div>
            <div class="member-actions">
                <button class="btn-edit"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-delete"><i class="fas fa-trash"></i> Excluir</button>
                <button class="btn-status"><i class="fas fa-exchange-alt"></i> ${member.status === 'inativo' ? 'Ativar' : 'Desativar'}</button>
            </div>
        </div>
        `;
    }).join('');

    // Adiciona listeners após renderizar
    document.querySelectorAll('.member-card').forEach(card => {
        const id = card.getAttribute('data-member-id');
        const status = card.getAttribute('data-status');
        
        // Listener para o card inteiro (detalhes)
        card.addEventListener('click', async (e) => {
            if (!e.target.closest('.member-actions')) {
                try {
                    const response = await fetch(`/api/members/${id}`, {
                        headers: window.getAuthHeaders()
                    });
                    if (response.ok) {
                        const member = await response.json();
                        showMemberDetails(member);
                    }
                } catch (error) {
                    console.error('Error fetching member details:', error);
                }
            }
        });

        // Listeners para os botões
        const btnEdit = card.querySelector('.btn-edit');
        const btnDelete = card.querySelector('.btn-delete');
        const btnStatus = card.querySelector('.btn-status');

        if (btnEdit) btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            editMember(id);
        });
        
        if (btnDelete) btnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteMember(id, card.querySelector('.member-name').textContent);
        });
        
        if (btnStatus) btnStatus.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStatus(id, status);
        });
    });
}

// Filtro de status e presença
function filterAndRenderMembers() {
    const searchTerm = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    const attendance = attendanceFilter.value;
    const today = new Date().toISOString().split('T')[0];
    const filtered = members.filter(member => {
        const matchesSearch = (member.name?.toLowerCase().includes(searchTerm) || 
                             member.phone?.includes(searchTerm));
        const matchesStatus = !status || member.status === status;
        let matchesAttendance = true;
        if (attendance === 'present') {
            matchesAttendance = member.lastAttendance && member.lastAttendance.split('T')[0] === today;
        } else if (attendance === 'absent') {
            matchesAttendance = !member.lastAttendance || member.lastAttendance.split('T')[0] !== today;
        } else if (attendance === 'inactive') {
            if (member.lastAttendance) {
                const last = new Date(member.lastAttendance);
                const diff = (new Date() - last) / (1000*60*60*24);
                matchesAttendance = diff >= 14;
            } else {
                matchesAttendance = true;
            }
        }
        return matchesSearch && matchesStatus && matchesAttendance;
    });
    renderMembers(filtered);
}

// Handle form submission (criar/editar)
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value.replace(/\D/g, ''),
        email: document.getElementById('email').value,
        birthDate: document.getElementById('birthDate').value,
        status: document.getElementById('status').value,
        address: document.getElementById('address').value,
        discipleBy: document.getElementById('discipleBy').value,
        ministries: {
            louvor: document.querySelector('input[name="ministry-louvor"]')?.checked || false,
            danca: document.querySelector('input[name="ministry-danca"]')?.checked || false,
            midia: document.querySelector('input[name="ministry-midia"]')?.checked || false,
            intercessao: document.querySelector('input[name="ministry-intercessao"]')?.checked || false,
            boaparte: document.querySelector('input[name="ministry-boaparte"]')?.checked || false
        }
    };
    
    try {
        let response;
        if (currentMemberId) {
            // Edição - usa PUT request
            response = await fetch(`/api/members/${currentMemberId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Criação - usa POST request
            response = await fetch('/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
        }

        if (!response.ok) throw new Error('Erro ao salvar membro');
        
        await loadMembers();
        modal.style.display = 'none';
        showToast('Membro salvo com sucesso');
    } catch (error) {
        showToast('Erro ao salvar membro', 'error');
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// Show member details
function showMemberDetails(member) {
    const card = document.getElementById('memberDetailsCard');
    if (!card) {
        console.error('Card de detalhes não encontrado');
        return;
    }

    try {
        // Define o nome
        document.getElementById('detailsMemberName').textContent = member.name || 'Não informado';
        
        // Define o telefone (formatado)
        document.getElementById('detailsPhone').textContent = formatPhone(member.phone) || 'Não informado';
        
        // Define data de nascimento
        document.getElementById('detailsBirthDate').textContent = member.birthDate ? formatDate(member.birthDate) : 'Não informado';
        
        // Define o status (primeira letra maiúscula)
        document.getElementById('detailsStatus').textContent = member.status ? 
            member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Não informado';
        
        // Define o discipulador
        document.getElementById('detailsDiscipleBy').textContent = member.discipleBy || 'Não informado';
        
        // Define o gênero (primeira letra maiúscula)
        document.getElementById('detailsGender').textContent = member.gender ? 
            member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : 'Não informado';

        // Os ministérios agora são processados na nova versão da função

        // Define a data de cadastro
        document.getElementById('detailsCreatedAt').textContent = formatDate(member.createdAt);

        // Mostra o card
        card.style.display = 'block';

        // Armazena o ID do membro atual para o botão de edição
        const editBtn = card.querySelector('.edit-member-btn');
        if (editBtn) {
            editBtn.setAttribute('data-member-id', member._id);
        }
    } catch (error) {
        console.error('Erro ao mostrar detalhes do membro:', error);
        showToast('Erro ao mostrar detalhes do membro', 'error');
    }
}

// Initialize event listeners for member details
function initializeMemberDetailsListeners() {
    const memberDetailsCard = document.getElementById('memberDetailsCard');
    const closeDetailsBtn = document.querySelector('.close-details');

    if (!memberDetailsCard) {
        console.error('Card de detalhes não encontrado no DOM');
        return;
    }

    // Close details card when clicking the close button
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            memberDetailsCard.style.display = 'none';
        });
    }

    // Close details card when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === memberDetailsCard) {
            memberDetailsCard.style.display = 'none';
        }
    });

    // Delegação de evento para os cards de membros usando o container
    const membersGrid = document.querySelector('.members-grid');
    if (membersGrid) {
        membersGrid.addEventListener('click', async (e) => {
            const memberCard = e.target.closest('.member-card');
            if (memberCard && !e.target.closest('.member-actions')) {
                const memberId = memberCard.getAttribute('data-member-id');
                try {
                    const member = members.find(m => m._id === memberId);
                    if (member) {
                        showMemberDetails(member);
                    }
                } catch (error) {
                    console.error('Error showing member details:', error);
                }
            }
        });
    }

    // Close details card when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === memberDetailsCard) {
            memberDetailsCard.style.display = 'none';
        }
    });

    // Handle clicks on member cards
    if (membersGrid) {
        membersGrid.addEventListener('click', async (e) => {
            const memberCard = e.target.closest('.member-card');
            if (memberCard && !e.target.closest('.card-actions')) {
                const memberId = memberCard.dataset.memberId;
                try {
                    const response = await fetch(`/api/members/${memberId}`, {
                        headers: window.getAuthHeaders()
                    });
                    if (response.ok) {
                        const member = await response.json();
                        showMemberDetails(member);
                    }
                } catch (error) {
                    console.error('Error fetching member details:', error);
                }
            }
        });
    }
}

// Add initialization call
document.addEventListener('DOMContentLoaded', () => {
    loadMembers();
    initializeDetailsCard();
    
    // Add form submission handler
    const memberForm = document.getElementById('memberForm');
    if (memberForm) {
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                birthDate: document.getElementById('birthDate').value,
                status: document.getElementById('status').value,
                discipleBy: document.getElementById('discipleBy').value,
                address: document.getElementById('address').value,
                ministries: {
                    louvor: document.querySelector('input[name="ministry-louvor"]')?.checked || false,
                    danca: document.querySelector('input[name="ministry-danca"]')?.checked || false,
                    midia: document.querySelector('input[name="ministry-midia"]')?.checked || false,
                    intercessao: document.querySelector('input[name="ministry-intercessao"]')?.checked || false,
                    recepcao: document.querySelector('input[name="ministry-recepcao"]')?.checked || false,
                    kids: document.querySelector('input[name="ministry-kids"]')?.checked || false
                }
            };

            try {
                const response = await fetch(`/api/members/${currentMemberId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...window.getAuthHeaders()
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) throw new Error('Erro ao atualizar membro');
                
                await loadMembers();
                modal.style.display = 'none';
                showToast('Membro atualizado com sucesso');
            } catch (error) {
                console.error('Erro ao atualizar membro:', error);
                showToast('Erro ao atualizar membro', 'error');
            }
        });
    }
});

// Função para formatar data
function formatDate(dateString) {
    if (!dateString) return 'Não informado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Função para mostrar detalhes do membro
function showMemberDetails(member) {
    const memberDetailsCard = document.getElementById('memberDetailsCard');
    if (!memberDetailsCard) {
        console.error('Card de detalhes não encontrado');
        return;
    }

    try {
        // Configura todas as informações do membro
        const fields = {
            'detailsMemberName': member.name,
            'detailsPhone': formatPhone(member.phone),
            'detailsEmail': member.email,
            'detailsBirthDate': member.birthDate ? formatDate(member.birthDate) : null,
            'detailsAddress': member.address,
            'detailsStatus': member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : null,
            'detailsDiscipleBy': member.discipleBy,
            'detailsGender': member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : null,
            'detailsCreatedAt': member.createdAt ? formatDate(member.createdAt) : null
        };

        // Processa os ministérios
        const ministries = [];
        if (member.ministries) {
            const ministryMap = {
                louvor: 'Louvor',
                danca: 'Dança',
                midia: 'Mídia',
                intercessao: 'Intercessão',
                boaparte: 'Boa Parte'
            };
            
            Object.entries(member.ministries).forEach(([key, value]) => {
                if (value && ministryMap[key]) {
                    ministries.push(ministryMap[key]);
                }
            });
        }
        fields['detailsMinistries'] = ministries.length > 0 ? ministries.join(', ') : null;

        // Atualiza cada campo, com validação
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || 'Não informado';
            }
        });

        // Exibe o card
        memberDetailsCard.style.display = 'block';

        // Configura o botão de edição
        const editMemberBtn = memberDetailsCard.querySelector('.edit-member-btn');
        if (editMemberBtn) {
            editMemberBtn.dataset.memberId = member._id;
        }
    } catch (error) {
        console.error('Erro ao mostrar detalhes do membro:', error);
    }
    
    memberDetailsCard.style.display = 'block';

    // Store current member ID for edit functionality
    const editMemberBtn = memberDetailsCard.querySelector('.edit-member-btn');
    if (editMemberBtn) {
        editMemberBtn.dataset.memberId = member._id;
    }
}

// Inicializa os event listeners para o card de detalhes
function initializeDetailsCard() {
    const memberDetailsCard = document.getElementById('memberDetailsCard');
    const closeDetailsBtn = document.querySelector('.close-details');
    const editMemberBtn = document.querySelector('.edit-member-btn');

    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            memberDetailsCard.style.display = 'none';
        });
    }

    if (editMemberBtn) {
        editMemberBtn.addEventListener('click', () => {
            const memberId = editMemberBtn.dataset.memberId;
            editMember(memberId);
            memberDetailsCard.style.display = 'none';
        });
    }

    // Fechar ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === memberDetailsCard) {
            memberDetailsCard.style.display = 'none';
        }
    });

        // Click handler para os cards
    document.addEventListener('click', async (e) => {
        const memberCard = e.target.closest('.member-card');
        if (memberCard && !e.target.closest('.member-actions')) {
            const memberId = memberCard.getAttribute('data-member-id');
            console.log('Card clicked:', memberId);
            if (memberId) {
                const member = members.find(m => m._id === memberId);
                console.log('Member found:', member);
                if (member) {
                    showMemberDetails(member);
                }
            }
        }
    });
}

// Garante que a função initializeMemberDetailsListeners seja chamada apenas quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMemberDetailsListeners);
} else {
    initializeMemberDetailsListeners();
}

// Edit member
function editMember(memberId) {
    currentMemberId = memberId;
    const member = members.find(m => m._id === memberId);
    if (!member) return;

    modalTitle.textContent = 'Editar Membro';
    document.getElementById('name').value = member.name || '';
    document.getElementById('phone').value = member.phone || '';
    document.getElementById('email').value = member.email || '';
    document.getElementById('birthDate').value = member.birthDate || '';
    document.getElementById('status').value = member.status || 'ativo';
    document.getElementById('discipleBy').value = member.discipleBy || '';
    document.getElementById('address').value = member.address || '';

    // Atualiza os checkboxes dos ministérios
    if (member.ministries) {
        const ministries = ['louvor', 'danca', 'midia', 'intercessao', 'boaparte'];
        ministries.forEach(ministry => {
            const checkbox = document.querySelector(`input[name="ministry-${ministry}"]`);
            if (checkbox) {
                checkbox.checked = member.ministries[ministry] || false;
            }
        });
    }

    modal.style.display = 'block';
}

// Delete member
function confirmDeleteMember(id, name) {
    if (confirm(`Deseja realmente excluir o membro "${name}"?`)) {
        deleteMember(id);
    }
}

async function deleteMember(id) {
    try {
        const response = await fetch(`/api/members/${id}`, {
            method: 'DELETE',
            headers: window.getAuthHeaders()
        });
        if (!response.ok) throw new Error('Erro ao excluir membro');
        await loadMembers();
        showToast('Membro excluído com sucesso');
    } catch (error) {
        showDetailedError(error, 'deleteMember');
    }
}

// Toggle member status
async function toggleStatus(id, currentStatus) {
    try {
        const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
        const response = await fetch(`/api/members/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...window.getAuthHeaders()
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw new Error('Erro ao alterar status');
        await loadMembers();
        showToast(`Status alterado para ${newStatus}`);
    } catch (error) {
        showDetailedError(error, 'toggleStatus');
    }
}

// Initialize page


document.addEventListener('DOMContentLoaded', () => {
    loadMembers();
    
    // Event listeners
    searchInput.addEventListener('input', filterAndRenderMembers);
    statusFilter.addEventListener('change', filterAndRenderMembers);
    memberForm.addEventListener('submit', handleFormSubmit);
    document.getElementById('exportBtn').onclick = exportMembersToCSV;
    attendanceFilter.addEventListener('change', filterAndRenderMembers);

    // Inicializa listeners para o card de detalhes
    initializeMemberDetailsListeners();
    
    // Modal controls
    const closeModal = () => { modal.style.display = 'none'; };
    document.querySelector('.close').onclick = closeModal;
    document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = closeModal);
    window.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    
    // Garante que o form não duplique listeners
    memberForm.onsubmit = null;
    memberForm.addEventListener('submit', handleFormSubmit);

    document.getElementById('addMemberBtn').onclick = () => {
        currentMemberId = null;
        memberForm.reset();
        modalTitle.textContent = 'Novo Membro';
        modal.style.display = 'block';
    };

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '/pages/login.html';
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
  if (window.logAction) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    window.logAction('members_access', `Acesso à página de membros em ${dateStr} às ${timeStr}`, 'info');
  }
});

// Helper function to format phone numbers
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
    }
    return phone;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// Função para mostrar erros detalhados no console e na tela
function showDetailedError(error, context = '') {
    let msg = '[MEMBERS]';
    if (context) msg += ` [${context}]`;
    if (error instanceof Error) {
        msg += ` ${error.message}`;
        if (error.stack) console.error(msg, error.stack);
        else console.error(msg);
    } else {
        msg += ` ${error}`;
        console.error(msg);
    }
    showToast(msg, 'error');
}

// Expor funções globais para onclick inline
window.editMember = editMember;
window.confirmDeleteMember = confirmDeleteMember;
window.toggleStatus = toggleStatus;
