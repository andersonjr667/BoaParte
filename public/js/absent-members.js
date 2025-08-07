// Salvar chamada rápida no backend
document.addEventListener('DOMContentLoaded', () => {
    const saveAbsentBtn = document.getElementById('saveAbsentBtn');
    if (saveAbsentBtn) {
        saveAbsentBtn.addEventListener('click', async () => {
            const quickAbsentList = document.getElementById('quickAbsentList');
            if (!quickAbsentList) return;
            const checkboxes = quickAbsentList.querySelectorAll('.quick-absent-checkbox:checked');
            const absents = Array.from(checkboxes).map(cb => {
                const li = cb.closest('li');
                return {
                    name: li.querySelector('.quick-name')?.textContent?.trim() || '',
                    phone: li.querySelector('.quick-phone')?.textContent?.replace(/\D/g, '') || ''
                };
            });
            // Data e hora atuais de Brasília
            const now = window.luxon.DateTime.now().setZone('America/Sao_Paulo');
            const date = now.toISODate();
            const time = now.toFormat('HH:mm');
            try {
                const res = await fetch('/api/members/absent-list/json', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(window.getAuthHeaders ? window.getAuthHeaders() : {})
                    },
                    body: JSON.stringify({ date, time, absents })
                });
                if (!res.ok) throw new Error('Erro ao salvar chamada');
                alert('Chamada salva com sucesso!');
                // Atualiza a tabela principal com a última chamada
                loadLastAbsentCall();
            } catch (err) {
                alert('Erro ao salvar chamada: ' + err.message);
            }
        });
    }
});
// DOM Elements
const absentList = document.getElementById('absentList');
const periodFilter = document.getElementById('periodFilter');
const searchInput = document.getElementById('searchInput');
const justificationModal = document.getElementById('justificationModal');
const justificationForm = document.getElementById('justificationForm');

let absentMembers = [];
let currentMemberId = null;

