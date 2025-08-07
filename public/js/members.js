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
const exportBtn = document.getElementById('exportBtn');
const attendanceFilter = document.getElementById('attendanceFilter');
const memberDetailsCard = document.getElementById('memberDetailsCard');
const closeDetailsBtn = document.querySelector('.close-details');

// Export members to Excel
if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
        try {
            // Show loading state
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

            // Make request to export endpoint
            const response = await fetch('/api/export/members', {
                method: 'GET',
                headers: window.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao exportar membros');
            }

            // Convert response to blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'membros.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Reset button state
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar';

        } catch (error) {
            console.error('Error exporting members:', error);
            alert('Erro ao exportar membros. Por favor, tente novamente.');
            
            // Reset button state
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar';
        }
    });
};

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


// Export members to XLSX
async function exportMembersToXLSX() {
    try {
        const response = await fetch('/api/members/export-xlsx', {
            headers: window.getAuthHeaders()
        });
        if (!response.ok) throw new Error('Erro ao exportar XLSX');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'membros.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        showToast('Erro ao exportar XLSX', 'error');
    }
}

// Render members grid (corrigido: mais campos, address, discipulador, data de cadastro)
function renderMembers(membersToRender) {
    if (!membersGrid) return;
    
    if (!membersToRender || membersToRender.length === 0) {
        membersGrid.innerHTML = '<p>Nenhum membro encontrado.</p>';
        return;
    }

    const html = membersToRender.map(member => {
        const status = member.status || 'ativo';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        const actionText = status === 'inativo' ? 'Ativar' : 'Desativar';
        const formattedPhone = formatPhone(member.phone) || 'Não informado';
        const registrationDate = member.createdAt ? 
            '<p><i class="fas fa-calendar-plus"></i> Cadastro: ' + new Date(member.createdAt).toLocaleDateString() + '</p>' : '';
        
        return '<div class="member-card" data-member-id="' + member._id + '" data-status="' + status + '">' +
               '<div class="member-header">' +
               '<h3 class="member-name">' + (member.name || '') + '</h3>' +
               '<span class="member-status ' + status + '">' + statusText + '</span>' +
               '</div>' +
               '<div class="member-info">' +
               '<p><i class="fas fa-phone"></i> ' + formattedPhone + '</p>' +
               registrationDate +
               '</div>' +
               '<div class="member-actions">' +
               '<button class="btn-edit"><i class="fas fa-edit"></i> Editar</button>' +
               '<button class="btn-delete"><i class="fas fa-trash"></i> Excluir</button>' +
               '<button class="btn-status"><i class="fas fa-exchange-alt"></i> ' + actionText + '</button>' +
               '</div>' +
               '</div>';
    }).join('');
    membersGrid.innerHTML = html;

    // Adiciona listeners após renderizar
    document.querySelectorAll('.member-card').forEach(card => {
        const id = card.getAttribute('data-member-id');
        const status = card.getAttribute('data-status');
        
        // Listener para o card inteiro (detalhes)
        card.addEventListener('click', async (e) => {
            if (!e.target.closest('.member-actions')) {
                try {
                    const response = await fetch('/api/members/' + id, {
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
        
        if (btnStatus) btnStatus.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const newStatus = await toggleStatus(id, status);
                if (newStatus && newStatus !== status) {
                    // Atualizar o botão e o status após a mudança bem-sucedida
                    card.setAttribute('data-status', newStatus);
                    btnStatus.innerHTML = '<i class="fas fa-exchange-alt"></i> ' + (newStatus === 'inativo' ? 'Ativar' : 'Desativar');
                    
                    const statusElement = card.querySelector('.member-status');
                    if (statusElement) {
                        statusElement.textContent = newStatus;
                        statusElement.className = 'member-status ' + newStatus;
                    }
                    
                    // Atualiza a lista local
                    const memberIndex = members.findIndex(m => m._id === id);
                    if (memberIndex !== -1) {
                        members[memberIndex].status = newStatus;
                    }
                }
            } catch (error) {
                console.error('Erro ao alterar status:', error);
                showToast('Erro ao alterar status do membro', 'error');
            }
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
        // Sanitiza e valida os dados antes de enviar
        const sanitizedData = {
            ...formData,
            phone: formData.phone.replace(/\D/g, ''), // Remove não-números
            email: formData.email.trim(), // Remove espaços
            name: formData.name.trim(), // Remove espaços
            // Certifica que birthDate está no formato correto ou é vazio
            birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString().split('T')[0] : '',
            // Garante que ministries tem todas as propriedades necessárias
            ministries: {
                louvor: Boolean(formData.ministries.louvor),
                danca: Boolean(formData.ministries.danca),
                midia: Boolean(formData.ministries.midia),
                intercessao: Boolean(formData.ministries.intercessao),
                boaparte: Boolean(formData.ministries.boaparte)
            }
        };

        let response;
        if (currentMemberId) {
            // Edição - usa PUT request
            response = await fetch(`/api/members/${currentMemberId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...window.getAuthHeaders()
                },
                body: JSON.stringify(sanitizedData)
            });
        } else {
            // Criação - usa POST request
            response = await fetch('/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...window.getAuthHeaders()
                },
                body: JSON.stringify(sanitizedData)
            });
        }

        // Log para debug
        console.log('Dados enviados:', sanitizedData);
        console.log('Resposta do servidor:', await response.clone().text());

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao salvar membro');
        }
        
        await loadMembers();
        modal.style.display = 'none';
        showToast(currentMemberId ? 'Membro atualizado com sucesso' : 'Membro criado com sucesso');
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
                    const response = await fetch('/api/members/' + memberId, {
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
    
    // Add event delegation for delete buttons
    membersGrid.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const memberCard = deleteBtn.closest('.member-card');
            const memberId = memberCard.getAttribute('data-member-id');
            const memberName = memberCard.querySelector('.member-name').textContent;
            await confirmDeleteMember(memberId, memberName);
        }
    });
    
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
                const url = currentMemberId ? `/api/members/${currentMemberId}` : '/api/members';
                const method = currentMemberId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...window.getAuthHeaders()
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) throw new Error(currentMemberId ? 'Erro ao atualizar membro' : 'Erro ao criar membro');
                
                await loadMembers();
                modal.style.display = 'none';
                showToast(currentMemberId ? 'Membro atualizado com sucesso' : 'Membro criado com sucesso');
                
                // Reset form if it was a new member
                if (!currentMemberId) {
                    memberForm.reset();
                }
            } catch (error) {
                console.error('Erro ao salvar membro:', error);
                showToast(currentMemberId ? 'Erro ao atualizar membro' : 'Erro ao criar membro', 'error');
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
            const checkbox = document.querySelector('input[name="ministry-' + ministry + '"]');
            if (checkbox) {
                checkbox.checked = member.ministries[ministry] || false;
            }
        });
    }

    modal.style.display = 'block';
}

// Delete member
async function confirmDeleteMember(id, name) {
    try {
        const shouldDelete = confirm('Deseja realmente excluir o membro "' + name + '"?');
        if (shouldDelete) {
            await deleteMember(id);
            // Atualiza a lista após exclusão bem-sucedida
            await loadMembers();
        }
    } catch (error) {
        console.error('Erro na confirmação de exclusão:', error);
        showToast('Não foi possível excluir o membro. ' + (error.message || 'Tente novamente.'), 'error');
    }
}

async function deleteMember(id) {
    try {
        // Usa a função getAuthHeaders que já está configurada
        const headers = {
            ...window.getAuthHeaders(),
            'Content-Type': 'application/json'
        };

        console.log('Tentando excluir membro com ID:', id);
        console.log('Headers:', headers);

        const response = await fetch('/api/members/' + id, {
            method: 'DELETE',
            headers: headers
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/pages/login.html';
            return;
        }

        // Tentar obter mensagem de erro detalhada do servidor
        if (!response.ok) {
            let errorMessage = 'Erro ao excluir membro';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } else {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                }
            } catch (e) {
                console.error('Erro ao processar resposta do servidor:', e);
            }
            throw new Error(errorMessage);
        }

        // Atualizar a lista local
        members = members.filter(m => m._id !== id);
        filterAndRenderMembers();
        
        showToast('Membro excluído com sucesso');
        
        // Log da ação bem-sucedida
        if (window.logAction) {
            await window.logAction('delete_member', `Membro ID ${id} excluído com sucesso`);
        }
    } catch (error) {
        console.error('Erro ao excluir membro:', error);
        showToast(error.message || 'Erro ao excluir membro', 'error');
        
        // Log do erro
        if (window.logAction) {
            await window.logAction('error', `Erro ao excluir membro: ${error.message}`, 'error');
        }
        
        throw error;
    }
}

// Toggle member status
async function toggleStatus(id, currentStatus) {
    try {
        const member = members.find(m => m._id === id);
        if (!member) throw new Error('Membro não encontrado');

        // Se está ativando, verifica as faltas
        if (currentStatus === 'inativo') {
            // Busca o histórico de presença
            const response = await fetch(`/api/members/${id}/attendance`, {
                headers: window.getAuthHeaders()
            });
            
            if (response.ok) {
                const attendanceData = await response.json();
                const absences = attendanceData?.absences || 0;
                
                if (absences >= 12) {
                    if (!confirm(`Este membro tem ${absences} faltas. Deseja realmente ativá-lo?`)) {
                        return currentStatus;
                    }
                }
            }
        }

        const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
        const statusResponse = await fetch(`/api/members/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...window.getAuthHeaders()
            },
            body: JSON.stringify({
                ...member,
                status: newStatus
            })
        });
        
        if (!statusResponse.ok) {
            const errorData = await statusResponse.json().catch(() => ({ message: 'Erro ao alterar status' }));
            throw new Error(errorData.message || 'Erro ao alterar status');
        }

        // Atualizar o membro na lista local
        const memberIndex = members.findIndex(m => m._id === id);
        if (memberIndex !== -1) {
            members[memberIndex].status = newStatus;
        }

        // Atualizar a interface
        await loadMembers();
        showToast(`Status alterado para ${newStatus}`);
        return newStatus;
    } catch (error) {
        showDetailedError(error, 'toggleStatus');
        throw error;
    }
}

// Initialize page


document.addEventListener('DOMContentLoaded', () => {
    loadMembers();
    
    // Event listeners
    searchInput?.addEventListener('input', filterAndRenderMembers);
    statusFilter?.addEventListener('change', filterAndRenderMembers);
document.getElementById('exportBtn')?.addEventListener('click', exportMembersToXLSX);
    attendanceFilter?.addEventListener('change', filterAndRenderMembers);

    // Inicializa listeners para o card de detalhes
    initializeMemberDetailsListeners();
    
    // Modal controls
    const closeModal = () => { 
        modal.style.display = 'none';
        memberForm.reset();
        currentMemberId = null;
    };
    
    document.querySelector('.close')?.addEventListener('click', closeModal);
    document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModal));
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Remove qualquer listener anterior do formulário
    const oldForm = memberForm.cloneNode(true);
    memberForm.parentNode.replaceChild(oldForm, memberForm);
    
    // Adiciona o novo listener do formulário
    oldForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted', currentMemberId ? 'edit' : 'new');
        
        // Validação dos campos obrigatórios
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.replace(/\D/g, '');
        
        if (!name) {
            showToast('O nome é obrigatório', 'error');
            return;
        }
        
        if (!phone || phone.length < 10) {
            showToast('Telefone inválido', 'error');
            return;
        }

        const formData = {
            name: name.trim(),
            phone: phone,
            email: document.getElementById('email').value.trim() || null,
            birthDate: document.getElementById('birthDate').value || null,
            status: document.getElementById('status').value || 'ativo',
            discipleBy: document.getElementById('discipleBy').value || null,
            address: document.getElementById('address').value.trim() || null,
            ministries: {
                louvor: document.querySelector('input[name="ministry-louvor"]')?.checked || false,
                danca: document.querySelector('input[name="ministry-danca"]')?.checked || false,
                midia: document.querySelector('input[name="ministry-midia"]')?.checked || false,
                intercessao: document.querySelector('input[name="ministry-intercessao"]')?.checked || false,
                boaparte: document.querySelector('input[name="ministry-boaparte"]')?.checked || false
            }
        };

        try {
            const url = currentMemberId ? `/api/members/${currentMemberId}` : '/api/members';
            console.log('Sending request to:', url, formData);

            // Remover campos null ou undefined antes de enviar
            const cleanData = Object.fromEntries(
                Object.entries(formData).filter(([_, value]) => value != null)
            );
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Você precisa estar logado para realizar esta operação');
            }

            const response = await fetch(url, {
                method: currentMemberId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(cleanData)
            });

            if (!response.ok) {
                let errorMessage = 'Erro ao salvar membro';
                
                try {
                    if (response.status === 401) {
                        localStorage.removeItem('token');
                        window.location.href = '/pages/login.html';
                        return;
                    }

                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                        if (errorData.errors) {
                            // If there are validation errors, show them in detail
                            errorMessage = Object.entries(errorData.errors)
                                .map(([field, error]) => `${field}: ${error.message}`)
                                .join('\n');
                        }
                    } else {
                        const errorText = await response.text();
                        console.error('Resposta do servidor:', errorText);
                        errorMessage = errorText || errorMessage;
                    }
                } catch (e) {
                    console.error('Erro ao processar resposta:', e);
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Resposta do servidor:', result);

            await loadMembers();
            closeModal();
            showToast(currentMemberId ? 'Membro atualizado com sucesso' : 'Membro criado com sucesso');
        } catch (error) {
            console.error('Erro ao salvar membro:', error);
            showToast(error.message || 'Erro ao salvar membro', 'error');
        }
    });

    // Botão Novo Membro
    document.getElementById('addMemberBtn')?.addEventListener('click', () => {
        currentMemberId = null;
        memberForm.reset();
        modalTitle.textContent = 'Novo Membro';
        document.getElementById('status').value = 'ativo'; // Define status padrão
        modal.style.display = 'block';
    });

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