// Load absent members
async function loadAbsentMembers() {
    try {
        const days = periodFilter.value;
        const response = await fetch(`/api/members/absent?days=${days}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Falha ao carregar membros ausentes');
        
        absentMembers = await response.json();
        renderAbsentMembers(absentMembers);
    } catch (error) {
        console.error('Erro ao carregar membros ausentes:', error);
        alert('Erro ao carregar lista de membros ausentes');
    }
}

// Calculate days absent
function calculateDaysAbsent(lastAttendance) {
    const lastDate = new Date(lastAttendance);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get status class based on days absent
function getStatusClass(days) {
    if (days >= 90) return 'critical';
    if (days >= 60) return 'warning';
    return 'normal';
}

// Render absent members table
function renderAbsentMembers(members) {
    // Se vier da última chamada, members é um array de ausentes simples (name, phone)
    // Pega a data/hora da última chamada do arquivo (já buscada em loadLastAbsentCall)
    let ultimaData = '';
    let ultimaHora = '';
    if (window.ultimaChamadaData && window.ultimaChamadaHora) {
        ultimaData = window.ultimaChamadaData;
        ultimaHora = window.ultimaChamadaHora;
    }
    // Carrega todos os membros do banco para mapear status
    fetch('/db/members.json', { headers: { 'Content-Type': 'application/json' } })
        .then(res => res.json())
        .then(allMembers => {
            absentList.innerHTML = members.map(member => {
                // Usa a data/hora da última chamada
                const dataFalta = ultimaData ? new Date(ultimaData).toLocaleDateString() : '-';
                const horaFalta = ultimaHora || '--:--';
                // Busca status pelo telefone (único)
                const found = allMembers.find(m => m.phone === member.phone);
                const status = found ? found.status : 'Desconhecido';
                const statusClass = status === 'ativo' ? 'status-ativo' : (status === 'inativo' ? 'status-inativo' : 'status-desconhecido');
                return `
                    <tr>
                        <td>${member.name || '-'}</td>
                        <td>${dataFalta} ${horaFalta}</td>
                        <td>${member.phone || '-'}</td>
                        <td><span class="status-badge ${statusClass}">${status}</span></td>
                        <td class="action-buttons"></td>
                    </tr>
                `;
            }).join('');
        });


}

// Justify absence
function justifyAbsence(id) {
    currentMemberId = id;
    justificationModal.style.display = 'block';
}

// Handle justification form submission

if (justificationForm) {
    justificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const justification = document.getElementById('justification').value;
        try {
            const response = await fetch(`/api/members/${currentMemberId}/absence`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    date: new Date().toISOString(),
                    justified: true,
                    justification
                })
            });
            if (!response.ok) throw new Error('Falha ao justificar ausência');
            justificationModal.style.display = 'none';
            loadAbsentMembers();
        } catch (error) {
            console.error('Erro ao justificar ausência:', error);
            alert('Erro ao salvar justificativa');
        }
    });
}

// Handle period filter change
periodFilter.addEventListener('change', loadAbsentMembers);

// Handle search input
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredMembers = absentMembers.filter(member =>
        member.name.toLowerCase().includes(searchTerm) ||
        member.phone.includes(searchTerm)
    );
    renderAbsentMembers(filteredMembers);
});

// --- Salvar chamada rápida no backend ---
// Removido listener duplicado do botão 'Salvar Chamada' para evitar conflito com o frontend

// Close modals when clicking outside or on close button
window.addEventListener('click', (e) => {
    if (e.target === justificationModal) {
        justificationModal.style.display = 'none';
    }
});

document.querySelectorAll('.close').forEach(button => {
    button.addEventListener('click', () => {
        justificationModal.style.display = 'none';
    });
});

document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
        justificationModal.style.display = 'none';
    });
});



// Carregar todos os membros do banco para a chamada rápida
async function loadQuickAbsentListFromBackend() {
    try {
        const res = await fetch('/api/members', {
            headers: window.getAuthHeaders ? window.getAuthHeaders() : {}
        });
        if (!res.ok) throw new Error('Erro ao buscar membros do banco');
        const members = await res.json();
        renderQuickAbsentList(members);
    } catch (err) {
        renderQuickAbsentList([]);
    }
}

// Renderiza a lista de chamada rápida (ul#quickAbsentList) com todos os membros
function renderQuickAbsentList(members) {
    const quickAbsentList = document.getElementById('quickAbsentList');
    if (!quickAbsentList) return;
    quickAbsentList.innerHTML = members.map(member => `
        <li class="quick-absent-item" tabindex="0" style="cursor:pointer;user-select:none;">
            <span class="quick-name">${member.name || '-'}</span>
            <span class="quick-phone">${member.phone || '-'}</span>
            <input type="checkbox" class="quick-absent-checkbox" data-member-id="${member._id}">
        </li>
    `).join('');

    // Permite selecionar o membro ao clicar no card inteiro
    Array.from(quickAbsentList.children).forEach(li => {
        li.addEventListener('click', function(e) {
            // Evita conflito ao clicar diretamente no checkbox
            if (e.target.tagName.toLowerCase() === 'input') return;
            const checkbox = li.querySelector('.quick-absent-checkbox');
            if (checkbox) checkbox.checked = !checkbox.checked;
        });
        // Acessibilidade: permite usar Enter/Espaço
        li.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                const checkbox = li.querySelector('.quick-absent-checkbox');
                if (checkbox) checkbox.checked = !checkbox.checked;
            }
        });
    });
}

// Renderiza todas as chamadas do dia, separando por horário
function renderQuickAbsentTableByCall(chamadas, dateStr) {
    const tbody = document.getElementById('absentList');
    if (!tbody) return;
    if (!chamadas.length) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhuma chamada registrada para o dia.</td></tr>';
        return;
    }
    tbody.innerHTML = chamadas.map(chamada => {
        const hora = chamada.time || '--:--';
        const dataFalta = chamada.date ? new Date(chamada.date).toLocaleDateString() : '';
        return chamada.absents.map(absent => `
            <tr>
                <td>${absent.name || '-'}</td>
                <td>${dataFalta} ${hora}</td>
                <td>${absent.phone || '-'}</td>
                <td><span class="status-badge status-ausente">Ausente</span></td>
                <td class="action-buttons">
                    <button class="notify-btn" title="Notificar"><i class="fas fa-bell"></i></button>
                </td>
            </tr>
        `).join('');
    }).join('');
}

// Renderiza a tabela de ausentes do arquivo
function renderQuickAbsentTable(absents, dateStr) {
    const tbody = document.getElementById('absentList');
    // Usa a data recebida do backend (formato yyyy-mm-dd) ou vazio
    let dataFalta = '';
    if (dateStr) {
        const d = new Date(dateStr);
        dataFalta = d.toLocaleDateString();
    }
    tbody.innerHTML = absents.map(absent => `
        <tr>
            <td>${absent.name || '-'}</td>
            <td>${dataFalta || '-'}</td>
            <td>${absent.phone || '-'}</td>
            <td><span class="status-badge status-ausente">Ausente</span></td>
            <td class="action-buttons">
                <button class="notify-btn" title="Notificar"><i class="fas fa-bell"></i></button>
            </td>
        </tr>
    `).join('');
}

// Carregar histórico de ausências agrupado por membro
async function loadAbsentHistory() {
    try {
        const res = await fetch('/api/members/absent-list/history', { headers: window.getAuthHeaders ? window.getAuthHeaders() : {} });
        if (!res.ok) throw new Error('Erro ao buscar histórico de ausências');
        const data = await res.json();
        renderAbsentHistoryTable(data);
    } catch (err) {
        renderAbsentHistoryTable([]);
    }
}

// Renderiza a tabela principal com histórico de faltas
function renderAbsentHistoryTable(members) {
    const tbody = document.getElementById('absentList');
    tbody.innerHTML = members.map(member => {
        const absences = (member.absences || []).slice(0, 5).map(date => {
            const d = new Date(date);
            return d.toLocaleDateString();
        }).join(', ');
        return `
            <tr>
                <td>${member.name || '-'}</td>
                <td>${absences || '-'}</td>
                <td>${member.phone || '-'}</td>
                <td><span class="status-badge status-ausente">Ausente</span></td>
                <td class="action-buttons">
                    <button class="notify-btn" title="Notificar"><i class="fas fa-bell"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}




// Função para buscar os ausentes da última chamada
async function loadLastAbsentCall() {
    try {
        // Busca todas as chamadas sem filtro de data
        const res = await fetch('/db/absentmembers.json', {
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Erro ao buscar chamadas');
        const chamadas = await res.json();
        // Pega a última chamada (maior data+hora)
        let ultimaChamada = null;
        if (Array.isArray(chamadas) && chamadas.length > 0) {
            ultimaChamada = chamadas.reduce((a, b) => {
                const aDate = new Date(a.date + 'T' + (a.time || '00:00'));
                const bDate = new Date(b.date + 'T' + (b.time || '00:00'));
                return bDate > aDate ? b : a;
            });
        }
        if (ultimaChamada && Array.isArray(ultimaChamada.absents)) {
            // Salva data/hora globais para uso na tabela
            window.ultimaChamadaData = ultimaChamada.date;
            window.ultimaChamadaHora = ultimaChamada.time;
            renderAbsentMembers(ultimaChamada.absents);
        } else {
            window.ultimaChamadaData = null;
            window.ultimaChamadaHora = null;
            renderAbsentMembers([]);
        }
    } catch (err) {
        window.ultimaChamadaData = null;
        window.ultimaChamadaHora = null;
        renderAbsentMembers([]);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Limpa seleção de ausentes (checkboxes e lista rápida)
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    const quickAbsentList = document.getElementById('quickAbsentList');
    if (quickAbsentList) quickAbsentList.innerHTML = '';

    if (!window.checkAuth || !window.checkAuth()) return;
    // Carrega ausentes da última chamada na tabela principal
    loadLastAbsentCall();
    // Carrega todos os membros na lista rápida
    loadQuickAbsentListFromBackend();
    if (window.logAction) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR');
        window.logAction('absent_members_access', `Acesso à página de membros ausentes em ${dateStr} às ${timeStr}`, 'info');
    }
});
